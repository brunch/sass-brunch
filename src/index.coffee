{spawn, exec} = require 'child_process'
sysPath = require 'path'

module.exports = class SassCompiler
  brunchPlugin: yes
  type: 'stylesheet'
  extension: 'scss'
  pattern: /\.s[ac]ss$/
  _dependencyRegExp: /^ *@import ['"](.*)['"]/
  _bin: if process.platform is 'win32' then 'sass.bat' else 'sass'

  constructor: (@config) ->
    exec "#{@_bin} --version", (error, stdout, stderr) =>
      if error
        console.error "You need to have Sass on your system"
        console.error "Execute `gem install sass`"
    exec 'compass --version', (error, stdout, stderr) =>
      @compass = not error

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
    options.push '--scss' if /\.scss$/.test path
    execute = =>
      options.push '--compass' if @compass
      sass = spawn @_bin, options
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
      sass.stdin.end data

    delay = =>
      if @compass?
        execute()
      else
        setTimeout delay, 100
    do delay

  getDependencies: (data, path, callback) =>
    parent = sysPath.dirname path
    dependencies = data
      .split('\n')
      .map (line) =>
        line.match(@_dependencyRegExp)
      .filter (match) =>
        match?.length > 0
      .map (match) =>
        match[1]
      .filter (path) =>
        !!path and path isnt 'compass'
      .map (path) =>
        if sysPath.extname(path) isnt ".#{@extension}"
          path + ".#{@extension}"
        else
          path
      .map (path) =>
        if path.charAt(0) is '/'
          sysPath.join @config.paths.root, path[1..]
        else
          sysPath.join parent, path
    process.nextTick =>
      callback null, dependencies
