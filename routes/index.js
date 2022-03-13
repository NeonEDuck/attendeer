import { Router } from 'express';
import { adminAuth } from '../firebase-admin.js';

const router = Router();

router.get('/', async (req, res) => {
    let { uid, name, email, picture } = req.local.decodedToken;

    res.render('index', { name });
});

export default router;