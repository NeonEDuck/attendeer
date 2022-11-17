import { prefab } from './prefab.js';
import { ClassModal } from './classModel.js';
import { htmlToElement, fetchData, apiCall, getUser, delay, setIntervalImmediately, SECOND, AlertTypeEnum } from './util.js';
import './back-to-top.js'

const anPostPrefab      = prefab.querySelector('.post[data-catagory="announce"]');
const hwPostPrefab      = prefab.querySelector('.post[data-catagory="homework"]');
const msgPrefab         = prefab.querySelector('.msg');
const alertPrefab       = prefab.querySelector('.alert');
const ptcpPrefab        = prefab.querySelector('.ptcp');
const alertBox1         = prefab.querySelector('.box1');
const alertBox2         = prefab.querySelector('.box2');
const alertBox3         = prefab.querySelector('.box3');
const postreplyPrefab   = prefab.querySelector('.post-reply');
const loading           = document.querySelector('.loading');
const className         = document.querySelector('#class-name');
const settingBtn        = document.querySelector('#setting-btn');
const callBtn           = document.querySelector('#call-btn');
const calendarTooltip   = document.querySelector('#calendar__tooltip');
const calendarCancelBtn = document.querySelector('#calendar__cancel');
const calendarSaveBtn   = document.querySelector('#calendar__save');
const calendarEditBtn   = document.querySelector('#calendar__edit');
const calendar          = document.querySelector('.calendar');
const calendarDetailDate= calendar.querySelector('.calendar .calendar-footer .detail__date');
const calendarDetailText= calendar.querySelector('.calendar .calendar-footer .detail__text');
const calendarDetailEdit= calendar.querySelector('.calendar .calendar-footer .detail__edit');
const classSchedule     = document.querySelector('#class-schedule');
const scheduleTooltip   = document.querySelector('#class-schedule__tooltip');
const scheduleCancelBtn = document.querySelector('#class-schedule__cancel');
const scheduleSaveBtn   = document.querySelector('#class-schedule__save');
const scheduleEditBtn   = document.querySelector('#class-schedule__edit');

const tabGroup          = document.querySelector('#tab-group');
const tabGroupTabs      = tabGroup.querySelectorAll('input[type="radio"]');
const tabGroupLabels    = tabGroup.querySelectorAll('label');
const tabGroupSlider    = tabGroup.querySelector('.slider');
const writeTab          = document.querySelector('#write-tab');
const entireTab         = document.querySelector('#entire-tab');
const catagoryTabs      = document.querySelectorAll(':where(#feature-tab) [data-catagory]');
const pages             = document.querySelectorAll('#bulletin > [data-catagory]');
const postDetail        = document.querySelector('#bulletin > [data-catagory="detail"]');

const writeCatagory     = document.querySelector('#write-catagory');
const writeTitle        = document.querySelector('#write-title');
const writeContent      = document.querySelector('#write-content');
const writeSubmitBtn    = document.querySelector('#write-submit-btn');

const chatLog           = document.querySelector('#chat-log');
const downloadChatBtn   = document.querySelector('#download-chat-btn');
const downloadAlertBtn  = document.querySelector('#download-alert-btn');

const alertSearch            = document.querySelector('#alert-lookup__search');
const alertLookupTable       = document.querySelector('.alert-lookup__table[data-type="alert"]');
const alertDetailLookupTable = document.querySelector('.alert-lookup__table[data-type="alert-detail"]');
const alertLog               = document.querySelector('#alert-log');
const alertDetailLog         = document.querySelector('#alert-detail-log');
const alertLookupDetail      = document.querySelector('#alert-lookup__detail');

const classId = document.querySelector('#class-id')?.value?.trim() || document.querySelector('#class-id').innerHTML?.trim();

const classModal = new ClassModal();
let editingSchedule = false;

document.addEventListener('readystatechange', async () => {
    entireTab.click();
});


