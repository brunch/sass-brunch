{spawn, exec} = require 'child_process'
sysPath = require 'path'

module.exports = class SassCompiler
  brunchPlugin: yes
  type: 'stylesheet'
  extension: 'scss'
  pattern: /\.s[ac]ss$/
  _dependencyRegExp: /@import ['"](.*)['"]/g
  sassExe = 'sass'
  if global.process.platform is 'win32'
    sassExe = 'sass.bat'

  constructor: (@config) ->
    exec sassExe + ' --version', (error, stdout, stderr) =>
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
    options.push '--compass' if @compass
    options.push '--scss' if /\.scss$/.test path
    execute = =>
      sass = spawn sassExe, options
      sass.stdout.on 'data', (buffer) ->
        result += buffer.toString()
      sass.stderr.on 'data', (buffer) ->
        error ?= ''
        error += buffer.toString()
      sass.on 'exit', (code) ->
        callback error, result
      sass.stdin.end data

    delay = =>
      if @compass?
        execute()
      else
        setTimeout delay, 100
    do delay

  getDependencies: (data, path, callback) =>
    paths = data.match(@_dependencyRegExp) or []
    parent = sysPath.dirname path
    dependencies = paths
      .map (path) =>
        res = @_dependencyRegExp.exec(path)
        @_dependencyRegExp.lastIndex = 0
        (res or [])[1]
      .filter((path) => !!path and path.indexOf('compass') isnt 0)
      .map (path) =>
        path = path.replace(/(\w+\.|\w+$)/, '_$1')
        if sysPath.extname(path) isnt ".#{@extension}"
          "#{path}.#{@extension}"
        else
          path
      .map(sysPath.join.bind(null, parent))
    process.nextTick =>
      callback null, dependencies
