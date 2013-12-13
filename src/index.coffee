{spawn, exec} = require 'child_process'
sysPath = require 'path'
progeny = require 'progeny'
Q = require 'q'

module.exports = class SassCompiler
  brunchPlugin: yes
  type: 'stylesheet'
  extension: 'scss'
  pattern: /\.s[ac]ss$/
  compass: Q.defer()
  _bin: if process.platform is 'win32' then 'sass.bat' else 'sass'
  _compass_bin: 'compass'

  constructor: (@brunchConfig) ->
    @conf = @brunchConfig.plugins?.sass

    @gem_home = @conf?.gem_home
    @mod_env = {}

    if @gem_home
      # Use copied process.env to not modify original
      env = ([k, v] for k, v of process.env).reduce (a={}, [k,v]) -> a[k] = v; a
      env['GEM_HOME'] = @gem_home
      @mod_env = {env}
      @_bin = "#{@gem_home}/bin/sass"
      @_compass_bin = "#{@gem_home}/bin/compass"

    @bundler = @conf?.useBundler
    prefix = if @bundler then 'bundle exec ' else ''

    exec "#{prefix}#{@_bin} --version", @mod_env, (error) =>
      if error
        console.error "You need to have Sass on your system"
        console.error "Execute `gem install sass`"
    exec "#{prefix}#{@_compass_bin} --version", @mod_env, (error) =>
      @compass.resolve not error

    @getDependencies = progeny rootPath: @brunchConfig.paths.root

  compile: (data, path, callback) ->
    Q.when @compass, (compassExists) =>
      @deferredCompile data, path, callback, compassExists

  deferredCompile: (data, path, callback, compassExists) ->
    result = ''
    error = null
    # Warning: spawning child processes is a quite slow operation.
    # On my machine, it's ~200ms, when compiling stylus via node.js
    # without spawning child process is ~20ms.
    cmd = [
      'sass'
      '--stdin'
      '--load-path', @brunchConfig.paths.root
      '--load-path', sysPath.dirname path
      '--no-cache'
    ]
    cmd.unshift 'bundle', 'exec' if @bundler

    if @conf?.debug in ['comments', 'debug'] and not @brunchConfig.optimize
      hasComments = @conf?.debug is 'comments'
      cmd.push if hasComments then '--line-comments' else '--debug-info'

    cmd.push '--scss' if /\.scss$/.test path
    cmd.push '--compass' if compassExists
    cmd.push.apply(cmd, @conf.options) if @conf?.options?

    execute = =>
      sass = spawn cmd[0], cmd.slice(1), @mod_env
      sass.stdout.on 'data', (buffer) ->
        result += buffer.toString()
      sass.stderr.on 'data', (buffer) ->
        error ?= ''
        error += buffer.toString()
      onExit = (code) -> callback error, result
      if process.version.slice(0, 4) is 'v0.6'
        sass.on 'exit', onExit
      else
        sass.on 'close', onExit
      if sass.stdin.write data
        sass.stdin.end()
      else
        sass.stdin.on 'drain', -> sass.stdin.end()

    delay = =>
      if compassExists?
        execute()
      else
        setTimeout delay, 100
    do delay
