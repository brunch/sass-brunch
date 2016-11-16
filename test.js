var expect = require('chai').expect;
var Plugin = require('./');
var sysPath = require('path');
var fs = require('fs');

describe('sass-brunch plugin using', function () {
  runTests.call(this, {
    mode: 'native',
    compress: function (s) { return s.replace(/[\s;]*/g, '') + '\n\n'; }
  });

  if (process.env.TRAVIS !== 'true') {
    runTests.call(this, {mode: 'ruby'});
  }
});

function runTests(o) {
  var mode = o.mode;
  var compress = o.compress || function (s) { return s; };

  describe(mode, function() {
    var plugin;
    var config;
    var fileName = 'app/styles/style.scss';

    beforeEach(function() {
      config = Object.freeze({
        paths: {root: '.'},
        optimize: true,
        plugins: {
          sass: {
            mode: mode
          }
        }
      });
      plugin = new Plugin(config);
    });

    it('should be an object', function() {
      expect(plugin).to.be.ok;
    });

    it('should have a #compile method', function() {
      expect(plugin.compile).to.be.an.instanceof(Function);
    });

    it('should compile and produce valid result for scss', function(done) {
      var content = '$a: 5px; .test {\n  border-radius: $a; }\n';
      var expected = '.test {\n  border-radius: 5px; }\n';

      plugin.compile({data: content, path: 'file.scss'}).then(data => {
        expect(data.data).to.equal(compress(expected));
        done();
      }, error => expect(error).not.to.be.ok);
    });

    it('should default to five decimals of precision for scss', function(done) {
      var content = '$a: 5px; .test {\n  border-radius: $a/3; }\n';
      var expected = '1.66667px';

      plugin.compile({data: content, path: 'file.scss'}).then(data => {
        expect(data.data).to.contain(expected);
        done();
      }, error => expect(error).not.to.be.ok);
    });

    it('should calculate to the indicated level of precision for scss', function(done) {
      var content = '$a: 5px; .test {\n  border-radius: $a/3; }\n';
      var expected = '1.66666667px';
      plugin = new Plugin({
        paths: config.paths,
        optimize: config.optimize,
        plugins: {
          sass: {
            precision: 8,
            mode: mode
          }
        }
      });

      plugin.compile({data: content, path: 'file.scss'}).then(data => {
        expect(data.data).to.contain(expected);
        done();
      }, error => expect(error).not.to.be.ok);
    });

    it('should compile and produce valid result for sass', function(done) {
      var content = '$a: 5px\n.test\n  border-radius: $a';
      var expected = '.test {\n  border-radius: 5px; }\n';

      plugin.compile({data: content, path: 'file.sass'}).then(data => {
        expect(data.data).to.equal(compress(expected));
        done();
      }, error => expect(error).not.to.be.ok);
    });

    it('should default to five decimals of precision for sass', function(done) {
      var content = '$a: 5px\n.test\n  border-radius: $a/3';
      var expected = '1.66667px';

      plugin.compile({data: content, path: 'file.sass'}).then(data => {
        expect(data.data).to.contain(expected);
        done();
      }, error => expect(error).not.to.be.ok);
    });

    it('should calculate to the indicated level of precision for sass', function(done) {
      var content = '$a: 5px\n.test\n  border-radius: $a/3';
      var expected = '1.66666667px';
      plugin = new Plugin({
        paths: config.paths,
        optimize: config.optimize,
        plugins: {
          sass: {
            precision: 8,
            mode: mode
          }
        }
      });

      plugin.compile({data: content, path: 'file.sass'}).then(data => {
        expect(data.data).to.contain(expected);
        done();
      }, error => expect(error).not.to.be.ok);
    });

    it('should output valid deps', function(done) {
      var content = "\
      @import \'valid1\';\n\
      @import \'../../vendor/styles/valid3\';\n\
      ";

      fs.mkdirSync('app');
      fs.mkdirSync('vendor');
      fs.mkdirSync(sysPath.join('app', 'styles'));
      fs.mkdirSync(sysPath.join('vendor', 'styles'));
      fs.writeFileSync(sysPath.join('app', 'styles', '_valid1.sass'), '@import \"./valid2.scss\";\n');
      fs.writeFileSync(sysPath.join('app', 'styles', 'valid2.scss'), '\n');
      fs.writeFileSync(sysPath.join('vendor', 'styles', '_valid3.scss'), '\n');

      var expected = [
        sysPath.join('app', 'styles', '_valid1.sass'),
        sysPath.join('app', 'styles', 'valid2.scss'),
        sysPath.join('vendor', 'styles', '_valid3.scss')
      ];

      plugin.getDependencies(content, fileName, function(error, dependencies) {
        fs.unlinkSync(sysPath.join('app', 'styles', '_valid1.sass'));
        fs.unlinkSync(sysPath.join('app', 'styles', 'valid2.scss'));
        fs.unlinkSync(sysPath.join('vendor', 'styles', '_valid3.scss'));
        fs.rmdirSync(sysPath.join('app', 'styles'));
        fs.rmdirSync(sysPath.join('vendor', 'styles'));
        fs.rmdirSync('app');
        fs.rmdirSync('vendor');
        expect(error).not.to.be.ok;
        expect(dependencies.length).to.eql(expected.length);
        expected.forEach(function (item){
          expect(dependencies.indexOf(item)).to.be.greaterThan(-1);
        });
        done();
      });
    });

    it('should return empty result for empty source', function(done) {
      var content = '   \t\n';
      var expected = '';
      plugin.compile({data: content, path: 'file.scss'}).then(data => {
        expect(data.data).to.equal(expected)
        done();
      }, error => expect(error).not.to.be.ok);
    });

    it('should save without error', function(done) {
      var content = '$var: () !default;' +
        '@function test($value) {\n' +
        '\t@if index($var, $value) {\n' +
        '\t\t@return false;' +
        '\t}' +
        '\t$var: append($var, $value) !global;\n' +
        '\t@return true;' +
        '}';
        var expected = '';
        plugin.compile({data: content, path: 'no-content.scss'}).then(data => {
          expect(data.data.trim()).to.equal(expected);
          done();
        }, error => expect(error).not.to.be.ok);
    });

  });
};


