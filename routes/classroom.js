import { Router } from 'express';

const router = Router();

router.get('/:callId', async (req, res) => {
    let { uid } = req.local.decodedToken;
    let { callId } = req.params;
    res.render('classroom', { uid, callId });
});

export default router;