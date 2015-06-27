var express = require('express'),
    http = require('http'),
    jade = require('jade'),
    async = require('async'),
    path = require('path'),
    logger = require('morgan'),
    fs = require('fs'),
    multer = require('multer'),
    FormData = require("form-data"),
    FileConverter = require ('./modules/FreeplaneConverter');

var options = processConfig();

var app = express();

var user;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(multer({
    inMemory: true
}))
.get('/files', ensureAuthenticated, function(request, response) {
        var req_options = {
                                method: 'GET',
                                host: options.storage.host,
                                port: options.storage.port,
                                path: '/files',
                                headers: request.headers
                            };
        var req = http.request(req_options, function(rightResponse) {
            rightResponse.on('data', function (chunk) {
               response.write(chunk);
            });
            rightResponse.on('end', function () {
                response.end();
            });

        }).on('error', function (error) {
            response.statusCode = 500;
            response.write(error.message);
            response.end();
            return;
        });
        req.end();
    })
    .get('/file/:id', ensureAuthenticated, function(request, response) {
        var retval = {};
        async.series(
            [ function (next) {
                getFileInfo(request.params.id, retval, next);
            },
            function (next) {
                var fileInfo = retval.result;
                if (!fileInfo.error &&
                    (fileInfo.owner === user.id
                    || user.id in fileInfo.viewers
                    || user.id in fileInfo.editors
                    || fileInfo.public === true)) {
                        getFileVersion(fileInfo.versions[fileInfo.versions.length-1],retval,next);
                } else if (!fileInfo.error) {
                    next ({statusCode: 401, message:'Unauthorized'});
                } else {
                    next ({statusCode: 500, message: fileInfo.error});
                }
            },
            function(next) {
                response.json(retval.result);
                response.end();
            }],
            function(error) {
                if (error) {
                    response.statusCode = error.statusCode;
                    response.write(error.message);
                    response.end();
                    return;
                }

            }
        )
    })
    .put   ('/change/:id', ensureAuthenticated, function(request, response) {
    })
    .post('/upload', ensureAuthenticated, function(request, response) {
        var retval = {};
        async.forEachOf(request.files,
            function (file, fileName, next) {
                if (!request.files.hasOwnProperty(fileName)) {
                    next();
                } else {
                    console.log("Received request to store file: " + file.originalname + " length:" + file.size);
                    async.series([
                        function (next2) {
                            try {
                                FileConverter.convert(file.buffer, retval, next2);
                            } catch (error) {
                                next2(error);
                            }
                        },
                        function (next2) {
                            try {
                                var form = new FormData();
                                form.append('fileName', file.originalname);
                                form.append('file', JSON.stringify(retval.rawmap));

                                var req_options = {
                                    method: 'POST',
                                    host: options.storage.host,
                                    port: options.storage.port,
                                    path: '/file/upload',
                                    headers: form.getHeaders()
                                };
                                req_options.headers.mindweb_user=JSON.stringify(user);
                                var store_req = http.request(req_options, function (conv_response) {
                                    var parts = [];

                                    conv_response.on('data', function (chunk) {
                                        parts.push(chunk);
                                    });

                                    conv_response.on('end', function () {
                                        retval.rawmap = JSON.parse(Buffer.concat(parts));
                                        next2();
                                    })
                                })
                                    .on('error', function (error) {
                                        next2(error);
                                    });
                                form.pipe(store_req);
                                store_req.end();
                            } catch (error) {
                                next2(error);
                            }
                        }
                    ], function(error) {
                        next(error);
                    });
                }
            },
            function (err) {
                if (err) {
                    response.status(500);
                    response.render('error', { error: err });
                } else {
                    response.json(retval);
                }
                response.end();
            }
        );
    })
    .use(
        function errorHandler(err, req, res, next) {
            res.status(500);
            res.render('error', { error: err });
    })
;

app.listen(options.port, function() {
    console.log("Listening on " + options.port);
});


function processConfig() {
    var rawConfig = fs.readFileSync(process.env['development'] ? 'config/config.local.json' : 'config/config.json');
    var config = rawConfig.toString();
    for (key in process.env) {
        var re = new RegExp('\\$\\{' + key + '\\}', 'g');
        config = config.replace(re, process.env[key]);
    }
    return JSON.parse(config);;
}

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if ('mindweb_user' in req.headers) {
        user = JSON.parse(req.headers.mindweb_user);
        return next();
    }
    res.status(401);
    res.statusMessage='The user has no authentication information';
    res.end();
}

function getFileInfo (fileId, retval, next) {
    // TODO: Fetch core file information from storage service
    var req_options = {
        method: 'GET',
        host: options.storage.host,
        port: options.storage.port,
        path: '/file/info/'+fileId,
        headers: {mindweb_user: JSON.stringify(user)}
    };
    var chunks = [];
    var req = http.request(req_options, function(rightResponse) {
        rightResponse.on('data', function (chunk) {
            chunks.push(chunk)
        });
        rightResponse.on('end', function () {
            if (rightResponse.statusCode==200){
                retval.result =  JSON.parse(Buffer.concat(chunks));
                next();
            } else {
                next ({statusCode:rightResponse.statusCode, message:rightResponse.statusMessage})
            }
        });

    }).on('error', function (error) {
        completed({statusCode:500, message:error.message})
    });
    req.end();
}

function getFileVersion (fileVersionId, retval, completed) {
    var req_options = {
        method: 'GET',
        host: options.storage.host,
        port: options.storage.port,
        path: '/fileversion/content/'+fileVersionId,
        headers: {mindweb_user: JSON.stringify(user)}
    };
    var chunks = [];
    var req = http.request(req_options, function(rightResponse) {
        rightResponse.on('data', function (chunk) {
            chunks.push(chunk)
        });
        rightResponse.on('end', function () {
            if (rightResponse.statusCode==200){
                retval.result =  JSON.parse(Buffer.concat(chunks));
                completed();
            } else {
                completed({statusCode:rightResponse.statusCode, message:rightResponse.statusMessage})
            }
        });

    }).on('error', function (error) {
        completed({statusCode:500, message:error.message})
    });
    req.end();
}