describe('sass-brunch plugin using native', function() {
  var compress = function (s) { return s.replace(/[\s;]*/g, '') + '\n\n'; };
  describe('with experimental custom functions', function() {

    it('should invoke the functions for scss', function(done) {
      var config = Object.freeze({
        paths: {root: '.'},
        optimize: true,
        plugins: {
          sass: {
            mode: 'native',
            functions: { pow: (val, exp) => require('node-sass').types.Number(Math.pow(val.getValue(), exp.getValue()), val.getUnit()) }
          }
        }
      });
      var plugin = new Plugin(config);

      var content = '.test {\n  border-radius: pow(2px,10); }\n';
      var expected = '.test {\n  border-radius: 1024px; }\n';

      plugin.compile({data: content, path: 'file.scss'}).then(data => {
        expect(data.data).to.equal(compress(expected));
        done();
      }, error => expect(error).not.to.be.ok)
      .catch( (err) => done(err) );
    });

    it('should invoke the functions for sass', function(done) {
      var config = Object.freeze({
        paths: {root: '.'},
        optimize: true,
        plugins: {
          sass: {
            mode: 'native',
            functions: { pow: (val, exp) => require('node-sass').types.Number(Math.pow(val.getValue(), exp.getValue()), val.getUnit()) }
          }
        }
      });
      var plugin = new Plugin(config);

      var content = '.test \n  border-radius: pow(2px,10);\n';
      var expected = '.test {\n  border-radius: 1024px; }\n';

      plugin.compile({data: content, path: 'file.sass'}).then(data => {
        expect(data.data).to.equal(compress(expected));
        done();
      }, error => expect(error).not.to.be.ok)
      .catch( (err) => done(err) );
    });

  });
});
