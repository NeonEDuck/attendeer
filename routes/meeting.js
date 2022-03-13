import { Router } from 'express';
import { adminAuth } from '../firebase-admin.js';

const router = Router();

router.get('/', async (req, res) => {
    let { uid } = req.local.decodedToken;

    res.render('meeting', { uid });
});

export default router;