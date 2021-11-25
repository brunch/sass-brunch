## sass-brunch [![Build Status](https://travis-ci.org/brunch/sass-brunch.svg?branch=master)](https://travis-ci.org/brunch/sass-brunch)

Adds Sass support to [Brunch](https://brunch.io).

## Usage
Install the plugin via npm with `npm install -S sass-brunch`.

### Options

Set additional include paths:
```javascript
includePaths: ['node_modules/foundation/scss']
```

Use libsass [experimental custom functions](https://github.com/sass/node-sass#functions--v300---experimental):

```javascript
var types = require('node-sass').types
module.exports = {
  plugins: {
    sass: {
      mode: 'native', // custom functions are only supported in 'native' mode
      functions: {
        sin: function(val) { types.Number(Math.sin(val.getValue())) },
        cos: function(val) { types.Number(Math.cos(val.getValue())) },
        tan: function(val) { types.Number(Math.tan(val.getValue())) }
      }
    }
  }
}
```

### CSS Modules
Starting Brunch `2.6.0`, you can use CSS Modules with css-brunch. To enable it, change your config to:

```javascript
module.exports = {
  // ...
  plugins: {
    sass: {
      modules: true
    }
  }
};
```

You can also pass options directly to
[postcss-modules](https://github.com/css-modules/postcss-modules):

```javascript
generateScopedName: '[name]__[local]___[hash:base64:5]'
```

Then, author your styles like you normally would:

```scss
.title {
  font-size: 32px;
}
```

And reference CSS class names by requiring the specific style into your javascript:

```javascript
var style = require('./title.scss');

<h1 className={style.title}>Yo</h1>
```

Note: enabling `cssModules` does so for every stylesheet in your project, even the files you don't require will be transformed into CSS modules (aka will have obfuscated class names, like turn `.title` into `._title_fdphn_1`).

You must use the ignore option to specifically opt out of files or directories where you don't want to use cssModules.

The ignore option takes an array of matches. [Anymatch](https://github.com/es128/anymatch) is used to handle the matching. See the [anymatch documentation](https://github.com/es128/anymatch) for more information.
```javascript
module.exports = {
  // ...
  plugins: {
    sass: {
      modules: {
        ignore: [/file\.css/, /some\/path\/to\/ignore/]
      }
    }
  }
};
```

## License

The MIT License (MIT)
