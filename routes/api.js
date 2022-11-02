import { Router } from 'express';
import * as XLSX from 'xlsx/xlsx.mjs';

/* load 'fs' for readFile and writeFile support */
import * as fs from 'fs';
XLSX.set_fs(fs);

/* load 'stream' for stream support */
import { Readable } from 'stream';
XLSX.stream.set_readable(Readable);

/* load the codepage support library for extended support with older formats  */
import * as cpexcel from 'xlsx/dist/cpexcel.full.mjs';
XLSX.set_cptable(cpexcel);
import {
    getClasses,
    getClass,
    addClass,
    updateClass,
    deleteClass,
    getClassAttendees,
    getSchools,
    getSchoolPeriods,
    getUserInfo,
    getClassSchedules,
    setClassSchedules,
    getClassCalendars,
    getClassCalendar,
    addClassCalendar,
    setClassCalendar,
    removeClassCalendar,
    getClassPosts,
    addClassPost,
    getPostReplys,
    addPostReply,
    getClassMessages,
    uploadSQL,
    getAlertRecords,
    getAlertRecordReacts,
    getAlertReacts,
} from './sql.js';

const router = Router();

export async function isAuth(userId, classId) {
    if (!userId) {
        return false;
    }
    const attendees = await getClassAttendees(classId);
    return (await isHost(userId, classId)) || attendees.find(e => e.UserId === userId);
}

export async function isHost(userId, classId) {
    const [ classInfo ] = await getClass(classId);
    return classInfo?.HostId === userId;
}

const checkAuth = async (req, res, next) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { classId } = req.body;
    if (await isAuth(userId, classId)) {
        next();
    }
    else {
        res.statusCode = "403";
        res.send({
            "code": "403",
            "message": "Forbidden."
        });
    }
}

const checkHost = async (req, res, next) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { classId } = req.body;
    if (await isHost(userId, classId)) {
        next();
    }
    else {
        res.statusCode = "403";
        res.send({
            "code": "403",
            "message": "Forbidden."
        });
    }
}

router.post('/api/getClasses', async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const results = await getClasses(userId);
    res.send(results);
});

router.post('/api/getClass', checkAuth, async (req, res) => {
    const { classId } = req.body;
    res.send((await getClass(classId))[0]);
});

router.post('/api/updateClass', checkHost, async (req, res) => {
    const {classId, className, schoolId, interval, duration, attendees} = req.body;
    const result = await updateClass(classId, className, schoolId, interval, duration, attendees);
    res.statusCode = result.code;
    res.send(result);
});

router.post('/api/deleteClass', checkHost, async (req, res) => {
    const {classId} = req.body;
    const result = await deleteClass(classId);
    res.statusCode = result.code;
    res.send(result);
});

router.post('/api/getClassAttendees', checkHost, async (req, res) => {
    const { classId } = req.body;
    res.send(await getClassAttendees(classId));
});

router.post('/api/addClass', async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { className, schoolId, interval, duration, attendees } = req.body;
    const result = await addClass(userId, className, schoolId, interval, duration, attendees);
    res.statusCode = result.code;
    res.send(result);
});

router.post('/api/getSchools', async (req, res) => {
    res.send(await getSchools());
});

router.post('/api/getSchoolPeriods', async (req, res) => {
    const { schoolId } = req.body;
    res.send(await getSchoolPeriods(schoolId));
});

router.post('/api/getClassSchedules', checkAuth, async (req, res) => {
    const { classId } = req.body;
    res.send(await getClassSchedules(classId));
});

router.post('/api/setClassSchedules', checkHost, async (req, res) => {
    const { classId, schedules } = req.body;
    const result = await setClassSchedules(classId, schedules);
    res.statusCode = result.code;
    res.send(result);
});

router.post('/api/getClassCalendars', checkAuth, async (req, res) => {
    const { classId } = req.body;
    res.send(await getClassCalendars(classId));
});

router.post('/api/updateClassCalendar', checkHost, async (req, res) => {
    const { classId, date, text } = req.body;
    const [ calendar ] = await getClassCalendar(classId, date);
    try {
        if (text !== '') {
            if (calendar) {
                await setClassCalendar(classId, date, text);
            }
            else {
                await addClassCalendar(classId, date, text);
            }
        }
        else {
            if (calendar) {
                await removeClassCalendar(classId, date);
            }
        }
        res.statusCode = 204;
        res.send({"code": 204, "message": "Request has been successfully fulfilled."});
    }
    catch {
        res.statusCode = 400;
        res.send({"code": 400, "message": "Body contains invaild data."});
    }
});

router.post('/api/getClassPosts', checkAuth, async (req, res) => {
    const { classId } = req.body;
    res.send(await getClassPosts(classId));
});

router.post('/api/addClassPost', checkHost, async (req, res) => {
    const { classId, title, content } = req.body;

    const result = await addClassPost(classId, title, content);
    res.statusCode = result.code;
    res.send(result);
});

