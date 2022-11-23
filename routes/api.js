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
    addAlertRecord,
    deleteUnfinishedRecords,
    expireUnfinishedRecords,
    turnOnRecord,
    finishRecord,
    updateClassAlertRecord,
    getAlertRecord,
    getAlertRecordReact,
    addAlertRecordReact,
    updateAlertRecordReact,
    getClassMessage,
    addClassMessage,
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

async function send(req, res, cb) {
    let result;
    try {
        result = await cb()
        if (!result) {
            result = {statusCode: 204, message: "Request has been successfully fulfilled."};
        }
        else if (!result.statusCode) {
            result = {statusCode: 200, message: "Request has been successfully fulfilled.", product: result};
        }
    }
    catch (err) {
        result = {statusCode: 400, message: "Fail to fulfill request.", err};
    }

    const content =
        `${req.baseUrl + req.path} @ ${new Date().toLocaleString()}\n` +
        `BODY: ${JSON.stringify(req.body, null, 4)}\n` +
        `
            STATUS CODE: ${result.statusCode || 200}
            MESSAGE: ${result.message || ''}
            LOG: ${result.err || ''}
            ==================================================
        `.split('\n').map(s => s.trim()).filter(Boolean).join('\n') + '\n';

    fs.writeFile('./err.log', content, {flag: 'a'}, err => {
        if (err) {
            console.error(err);
        }
    });
    res.statusCode = result.statusCode
    if (res.statusCode === 204) {
        return res.send();
    }
    else {
        return res.send(result.product);
    }
}

router.post('/api/getClasses', async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    send(req, res, async () => {
        return await getClasses(userId);
    });
});

router.post('/api/getClass', checkAuth, async (req, res) => {
    const { classId } = req.body;
    send(req, res, async () => {
        return (await getClass(classId))?.[0];
    });
});

router.post('/api/addClass', async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { className, schoolId, classColor, interval, duration, attendees } = req.body;
    send(req, res, async () => {
        return await addClass(userId, className, schoolId, classColor, interval, duration, attendees);
    });
});

router.post('/api/updateClass', checkHost, async (req, res) => {
    const {classId, className, classColor, schoolId, interval, duration, attendees} = req.body;
    send(req, res, async () => {
        return await updateClass(classId, className, schoolId, classColor, interval, duration, attendees);
    });
});

router.post('/api/updateClassAlertRecord', checkHost, async (req, res) => {
    const {classId, interval, duration} = req.body;
    send(req, res, async () => {
        return await updateClassAlertRecord(classId, interval, duration);
    });
});

router.post('/api/deleteClass', checkHost, async (req, res) => {
    const {classId} = req.body;
    send(req, res, async () => {
        return await deleteClass(classId);
    });
});

router.post('/api/getClassAttendees', checkHost, async (req, res) => {
    const { classId } = req.body;
    send(req, res, async () => {
        return await getClassAttendees(classId);
    });
});

router.post('/api/getSchools', async (req, res) => {
    send(req, res, async () => {
        return await getSchools();
    });
});

router.post('/api/getSchoolPeriods', async (req, res) => {
    const { schoolId } = req.body;
    send(req, res, async () => {
        return await getSchoolPeriods(schoolId);
    });
});

router.post('/api/getClassSchedules', checkAuth, async (req, res) => {
    const { classId } = req.body;
    send(req, res, async () => {
        return await getClassSchedules(classId);
    });
});

router.post('/api/setClassSchedules', checkHost, async (req, res) => {
    const { classId, schedules } = req.body;
    send(req, res, async () => {
        return await setClassSchedules(classId, schedules);
    });
});

router.post('/api/getClassCalendars', checkAuth, async (req, res) => {
    const { classId } = req.body;
    send(req, res, async () => {
        return await getClassCalendars(classId);
    });
});

router.post('/api/updateClassCalendar', checkHost, async (req, res) => {
    const { classId, date, text } = req.body;
    const [ calendar ] = await getClassCalendar(classId, date);
    if (text !== '') {
        if (calendar) {
            send(req, res, async () => {
                return await setClassCalendar(classId, date, text);
            });
        }
        else {

            send(req, res, async () => {
                return await addClassCalendar(classId, date, text);
            });
        }
    }
    else {
        if (calendar) {
            send(req, res, async () => {
                return await removeClassCalendar(classId, date);
            });
        }
    }
});

router.post('/api/getClassPosts', checkAuth, async (req, res) => {
    const { classId } = req.body;
    send(req, res, async () => {
        return await getClassPosts(classId);
    });
});