async function generateAlertLog() {
    alertLog.innerHTML = '';
    const response = await apiCall('getAlertRecords', {classId});
    if (response.status !== 200) {
        return;
    }
    const alertRecords = await response.json()
    for (const alertRecord of alertRecords) {
        const record = htmlToElement(`
            <tr class="alert-record">
                <td class="alert-record__type">${alertRecord.AlertType}</td>
                <td class="alert-record__interval">${alertRecord.Interval}</td>
                <td class="alert-record__duration">${alertRecord.Duration}</td>
                <td class="alert-record__timestamp">${new Date(alertRecord.Timestamp).toLocaleString()}</td>
                <td class="alert-record__question">${alertRecord.Question}</td>
            </tr>
        `);
        record.addEventListener('click', async (e) => {
            alertLookupTable.hidden = true;
            alertSearch.hidden = true;
            loading.hidden = false;
            alertDetailLog.hidden = true;

            while (alertDetailLog.lastChild) {
                alertDetailLog.removeChild(alertDetailLog.lastChild);
            }

            const alertDetail = htmlToElement(`
                <div id="alert-detail">
                    <button id="return-alert-list">返回</button>
                    <div id="alert-type" class="nested">警醒類型：${alertRecord.AlertType}</div>
                    <div id="alert-interval" class="nested">警醒間隔：${alertRecord.Interval}</div>
                    <div id="alert-time" class="nested">警醒持續時間：${alertRecord.Duration}</div>
                    <div id="time-start" class="nested">建立時間：${new Date(alertRecord.Timestamp).toLocaleString()}</div>
                </div>
            `);

            alertDetail.querySelector('#return-alert-list').addEventListener('click', async (e) => {
                alertSearch.hidden = false;
                alertDetailLog.hidden = true;
                alertLookupTable.hidden = false;
                alertDetailLookupTable.hidden = true;
                alertSearch.hidden = false;
                alertLookupDetail.hidden = true;
                while (alertLookupDetail.lastChild) {
                    alertLookupDetail.removeChild(alertLookupDetail.lastChild);
                }
            });
            alertLookupDetail.appendChild(alertDetail);

            const response = await apiCall('getAlertRecordReacts', {classId, recordId: alertRecord.RecordId})
            const alertReacts = await response.json();

            generateAlertSummary(alertRecord, alertReacts);

            for (const alertReact of alertReacts) {
                alertReact.Answer = (alertRecord.MultipleChoice)?alertRecord.MultipleChoice[Number(alertReact.Answer)] : alertReact.Answer;
                generateReactDetail(alertRecord.AlertTypeId, alertReact);
            }

            loading.hidden = true;
            alertDetailLog.hidden = false;
            alertDetailLookupTable.hidden = false;
            alertSearch.hidden = true;
            alertLookupDetail.hidden = false;
        });
        alertLog.insertBefore(record, alertLog.firstChild);
    }
}

function generateAlertSummary(alertRecord, alertReacts) {
    // 1 == click
    // 2 == multiple choice
    // 3 == essay question
    // 4 == vote
    if (alertRecord.AlertTypeId !== AlertTypeEnum.Click) {
        alertLookupDetail.appendChild(htmlToElement(`
            <div id="alert-question">題目：${alertRecord.Question}</div>
        `));

        if (alertRecord.AlertTypeId === AlertTypeEnum.MultipleChoice || alertRecord.AlertTypeId === AlertTypeEnum.Vote) {
            const alertSummary = htmlToElement(`<div id="alert-summary"></div>`);
            let i = 0;
            for (const option of alertRecord.MultipleChoice) {
                const amount = alertReacts.filter((x) => (x.Answer === i.toString())).length;
                const total  = alertReacts.filter((x) => (x.Answer !== null)).length;

                alertSummary.appendChild(htmlToElement(`
                    <div class="alert-summary__option ${(alertRecord.Answer === i.toString())?'answer' : ''}">
                        <p>( ${i+1} ) ${option}</p>
                        <p>${amount}人</p>
                        <p>${total>0 ? amount/total*100 : 0}%</p>
                    </div>
                `));
                i++;
            }
            alertLookupDetail.appendChild(alertSummary);
        }
    }
}

