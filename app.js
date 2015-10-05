require("babel/register");

var express = require('express');
var path = require('path');
var fs = require('fs');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

var ServiceError = require('./classes/ServiceError');

var routes = require('./routes/index');
var authRoute = require('./routes/auth');
var fileRoute = require('./routes/file');

var options = processConfig();

var cassandraOptions = {
    "contactPoints": [
        options.db.host
    ],
    "keyspace": "mindweb",
    "protocolOptions": {
        "port": options.db.port
    },
    "authProvider": {
        "username": "",
        "password": ""
    }
};

authRoute.setupDB(cassandraOptions);
fileRoute.setupDB(cassandraOptions);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
var CassandraStore = require("cassandra-store")(session);
var cassandraStore = new CassandraStore(cassandraOptions);
app.use(session({
    secret: 'J;SDUKLJDFMAP[M OWIO WRXD/L SDF;KZSDVKXCD;fAdslsd:fop$##o(we)tig]',
    name: 'mindweb_session',
    cookie: {secure: false},
    resave: false,
    saveUninitialized: true,
    store: cassandraStore
}));

app.use('/auth', authRoute);
app.use('/file', authRoute.authorizeMiddleware, fileRoute);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

function processConfig() {
    var rawConfig = fs.readFileSync('config/config.json');
    var config = rawConfig.toString();
    for (var key in process.env) {
        if (!process.env.hasOwnProperty(key)) {
            continue;
        }
        var re = new RegExp('\\$\\{' + key + '\\}', 'g');
        config = config.replace(re, process.env[key]);
    }
    return JSON.parse(config);
}


module.exports = app;
