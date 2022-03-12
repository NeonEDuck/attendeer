import { Router } from 'express';
import passport from 'passport';

const router = Router();

router.get('/login',
    passport.authenticate('google', { scope: ['email', 'profile'] })
);

router.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    // console.log(req.session.passport.user.id);
    // console.log(req.session.passport.user.displayName);
    // console.log(req.session.passport.user.emails[0].value);
    // console.log(req.session.passport.user.photos[0].value);

    res.redirect('/');
});

router.get('/logout', (req, res) => {
    req.logout();

    try {
        req.session.passport.user.id = null;
    }
    catch (e) {

    }

    res.redirect('/');
});

export default router;