async function generateReactDetail(alertType, alertReact) {
    let clickColor = 'var(--text-color)';
    let clicked = '未加入會議';
    let answer  = '-';
    if (alertReact.Clicked !== null) {
        if (alertReact.Clicked) {
            clicked = '完成';
            answer = alertReact.Answer;
            clickColor = '#7CFC00'
        }
        else {
            clicked = '未完成';
            answer = '';
            clickColor = '#ff0000'
        }
    }

    const alertReactElement = htmlToElement(`
        <tr class="alert-react">
            <td class="alert-react__name">${alertReact.UserName}</td>
            <td class="alert-react__click" style="color: ${clickColor}">${clicked}</td>
            <td class="alert-react__ans">${(alertType !== 1)?answer:'-'}</td>
            <td class="alert-react__timestamp">${new Date(alertReact.Timestamp).toLocaleString()}</td>
        </tr>
    `);
    alertDetailLog.insertBefore(alertReactElement, alertDetailLog.firstChild);
}

alertSearch.addEventListener('keyup', () => {
    const filter = alertSearch.value.toUpperCase();
    const rows = alertLog.querySelectorAll('tr');

    for (const row of rows) {
        const text = [...row.querySelectorAll("td")].map((e) => {e.textContent || e.innerText}).join('').toUpperCase()

        if (text.indexOf(filter) !== -1) {
            row.style.display = "none";
        }
        else {
            row.style.display = "";
        }
    }
})

settingBtn.addEventListener('click', async (e) => {
    classModal.openModifyModal(classId);
});

classModal.oldSubmitForm = classModal._submitForm;
classModal._submitForm = async (e) => {
    if (await classModal.oldSubmitForm(e)) {
        window.location.reload();
    }
}

callBtn.addEventListener('click', () => {
    window.location.href = `/${classId}/meeting`
});

function toggleScheduleCell(cell) {
    if (editingSchedule) {
        if (cell.classList.contains('on')) {
            cell.classList.remove('on');
        }
        else {
            cell.classList.add('on');
        }
    }
}

calendarCancelBtn?.addEventListener('click', () => {
    calendarEditBtn.hidden = false;
    calendarCancelBtn.hidden = true;
    calendarSaveBtn.hidden = true;
    calendarTooltip.hidden = true;
    calendar.dataset.editing = false;
    calendarDetailText.hidden = false;
    calendarDetailEdit.hidden = true;
    calendarDetailEdit.value = '';
});

calendarEditBtn?.addEventListener('click', () => {
    if (!calendar.dataset.curDate) {
        return;
    }
    calendarEditBtn.hidden = true;
    calendarCancelBtn.hidden = false;
    calendarSaveBtn.hidden = false;
    calendarTooltip.hidden = false;
    calendarDetailText.hidden = true;
    calendarDetailEdit.hidden = false;
    calendar.dataset.editing = true;
});

calendarSaveBtn?.addEventListener('click', async () => {
    calendarEditBtn.hidden = false;
    calendarCancelBtn.hidden = true;
    calendarSaveBtn.hidden = true;
    calendarTooltip.hidden = true;
    calendar.dataset.editing = false;
    calendarDetailText.hidden = false;
    calendarDetailEdit.hidden = true;

    const date = calendar.dataset.curDate;
    const text = calendarDetailEdit.value.trim();

    const response = await apiCall('updateClassCalendar', {classId, date, text});
    if (response.status !== 400) {
        calendar.querySelector('.current-selected-day').dataset.detail = text;
        calendarDetailText.innerHTML = text || '無行程';
        if (text) {
            calendar.querySelector('.current-selected-day').classList.add('detailed-date');
        }
        else {
            calendar.querySelector('.current-selected-day').classList.remove('detailed-date');
        }
    }

});

classSchedule.querySelectorAll('[data-weekday]').forEach((e) => {
    e.addEventListener('click', () => {toggleScheduleCell(e)});
});

scheduleCancelBtn?.addEventListener('click', () => {
    scheduleEditBtn.hidden = false;
    scheduleCancelBtn.hidden = true;
    scheduleSaveBtn.hidden = true;
    scheduleTooltip.hidden = true;
    editingSchedule = false;
    refreshSchedule();
});

