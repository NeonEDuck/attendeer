import express from "express";
import "dotenv/config";

let PORT = 80;
let app = express();

// static folder

app.use("/", express.static("public"));
app.use("/js/firebase", express.static("node_modules/firebase"));

// body parser

import bodyParser from "body-parser";

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// cookie parser

import cookieParser from "cookie-parser";

app.use(cookieParser());

// view engine

import nunjucks from "nunjucks";
nunjucks.configure('views', {
    autoescape: true,
    cache: false,
    express: app
})

app.set('views', './views');
app.set('view engine', 'njk');
app.engine('njk', nunjucks.render);


// passport-google-oauth20
import passport from 'passport';
import sess from 'express-session';
import oauth from 'passport-google-oauth20';

app.use(sess({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, user);
});

var GoogleStrategy = oauth.Strategy;

passport.use(
    new GoogleStrategy({
        clientID: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        callbackURL: (process.env.DOMAIN_NAME.match("https?://")?.input || "http://localhost") + "/auth/google/callback"
    },
    function(accessToken, refreshToken, profile, done) {
        if (profile) {
            return done(null, profile);
        }else {
            return done(null, false);
        }
    }
));

// router

import index from "./routes/index.js";
import login from "./routes/login.js";
import meeting from "./routes/meeting.js";
import test from "./routes/test.js";

app.use('/', index);
app.use('/', login);
app.use('/meeting', meeting);
app.use('/test', test);

// listen

app.listen(PORT, () => {console.log(`> Listening on port ${PORT}`)});