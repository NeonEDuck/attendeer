import { Router } from 'express';
import { isAuth } from './api.js';
import { getClass, getSchools, getSchoolPeriods, getClassSchedules } from './sql.js';

const router = Router();

router.get('/:classId', async (req, res, next) => {
    const { classId } = req.params;
    const { id: userId, displayName, photos } = req.session?.passport?.user || {};
    const photoURL = photos?.[0]?.value;

    console.log(userId, classId);
    console.log(await isAuth(userId, classId));

    if (await isAuth(userId, classId)) {
        const schools = await getSchools();
        const [ classInfo ] = await getClass(classId);
        const periods = await getSchoolPeriods(classInfo.SchoolId);
        const schedules = await getClassSchedules(classId);
        const classSchedule = {};
        for (const period of periods) {
            const week = []
            for (const day of [1, 2, 3, 4, 5, 6, 7]) {
                if (schedules.find(x => (x.PeriodId === period.PeriodId && x.WeekdayId === day))) {
                    week.push(true);
                }
                else {
                    week.push(false);
                }
            }
            classSchedule[period.PeriodId] = { periodName: period.PeriodName, week }
        }

        res.render('classroom', { classId, displayName, photoURL, schools, classInfo, schedule: classSchedule, isHost: classInfo?.HostId === userId });
    }
    // next();
    else {
        res.redirect('/');
    }
});

export default router;