scheduleSaveBtn?.addEventListener('click', async () => {
    scheduleEditBtn.hidden = false;
    scheduleCancelBtn.hidden = true;
    scheduleSaveBtn.hidden = true;
    scheduleTooltip.hidden = true;
    editingSchedule = false;

    const cells = classSchedule.querySelectorAll('.on[data-weekday]');
    const schedules = [...cells].map(e => {return {weekday: e.dataset.weekday, period: e.dataset.period}});
    const response = await apiCall('setClassSchedules', {classId, schedules});
    console.log(response.status);
    refreshSchedule();
});

scheduleEditBtn?.addEventListener('click', () => {
    scheduleEditBtn.hidden = true;
    scheduleCancelBtn.hidden = false;
    scheduleSaveBtn.hidden = false;
    scheduleTooltip.hidden = false;
    editingSchedule = true;
    refreshSchedule();
});

let generator = null;
let currentIndex = 0;
tabGroup.style.setProperty('--length', tabGroupTabs.length);
tabGroupLabels.forEach((e, idx) => {
    e.addEventListener('mouseleave', () => {
        tabGroupSlider.style.setProperty('--offset', '0');
    });
    e.addEventListener('mouseenter', () => {
        const offset = Math.sign(idx - currentIndex);
        tabGroupSlider.style.setProperty('--offset', offset);
    });
});
tabGroupTabs.forEach((tab, idx) => {

    tab.addEventListener('click', async () => {
        currentIndex = idx;
        tabGroupSlider.style.setProperty('--index', currentIndex);
        tabGroupSlider.style.setProperty('--offset', 0);
        tabGroupLabels.forEach((e) => {
            e.classList.remove('checked');
        });
        tabGroupLabels[currentIndex].classList.add('checked');

        const catagory = tab.dataset.catagory;
        pages.forEach((p) => {p.hidden = true});
        const targetPage = document.querySelector(`#bulletin > [data-catagory="${catagory}"]`);
        targetPage.hidden = false;

        clearInterval(generator);
        if (catagory === 'entire') {
            const generatedPosts = []
            generator = setIntervalImmediately(async () => {
                const response = await apiCall('getClassPosts', {classId});
                if (response.status === 400) {
                    return;
                }
                const posts = await response.json()
                if (!generatedPosts) {
                    targetPage.innerHTML = '';
                }
                const promises = [];
                for (const post of posts) {
                    if (!generatedPosts.includes(post.PostId)) {
                        generatedPosts.push(post.PostId)
                        promises.push(new Promise(async (resolve) => {
                            resolve(await generatePost(post))
                        }));
                    }
                }

                const postElements = await Promise.all(promises);
                for (const postElement of postElements.reverse()) {
                    targetPage.insertBefore(postElement, targetPage.firstChild);
                }

            }, 20 * SECOND);
        }
        else if (catagory === 'chat') {
            chatLog.innerHTML = '';
            const response = await apiCall('getClassMessages', {classId});
            if (response.status === 400) {
                return;
            }
            const messages = await response.json()
            for (const message of messages) {
                const msg = htmlToElement(`
                    <li>
                        <p>${message.UserName} - ${new Date(message.Timestamp).toLocaleString()}</p>
                        <p>${message.Content}</p>
                    </li>
                `);
                chatLog.appendChild(msg);
            }
        }
        else if (catagory === 'alert') {
            generateAlertLog();
        }
    });
});

writeSubmitBtn.addEventListener('click', async () => {
    // const catagory = writeCatagory.options[writeCatagory.selectedIndex].value;
    const title = writeTitle.value.trim();
    const content = writeContent.value;

    if (title.length > 0) {
        // const data = {
        //     catagory,
        //     title,
        //     content,
        //     timestamp: new Date(),
        // }

        await apiCall('addClassPost', {classId, title, content})

        // await addDoc(posts, data);
    }
    writeCatagory.selectedIndex = 0;
    writeTitle.value = '';
    writeContent.value = '';
    entireTab.click();
});

downloadChatBtn.addEventListener('click', async () => {
    downloadChatBtn.disabled = true;
    downloadChatBtn.innerHTML = '載入中';
    const element = document.createElement('a');
    const response = await apiCall('getChatLog', {classId});
    const chatLogString = await response.text();
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(chatLogString));
    element.setAttribute('download', 'chatLog.txt');

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    downloadChatBtn.disabled = false;
    downloadChatBtn.innerHTML = '下載';
});

