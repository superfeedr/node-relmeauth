var url = require('url');
var querystring = require('querystring');
var OAuth2 = require('oauth').OAuth2;

var config = {};
var domain = 'google.com';
var oauth = null;

exports.configure = function configure(c) {
  config = c;
  oauth = new OAuth2(config.id, config.secret, '', 'https://accounts.google.com/o/oauth2/auth', 'https://accounts.google.com/o/oauth2/token');
}

exports.getUserUrl = function(base, authCode, cb) {
  oauth.getOAuthAccessToken(authCode, {grant_type: 'authorization_code', scope: '', redirect_uri: [base, domain].join('/')}, function(err, accessToken, refreshToken, results) {
    if(err || !accessToken) {
      cb(new Error('NoToken'), null);
    }
    else {
      oauth.get('https://www.googleapis.com/oauth2/v2/userinfo', accessToken, function(err, result) {
        if(err || !result) {
          cb(new Error('NoInfo'), null);
        }
        else {
          cb(null, JSON.parse(result).link);
        }
      });
    }
  });
}

exports.getRedirectUrl = function(base) {
  var getRequestTokenUrl = "https://accounts.google.com/o/oauth2/auth?";
  var params = {
    response_type: 'code',
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/userinfo.profile',
    redirect_uri: [base, domain].join('/')
  }
  var redirectUrl = oauth.getAuthorizeUrl(params);
  return redirectUrl
}

exports.domain = domain;
