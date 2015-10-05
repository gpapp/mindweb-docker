import express from 'express';
import cassandra from 'cassandra-driver';
import passport from 'passport';
import UserService from '../services/UserService';
import ServiceError from '../classes/ServiceError.js';

var router = express.Router();
var userService;
// Documentation: @ http://passportjs.org/docs/google

var GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,
    TwitterStrategy = require('passport-twitter').Strategy,
    FacebookStrategy = require('passport-facebook').Strategy,
    LinkedInStrategy = require('passport-linkedin').Strategy;
router.get('/google', passport.authenticate('google', {scope: ['https://www.googleapis.com/auth/plus.login']}));
router.get('/google/return', passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/login'
}));
router.get('/twitter', passport.authenticate('twitter'));
router.get('/twitter/return', passport.authenticate('twitter', {
    successRedirect: '/',
    failureRedirect: '/login'
}));
router.get('/facebook', passport.authenticate('facebook', {scope: ['public_profile', 'email']}));
router.get('/facebook/return', passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/login'
}));
router.get('/linkedin', passport.authenticate('linkedin', {scope: ['r_basicprofile']}));
router.get('/linkedin/return', passport.authenticate('linkedin', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

router.get('/logout', function (request, response) {
    console.log("Received session for destroy: ");
    request.logout();
    response.redirect('/');
});
router.setupDB = function (cassandraOptions) {

    console.log("Setting up DB connection for authentication");

    var cassandraClient = new cassandra.Client(cassandraOptions);
    cassandraClient.connect(function (error, ok) {
        if (error) {
            throw 'Cannot connect to database';
        }
        console.log('Connected to database:' + ok);
    });
    userService = new UserService(cassandraClient);

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Google profile is
//   serialized and deserialized.
    passport.serializeUser(function (user, done) {
        done(null, user);
    });

    passport.deserializeUser(function (obj, done) {
        done(null, obj);
    });

    passport.use(
        new GoogleStrategy(
            {
                clientID: '605748769967-s6vb5kqpgpsp41nlbaiu84sbvqid0itg.apps.googleusercontent.com',
                clientSecret: '7xeJUKt1DiJn8mdGI1l2hHOp',
                callbackURL: '/auth/google/return'
            },
            function (accessToken, refreshToken, profile, done) {
                var user = findOrCreateUser('google:' + profile.id, profile.displayName, profile.photos[0].value);
                return done(null, user);
            }
        )
    );
    passport.use(
        new FacebookStrategy(
            {
                clientID: '578046905670294',
                clientSecret: '7109c72ffe7cad58b5a55d52d85dabea',
                callbackURL: '/auth/facebook/return',
                profileFields: ['id', 'displayName', 'photos']
            },
            function (accessToken, refreshToken, profile, done) {
                var user = findOrCreateUser('facebook:' + profile.id, profile.displayName, profile.photos[0].value);
                return done(null, user);
            }
        )
    );
    passport.use(
        new TwitterStrategy(
            {
                consumerKey: 'fman10LDdbSTEg0ZRlhdnevFJ',
                consumerSecret: 'tjH5bWIIcuUZa6Ru3E14Bn0alU1RRqUp5aQM3ZjGCbiETXgevM',
                callbackURL: '/auth/twitter/return'
            },
            function (accessToken, refreshToken, profile, done) {
                var user = findOrCreateUser('twitter:' + profile.id, profile.displayName, profile._json.profile_image_url_https);
                return done(null, user);
            }
        )
    );
    passport.use(
        new LinkedInStrategy(
            {
                consumerKey: '77d66pdruhn8fm',
                consumerSecret: '7XK9Ih89pevK1yRm',
                callbackURL: '/auth/linkedin/return',
                profileFields: ['id', 'formatted-name', 'picture-url']
            },
            function (accessToken, refreshToken, profile, done) {
                findOrCreateUser('linkedin:' + profile.id, profile._json.formattedName, profile._json.pictureUrl, done);
            }
        )
    );
    router.use(passport.initialize());
    router.use(passport.session());
};

router.authorizeMiddleware = function (request, response, next) {
    if (request.isAuthenticated()) {
        request.headers['mindweb_user'] = userService.getUser(request.session.passport.user.id,next);
    } else {
        next(new ServiceError(401, 'Unauthenticated user'));
    }
};

function findOrCreateUser(authId, name, avatarUrl, next) {
    console.log('Creating user:' + authId + ':' + name + ':' + avatarUrl);
    var user = userService.getUser(request.session.passport.user.id);
    if (user == null) {
        userService.createUser(authId, name, avatarUrl, function (error, result) {
            next(error, result);
        });
    }
}
module.exports = router;
