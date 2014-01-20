var cp = require('child_process'), spawn = cp.spawn, exec = cp.exec;
var sysPath = require('path');
var progeny = require('progeny');
var libsass = require('node-sass');
var Promise = require('promise');
var os = require('os');

var isWindows = os.platform() === 'win32';
var compassRe = /compass/;
var sassRe = /\.sass$/;

var extend = function(object, source) {
  for (var key in source) object[key] = source[key];
  return object;
};

function SassCompiler(cfg) {
  if (cfg == null) cfg = {};
  this.rootPath = cfg.paths.root;
  this.optimize = cfg.optimize;
  this.config = (cfg.plugins && cfg.plugins.sass) || {};
  this.mode = this.config.mode;
  this.getDependencies = progeny({
    rootPath: this.rootPath
  });
  this.seekCompass = progeny({
    rootPath: this.rootPath,
    exclusion: ''
  });
  this.gem_home = this.config.gem_home;
  this.env = {};
  if (this.gem_home) {
    var env = extend({}, process.env);
    env.GEM_HOME = this.gem_home;
    this.env = {
      env: env
    };
    this._bin = this.gem_home + "/bin/" + this._bin;
    this._compass_bin = this.gem_home + "/bin/" + this._compass_bin;
  }
  this.bundler = this.config.useBundler;
  this.prefix = this.bundler ? 'bundle exec ' : '';
}

SassCompiler.prototype.brunchPlugin = true;
SassCompiler.prototype.type = 'stylesheet';
SassCompiler.prototype.extension = 'scss';
SassCompiler.prototype.pattern = /\.s[ac]ss$/;
SassCompiler.prototype._bin = isWindows ? 'sass.bat' : 'sass';
SassCompiler.prototype._compass_bin = isWindows ? 'compass.bat' : 'compass';

SassCompiler.prototype._checkRuby = function() {
  var prefix = this.prefix;
  var env = this.env;
  var sassCmd = this.prefix + this._bin + " --version";
  var compassCmd = this.prefix + this._compass_bin + " --version";

  var sassPromise = new Promise(function(resolve, reject) {
    exec(sassCmd, env, function(error) {
      if (error) {
        console.error("You need to have Sass on your system");
        console.error("Execute `gem install sass`");
        reject();
      } else {
        resolve();
      }
    });
  });
  var compassPromise = new Promise((function(resolve, reject) {
    exec(compassCmd, env, (function(error) {
      this.compass = !error;
      resolve();
    }).bind(this));
  }).bind(this));
  this.rubyPromise = Promise.all([sassPromise, compassPromise]);
};

SassCompiler.prototype._nativeCompile = function(data, path, callback) {
  var includePaths = [this.rootPath, sysPath.dirname(path)];
  if (this.config.options != null && this.config.options.includePaths != null) {
    includePaths.push.apply(includePaths, this.config.options.includePaths);
  }

  libsass.render({
    data: data,
    success: (function(css) {
      callback(null, css);
    }),
    error: (function(error) {
      callback(error);
    }),
    includePaths: includePaths,
    outputStyle: 'nested',
    sourceComments: !this.optimize
  });
};

SassCompiler.prototype._rubyCompile = function(data, path, callback) {
  if (this.rubyPromise == null) this._checkRuby();
  var result = '';
  var error = null;
  var cmd = [
    this._bin,
    '--stdin',
    '--load-path', this.rootPath,
    '--load-path', sysPath.dirname(path),
    '--no-cache'
  ];
  if (this.bundler) cmd.unshift('bundle', 'exec');

  this.rubyPromise.then((function() {
    var debugMode = this.config.debug, hasComments;
    if ((debugMode === 'comments' || debugMode === 'debug') && !this.optimize) {
      hasComments = this.config.debug === 'comments';
      cmd.push(hasComments ? '--line-comments' : '--debug-info');
    }

    if (!sassRe.test(path)) cmd.push('--scss');
    if (this.compass) cmd.push('--compass');
    if (this.config.options != null) cmd.push.apply(cmd, this.config.options);

    if (isWindows) {
      cmd = ['cmd', '/c', '"' + cmd[0] + '"'].concat(cmd.slice(1));
      this.env.windowsVerbatimArguments = true;
    }
    var sass = spawn(cmd[0], cmd.slice(1), this.env);
    sass.stdout.on('data', function(buffer) {
      result += buffer.toString();
    });
    sass.stderr.on('data', function(buffer) {
      if (error == null) error = '';
      error += buffer.toString();
    });
    sass.on('close', function(code) {
      callback(error, result);
    });
    if (sass.stdin.write(data)) {
      sass.stdin.end();
    } else {
      sass.stdin.on('drain', function() {
        sass.stdin.end();
      });
    }
  }).bind(this));
};

SassCompiler.prototype.compile = function(data, path, callback) {
  this.seekCompass(data, path, (function (err, imports) {
    if (err) callback(err);
    this.compass = imports.some(function (depPath){
      return compassRe.test(depPath);
    });
    var fileUsesRuby = sassRe.test(path) || this.compass;
    if (this.mode === 'ruby' || (!this.mode && fileUsesRuby)) {
      this._rubyCompile(data, path, callback);
    } else {
      this._nativeCompile(data, path, callback);
    }
  }).bind(this));
};

module.exports = SassCompiler;
