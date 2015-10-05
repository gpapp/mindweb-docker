require("babel/register");

var fs = require('fs');
var assert = require('assert');
var cassandra = require('cassandra-driver');
var UserService = require('../../services/UserService');

var rawConfig = fs.readFileSync('config/config.json');
var config = rawConfig.toString();
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
var userDAO = new UserService(cassandraClient);
describe('UserDAO userCreate', function () {
    it("creates a user in the database", function (done) {
        userDAO.createUser("TestID 1", "Test User 1", "Test Avatar 1", function (error, result) {
            try {
                assert(error == null, "Cannot create test user: " + error);
                assert(result, "Result is empty");
                assert(result.userId, "Result userId is empty");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
});
describe('UserDAO getUser', function () {
    it("finds a user from the database", function (done) {
        userDAO.getUser("TestID 1", function (error, result) {
            try {
                assert(result, "Cannot find user");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
});
describe('UserDAO userDelete', function () {
    var userId;
    before(function (next) {
        userDAO.getUser("TestID 1", function (error, result) {
            userId = result.id;
            next();
        });
    });
    it("removes a user from the database", function (done) {
        userDAO.deleteUser(userId, function (error, result) {
            try {
                assert(error == null, "Cannot remove test user: " + error);
                console.log("User removed:" + userId);
                assert(result != null, "Result is empty");
                assert(!result.rows, "Result has data");
                done();
            }
            catch (e) {
                done(e);
            }
        });
    });
});
