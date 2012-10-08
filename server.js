var express = require('express');
var relme = require('./index.js');

var app = express();
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  secret: "A secret for the Sessions encryption"
}));
app.use(relme.middleware({root: 'http://127.0.0.1:8080'}));

app.get('/private', relme.authenticated ,function(req, res){
  res.end('This is a scret that you can now only if youre authentified.');
});

app.listen(8080)

