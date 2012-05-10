{spawn} = require 'child_process'
sysPath = require 'path'

module.exports = class SassCompiler
  brunchPlugin: yes
  type: 'stylesheet'
  extension: 'scss'
  pattern: /\.s[ac]ss$/
  _dependencyRegExp: /@import ['"](.*)['"]/g

  constructor: (@config) ->
    return

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
    sass = spawn 'sass', options
    sass.stdin.end data
    sass.stdout.on 'data', (stdout) ->
      result += stdout.toString()
    sass.stderr.on 'data', (stderr) ->
      error ?= ''
      error += stderr.toString()
    sass.on 'exit', (code) ->
      callback error, result

  getDependencies: (data, path, callback) =>
    paths = data.match(@_dependencyRegExp) or []
    parent = sysPath.dirname path
    dependencies = paths
      .map (path) =>
        res = @_dependencyRegExp.exec(path)
        @_dependencyRegExp.lastIndex = 0
        (res or [])[1]
      .map (path) =>
        path = path.replace(/(\w+\.|\w+$)/, '_$1')
        if sysPath.extname(path) isnt ".#{@extension}"
          "#{path}.#{@extension}"
        else
          path
      .map(sysPath.join.bind(null, parent))
    process.nextTick =>
      callback null, dependencies
