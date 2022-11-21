import express from 'express';
import 'dotenv/config';

const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const app = express();

// globle variable
process.env.SESSION_MAX_AGE = 60 * 60 * 24 * 5 * 1000;

// gzip compression
import compression from 'compression';
app.use(compression());

// static folder
app.use('/', express.static('public'));

// body parser
import bodyParser from 'body-parser';

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// cookie parser
import cookieParser from 'cookie-parser';
app.use(cookieParser());

// view engine
import nunjucks from 'nunjucks';
nunjucks.configure('views', {
    autoescape: true,
    cache: false,
    express: app
})

app.set('views', './views');
app.set('view engine', 'njk');
app.engine('njk', nunjucks.render);

// session
import session from 'express-session';
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { maxAge: Number(process.env.SESSION_MAX_AGE), httpOnly: true },
}));

// csrf middleware
import csrf from 'csurf';
const csrfMiddleware = csrf({ cookie: { secure: true, httpOnly: true, sameSite: 'strict' } });
// app.use(csrfMiddleware);
// app.all('*', (req, res, next) => {
//     res.locals.csrfToken = req.csrfToken();
//     next();
// });

import passport from 'passport';

app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});

import { OAuth2Strategy } from 'passport-google-oauth';
passport.use(new OAuth2Strategy(
    {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/auth/google/callback"
    },
    (accessToken, refreshToken, profile, done) => {
        if (profile) {
            return done(null, profile);
        }
        else {
            return done(null, false);
        }
    }
));

app.get('/auth/google', passport.authenticate('google', { scope : ['profile', 'email'] }));

import { query } from './routes/sql.js';
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/error' }), async (req, res) => {
    const userExist = await query(`SELECT UserId FROM Users WHERE UserId = :userId`, {userId: req.session.passport.user.id})
    if (userExist.length === 0) {
        await query(`INSERT INTO Users VALUES (:userId, :email, :userName, :photoURL)`, {
            userId:   req.session.passport.user.id,
            email:    req.session.passport.user.emails[0].value,
            userName: req.session.passport.user.displayName,
            photoURL: req.session.passport.user.photos[0].value,
        });
    }
    res.redirect('/');
});

app.get('/logout', function(req, res){
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

// router
import api from './routes/api.js';
import index from './routes/index.js';
import meeting from './routes/meeting.js';
import login from './routes/login.js';
import classroom from './routes/classroom.js';

app.use(api);
app.use(index);
app.use(meeting);
app.use(login);
app.use(classroom);

// error handler
app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);

    // handle CSRF token errors here
    res.status(403);
    res.send('form tampered with');
});

// listen
import http from 'http';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { Server as socketServer } from 'socket.io';
import socketSetup from './sockets.js';

if (process.env.DEBUG?.toLowerCase() === 'true') {
    const httpServer = http.createServer(app);
    const io = new socketServer(httpServer);
    socketSetup(io);
    httpServer.listen(HTTP_PORT, () => {console.log(`> Listening on port ${HTTP_PORT}`)});
}
else {
    try {
        const options = {
            key:  fs.readFileSync( path.join(process.env.CERT_DIR_PATH || 'certs', 'private.key') , 'utf-8'),
            cert: fs.readFileSync( path.join(process.env.CERT_DIR_PATH || 'certs', 'certificate.crt') , 'utf-8'),
            ca:   fs.readFileSync( path.join(process.env.CERT_DIR_PATH || 'certs', 'ca_bundle.crt') , 'utf-8'),
        };
        const httpsServer = https.createServer(options, app);
        const io = new socketServer(httpsServer);
        socketSetup(io);
        httpsServer.listen(HTTPS_PORT, () => {console.log(`> Listening on port ${HTTPS_PORT}`)});
        http.createServer((req, res) => {
            res.writeHead(302, { "Location": "https://" + req.headers.host + req.url });
            res.end();
        }).listen(HTTP_PORT, () => {console.log(`> Listening on port ${HTTP_PORT}`)});
    } catch (err) {
        if (err.code === 'ENOENT') {
            console.error(
                `Error: certification file missing, finding '${err.path}'.\n` +
                `    Maybe you forgot to put certification files in the correct folder.\n` +
                `    Configure "CERT_DIR_PATH" in .env file if needed.\n`
            );
        }
        else {
            console.error(err);
        }
        console.log('Fallback to http server.')
        const httpServer = http.createServer(app);
        const io = new socketServer(httpServer);
        socketSetup(io);
        httpServer.listen(HTTP_PORT, () => {console.log(`> Listening on port ${HTTP_PORT}`)});
    }
}