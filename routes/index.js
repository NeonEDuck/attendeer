import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
    // let { uid, name, email, picture } = req.local.decodedToken;

    res.render('index');
});

export default router;