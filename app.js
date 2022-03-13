import express from 'express';
import 'dotenv/config';

let PORT = 80;
let app = express();

// globle variable

process.env.SESSION_MAX_AGE = 60 * 60 * 24 * 5 * 1000;

// static folder

app.use('/', express.static('public'));
app.use('/js/firebase', express.static('node_modules/firebase'));

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
const csrfMiddleware = csrf({ cookie: true });
app.use(csrfMiddleware);
app.all('*', (req, res, next) => {
    res.cookie("XSRF-TOKEN", req.csrfToken());
    next();
});

// auth check
import { adminAuth } from './firebase-admin.js';

app.all('*', async (req, res, next) => {
    const sessionCookie = req.session.idToken || '';

    req.local = {};
    await adminAuth.verifySessionCookie(sessionCookie, true)
        .then((decodedToken) => {
            req.local.decodedToken = decodedToken;
        }, (error) => {
            req.local.decodedToken = {};
        });
    next();
});

// router

import index from './routes/index.js';
import login from './routes/login.js';
import meeting from './routes/meeting.js';
import test from './routes/test.js';

app.use('/', index);
app.use('/', login);
app.use('/meeting', meeting);
app.use('/test', test);

// listen

app.listen(PORT, () => {console.log(`> Listening on port ${PORT}`)});