const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
    const byteCharacters = atob(b64Data);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
        const slice = byteCharacters.slice(offset, offset + sliceSize);

        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
            byteNumbers[i] = slice.charCodeAt(i);
        }

        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
    }

    const blob = new Blob(byteArrays, {type: contentType});
    return blob;
}

downloadAlertBtn.addEventListener('click', async () => {
    downloadAlertBtn.disabled = true;
    downloadAlertBtn.innerHTML = '載入中';

    const response = await apiCall('getAlertLog', {classId});
    const b64file = await response.text();
    const blob = b64toBlob(b64file, 'application/vnd.ms-excel');

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = 'alertLog.xlsx';
    link.click();
    link.remove();

    downloadAlertBtn.disabled = false;
    downloadAlertBtn.innerHTML = '下載';
});

async function refreshSchedule() {
    const response = await apiCall('getClassSchedules', {classId});
    const schedules = await response.json();

    const rows = classSchedule.querySelector('tbody').querySelectorAll('tr');
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        for (var i = 1; i < cells.length; i++) {
            cells[i].classList.remove('on');
        }
    }

    for (const schedule of schedules) {
        const cell = classSchedule.querySelector(`td[data-period="${schedule.Period}"][data-weekday="${schedule.WeekdayId}"]`)
        cell && cell.classList.add('on');
    }

}

async function generatePost(post) {
    const postElement = anPostPrefab.cloneNode(true);
    postElement.dataset.postId = post.PostId;

    postElement.querySelector('.post__title').innerHTML   = post.Title;
    postElement.querySelector('.post__content').innerHTML = post.Content;
    postElement.querySelector('.post__date').innerHTML    = new Date(post.Timestamp).toLocaleString();

    const submitInput  = postElement.querySelector('.post-reply-writer textarea');
    const submitButton = postElement.querySelector('.post-reply-writer button');
    const showButton   = postElement.querySelector('.post-reply-show');
    postElement.dataset.replyCount = 3;

    submitButton.addEventListener('click', async () => {
        const text = submitInput.value.trim();
        if (text.length > 0) {
            submitInput.value = '';
            apiCall('addPostReply', {classId, postId: post.PostId, content: text}).then((response) => {
                if (response.status === 400) {
                    console.log(response.status);
                    return;
                }
                populateReply(postElement, Number(postElement.dataset.replyCount));
            })
        }
    });
    showButton.addEventListener('click', () => {
        if (postElement.dataset.replyCount == -1) {
            postElement.dataset.replyCount = 3;
            showButton.innerHTML = '顯示所有留言';
        }
        else {
            postElement.dataset.replyCount = -1;
            showButton.innerHTML = '只顯示部分留言';
        }
        populateReply(postElement, Number(postElement.dataset.replyCount));
    });

    await populateReply(postElement, Number(postElement.dataset.replyCount));
    setInterval(() => {
        populateReply(postElement, Number(postElement.dataset.replyCount));
    }, 20 * SECOND);

    return postElement;
}

async function populateReply(post, count) {
    const replyContainer = post.querySelector('.post-reply-container');
    const response = await apiCall('getPostReplys', {classId, postId: post.dataset.postId, limit: count});
    const replys = await response.json();

    replyContainer.innerHTML = '';
    for (const reply of replys) {
        const replyElement = postreplyPrefab.cloneNode(true);
        replyElement.querySelector('.post__name').innerHTML = reply.UserName;
        replyElement.querySelector('.post__picture').src = reply.PhotoURL;
        replyElement.querySelector('.post__date').innerHTML = (new Date(reply.Timestamp)).toLocaleString();
        replyElement.querySelector('.post-reply__content').innerHTML = reply.Content;

        replyContainer.appendChild(replyElement);
    }
}

/*
 *  Calendar Script
 */

const month_names = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']

function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0 && year % 400 !== 0) || (year % 100 === 0 && year % 400 ===0)
}

function getFebDays(year) {
    return isLeapYear(year) ? 29 : 28
}

