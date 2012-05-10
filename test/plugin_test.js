describe('Plugin', function() {
  var plugin;

  beforeEach(function() {
    plugin = new Plugin({paths: {root: '.'}});
  });

  it('should be an object', function() {
    expect(plugin).to.be.ok();
  });

  it('should has #compile method', function() {
    expect(plugin.compile).to.be.a(Function);
  });

  it('should compile and produce valid result for scss', function(done) {
    var content = '.test {\n  border-color: #fff; }\n';
    var expected = '.test {\n  border-color: #fff; }\n';

    plugin.compile(content, 'file.scss', function(error, data) {
      expect(error).not.to.be.ok();
      expect(data).to.equal(expected)
      done();
    });
  });
  
  it('should compile and produce valid result for sass', function(done) {
    var content = '.test\n  border-color: #fff';
    var expected = '.test {\n  border-color: white; }\n';

    plugin.compile(content, 'file.sass', function(error, data) {
      expect(error).not.to.be.ok();
      expect(data).to.equal(expected)
      done();
    });
  });
});
