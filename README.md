Relmeauth
=========

This is a very simple IndieAuth (or rel='me' auth) middleware (Connect) for Node.js.
The main design goal is to enable a dead simple auth inside any Connect-type application.

Install
-------

`npm install relmeauth`

Dependencies
------------

It requires that you use the bodyParser middleware, the cookieParser middleware (for the session).


Example/Usage
-------------

```javascript
var express = require('express');
var relme = require('./index.js');

var app = express();
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret: "A secret for the Sessions encryption"
}));
app.use(relme.middleware({})); // {} is for options. See below.

// Protect private resources like this.
app.get('/private', relme.authenticated ,function(req, res){
  res.end('This is a scret that you can now only if you're authentified.');
});

app.listen(8080)
```

Current providers include: [OStatus](http://status.net) sites, [Twitter](http://twitter.com), [Google](http://plus.google.com), [Github](http://github.com). If you want to support IndieAuth, make sure you support OAuth2, provide `rel=me` links on your profiles pages.

Test it in on ...

Customization
-------------

You can initialize the middleware by providing a configuration object. Options include
* __prefix__: the prefix for all the relmeauth urls. Default is `relmeauth`. Change it if it conflicts with your application.
* __authPage__: the page on which the user will be asked to submit his indieAuth url. The form must be of GET method and the
url provided' name must be `me`.
* __authErrorPage__: the page on which error messages will be displayed. The error message is accessible in response.authError

Example:

```javascript
app.use(relme.middleware({
  prefix: 'auth',
  authPage = function(req, res, next) {
    // Render whatever makes sense to render on the authPage. You can also redirect... etc.
  }
  authErrorPage = function(req, res, next) {
    // Render whatever makes sense to render on the authErrorPage
  }
}));
  ``

Thank you
---------

Special thanks go to [ciaranj](https://github.com/ciaranj) for his [node-auth](https://github.com/ciaranj/node-oauth) NPM, and praise goes to [jaredhanson](http://twitter.com/jaredhanson) for his willingness to make [passport](https://github.com/jaredhanson/passport) simpler to use!
