var url = require('url');
var querystring = require('querystring');
var OAuth2 = require('oauth').OAuth2;

var domain = 'github.com';
var oauth = null;

exports.configure = function configure(config) {
  oauth = new OAuth2(config.id, config.secret, '', 'https://github.com/login/oauth/authorize', ' https://github.com/login/oauth/access_token');
}

exports.getUserUrl = function(base, authCode, cb) {
  oauth.getOAuthAccessToken(authCode, {}, function(err, accessToken, refreshToken, results) {
    if(err || !accessToken) {
      cb(new Error('NoToken'), null);
    }
    else {
      oauth.get('https://api.github.com/user', accessToken, function(err, result) {
        if(err || !result) {
          cb(new Error('NoInfo'), null);
        }
        else {
          cb(null, JSON.parse(result).html_url);
        }
      });
    }
  });
}

exports.getRedirectUrl = function(base) {
  var params = {
    redirect_uri: [base, domain].join('/')
  }
  var redirectUrl = oauth.getAuthorizeUrl(params);
  return redirectUrl
}

exports.domain = domain;
