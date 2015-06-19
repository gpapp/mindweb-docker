var express = require('express'),
    http = require('http'),
    async = require('async'),
    logger = require('morgan')
    fs = require('fs'),
    multer = require('multer'),
    FormData = require("form-data");


var rawConfig = fs.readFileSync(process.env['DEV'] ? 'config/config.json.leaf' : 'config/config.json');
var config = rawConfig.toString();
for (key in process.env) {
    var re = new RegExp('\\$\\{' + key + '\\}', 'g');
    config = config.replace(re, process.env[key]);
}

var options = JSON.parse(config);

var app = express();

var user;

app
.use(multer({
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
            response.statusCode='500';
            response.write(error);
            response.end();
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
                var cleanupContent = JSON.parse(retval.result.content);
                renameChildrenToNodes(cleanupContent);
                buildMarkdownContent(cleanupContent);
                retval.result.content=JSON.stringify(cleanupContent);
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
                                var form = new FormData();
                                form.append('file', file.buffer);

                                var req_options = {
                                    method: 'POST',
                                    host: options.converter.host,
                                    port: options.converter.port,
                                    path: options.converter.path,
                                    headers: form.getHeaders()
                                };
                                var conv_req = http.request(req_options, function (conv_response) {
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
                                form.pipe(conv_req);
                                conv_req.end();
                            } catch (error) {
                                next(error);
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
                                next(error);
                            }
                        }
                    ], function(error) {
                        next(error);
                    });
                }
            },
            function (err) {
                if (err) {
                    response.statusCode = 500;
                    response.json(err);
                } else {
                    response.json(retval);
                }
                response.end();
            }
        );
    })
;

app.listen(options.port, function() {
    console.log("Listening on " + options.port);
});

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
    res.statusCode = 401;
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

function renameChildrenToNodes(node) {
    if (node.children && typeof node.children != "function") {
        node.nodes = node.children;
        delete node.children;
        for (var i = 0, tot = node.nodes.length; i < tot; i++) {
            renameChildrenToNodes(node.nodes[i]);
        }
    }
}

var urlPattern = /(^|[\s\n]|<br\/?>)((?:https?|ftp):\/\/[\-A-Z0-9+\u0026\u2019@#\/%?=()~_|!:,.;]*[\-A-Z0-9+\u0026@#\/%=~()_|])/gi;
function buildMarkdownContent(node){
    if(node.attributes) {
        node.nodeMarkdown = node.attributes.TEXT;
    }
    if (node.nodes){
        node.nodes.forEach(function(n) {
            node.detailMarkdown = markdown;
            node.noteMarkdown = markdown;
            if(n.name === 'richcontent') {
                var markdown = buildMarkdownContentForNode(n.nodes);
                if (n.attributes.TYPE === 'NODE') {
                    node.nodeMarkdown = markdown;
                }
                else if (n.attributes.TYPE === 'DETAILS') {
                    node.detailMarkdown = markdown;
                }
                else if (n.attributes.TYPE === 'NOTE') {
                    node.noteMarkdown = markdown;
                }
            } else {
                buildMarkdownContent(n);
            }
        });
    }
}

function buildMarkdownContentForNode(nodes){
    var retval = '';
    nodes.forEach(function(n) {
        if(n.name === 'p') {
            if (n.value) {
                retval += n.value.trim().replace(urlPattern, '$1[$2]($2)');
            }
            retval += '\n\n';
        }
        if (n.nodes) {
            retval += buildMarkdownContentForNode(n.nodes);
        }
    });
    return retval;
}