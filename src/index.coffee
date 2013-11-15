{spawn, exec} = require 'child_process'
sysPath = require 'path'
progeny = require 'progeny'

module.exports = class SassCompiler
  brunchPlugin: yes
  type: 'stylesheet'
  extension: 'scss'
  pattern: /\.s[ac]ss$/
  _bin: if process.platform is 'win32' then 'sass.bat' else 'sass'
  _compass_bin: 'compass'

  constructor: (@config) ->
    @gem_home = @config.plugins?.sass?.gem_home

    @mod_env = {}

    if @gem_home
      # Use copied process.env to not modify original
      env = ([k, v] for k, v of process.env).reduce (a={}, [k,v]) -> a[k] = v; a
      env['GEM_HOME'] = config.plugins.sass.gem_home
      @mod_env = {env}
      @_bin = @config.plugins.sass.gem_home + '/bin/sass'
      @_compass_bin = @config.plugins.sass.gem_home + '/bin/compass'


    if config.plugins.sass.useBundler
      @_bin = "bundle exec #{@_bin}"
      @_compass_bin = "bundle exec #{@_compass_bin}"

    exec "#{@_bin} --version", @mod_env, (error, stdout, stderr) =>
      if error
        console.error "You need to have Sass on your system"
        console.error "Execute `gem install sass`"
    exec "#{@_compass_bin} --version", @mod_env, (error, stdout, stderr) =>
      @compass = not error

    @getDependencies = progeny rootPath: @config.paths.root

  compile: (data, path, callback) ->
    result = ''
    error = null
    # Warning: spawning child processes is a quite slow operation.
    # On my machine, it's ~200ms, when compiling stylus via node.js
    # without spawning child process is ~20ms.
    options = [
      '--stdin',
      '--load-path', @config.paths.root,
      '--load-path', sysPath.dirname(path),
      '--no-cache',
    ]
    unless @config.optimize
      hasComments = @config.plugins?.sass?.debug is 'comments'
      options.push (if hasComments then '--line-comments' else '--debug-info')
    options.push.apply(options, @config.plugins.sass.options) if @config.plugins?.sass?.options?

    options.push '--scss' if /\.scss$/.test path
    execute = =>
      options.push '--compass' if @compass
      sass = spawn @_bin, options, @mod_env
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
      if @compass?
        execute()
      else
        setTimeout delay, 100
    do delay