router.post('/api/addClassPost', checkHost, async (req, res) => {
    const { classId, title, content } = req.body;
    send(req, res, async () => {
        return await addClassPost(classId, title, content);
    });
});

router.post('/api/getPostReplys', checkAuth, async (req, res) => {
    const { postId, limit } = req.body;
    send(req, res, async () => {
        return await getPostReplys(postId, limit);
    });
});

router.post('/api/addPostReply', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { postId, content } = req.body;
    send(req, res, async () => {
        return await addPostReply(postId, userId, content);
    });
});

router.post('/api/getUserInfo', async (req, res) => {
    const { userId, email } = req.body;
    send(req, res, async () => {
        return (await getUserInfo(userId, email))[0];
    });
});

router.post('/api/getClassMessages', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { classId } = req.body;
    send(req, res, async () => {
        const messages = await getClassMessages(classId, userId);
        if (await isHost(userId, classId)) {
            return messages;
        }

        return messages.map((x) => {
            x.UserName = (x.IsSelf  === 1 || x.IsHost === 1) ? x.UserName : '參與者';
            return x;
        });
    });
});

router.post('/api/getClassMessage', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { classId, messageId } = req.body;

    send(req, res, async () => {
        const message = (await getClassMessage(classId, userId, messageId))[0];
        if (!(await isHost(userId, classId))) {
            message.UserName = (message.IsSelf || message.IsHost) ? message.UserName : '參與者';
        }
        return message;
    });
});

router.post('/api/addClassMessage', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { classId, content } = req.body;
    send(req, res, async () => {
        return await addClassMessage(classId, userId, content);
    });
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
    send(req, res, async () => {
        return (await getAlertRecords(classId)).map((x) => {
            x.MultipleChoice = JSON.parse(x.MultipleChoice);
            return x;
        });
    });
});

router.post('/api/getAlertRecord', checkAuth, async (req, res) => {
    const { recordId } = req.body;
    send(req, res, async () => {
        return (await getAlertRecord(recordId)).map((x) => {
            x.MultipleChoice = JSON.parse(x.MultipleChoice);
            return x;
        })?.[0];
    });
});

router.post('/api/getAlertRecordReacts', checkAuth, async (req, res) => {
    const { classId, recordId } = req.body;
    send(req, res, async () => {
        return await getAlertRecordReacts(classId, recordId);
    });
});

router.post('/api/getAlertRecordReact', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { classId, recordId } = req.body;
    send(req, res, async () => {
        return (await getAlertRecordReact(classId, recordId, userId))[0];
    });
});

router.post('/api/addAlertRecordReact', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { recordId } = req.body;
    send(req, res, async () => {
        return await addAlertRecordReact(recordId, userId);
    });
});

router.post('/api/updateAlertRecordReact', checkAuth, async (req, res) => {
    const { id: userId } = req.session?.passport?.user || {id: req.body._userId};
    const { reactId, data: {click, answear: answer} } = req.body;
    send(req, res, async () => {
        return await updateAlertRecordReact(reactId, userId, click, answer);
    });
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

router.post('/api/addAlertRecord', checkHost, async (req, res) => {
    const { classId, alertType, interval, duration, Question: question, MultipleChoice: multipleChoice, Answear: answer } = req.body;
    const multipleChoiceString = JSON.stringify(multipleChoice);
    send(req, res, async () => {
        return await addAlertRecord(classId, alertType, interval, duration, question, multipleChoiceString, answer);
    });
});

router.post('/api/deleteUnfinishedRecords', checkHost, async (req, res) => {
    const { classId } = req.body;
    send(req, res, async () => {
        return await deleteUnfinishedRecords(classId);
    });
});

router.post('/api/expireUnfinishedRecords', checkHost, async (req, res) => {
    const { classId } = req.body;
    send(req, res, async () => {
        return await expireUnfinishedRecords(classId);
    });
});

router.post('/api/turnOnRecord', checkHost, async (req, res) => {
    const { recordId } = req.body;
    send(req, res, async () => {
        return await turnOnRecord(recordId);
    });
});

router.post('/api/finishRecord', checkHost, async (req, res) => {
    const { recordId } = req.body;
    send(req, res, async () => {
        return await finishRecord(recordId);
    });
});

router.post('/api/_uploadSQL', async (req, res) => {
    const result = await uploadSQL();
    res.send(result);
});

export default router;