var cp = require('child_process'), spawn = cp.spawn, exec = cp.exec;
var sysPath = require('path');
var progeny = require('progeny');
var libsass = require('node-sass');
var Promise = require('promise');
var os = require('os');
var util = require('util');

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
  if (this.config.options != null && this.config.options.includePaths != null) {
    this.includePaths = this.config.options.includePaths;
  }
  this.getDependencies = progeny({
    rootPath: this.rootPath,
    altPaths: this.includePaths,
    reverseArgs: true
  });
  this.seekCompass = progeny({
    rootPath: this.rootPath,
    exclusion: '',
    potentialDeps: true
  });
}

SassCompiler.prototype.brunchPlugin = true;
SassCompiler.prototype.type = 'stylesheet';
SassCompiler.prototype.extension = 'scss';
SassCompiler.prototype.pattern = /\.scss$/;

SassCompiler.prototype._getIncludePaths = function(path) {
  var includePaths = [this.rootPath, sysPath.dirname(path)];
  if (Array.isArray(this.includePaths)) {
    includePaths = includePaths.concat(this.includePaths);
  }
  return includePaths;
};

SassCompiler.prototype._compile = function(source, callback) {
  libsass.render({
      file: source.path,
      data: source.data,
      includePaths: this._getIncludePaths(source.path),
      outputStyle: (this.optimize ? "nested" : 'compressed'),
      sourceComments: !this.optimize
    },
    function(error, result) {
      if (error) {
        callback(error.message || util.inspect(error));
      } else {
        callback(null, result.css.toString());
      }
    });
};

SassCompiler.prototype.compile = function(data, path, callback) {
  // skip empty source files
  if (!data.trim().length) return callback(null, '');

  this.seekCompass(path, data, (function (err, imports) {
    if (err) callback(err);

    var source = {
      data: data,
      path: path
    };

    this._compile(source, callback);
    
  }).bind(this));
};

module.exports = SassCompiler;
