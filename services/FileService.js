import async from 'async';

import File from '../classes/File';
import FileDAO from '../dao/File';
import FileVersionDAO from '../dao/FileVersion';

var Uuid = require('cassandra-driver').types.Uuid;

export default class FileService {

    constructor(connection) {
        this.file = new FileDAO(connection);
        this.fileVersion = new FileVersionDAO(connection);
    }

    getFiles(userId, callback) {
        this.file.getFiles(userId, function (error, result) {
            if (error) {
                return callback(error, null);
            }
            var retval = new Array(result.rows.length);
            for (var i = 0; i < result.rows.length; i++) {
                var row = result.rows[i];
                retval[i] = new File(row.id, row.name, row.owner, row.viewers, row.editors, row.isPublic, row.versions);
            }
            callback(null, retval);
        });
    }

    getFile(fileId, callback) {
        this.file.getFile(fileId, function (error, result) {
            if (error) {
                return callback(error, null);
            }
            var row = result.first();
            if (row == null) {
                return callback('No such file version by that id', null);
            }
            callback(null, new File(row.id, row.name, row.owner, row.viewers, row.editors, row.public, row.versions));
        });
    }

    deleteFile(fileId, callback) {
        var fileLocal = this.file;
        var fileVersionLocal = this.fileVersion;
        fileLocal.getFile(fileId, function (error, result) {
            if (error)
                return callback(error);
            if (result.rows.length > 0) {
                async.each(result.rows[0].versions, function (fileVersionId, next) {
                    fileVersionLocal.deleteById(fileVersionId, function () {
                        next();
                    });
                }, function (error) {
                    if (error) {
                        return callback(error);
                    }
                    fileLocal.deleteById(fileId, function (error) {
                        if (error) {
                            return callback(error);
                        }
                        callback(null, 'OK');
                    });
                });
            }
            else {
                callback('FileService not found', null);
            }
        });
    }

    renameFile(fileId, newFileName, callback) {
        var fileLocal = this.file;
        fileLocal.renameById(fileId, newFileName, function (error) {
            if (error) {
                return callback(error);
            }
            callback(null, 'OK');
        });
    }

    getFileVersion(fileVersionId, callback) {
        this.fileVersion.getContent(fileVersionId, function (error, result) {
            if (error) {
                return callback(error, null);
            }
            var row = result.first();
            if (row != null) {
                callback(null, {version: row.version, content: row.content});
            }
            else {
                callback('No such file version by that id');
            }
        });
    }

    createNewVersion(fileName, userId, content, callback) {
        var fileLocal = this.file;
        var fileVersionLocal = this.fileVersion;
        async.waterfall([
            function (next) {
                fileLocal.getFileByUserAndName(userId, fileName, function (error, result) {
                    var fileId;
                    var versions;
                    if (error)
                        return next(error);
                    if (result.rows.length > 0) {
                        fileId = result.rows[0].id;
                        versions = result.rows[0].versions;
                    }
                    else {
                        fileId = Uuid.random();
                        versions = [];
                    }
                    next(null, fileId, versions);
                });
            },
            function (fileId, versions, seriesCallback) {
                var newFileVersionId = Uuid.random();
                if (versions.length > 0) {
                    var oldFileVersionId = versions[0];
                    fileVersionLocal.getContent(oldFileVersionId, function (error, result) {
                        var row = result.first();
                        if (content == row.content) {
                            seriesCallback(null, false, fileId, null);
                        }
                        else {
                            fileVersionLocal.createNewVersion(newFileVersionId, versions.length + 1, content, function (error) {
                                if (error) {
                                    return seriesCallback(error);
                                }
                                versions.unshift(newFileVersionId);
                                seriesCallback(null, true, fileId, versions);
                            });
                        }
                    });
                }
                else {
                    fileVersionLocal.createNewVersion(newFileVersionId, versions.length + 1, content, function (error) {
                        if (error) {
                            return seriesCallback(error);
                        }
                        versions.unshift(newFileVersionId);
                        seriesCallback(null, true, fileId, versions);
                    });
                }
            },
            function (needsSave, fileId, versions) {
                if (!needsSave) {
                    return callback(null, fileId);
                }
                var isUpdate = versions.length > 1;
                if (isUpdate) {
                    fileLocal.updateFile(fileId, fileName, userId, versions, function (error) {
                        callback(error, fileId);
                    });
                }
                else {
                    fileLocal.createFile(fileId, fileName, userId, versions, function (error) {
                        callback(error, fileId);
                    });
                }
            }
        ]);
    }

    updateFileVersion(fileId, content, callback) {
        this.fileVersion.updateVersion(fileId, content, function (error) {
            callback(error, 'OK');
        });
    }

    shareFile(fileId, isPublic, editors, viewers, callback) {
        this.file.shareFile(fileId, isPublic, editors, viewers, function (error) {
            callback(error, 'OK');
        });
    }
}