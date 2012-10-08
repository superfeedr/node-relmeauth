var url = require('url');
var querystring =  require('querystring');
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
var google = require('./strategies/google.js');
var github = require('./strategies/github.js');

var authProviders = {};
authProviders[google.domain] = google;
authProviders[github.domain] = github;

var configuration = {
  prefix: 'relmeauth',
  root: 'http://127.0.0.1:8080'
};

/*
  Default Error Page
*/
configuration.authErrorPage = function authErrorPage(req, res, next) {
  res.writeHead(400,  {'Content-Type': 'text/html'});
  res.write(req.errorMessage);
  res.end();
}

/*
  Default Auth Page.
*/
configuration.authPage = function authPage(req, res, next) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write('<form method="get"><label>Your indie url</label><input name="me" /><input type="submit" /></form>');
  res.end();
}


/*
  Authenticates against the OAuth2 provider
*/
function authenticate(provider, req, res, next) {
  var redirectUrl = provider.getRedirectUrl([configuration.root, configuration.prefix, 'oauth'].join('/'));
  res.writeHead(302, {'Location': redirectUrl});
  res.end();
}

/*
  Checks whether a link as a rel=me back to the first argument and if it is a supported provider
*/
function checkLink(me, link, cb) {
  var otherme = url.parse(link);
  var provider = null;
  getRelMeLinks(otherme, function(error, relMeLinks){
    if(error || !relMeLinks) {
      cb(error, null)
    }
    else {
      relMeLinks.forEach(function(l) {
        if(url.format(url.parse(l)) === url.format(me) && !provider) {
          provider = authProviders[otherme.hostname.split('.').slice(-2).join(".")];
        }
      });
    }
    cb(null, provider);
  });
}

/*
  Checks a list of links in a synchronous way.
*/
function checkLinks(me, relMeLinks, req, res, next) {
  var link = relMeLinks.pop();
  if(link) {
    checkLink(me, link, function(err, provider) {
      if(err || !provider) {
        checkLinks(me, relMeLinks, req, res, next);
      }
      else {
        req.session.indieAuthChecking = link;
        req.session.indieAuthTestNext = relMeLinks;
        authenticate(provider, req, res, next);
      }
    })
  }
  else {
    req.errorMessage = 'We could not authenticate with any of you rel=me links';
    configuration.authErrorPage(req, res, next);
  }
}

/*
  Lists all the rel=me links in a page
*/
function getRelMeLinks(uri, cb) {
  request({uri: uri}, function(error, response, body) {
    if (!error) {
      var $ = cheerio.load(body);
      var relMeLinks = _.map(_.filter($('a').toArray(), function(link) { return link.attribs.rel && link.attribs.rel.split(' ').indexOf('me') >= 0; }), function(l) { return l.attribs.href });
      cb(null, relMeLinks);
    }
    else {
      cb(error, null);
    }
  });
}

/*
  This is the 'main' middlware call. Proceeds to the next if the user was authenticated.
  Redirects the user to authenication if not.
*/
exports.authenticated = function(req, res, next) {
  if(req.session.relMeAuthed) {
    next();
  }
  else {
    req.session.indieAuthOrigin = req.url;
    res.writeHead(302, {'Location': configuration.prefix});
    res.end();
  }
}

/*
  This is the middleware.
*/
exports.middleware = function(config) {
  if(config) {
    for(var c in config) {
      if(c !== 'providers') {
        configuration[c] = config[c];
      }
      else {
        for(var provider in config['providers']) {
          if(authProviders[provider]) {
            authProviders[provider].configure(config['providers'][provider]);
          }
        }
      }
    }
  }

  return function(req, res, next) {
    req.session.indieAuth = {};
    if(new RegExp(['\\/', configuration.prefix, '$'].join('')).test(req.url)) {
      configuration.authPage(req, res, next);
    }
    else if(new RegExp(['\\/', configuration.prefix, '\\?'].join('')).test(req.url)) {
      var uri = url.parse(req.url);
      var query = querystring.parse(uri.query)
      if(!query.me || query.me === '') {
        res.writeHead(302, {'Location': configuration.prefix});
        res.end();
      }
      else {
        var me = query.me;
        if(!/https?:\/\//.test(query.me)) {
          me = ['http://', query.me].join('');
        }
        var me = url.parse(me);
        if(authProviders[me.hostname]) {
          req.session.indieAuthChecking = url.format(me);
          req.session.indieAuthTestNext = [];
          authenticate(authProviders[me.hostname], req, res, next);
        }
        else {
          getRelMeLinks(me, function(err, relMeLinks) {
            if(err) {
              req.errorMessage = ['Error', err, 'when extracting rel=me links from', url.format(me)].join(' ');
              configuration.authErrorPage(req, res, next);
            }else {
              checkLinks(me, relMeLinks, req, res, next);
            }
          });
        }
      }
    }
    else if(new RegExp(['\\/', configuration.prefix, '\\/oauth\\/(.*)\\?.*'].join('')).test(req.url)) {
      var uri = url.parse(req.url);
      var params = querystring.parse(uri.query);
      authProviders[RegExp.$1].getUserUrl([configuration.root, configuration.prefix, 'oauth'].join('/'), params.code ,function(error, profileUrl) {
        if(error) {
          req.errorMessage = ['We could not get authentication from',RegExp.$1].join(' ');
          configuration.authErrorPage(req, res, next);
        }
        else {
          if(req.session.indieAuthChecking === profileUrl) {
            req.session.relMeAuthed = true;
            req.session.relMeAuthedUrl = profileUrl;
            res.writeHead(302, {'Location': req.session.indieAuthOrigin});
            res.end();
          }
          else {
            req.errorMessage = 'Looks like you are not the person you claim to be!';
            configuration.authErrorPage(req, res, next);
          }
        }
      });
    }
    else {
      next();
    }
  }
};