router.post('/api/getPostReplys', checkAuth, async (req, res) => {
    const { postId, limit } = req.body;
    res.send(await getPostReplys(postId, limit));
});

router.post('/api/addPostReply', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { postId, content } = req.body;
    const result = await addPostReply(postId, userId, content);
    res.statusCode = result.code;
    res.send(result);
});

router.post('/api/getUserInfoDepercated', async (req, res) => {
    const { email } = req.body;
    res.send((await getUserInfoDepercated(email))[0] || {});
});

router.post('/api/getUserInfo', async (req, res) => {
    const { userId } = req.body;
    res.send((await getUserInfo(userId))[0] || {});
});

router.post('/api/getClassMessages', checkAuth, async (req, res) => {
    const { classId } = req.body;
    res.send(await getClassMessages(classId));
});

router.post('/api/addClassMessage', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { classId, content } = req.body;
    const result = await addClassMessage(classId, userId, content);
    res.statusCode = result.code;
    res.send(result);
});

router.post('/api/getChatLog', checkAuth, async (req, res) => {
    const { classId } = req.body;
    const messages = await getClassMessages(classId);
    let log = '';
    messages.forEach((msg) => {
        log += `${msg.UserName} - ${new Date(msg.Timestamp).toISOString()}\n${msg.Content}\n`;
    });
    res.send(log);
});

router.post('/api/getAlertRecords', checkHost, async (req, res) => {
    const { classId } = req.body;
    res.send((await getAlertRecords(classId)).map((x) => {
        x.MultipleChoice = JSON.parse(x.MultipleChoice);
        return x;
    }));
});

router.post('/api/getAlertRecordReacts', checkHost, async (req, res) => {
    const { classId, recordId } = req.body;
    res.send(await getAlertRecordReacts(classId, recordId));
});

router.post('/api/getAlertLog', checkHost, async (req, res) => {
    const { classId } = req.body;
    const records = await getAlertRecords(classId);
    const reacts = await getAlertReacts(classId);
    const recordsJson = records.map((x) => {

        const amount = reacts.filter((y) => (y.Answer === x.Answer)).length;
        const total  = reacts.filter((y) => (y.Answer !== null)).length;
        console.log(JSON.parse(x.MultipleChoice)?.map((y, idx) => {
            const amount = reacts.filter((z) => (z.RecordId === x.RecordId && z.Answer === idx.toString())).length;
            const total  = reacts.filter((z) => (z.RecordId === x.RecordId && z.Answer !== null)).length;
            console.log(amount, total);
            return amount / total;
        }));
        return {
            警醒類型: x.AlertType,
            警醒間隔: x.Interval,
            持續時間: x.Duration,
            問題: (x.AlertTypeId === 1)?'-' : x.Question,
            選項: (x.AlertTypeId === 1 || x.AlertTypeId === 3)?'-' : x.MultipleChoice,
            比例: (x.AlertTypeId === 1 || x.AlertTypeId === 3)?'-' : JSON.stringify(
                JSON.parse(x.MultipleChoice).map((_, idx) => {
                    const amount = reacts.filter((y) => (y.RecordId === x.RecordId && y.Answer === idx.toString())).length;
                    const total  = reacts.filter((y) => (y.RecordId === x.RecordId && y.Answer !== null)).length;
                    return (amount / total) * 100;
                })
            ),
            建立時間: new Date(x.Timestamp).toISOString(),
            連結: '點擊前往'
        }
    });

    // 姓名,點擊狀態,回答,完成時間
    const workbook = XLSX.utils.book_new();
    const mainsheet = XLSX.utils.json_to_sheet(recordsJson);
    const sheets = []
    for (let i = 0; i < records.length; i++) {
        const sheetName = `警醒${i+1}`;
        mainsheet[`G${i+1}`].l = { Target: `#${sheetName}!A1` };
        const reactsJson = reacts.filter((x) => (x.RecordId === records[i].RecordId)).map((x) => {return {
            姓名: x.UserName,
            點擊狀態: (x.Clicked === null)?'未加入會議' : ((x.Clicked)?'點擊' : '未點擊'),
            回答: (records[i].AlertTypeId === 1 || !x.Clicked)?'-' : x.Answer,
            完成時間: (x.Clicked === null)?'-' : new Date(x.Timestamp).toISOString(),
        }});

        sheets.push({
            sheetName,
            sheet: XLSX.utils.json_to_sheet(reactsJson)
        });
    }
    XLSX.utils.book_append_sheet(workbook, mainsheet, "主表", true);

    sheets.forEach((s) => {
        XLSX.utils.book_append_sheet(workbook, s.sheet, s.sheetName, true);
    })

    // XLSX.writeFile(workbook, './test.xlsx', {type: 'base64'})
    res.send(XLSX.write(workbook, {type: 'base64'}));
});

router.post('/api/_uploadSQL', async (req, res) => {
    const result = await uploadSQL();
    res.send(result);
});

export default router;