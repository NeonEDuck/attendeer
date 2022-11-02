import { Router } from 'express';
import { isAuth } from './api.js';
import { getClass } from './sql.js';

const router = Router();

router.get('/:classId/meeting', async (req, res) => {
    let { classId } = req.params;
    const { id: userId, displayName, photos } = req.session?.passport?.user || {};
    const photoURL = photos?.[0]?.value;

    if (isAuth) {
        const [ classInfo ] = await getClass(classId);
        res.render('meeting', { userId, displayName, photoURL, hostId: classInfo.HostId, classId, isHost: classInfo.HostId === userId });
    }
    else {
        res.redirect('/');
    }

});

export default router;