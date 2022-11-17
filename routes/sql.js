import { createPool } from 'mysql';
import { queryBuilder } from 'mysql-query-placeholders';
import fs from 'fs';

const pool = createPool({
    host    : process.env.DB_HOST,
    user    : process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    timezone: 'utc',
});

const statusCode200 = (product) => {
    return {statusCode: 200, message: "Request has been successfully fulfilled.", product}
};
const statusCode204 = () => {
    return {statusCode: 204, message: "Request has been successfully fulfilled."};
};

export async function transactionQuery(cb) {
    return new Promise((resolve, reject) => {
        pool.getConnection(async (err, conn) => {
            try {
                if (err) {
                    throw err;
                };
                const result = await new Promise((resolve, reject) => {
                    conn.beginTransaction(async (err) => {
                        if (err) {
                            reject(err);
                        }
                        try {
                            const result = await cb((sqlString, values) => {return query(sqlString, values, conn)});
                            conn.commit((err) => {
                                if (err) {
                                    throw err;
                                }
                                conn.release();
                                resolve(result);
                            });
                        }
                        catch (err) {
                            reject(err);
                        }
                    });
                });
                resolve(result);
            }
            catch (err) {
                conn.rollback(() => {
                    conn.release();
                });
                reject(err);
            }
        });
    });
}

export function query(sqlString, values, conn) {
    const options = queryBuilder(sqlString, values)
    return new Promise((resolve, reject) => {
        (conn || pool).query(options, (err, results, fields) => {
            if (err) {
                reject(err);
            }
            else{
                resolve(results);
            }
        });
    });
}

const LOWER_CASE = 'abcdefghjiklnmopqrstuvwxyz';

function randomLowerCaseString(length) {
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += LOWER_CASE.charAt(Math.floor(Math.random() * LOWER_CASE.length));
    }
    return randomString;
}

function generateClassId() {
    return randomLowerCaseString(3) + '-' + randomLowerCaseString(3);
}

export function getClasses(userId) {
    return query(`
        SELECT DISTINCT Classes.*, IFNULL(ClassHour, 0) as ClassHour, Users.UserName as HostName FROM Classes
        LEFT JOIN ClassAttendees
        ON Classes.ClassId = ClassAttendees.ClassId
        LEFT JOIN Users
        ON Classes.HostId = Users.userId
        LEFT JOIN (
            SELECT ClassId, COUNT(*) as ClassHour FROM Schedules
            GROUP BY ClassId
        ) as tmp
        ON Classes.ClassId = tmp.ClassId
        WHERE Classes.HostId = :userId
        OR ClassAttendees.UserId = :userId
    `, {userId});
}

export function getClass(classId) {
    return query(`
        SELECT * FROM Classes
        WHERE Classes.ClassId = :classId
    `, {classId});
}

