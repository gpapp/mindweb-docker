///<reference path='../typings/tsd.d.ts' />
///<reference path='../classes/classes.ts' />
import http = require('http');
import FormData = require("form-data");

import FileVersion = require("../classes/FileVersion");
import FileContent = require("../classes/FileContent");
import FileInfo = require("../classes/FileInfo");
import User = require("../classes/User");

class StorageService {
    private host:String;
    private port:number;

    constructor(host:String, port:number) {
        this.host = host;
        this.port = port;
    }

    public uploadFile(user:User, fileName:string, rawmap:FileContent, callback) {
        var myForm:FormData = new FormData();
        myForm.append('fileName', fileName);
        myForm.append('file', JSON.stringify(rawmap));
        myForm.submit(
            {
                host: this.host,
                port: this.port,
                path: '/file/upload',
                headers: {mindweb_user: JSON.stringify(user)}
            },
            function (error:any, response):void {
                if (error) {
                    callback({statusCode: 500, message: error})
                } else if (response.statusCode == 200) {
                    callback();
                } else {
                    callback({statusCode: response.statusCode, message: response.statusMessage})
                }
            }
        );
    }

    public getFileInfo(user:User, fileId:String, next) {
        // TODO: Fetch core file information from storage service
        var req_options = {
            method: 'GET',
            host: this.host,
            port: this.port,
            path: '/file/info/' + fileId,
            headers: {mindweb_user: JSON.stringify(user)}
        };
        var chunks = [];
        var req = http.request(req_options, function (rightResponse:http.ClientResponse) {
            rightResponse.on('data', function (chunk) {
                chunks.push(chunk)
            });
            rightResponse.on('end', function () {
                if (rightResponse.statusCode == 200) {
                    next(null, new FileInfo(JSON.parse(Buffer.concat(chunks))));
                } else {
                    next({statusCode: rightResponse.statusCode, message: rightResponse.statusMessage})
                }
            });

        });
        req.on('error', function (error) {
            next({statusCode: 500, message: error.message})
        });
        req.end();
    }

    public getFileVersion(user:User, fileVersionId:String, completed) {
        var req_options = {
            method: 'GET',
            host: this.host,
            port: this.port,
            path: '/fileversion/content/' + fileVersionId,
            headers: {mindweb_user: JSON.stringify(user)}
        };
        var chunks = [];
        var req = http.request(req_options, function (rightResponse) {
            rightResponse.on('data', function (chunk) {
                chunks.push(chunk)
            });
            rightResponse.on('end', function () {
                if (rightResponse.statusCode == 200) {
                    completed(null, new FileVersion(Buffer.concat(chunks)));
                } else {
                    completed({statusCode: rightResponse.statusCode, message: rightResponse.statusMessage})
                }
            });

        });
        req.on('error', function (error) {
            completed({statusCode: 500, message: error.message})
        });
        req.end();
    }

    public saveFileVersion(user:User, fileVersionId:string, content:FileContent, callback) {
        var form:FormData = new FormData();
        form.append('content', JSON.stringify(content));

        form.submit(
            {
                host: this.host,
                port: this.port,
                path: '/fileversion/content/' + fileVersionId,
                headers: {mindweb_user: JSON.stringify(user)}
            },
            function (error, response) {
                if (error) {
                    callback({statusCode: 500, message: error})
                } else if (response.statusCode == 200) {
                    callback();
                } else {
                    callback({statusCode: response.statusCode, message: response.statusMessage})
                }
            }
        );
    }
}
export = StorageService;