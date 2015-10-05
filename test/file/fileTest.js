require("babel/register");

var assert = require ('assert');
var fs = require('fs');
var async = require('async');
var cassandra = require('cassandra-driver');
var FileService = require('../../services/FileService');
var UserService = require('../../services/UserService');


var rawConfig = fs.readFileSync('config/config.json');
var config = rawConfig.toString();

//import FileService from '../services/FileService'

for (var key in process.env) {
    if (!process.env.hasOwnProperty(key)) {
        continue;
    }
    var re = new RegExp('\\$\\{' + key + '\\}', 'g');
    config = config.replace(re, process.env[key]);
}
var options = JSON.parse(config);

console.log('Expecting DB on ' + options.db.host + ':' + options.db.port);

var cassandraClient = new cassandra.Client({
    contactPoints: [
        options.db.host
    ],
    protocolOptions: {
        port: options.db.port
    }
});

cassandraClient.connect(function (error, ok) {
    if (error) {
        throw 'Cannot connect to database';
    }
    console.log('Connected to database:' + ok);
});

var fileDAO = new FileService(cassandraClient);
var userDAO = new UserService(cassandraClient);
var testFileId;
describe('FileDAO file create', function () {
    var userId;
    before(function (next) {
        userDAO.createUser("fileTest:ID1", "Test User 1", "Test Avatar 1", function (error, result) {
            if (error) {
                userDAO.getUser("fileTest:ID1", function (error, result) {
                    userId = result.id;
                    console.log("User loaded:" + userId);
                    next();
                });
            }
            else {
                userId = result.userId;
                console.log("User created:" + userId);
                next();
            }
        });
    });
    it("creates a file in the database", function (done) {
        fileDAO.createNewVersion("Test fajl 1", userId, "Test Content", function (error, result) {
            try {
                assert(error == null, "Cannot create test file: " + error);
                assert(result != null, "Result is empty");
                testFileId = result;
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
    it("Saves a file with identical content (no new version)", function (done) {
        fileDAO.createNewVersion("Test fajl 1", userId, "Test Content", function (error, result) {
            try {
                assert(error == null, "Cannot create test file: " + error);
                assert(result != null, "Result is empty");
                assert(result.toString() === testFileId.toString(), "FileService ids mismatched");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
    it("Saves a new version of a file with changed content (new version)", function (done) {
        fileDAO.createNewVersion("Test fajl 1", userId, "Test Content changed", function (error, result) {
            try {
                assert(error == null, "Cannot create test file: " + error);
                assert(result != null, "Result is empty");
                assert(result.toString() === testFileId.toString(), "FileService ids mismatched");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
    it("Renames a file", function (done) {
        fileDAO.renameFile(testFileId, "Test fajl 1 (renamed)", function (error, result) {
            try {
                assert(error == null, "Cannot delete test file: " + error);
                assert(result, "Result is empty");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
    it("Shares a file publicly", function (done) {
        fileDAO.shareFile(testFileId, true, null, null, function (error, result) {
            try {
                assert(error == null, "Cannot share file: " + error);
                assert(result, "Result is empty");
                fileDAO.getFile(testFileId, function (error, result) {
                    assert(result.id.toString() == testFileId.toString(), "Wrong file loaded");
                    assert(result.isPublic == true, "File is not public");
                    assert(result.editors === null, "Editors is not null");
                    assert(result.viewers === null, "Viewers is not null");
                    done();
                });
            }
            catch (e) {
                done(e);
            }
        });
    });
    it("Shares a file to editors and viewers", function (done) {
        fileDAO.shareFile(testFileId, true, null, null, function (error, result) {
            try {
                assert(error == null, "Cannot delete test file: " + error);
                assert(result, "Result is empty");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
    it("Unshares a file from all editors and viewers", function (done) {
        fileDAO.shareFile(userId, true, null, null, function (error, result) {
            try {
                assert(error == null, "Cannot delete test file: " + error);
                assert(result, "Result is empty");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
    it("Deletes a file", function (done) {
        fileDAO.deleteFile(testFileId, function (error, result) {
            try {
                assert(error == null, "Cannot delete test file: " + error);
                assert(result === 'OK', "Result is empty");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
    after(function (next) {
        userDAO.deleteUser(userId, function (error) {
            if (error) {
                next(error);
            }
            console.log("User removed:" + userId);
            next();
        });
    });
});
