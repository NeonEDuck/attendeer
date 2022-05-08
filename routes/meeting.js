import { Router } from 'express';

const router = Router();

router.get('/:callId', async (req, res) => {
    let { callId } = req.params;
    res.render('meeting', { callId });
});

export default router;