export async function addClass(userId, className, schoolId, classColor, interval, duration, attendees) {
    let classId;
    while ((await getClass(classId = generateClassId())).length > 0) {
        // 生成隨機ClassId，如果有與已存在的課程ClassId衝突到，重新再生成
    }

    await transactionQuery(async (query) => {
        const product = await query(`
            INSERT INTO Classes VALUES (:classId, :className, :userId, :schoolId, :classColor, 1, :interval, :duration)
        `, { classId, className, userId, schoolId, classColor, interval, duration });
        console.log(product);

        const promises = []
        for (const attendee of attendees) {
            promises.push(new Promise(async (resolve, reject) => {
                try {
                    const [ { UserId: userId } ] = await getUserInfo(undefined, attendee);
                    await query(`INSERT INTO ClassAttendees VALUES (:classId, :userId, UNHEX(REPLACE(UUID(), '-', '')))`, { classId, userId });
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            }));
        }

        await Promise.all(promises);
    })
    return statusCode200({insertId: classId});
}

export async function updateClass(classId, className, schoolId, classColor, interval, duration, attendees) {
    await transactionQuery(async (query) => {
        await query(`
            UPDATE Classes SET ClassName = :className, SchoolId = :schoolId, ClassColor = :classColor, \`Interval\` = :interval, Duration = :duration
            WHERE ClassId = :classId
        `, {classId, className, schoolId, classColor, interval, duration});

        await query(`DELETE FROM ClassAttendees WHERE ClassId = :classId`, { classId });

        const promises = []
        for (const attendee of attendees) {
            promises.push(new Promise(async (resolve, reject) => {
                try {
                    const [ { UserId: userId } ] = await getUserInfo(undefined, attendee);
                    await query(`INSERT INTO ClassAttendees VALUES (:classId, :userId, UNHEX(REPLACE(UUID(), '-', '')))`, { classId, userId });
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            }));
        }

        await Promise.all(promises);
    });
    return statusCode204();
}

export async function updateClassAlertRecord(classId, interval, time) {
    await query(`
        UPDATE Classes SET \`Interval\` = :interval, Duration = :time
        WHERE ClassId = :classId
    `, { classId, interval, time });
    return statusCode204();
}

export async function deleteClass(classId) {
    await query(`DELETE FROM Classes WHERE ClassId = :classId`, { classId });
    return statusCode204();
}

export function getClassAttendees(classId) {
    return query(`
        SELECT Classes.*, Users.* FROM Classes
        JOIN ClassAttendees ON Classes.ClassId = ClassAttendees.ClassId
        LEFT JOIN Users ON ClassAttendees.UserId = Users.UserId
        WHERE Classes.ClassId = :classId
    `, {classId});
}

export function getSchools() {
    return query(`SELECT * FROM Schools`);
}

export function getSchoolPeriods(schoolId) {
    return query(`
        SELECT Periods.*, (PeriodId - FirstPeriodId) AS Period FROM Periods
        CROSS JOIN (
            SELECT PeriodId AS FirstPeriodId FROM Periods
            WHERE SchoolId = :schoolId
            ORDER BY StartTime ASC
            LIMIT 1
        ) AS tmp
        WHERE SchoolId = :schoolId
        ORDER BY StartTime ASC
    `, {schoolId});
}

export function getClassSchedules(classId) {
    return query(`
        SELECT * FROM Schedules WHERE ClassId = :classId
    `, {classId});
}

export async function setClassSchedules(classId, schedules) {
    await transactionQuery(async (query) => {
        await query(`DELETE FROM Schedules WHERE ClassId = :classId`, { classId });

        const promises = [];
        for (const schedule of schedules) {
            promises.push(new Promise(async (resolve, reject) => {
                try {
                    await query(
                        `INSERT INTO Schedules VALUES (:classId, :period, :weekdayId)`,
                        {classId, period: schedule.period, weekdayId: schedule.weekday}
                    )
                    resolve()
                }
                catch (err) {
                    reject(err)
                }
            }));
        }

        await Promise.all(promises);
    });
    return statusCode204();
}

export function getClassCalendars(classId) {
    return query(`SELECT ClassId, Content, DATE_FORMAT(OccurDate,'%Y-%m-%d') as OccurDate FROM Calendars WHERE ClassId = :classId`, {classId});
}

export function getClassCalendar(classId, date) {
    return query(`SELECT ClassId, Content, DATE_FORMAT(OccurDate,'%Y-%m-%d') as OccurDate FROM Calendars WHERE ClassId = :classId AND OccurDate = :date`, {classId, date});
}

export function addClassCalendar(classId, date, text) {
    const product = query(
        `INSERT INTO Calendars (ClassId, Content, OccurDate) VALUES (:classId, :text, :date)`,
        {classId, date, text}
    );
    return statusCode200(product);
}

export async function setClassCalendar(classId, date, text) {
    await query(
        `UPDATE Calendars SET Content = :text WHERE ClassId = :classId AND OccurDate = :date`,
        {classId, date, text}
    );
    return statusCode204();
}

export async function removeClassCalendar(classId, date) {
    await query(
        `DELETE FROM Calendars WHERE ClassId = :classId AND OccurDate = :date`,
        {classId, date}
    );
    return statusCode204();
}

export function getClassPosts(classId) {
    return query(`
        SELECT * FROM Posts
        WHERE ClassId = :classId
        ORDER BY Timestamp DESC
    `, {classId});
}

export async function addClassPost(classId, title, content) {
    const product = await query(
        `INSERT INTO Posts (ClassId, Title, Content) VALUES (:classId, :title, :content)`,
        {classId, title, content}
    );
    return statusCode200(product);
}

export function getPostReplys(postId, limit) {
    if (limit >= 0) {
        return query(`
            SELECT * FROM
            (
                SELECT Users.*, Content, Timestamp FROM Replys
                JOIN Users ON Replys.UserId = Users.UserId
                WHERE PostId = :postId
                ORDER BY Timestamp DESC
                LIMIT :limit
            ) as a
            ORDER BY Timestamp ASC
        `, {postId, limit});
    }
    return query(`
        SELECT * FROM
        (
            SELECT Users.*, Content, Timestamp FROM Replys
            JOIN Users ON Replys.UserId = Users.UserId
            WHERE PostId = :postId
            ORDER BY Timestamp DESC
        ) as a
        ORDER BY Timestamp ASC
    `, {postId});
}

export async function addPostReply(postId, userId, content) {
    const product = await query(
        `INSERT INTO Replys (PostId, UserId, Content) VALUES (:postId, :userId, :content)`,
        {postId, userId, content}
    );
    return statusCode200(product);
}

export function getUserInfo(userId, email) {
    return query(`SELECT * FROM Users WHERE ${(userId)?'UserId = :userId' : 'Email = :email'}`, {userId, email});
}

export function getClassMessages(classId, userId) {
    return query(`
        SELECT Messages.UserId = :userId as IsSelf, Messages.UserId = HostId as IsHost, UUID, UserName, Content, Timestamp FROM Messages
        LEFT JOIN Users ON Messages.UserId = Users.UserId
        LEFT JOIN Classes ON Messages.ClassId = Classes.ClassId
        LEFT JOIN ClassAttendees ON Messages.ClassId = ClassAttendees.ClassId AND Messages.UserId = ClassAttendees.UserId
        WHERE Messages.ClassId = :classId
        ORDER BY Timestamp ASC
    `, {classId, userId});
}

export function getClassMessage(classId, userId, messageId) {
    return query(`
        SELECT Messages.UserId = :userId as IsSelf, Messages.UserId = HostId as IsHost, UUID, UserName, Content, Timestamp FROM Messages
        LEFT JOIN Users ON Messages.UserId = Users.UserId
        LEFT JOIN Classes ON Messages.ClassId = Classes.ClassId
        LEFT JOIN ClassAttendees ON Messages.ClassId = ClassAttendees.ClassId AND Messages.UserId = ClassAttendees.UserId
        WHERE Messages.ClassId = :classId AND MessageId = :messageId
        ORDER BY Timestamp ASC
    `, {classId, userId, messageId});
}

export async function addClassMessage(classId, userId, content) {
    const product = await query(`
        INSERT INTO Messages (ClassId, UserId, Content) VALUES (:classId, :userId, :content)
    `, {classId, userId, content});
    return statusCode200(product);
}

export async function getAlertRecords(classId) {
    return await query(`
        SELECT RecordId, AlertType.AlertId as AlertTypeId, AlertType.AlertName as AlertType, \`Interval\`, Duration, Start, Finished, Outdated, Question, MultipleChoice, Answer, Timestamp FROM AlertRecords
        LEFT JOIN AlertType ON AlertRecords.AlertType = AlertType.AlertId
        WHERE ClassId = :classId
    `, {classId});
}

export async function getAlertRecord(recordId) {
    return await query(`
        SELECT RecordId, AlertType.AlertId as AlertTypeId, AlertType.AlertName as AlertType, \`Interval\`, Duration, Start, Finished, Outdated, Question, MultipleChoice, Answer, Timestamp FROM AlertRecords
        LEFT JOIN AlertType ON AlertRecords.AlertType = AlertType.AlertId
        WHERE RecordId = :recordId
    `, {recordId});
}

export async function getAlertRecordReacts(classId, recordId) {
    return await query(`
        SELECT ReactId, Users.UserId, UserName, Clicked, Answer, Timestamp FROM ClassAttendees
        LEFT JOIN Users
        ON ClassAttendees.UserId = Users.UserId
        LEFT JOIN AlertRecordReacts
        ON ClassAttendees.UserId = AlertRecordReacts.UserId
        WHERE ClassId = :classId AND RecordId = :recordId
    `, {classId, recordId});
}

export async function getAlertRecordReact(classId, recordId, userId) {
    return await query(`
        SELECT ReactId, Users.UserId, UserName, Clicked, Answer, Timestamp FROM ClassAttendees
        LEFT JOIN Users
        ON ClassAttendees.UserId = Users.UserId
        LEFT JOIN AlertRecordReacts
        ON ClassAttendees.UserId = AlertRecordReacts.UserId
        WHERE ClassId = :classId AND RecordId = :recordId AND AlertRecordReacts.UserId = :userId
    `, {classId, recordId, userId});
}

export async function addAlertRecordReact(recordId, userId) {
    const product = await query(`
        INSERT INTO AlertRecordReacts (RecordId, UserId) VALUES
        (:recordId, :userId)
    `, {recordId, userId});
    return statusCode200(product);

}

export async function updateAlertRecordReact(reactId, userId, click, answer) {
    await query(`
        UPDATE AlertRecordReacts SET Clicked = :click, Answer = :answer, Timestamp = NOW()
        WHERE ReactId = :reactId AND UserId = :userId
    `, {reactId, userId, click, answer});
    return statusCode204();
}

export async function getAlertReacts(classId) {
    return await query(`
        SELECT Reference.RecordId, Users.UserId, UserName, Clicked, Answer, Timestamp FROM (
            SELECT UserId, RecordId FROM ClassAttendees
            CROSS JOIN (
                SELECT DISTINCT RecordId FROM AlertRecords
                WHERE ClassId = :classId
            ) AS arr
            WHERE ClassId = :classId
        ) AS Reference
        LEFT JOIN Users
        ON Reference.UserId = Users.UserId
        LEFT JOIN AlertRecordReacts
        ON Reference.RecordId = AlertRecordReacts.RecordId AND Reference.UserId = AlertRecordReacts.UserId
    `, {classId});
}

export async function addAlertRecord(classId, alertType, interval, duration, question, multipleChoice, answer) {
    const product = await query(`
        INSERT INTO AlertRecords (ClassId, AlertType, \`Interval\`, Duration, Question, MultipleChoice, Answer) VALUES
        (:classId, :alertType, :interval, :duration, :question, :multipleChoice, :answer)
    `, {classId, alertType, interval, duration, question, multipleChoice, answer});
    return statusCode200(product)
}

export async function deleteUnfinishedRecords(classId) {
    await query(`
        DELETE FROM AlertRecords
        WHERE ClassId = :classId
        AND Finished = false
    `, {classId});
    return statusCode204();
}

export async function expireUnfinishedRecords(classId) {
    await query(`
        DELETE FROM AlertRecords
        WHERE ClassId = :classId
        AND Finished = false
    `, {classId});
    return statusCode204();
}

export async function turnOnRecord(recordId) {
    await query(`
        UPDATE AlertRecords SET Start = true
        WHERE RecordId = :recordId
    `, {recordId});
    return statusCode204();
}

export async function finishRecord(recordId) {
    return await transactionQuery(async (query) => {
        const [{Outdated: outdated}] = await query(`
            SELECT Outdated FROM AlertRecords
            WHERE RecordId = :recordId
        `, {recordId});
        if (outdated) {
            await query(`
                DELETE FROM AlertRecords
                WHERE RecordId = :recordId
            `, {recordId});
            return {"code": 204, message: "Record has been deleted."};
        }
        else {
            await query(`
                UPDATE AlertRecords SET Finished = true
                WHERE RecordId = :recordId
            `, {recordId});
            return {"code": 201, message: "Request has been successfully fulfilled."};
        }
    });
}

export async function uploadSQL() {
    try {
        const sql = await new Promise((resolve, reject)=>{
            fs.readFile('./init.sql', 'utf-8', (err, data) => {
                if (err) throw err;
                resolve(data);
            });
        });
        await query(`DROP PROCEDURE IF EXISTS ResetAllTable;`);
        await query(sql);
        const result = await query(`CALL ResetAllTable()`);
        await query(`CALL PopulateSchools()`);
        await query(`CALL PopulateAlertTypes()`);
        console.log(result);
    } catch (err) {
        console.log(err);
    }
}