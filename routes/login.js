import { Router } from 'express';

const router = Router();

router.get('/login', async (req, res) => {
    let { uid } = req.local.decodedToken;

    res.render('login', { uid });
});

export default router;