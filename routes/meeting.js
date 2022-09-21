import { Router } from 'express';

const router = Router();

router.get('/:callId/meeting', async (req, res) => {
    let { uid } = req.local.decodedToken;
    let { callId } = req.params;
    res.render('meeting', { uid, callId });
});

export default router;