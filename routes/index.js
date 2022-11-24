import { Router } from 'express';
import { getClasses, getSchools } from './sql.js';

const router = Router();

router.get('/', async (req, res) => {
    const { id: userId, displayName, photos } = req.session?.passport?.user || {};
    const photoURL = photos?.[0]?.value;
    const classes = await getClasses(userId);
    const schools = await getSchools();

    res.render('index', { displayName, photoURL, classes, schools });
});

export default router;