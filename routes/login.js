import { Router } from 'express';
import { adminAuth } from '../firebase-admin.js';

const router = Router();

router.get('/login', (req, res) => {
    res.render('login');
});

router.post("/sessionLogin", (req, res) => {
    const idToken = req.body.idToken.toString();
    let expiresIn = Number(process.env.SESSION_MAX_AGE);

    adminAuth.createSessionCookie(idToken, { expiresIn })
        .then(
            (sessionCookie) => {
                req.session.idToken = sessionCookie;
                res.end(JSON.stringify({ status: "success" }));
            },
            (error) => {
                res.status(401).send("UNAUTHORIZED REQUEST!");
            });
});

router.get('/logout', (req, res) => {
    req.session.idToken = undefined;

    res.redirect('/');
});

export default router;