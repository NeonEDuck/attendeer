import { Router } from 'express';
import { adminAuth } from '../firebase-admin.js';

const router = Router();

router.get('/', async (req, res) => {

    let user = req.session?.passport?.user || {};
    let { id, displayName, emails, photos } = user;

    if (id) {
        console.log(req.session.passport);
        let user = await adminAuth.getUserByProviderUid('google.com', id);
        console.log(user);
    }

    res.render('index', { displayName });
});

export default router;