async function generateCalendar(month, year) {
    const calendar_days = calendar.querySelector('.calendar-days')
    const calendar_header_year = calendar.querySelector('#year')
    const calendar_header_month = calendar.querySelector('#month')

    const days_of_month = [31, getFebDays(year), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    const currDate = new Date()
    if (month == undefined) month = currDate.getMonth()
    if (year == undefined) year = currDate.getFullYear()

    const calendarEvents = {};
    const response = await apiCall('getClassCalendars', {classId});
    const calendars = await response.json();

    calendar_days.innerHTML = ''

    for (const calendar of calendars) {
        calendarEvents[calendar.OccurDate] = calendar.Content;
    }
    console.log(calendarEvents)

    const curr_month = `${month_names[month]}`
    calendar_header_month.innerHTML = curr_month
    calendar_header_year.innerHTML = year

    // get first day of month

    const first_day = new Date(year, month, 1)

    for (let i = 0; i <= days_of_month[month] + first_day.getDay() - 1; i++) {
        const dayDiv = document.createElement('div')
        const day = i - first_day.getDay() + 1;
        if (i >= first_day.getDay()) {
            dayDiv.classList.add('calendar-day-hover')
            dayDiv.innerHTML = i - first_day.getDay() + 1
            if (day === currDate.getDate() && year === currDate.getFullYear() && month === currDate.getMonth()) {
                dayDiv.classList.add('curr-date')
            }
            const detail = calendarEvents[`${year}-${month+1}-${day}`]
            if (detail) {
                dayDiv.classList.add('detailed-date')
                dayDiv.dataset.detail = detail;
            }
            dayDiv.addEventListener('click', () => {
                if (calendar.dataset.editing === 'true') {
                    return;
                }
                for (const dd of calendar.querySelectorAll('.current-selected-day')) {
                    dd.classList.remove('current-selected-day');
                }
                dayDiv.classList.add('current-selected-day');
                const calendar_detail_date = calendar.querySelector('.calendar-footer .detail__date');
                const calendar_detail_text = calendar.querySelector('.calendar-footer .detail__text');
                const calendar_detail_edit = calendar.querySelector('.calendar-footer .detail__edit');
                calendar_detail_date.innerHTML = `${year}-${month+1}-${i - first_day.getDay() + 1}`
                calendar.dataset.curDate = `${year}-${month+1}-${i - first_day.getDay() + 1}`;
                if (dayDiv.dataset.detail) {
                    calendar_detail_text.innerHTML = dayDiv.dataset.detail;
                    calendar_detail_edit.value = dayDiv.dataset.detail;
                }
                else {
                    calendar_detail_text.innerHTML = `無行程`;
                    calendar_detail_edit.value = '';
                }
            });
        }
        calendar_days.appendChild(dayDiv)
    }
}

// const month_list = calendar.querySelector('.month-list')

// month_names.forEach((e, index) => {
//     const month = htmlToElement(`
//         <div>
//             <div data-month="${index}">
//                 ${e}
//             </div>
//         </div>
//     `);
//     month.querySelector('div').onclick = () => {
//         month_list.classList.remove('show')
//         curr_month.value = index
//         generateCalendar(index, curr_year.value)
//     }
//     month_list.appendChild(month)
// })

// const month_picker = calendar.querySelector('#month-picker')

// month_picker.onclick = () => {
//     month_list.classList.add('show')
// }

const currDate = new Date()

const curr_month = {value: currDate.getMonth()}
const curr_year = {value: currDate.getFullYear()}

generateCalendar(curr_month.value, curr_year.value)

document.querySelector('#prev-year').onclick = () => {
    --curr_year.value
    generateCalendar(curr_month.value, curr_year.value)
}

document.querySelector('#next-year').onclick = () => {
    ++curr_year.value
    generateCalendar(curr_month.value, curr_year.value)
}

document.querySelector('#prev-month').onclick = () => {
    --curr_month.value
    if (curr_month.value < 0) {
        curr_month.value = 11;
        curr_year.value--;
    }
    generateCalendar(curr_month.value, curr_year.value)
}

document.querySelector('#next-month').onclick = () => {
    ++curr_month.value;
    if (curr_month.value >= 12) {
        curr_month.value = 0;
        curr_year.value++;
    }
    generateCalendar(curr_month.value, curr_year.value)
}