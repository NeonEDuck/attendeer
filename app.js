import express from 'express';
import 'dotenv/config';

const HTTP_PORT = process.env.HTTP_PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const app = express();

// globle variable
process.env.SESSION_MAX_AGE = 60 * 60 * 24 * 5 * 1000;

// convert to compressed gzip
app.get('/js/*.js', (req, res, next) => {
    req.url = req.url + '.gz';
    res.set('content-encoding', 'gzip');
    res.set('content-type', 'text/javascript');
    next();
});

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
const csrfMiddleware = csrf({ cookie: { secure: true, httpOnly: true, sameSite: 'strict' } });
app.use(csrfMiddleware);
app.all('*', (req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});

// gzip compression
// import compression from 'compression';
// app.use(compression());

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
import meeting from './routes/meeting.js';
import overview from './routes/overview.js';
import login from './routes/login.js';

app.use('/', index);
app.use('/meeting', meeting);
app.use('/overview', overview);
app.use('/login', login);

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

if (process.env.DEBUG?.toLowerCase() === 'true') {
    http.createServer(app).listen(HTTP_PORT, () => {console.log(`> Listening on port ${HTTP_PORT}`)});
}
else {
    try {
        const options = {
            key:  fs.readFileSync( path.join(process.env.CERT_DIR_PATH || 'certs', 'private.key') , 'utf-8'),
            cert: fs.readFileSync( path.join(process.env.CERT_DIR_PATH || 'certs', 'certificate.crt') , 'utf-8'),
            ca:   fs.readFileSync( path.join(process.env.CERT_DIR_PATH || 'certs', 'ca_bundle.crt') , 'utf-8'),
        };
        https.createServer(options, app).listen(HTTPS_PORT, () => {console.log(`> Listening on port ${HTTPS_PORT}`)});
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
        http.createServer(app).listen(HTTP_PORT, () => {console.log(`> Listening on port ${HTTP_PORT}`)});
    }
}