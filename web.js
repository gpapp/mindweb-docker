///<reference path='typings/tsd.d.ts' />
///<reference path='classes/classes.ts' />
///<reference path='modules/EditorService.ts' />
///<reference path='modules/FreeplaneConverterService.ts' />
///<reference path='modules/StorageService.ts' />
var http = require('http');
var async = require('async');
var path = require('path');
var fs = require('fs');
var logger = require('morgan');
var Multer = require('multer');
var express = require('express');
var bodyParser = require('body-parser');
var ServiceError = require('./classes/ServiceError');
// Services
var EditorService = require('./modules/EditorService');
var FreeplaneConverterService = require('./modules/FreeplaneConverterService');
var StorageService = require('./modules/StorageService');
var options = processConfig();
var app = express();
var upload = Multer({ inMemory: true });
var user;
var storageService = new StorageService(options.storage.host, options.storage.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app
    .get('/files', ensureAuthenticated, function (request, response) {
    var req_options = {
        method: 'GET',
        host: options.storage.host,
        port: options.storage.port,
        path: '/files',
        headers: request.headers
    };
    var req = http.request(req_options, function (rightResponse) {
        rightResponse.on('data', function (chunk) {
            response.write(chunk);
        });
        rightResponse.on('end', function () {
            response.end();
        });
    });
    req.on('error', function (error) {
        response.statusCode = 500;
        response.write(error.message);
        response.end();
    });
    req.end();
})
    .get('/file/:id', ensureAuthenticated, function (request, response) {
    async.waterfall([
        function (next) {
            storageService.getFileInfo(user, request.params.id, next);
        },
        function (result, next) {
            var fileInfo = result;
            if (!fileInfo.error && fileInfo.canView(user)) {
                var lastVersionId = fileInfo.versions[fileInfo.versions.length - 1];
                storageService.getFileVersion(user, lastVersionId, function (error, content) {
                    if (error) {
                        next(error);
                    }
                    next(null, content);
                });
            }
            else if (!fileInfo.error) {
                next(new ServiceError(401, 'Unauthorized'));
            }
            else {
                next(new ServiceError(500, fileInfo.error));
            }
        },
        function (fileContent, next) {
            response.json(fileContent);
            response.end();
            next();
        }], function (error) {
        if (error) {
            response.statusCode = error.statusCode;
            response.write(error.message);
            response.end();
        }
    });
})
    .put('/change/:id', ensureAuthenticated, bodyParser.json(), function (request, response) {
    var fileId = request.params.id;
    var actions = request.body.actions;
    async.waterfall([
        function (next) {
            storageService.getFileInfo(user, fileId, next);
        },
        function (fileInfo, next) {
            if (!fileInfo.error && fileInfo.canEdit(user)) {
                var fileVersionId = fileInfo.versions[fileInfo.versions.length - 1];
                storageService.getFileVersion(user, fileVersionId, function (error, fileVersion) {
                    if (error) {
                        return next(error);
                    }
                    next(null, fileVersionId, fileVersion.content);
                });
            }
            else if (!fileInfo.error) {
                next(new ServiceError(401, 'Unauthorized'));
            }
            else {
                next(new ServiceError(500, fileInfo.error));
            }
        },
        function (fileVersionId, fileContent, next) {
            async.each(actions, function (action, callback) {
                EditorService.applyAction(fileContent, action, callback);
            }, function (error) {
                if (error) {
                    console.error("Error applying action: " + error);
                }
                next(null, fileVersionId, fileContent);
            });
        },
        function (fileVersionId, fileContent, next) {
            storageService.saveFileVersion(user, fileVersionId, fileContent, next);
        }
    ], function (error) {
        if (error) {
            response.statusCode = error.statusCode;
            response.write(error.message);
        }
        else {
            response.statusCode = 200;
        }
        response.end();
    });
})
    .post('/upload', ensureAuthenticated, upload.array('file', 10), function (request, response) {
    async.forEachOf(request.files, function (file, index, next) {
        console.log("Received request to store file: " + file.originalname + " length:" + file.size);
        FreeplaneConverterService.convert(file.buffer, function (error, rawmap) {
            if (error) {
                next(error);
            }
            storageService.uploadFile(user, file.originalname, rawmap, next);
        });
    }, function (err) {
        if (err) {
            response.status(500);
            response.render('error', { error: err });
        }
        else {
            response.status(200);
        }
        response.end();
    });
})
    .
        use(function (err, req, res, next) {
    res.status(err.statusCode ? err.statusCode : 500);
    res.render('error', { "error": err });
    next();
});
app.listen(options.port, function () {
    console.log("Listening on " + options.port);
});
function processConfig() {
    var rawConfig = fs.readFileSync(process.env['development'] ? 'config/config.local.json' : 'config/config.json');
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
    next(new ServiceError(401, 'The user has no authentication information', "Authentication failed"));
}
//# sourceMappingURL=web.js.map