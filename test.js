var expect = require('chai').expect;
var Plugin = require('./');
var sysPath = require('path');
var fs = require('fs');

describe('sass-brunch plugin', function() {
  var plugin;
  var fileName = 'app/styles/style.scss';

  beforeEach(function() {
    var config = Object.freeze({
      paths: {root: '.'},
      optimize: true
      // ,plugins: {
      //   sass: {
      //     mode: 'ruby'
      //   }
      // }
    });
    plugin = new Plugin(config);
  });

  it('should be an object', function() {
    expect(plugin).to.be.ok;
  });

  it('should has #compile method', function() {
    expect(plugin.compile).to.be.an.instanceof(Function);
  });

  it('should compile and produce valid result for scss', function(done) {
    var content = '$a: 5px; .test {\n  border-radius: $a; }\n';
    var expected = '.test {\n  border-radius: 5px; }\n';

    plugin.compile(content, 'file.scss', function(error, data) {
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected);
      done();
    });
  });

  it('should compile and produce valid result for sass', function(done) {
    var content = '$a: 5px\n.test\n  border-radius: $a';
    var expected = '.test {\n  border-radius: 5px; }\n';

    plugin.compile(content, 'file.sass', function(error, data) {
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected);
      done();
    });
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
    plugin.compile(content, 'file.scss', function(error, data) {
      expect(error).not.to.be.ok;
      expect(data).to.equal(expected)
      done();
    });
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
      plugin.compile(content, 'no-content.scss', function(error, data) {
          expect(error).not.to.be.ok;
          expect(data).to.equal(expected);
          done();
      });
  });
});
