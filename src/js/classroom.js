import { onSnapshot, collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import { prefab } from './prefab.js';
import { ClassModal } from './classModel.js';
import { getUser, getUserData, delay } from './util.js';

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
const classSchedule     = document.querySelector('#class-schedule');
const calendarTooltip   = document.querySelector('#calendar__tooltip');
const calendarCancelBtn = document.querySelector('#calendar__cancel');
const calendarSaveBtn   = document.querySelector('#calendar__save');
const calendarEditBtn   = document.querySelector('#calendar__edit');
const calendar          = document.querySelector('.calendar');
const calendarDetailDate= calendar.querySelector('.calendar .calendar-footer .detail__date');
const calendarDetailText= calendar.querySelector('.calendar .calendar-footer .detail__text');
const calendarDetailEdit= calendar.querySelector('.calendar .calendar-footer .detail__edit');
const scheduleTooltip   = document.querySelector('#class-schedule__tooltip');
const scheduleCancelBtn = document.querySelector('#class-schedule__cancel');
const scheduleSaveBtn   = document.querySelector('#class-schedule__save');
const scheduleEditBtn   = document.querySelector('#class-schedule__edit');

const tabs              = document.querySelectorAll(':where(#bulletin-horizontal-tab-container, #bulletin-vertical-tab-container) button');
const writeTab          = document.querySelector('#write-tab');
const backToTopTab      = document.querySelector('#back-to-top-tab');
const entireTab         = document.querySelector('#bulletin-vertical-tab-container > [data-catagory="entire"]');
const catagoryTabs      = document.querySelectorAll(':where(#bulletin-horizontal-tab-container, #bulletin-vertical-tab-container) [data-catagory]');
const pages             = document.querySelectorAll('#bulletin > [data-catagory]');
const postDetail        = document.querySelector('#bulletin > [data-catagory="detail"]');

const writeCatagory     = document.querySelector('#write-catagory');
const writeTitle        = document.querySelector('#write-title');
const writeContent      = document.querySelector('#write-content');
const writeSubmitBtn    = document.querySelector('#write-submit-btn');

const chatLog           = document.querySelector('#chat-log');
const downloadChatBtn   = document.querySelector('#download-chat-btn');
const downloadAlertBtn  = document.querySelector('#download-alert-btn');

const alertSearch       = document.querySelector('#alert__Search');
const listAlert         = document.querySelector('.list__alert');
const listPtcp          = document.querySelector('.list__ptcp');
const alertLog          = document.querySelector('#alert-log');
const ptcpLog           = document.querySelector('#ptcp-log');
const wrapper           = document.querySelector('#wrapper');

const callId = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

const calls    = collection(firestore, 'calls');
const callDoc  = doc(calls, callId);
const users    = collection(firestore, 'users');
const posts    = collection(callDoc, 'posts');
const messages = collection(callDoc, 'messages');
const events   = collection(callDoc, 'events');
const alertRecords = collection(callDoc, 'alertRecords');


const classModal = new ClassModal();
let prevSchedule = [];
let editingSchedule = false;

document.onreadystatechange = async () => {
    const user = await getUser();

    const callDoc = await getDoc(doc(calls, callId));
    const { name, host, schedule } = callDoc.data();
    if (user.uid === host){
        settingBtn.hidden = false;
        calendarEditBtn.hidden = false;
        scheduleEditBtn.hidden = false;
        writeTab.hidden = false;
    }

    className.innerHTML = name;

    let localUserId = user.uid;

    if( localUserId != host ) {
        downloadAlertBtn.remove();
        alertSearch.remove();
        listAlert.remove();
        const alertNope = document.querySelector('#alert-nope');
        alertNope.hidden = false;
    }

    let chatInit = true;
    onSnapshot(messages, async (snapshot) => {
        if (chatInit) {
            chatInit = false;

            const q = query(messages, orderBy('timestamp', 'asc'));
            const messageDocs = await getDocs(q);
            for (const msgDoc of messageDocs.docs) {
                await addMessageToLog(msgDoc.data());
            }
        }
        else {
            snapshot.docChanges().forEach( async (change) => {
                if (change.type === 'added') {
                    await addMessageToLog(change.doc.data());
                }
            });
        }

        await delay(100);
    });

    if( localUserId === host ) {
        let alertInit = true;
        onSnapshot(alertRecords, async (snapshot) => {
            if (alertInit) {
                alertInit = false;
                const q = query(alertRecords, orderBy('timestamp', 'asc'));
                const alertDocs = await getDocs(q);
                for (const alertDoc of alertDocs.docs) {
                    await addAlertToLog(alertDoc);
                }
            }
            else {
                snapshot.docChanges().forEach( async (change) => {
                    if (change.type === 'modified') {
                        await addAlertToLog(change.doc);
                    }
                });
            }

            await delay(100);
        });
    }

    const rows = classSchedule.querySelector('tbody').querySelectorAll('tr');
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        for (var i = 1; i < cells.length; i++) {
            const cell = cells[i];
            cell.addEventListener('click', () => {toggleScheduleCell(cell)});
        }
    }

    if (schedule) {
        prevSchedule = schedule;
    }
    refreshSchedule();
    entireTab.click();
};

async function addMessageToLog(msgData) {
    const { user, text, timestamp } = msgData;
    const timeString = timestamp.toDate().toLocaleString();
    const { name } = await getUserData(user) || { name: "???" };

    const msg = msgPrefab.cloneNode(true);
    const msgUser = msg.querySelector('.msg__user');
    const msgTime = msg.querySelector('.msg__timestamp');
    const msgText = msg.querySelector('.msg__text');
    msgUser.innerHTML = name;
    msgTime.innerHTML = timeString;
    msgText.innerHTML = text;
    // chatLog.insert(msg, chatLog.firstChild);
    chatLog.appendChild(msg);
}

async function addAlertToLog(alertData) {
    const { alertType:type,interval,duration,timestamp, done } = alertData.data();

    if( done === true ) {

        const timeString = timestamp.toDate().toLocaleString();

        const alert = alertPrefab.cloneNode(true);
        const alertType = alert.querySelector('.alert__type');
        const alertInterval = alert.querySelector('.alert__interval');
        const alertDuration = alert.querySelector('.alert__duration');
        const alertTime = alert.querySelector('.alert__timestamp');
        const alertQst = alert.querySelector('.alert__question');
        
        if( type != 'click' ) {
            const { question } = alertData.data();
            alertQst.innerHTML = question;
        }else {
            alertQst.innerHTML = '-';
        }

        alertType.innerHTML = type;
        alertInterval.innerHTML = interval;
        alertDuration.innerHTML = duration;
        alertTime.innerHTML = timeString;
        alertLog.insertBefore(alert, alertLog.children[0]);
        
        alert.addEventListener('click', async (e) => {
            
            listAlert.classList.toggle("close");
            alertSearch.hidden = true;
            loading.style.display = 'block';
            ptcpLog.hidden = true;

            while (ptcpLog.lastChild) {
                ptcpLog.removeChild(ptcpLog.lastChild);
            }
            
            const { question, multipleChoice, answear } = alertData.data();
            const alertDoc      = doc(alertRecords, alertData.id);
            const participants  = collection(alertDoc, 'participants');
            const querySnapshot = await getDocs(participants);
            const { attendees } = (await getDoc(callDoc)).data();
            const { host } = ( await getDoc(callDoc)).data();

            const Box1 = alertBox1.cloneNode(true);
            const alertType = Box1.querySelector('#alert-type');
            const alertInterval = Box1.querySelector('#alert-interval');
            const alertTime = Box1.querySelector('#alert-time');
            const timeStart = Box1.querySelector('#time-start');
            const returnAlertList = Box1.querySelector('#return-alert-list');

            alertType.innerHTML = '警醒類型：' + type;
            alertInterval.innerHTML = "警醒間隔：" + interval;
            alertTime.innerHTML = '警醒持續時間：' + duration;
            timeStart.innerHTML = '建立時間：' + timeString;
            returnAlertList.addEventListener('click', async (e) => {
                alertSearch.hidden = false;
                ptcpLog.hidden = true;
                listAlert.classList.toggle("close");
                listPtcp.classList.toggle("close");
                alertSearch.hidden = false;
                wrapper.hidden = true;
                while (wrapper.lastChild) {
                    wrapper.removeChild(wrapper.lastChild);
                }
            });
            wrapper.appendChild(Box1);

            if( type != 'click' ){
                const Box2 = alertBox2.cloneNode(true);
                const alertQuestion = Box2.querySelector('#alert-question');
                alertQuestion.innerHTML = '題目： ' + question + ' ?';
                wrapper.appendChild(Box2);
                if( type === 'multiple choice' || type === 'vote' ){
                    const Box3 = alertBox3.cloneNode(true);
                    let i = 1;
                    for (const option of multipleChoice) {
                        const alertOptions = document.createElement('div');
                        alertOptions.classList.add('alert-options','nested');
                        Box3.appendChild(alertOptions);
                        const p1 = document.createElement('p');
                        p1.innerHTML = '( ' + i + ' ) ' + option;
                        alertOptions.appendChild(p1);
                        if( answear != undefined ) {
                            if( answear === i.toString() ) {
                                alertOptions.classList.add("answear");
                            }
                        }
                        const q = query(participants, where('answear', '==', i.toString() ));
                        const snapshot1 = await getDocs(q);
                        let amount = 0;
                        snapshot1.forEach(async () => {
                            amount++;
                        });
                        const p2 = document.createElement('p');
                        p2.innerHTML = amount + '人';
                        alertOptions.appendChild(p2);
                        let total = 0;
                        querySnapshot.forEach( async (docc) => {
                            const { answear } = docc.data();
                            if( answear != undefined ) {
                                total++;
                            }
                        });
                        const p3 = document.createElement('p');
                        if(total!=0) {
                            p3.innerHTML = amount/total*100 + '%';
                        }else {
                            p3.innerHTML = '0%';
                        }
                        alertOptions.appendChild(p3);
                        i++;
                    }
                    wrapper.appendChild(Box3);
                }
            }

            for (const userId of attendees) {
                ptcpLogFunction(userId, alertData);
            }

            loading.style.display = 'none';
            ptcpLog.hidden = false;
            listPtcp.classList.toggle("close");
            alertSearch.hidden = true;
            wrapper.hidden = false;
        });
    }

}

async function ptcpLogFunction(userId ,alertData) {
    const alertDoc      = doc(alertRecords, alertData.id);
    const participants  = collection(alertDoc, 'participants');
    const querySnapshot = await getDocs(participants);
    const { host } = ( await getDoc(callDoc)).data();
    if( userId != host ) {
        let clickfield = '未加入會議';
        let clickColor = 'var(--text-color)';
        let answearfield = '-';
        let timeStringfield = '-';
        const user = doc(users, userId);
        const data = (await getDoc(user)).data();
        querySnapshot.forEach( async (docc) => {
            if( userId === docc.id) {
                const { answear,click,timestamp } = docc.data();
                if( timestamp != undefined ) {
                    timeStringfield = timestamp.toDate().toLocaleString();
                }
                if( click === true ) {
                    clickfield = '完成';
                    clickColor = '#7CFC00'
                }else if(click === false ){
                    clickfield = '未完成';
                    clickColor = '#ff0000'
                }
                if( answear != undefined ) {
                    answearfield = answear;
                }
            }
        });
        const ptcp = ptcpPrefab.cloneNode(true);
        const ptcpName = ptcp.querySelector('.ptcp__name');
        const ptcpClick = ptcp.querySelector('.ptcp__click');
        const ptcpAns = ptcp.querySelector('.ptcp__ans');
        const ptcpTimestamp = ptcp.querySelector('.ptcp__timestamp');
    
        ptcpName.innerHTML = data.name;
        ptcpClick.innerHTML = clickfield;
        ptcpClick.style.color = clickColor;
        ptcpAns.innerHTML = answearfield;
        ptcpTimestamp.innerHTML = timeStringfield;
        ptcpLog.insertBefore(ptcp, ptcpLog.children[0]);
    }
}

alertSearch.onkeyup = function() {myFunction()};
function myFunction() {

  let filter, tr, td1, td2, td3, td4, td5, i, txtValue;
  filter = alertSearch.value.toUpperCase();
  tr = alertLog.getElementsByTagName('tr');

  for (i = 0; i < tr.length; i++) {
    td1 = tr[i].getElementsByTagName("td")[0];
    td2 = tr[i].getElementsByTagName("td")[1];
    td3 = tr[i].getElementsByTagName("td")[2];
    td4 = tr[i].getElementsByTagName("td")[3];
    td5 = tr[i].getElementsByTagName("td")[4];
    txtValue = (td1.textContent || td1.innerText) + (td2.textContent || td2.innerText) + (td3.textContent || td3.innerText) + (td4.textContent || td4.innerText) + (td5.textContent || td5.innerText);
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
        tr[i].style.display = "";
    } else {
        tr[i].style.display = "none";
    }
  }
}

settingBtn.addEventListener('click', async (e) => {
    classModal.openModifyModal(callId);
});

classModal.oldSubmitForm = classModal._submitForm;
classModal._submitForm = async (e) => {
    await classModal.oldSubmitForm(e);
    window.location.reload();
}

callBtn.addEventListener('click', () => {
    window.location.href = `/${callId}/meeting`
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

calendarCancelBtn.addEventListener('click', () => {
    calendarEditBtn.hidden = false;
    calendarCancelBtn.hidden = true;
    calendarSaveBtn.hidden = true;
    calendarTooltip.hidden = true;
    calendar.dataset.editing = false;
    calendarDetailText.hidden = false;
    calendarDetailEdit.hidden = true;
    calendarDetailEdit.value = '';
});

calendarEditBtn.addEventListener('click', () => {
    calendarEditBtn.hidden = true;
    calendarCancelBtn.hidden = false;
    calendarSaveBtn.hidden = false;
    calendarTooltip.hidden = false;
    calendarDetailText.hidden = true;
    calendarDetailEdit.hidden = false;
    calendar.dataset.editing = true;
});

calendarSaveBtn.addEventListener('click', async () => {
    calendarEditBtn.hidden = false;
    calendarCancelBtn.hidden = true;
    calendarSaveBtn.hidden = true;
    calendarTooltip.hidden = true;
    calendar.dataset.editing = false;
    calendarDetailText.hidden = false;
    calendarDetailEdit.hidden = true;

    const date = calendar.dataset.curDate;
    const text = calendarDetailEdit.value.trim();

    const q = query(events, where('date', '==', date), limit(1));
    const dateDocs = await getDocs(q);

    if (text !== '') {
        if (dateDocs.size > 0) {
            calendar.querySelector('.current-selected-day')?.classList.add('detailed-date');
            await updateDoc(dateDocs.docs[0].ref, {text});
        }
        else {
            calendar.querySelector('.current-selected-day')?.classList.add('detailed-date');
            await addDoc(events, {date, text});
        }
    }
    else {
        if (dateDocs.size > 0) {
            calendar.querySelector('.current-selected-day')?.classList.remove('detailed-date');
            await deleteDoc(dateDocs.docs[0].ref);
        }
    }

    calendar.querySelector('.current-selected-day').dataset.detail = text;
    calendarDetailText.innerHTML = text || '無行程';
});

scheduleCancelBtn.addEventListener('click', () => {
    scheduleEditBtn.hidden = false;
    scheduleCancelBtn.hidden = true;
    scheduleSaveBtn.hidden = true;
    scheduleTooltip.hidden = true;
    editingSchedule = false;
    refreshSchedule();
});

scheduleSaveBtn.addEventListener('click', async () => {
    scheduleEditBtn.hidden = false;
    scheduleCancelBtn.hidden = true;
    scheduleSaveBtn.hidden = true;
    scheduleTooltip.hidden = true;
    editingSchedule = false;

    const rows = classSchedule.querySelector('tbody').querySelectorAll('tr');
    const schedule = [];
    for (let i = 0; i < rows.length; i++) {
        const cells = rows[i].querySelectorAll('td');
        for (var j = 1; j < cells.length; j++) {
            if (cells[j].classList.contains('on')) {
                schedule.push((j)*100+i+1);
            }
        }
    }
    await updateDoc(callDoc, {schedule});
    prevSchedule = schedule;
    refreshSchedule();
});

scheduleEditBtn.addEventListener('click', () => {
    scheduleEditBtn.hidden = true;
    scheduleCancelBtn.hidden = false;
    scheduleSaveBtn.hidden = false;
    scheduleTooltip.hidden = false;
    editingSchedule = true;
    refreshSchedule();
});

for (const tab of catagoryTabs) {
    tab.addEventListener('click', async () => {
        turnOnTab(tab);
        const catagory = tab.dataset.catagory;
        let targetPage;
        for (const page of pages) {
            page.hidden = true;
            if (page.dataset.catagory == catagory) {
                targetPage = page;
            }
        }
        if (catagory !== 'write' && catagory !== 'chat' && catagory !== 'alert') {
            targetPage.innerHTML = '';
            let q = query(posts, orderBy('timestamp', 'desc'));
            if (catagory !== 'entire') {
                q = query(posts, where('catagory', '==', catagory), orderBy('timestamp', 'desc'));
            }

            const postDocs = await getDocs(q);
            for (const postDoc of postDocs.docs) {
                const post = await generatePost(postDoc);

                targetPage.appendChild(post);
            }
        }
        targetPage.hidden = false;
    });
}

backToTopTab.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

writeSubmitBtn.addEventListener('click', async () => {
    const catagory = writeCatagory.options[writeCatagory.selectedIndex].value;
    const title = writeTitle.value.trim();
    const content = writeContent.value;

    if (title.length > 0) {
        const data = {
            catagory,
            title,
            content,
            timestamp: new Date(),
        }

        await addDoc(posts, data);
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
    const chatLogString = await getChatLog();
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(chatLogString));
    element.setAttribute('download', 'chatLog.txt');

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    downloadChatBtn.disabled = false;
    downloadChatBtn.innerHTML = '下載';
});

async function getChatLog() {
    const msgs = chatLog.querySelectorAll('.msg');
    const messageDocs = await getDocs(messages);
    console.log(messageDocs);
    let log = '';
    for (const msg of messageDocs.docs) {
        const { user, timestamp, text } = msg.data();
        const timeString = timestamp.toDate().toLocaleString();
        const { name } = await getUserData(user) || { name: "???" };
        log += name + ' '
                + timeString + '\n'
                + text + '\n';
    }
    return log;
}

downloadAlertBtn.addEventListener('click', async () => {
    downloadAlertBtn.disabled = true;
    downloadAlertBtn.innerHTML = '載入中';
    const element = document.createElement('a');
    const alertLogString = await getAlertLog();
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(alertLogString));
    element.setAttribute('download', 'alertLog.csv');

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    downloadAlertBtn.disabled = false;
    downloadAlertBtn.innerHTML = '下載';
});

async function getAlertLog() {
    const alertDocs = await getDocs(alertRecords);
    let log = '';
    for (const alert of alertDocs.docs) {
        const { alertType:type,interval,duration,timestamp, done } = alert.data();
        const alertDoc      = doc(alertRecords, alert.id);
        const participants  = collection( alertDoc,'participants' );
        const querySnapshot = await getDocs(participants);
        const { attendees } = (await getDoc(callDoc)).data();
        const { host } = ( await getDoc(callDoc)).data();
        if( done === true ) {
            const timeString = timestamp.toDate().toLocaleString();

            log += '警醒類型,警醒間隔,持續時間,建立時間' + '\n';
            log += type + ',' + interval + ',' + duration + ',' + timeString + '\n';

            if( type != 'click' ) {
                const { question } = alert.data();
                log += '問題,' + question + '\n';
                if( type === 'multiple choice' || type === 'vote' ){
                    const { multipleChoice, answear } = alert.data();
                    let i = 1;
                    for (const option of multipleChoice) {
                        log += '選項' + i + ',' + option + ',';
                        const q = query(participants, where('answear', '==', i.toString() ));
                        const snapshot1 = await getDocs(q);
                        let amount = 0;
                        snapshot1.forEach(async () => {;
                            amount++;
                        });
                        let total = 0;
                        querySnapshot.forEach( async (docc) => {
                            const { answear } = docc.data();
                            if( answear != undefined ) {
                                total++;
                            }
                        });
                        if(total!=0) {
                            log += amount + '人,' + amount/total*100 + '%' + '\n';
                        }else {
                            log += amount + '人,0%' + '\n';
                        }
                        i++;
                    }
                    if( answear != undefined ) {
                        if( answear === i.toString() ) {
                            log += '答案,' + answear + '\n';
                        }
                    }
                }
            }
            log += '姓名,點擊狀態,回答,完成時間\n';

            for (const userId of attendees) {
                log = await downloadAlert(userId, log, alert);
            }
        }
    }
    
    return log;
}

async function downloadAlert(userId, log, alert) {
    const alertDoc      = doc(alertRecords, alert.id);
    const participants  = collection( alertDoc,'participants' );
    const querySnapshot = await getDocs(participants);
    const { host } = ( await getDoc(callDoc)).data();
    if( userId != host ) {
        let clickfield = '未加入會議';
        let answearfield = '-';
        let timeStringfield = '-';
        const user = doc(users, userId);
        const data = (await getDoc(user)).data();
        querySnapshot.forEach( async (docc) => {
            if( userId === docc.id) {
                const { answear,click,timestamp } = docc.data();
                if( timestamp != undefined ) {
                    timeStringfield = timestamp.toDate().toLocaleString();
                }
                if( click === true ) {
                    clickfield = '完成';
                }else if(click === false ){
                    clickfield = '未完成';
                }
                if( answear != undefined ) {
                    answearfield = answear;
                }
            }
        });
        
        log +=  data.name + ',' + clickfield + ',' + answearfield + ',' + timeStringfield + '\n';
    }

    return log;
}

function refreshSchedule() {
    const rows = classSchedule.querySelector('tbody').querySelectorAll('tr');
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        for (var i = 1; i < cells.length; i++) {
            cells[i].classList.remove('on');
        }
    }
    for (const date of prevSchedule) {
        const weekday = Math.trunc(date / 100);
        const when    = date % 100;
        const cells = rows[when-1].querySelectorAll('td');
        cells[weekday].classList.add('on');
    }
}

function turnOnTab(target) {
    for (const tab of tabs) {
        tab.classList.remove('btn-on');
    }
    target?.classList?.add('btn-on');
}

async function generatePost(postDoc) {
    const { title, content, timestamp, catagory } = postDoc.data();
    let post = anPostPrefab.cloneNode(true);
    post.dataset.postId = postDoc.id

    switch (catagory) {
        case 'announce':
            post.querySelector('.post__catagory').innerHTML = '公告';
            const writerPic    = post.querySelector('.post-reply-writer .post__picture');
            const writerName   = post.querySelector('.post-reply-writer .post__name');
            const submitInput  = post.querySelector('.post-reply-writer textarea');
            const submitButton = post.querySelector('.post-reply-writer button');
            const showButton   = post.querySelector('.post-reply-show');
            post.dataset.replyCount = 3;
            const user = await getUser();
            writerPic.src = user.photoURL;
            writerName.innerHTML = user.displayName;

            submitButton.addEventListener('click', async () => {
                const text = submitInput.value.trim();
                if (text.length > 0) {
                    submitInput.value = '';
                    const replys = collection(postDoc.ref, 'replys');
                    await addDoc(replys, {user: user.uid, content: text, timestamp: new Date()})
                }
                populateReply(post, post.dataset.replyCount);
            });
            showButton.addEventListener('click', () => {
                if (post.dataset.replyCount == -1) {
                    post.dataset.replyCount = 3;
                    showButton.innerHTML = '顯示所有留言';
                }
                else {
                    post.dataset.replyCount = -1;
                    showButton.innerHTML = '只顯示部分留言';
                }
                populateReply(post, post.dataset.replyCount);
            });
            populateReply(post, 3);
            break;
        case 'homework':
            post = hwPostPrefab.cloneNode(true);
            post.dataset.postId = postDoc.id
            post.querySelector('.post__catagory').innerHTML = '作業';
            post.querySelector('.post__state').innerHTML = "尚未繳交";
            post.querySelector('.post__upload-btn').addEventListener('click', () => {
                // for (const page of pages) {
                //     page.hidden = true;
                // }
                // postDetail.hidden = false;
            });
            post.querySelector('.post__check-detail').addEventListener('click', async () => {
                turnOnTab();
                for (const page of pages) {
                    page.hidden = true;
                }

                const { attendees } = (await getDoc(callDoc)).data();

                let table = '';
                for (const userId of attendees) {

                    const user = doc(users, userId);
                    const { name } = (await getDoc(user)).data();
                    table += `<tr><td>${name}</td><td>${"尚未繳交"}</td><td>${"-"}</td></tr>`;
                }
                const result = `<table><tr><th>名字</th><th>繳交進度</th><th>繳交時間</th></tr>${table}</table>`

                postDetail.querySelector('.user-records').innerHTML = result;
                postDetail.hidden = false;
            });
            break;
    }

    post.querySelector('.post__title').innerHTML = title;
    post.querySelector('.post__content') && (post.querySelector('.post__content').innerHTML = content);
    post.querySelector('.post__date').innerHTML = timestamp.toDate().toLocaleDateString();

    return post;
}

async function populateReply(post, count) {
    const replyContainer = post.querySelector('.post-reply-container');
    const postDoc = doc(posts, post.dataset.postId);
    const replys = collection(postDoc, 'replys');
    let q;
    if (count > 0) {
        q = query(replys, orderBy('timestamp', 'desc'), limit(count));
    }
    else {
        q = query(replys, orderBy('timestamp', 'desc'));
    }

    const replyDocs = await getDocs(q);

    replyContainer.innerHTML = '';
    for (const replyDoc of replyDocs.docs.reverse()) {
        const { user: userId, content, timestamp } = replyDoc.data();
        const { name, photo } = await getUserData(userId);
        const reply = postreplyPrefab.cloneNode(true);
        reply.querySelector('.post__name').innerHTML = name;
        reply.querySelector('.post__picture').src = photo;
        reply.querySelector('.post__date').innerHTML = timestamp.toDate().toLocaleDateString();
        reply.querySelector('.post-reply__content').innerHTML = content;

        replyContainer.appendChild(reply);
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

    const days_of_month = [31, getFebDays(year), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

    calendar_days.innerHTML = ''

    const currDate = new Date()
    if (month == undefined) month = currDate.getMonth()
    if (year == undefined) year = currDate.getFullYear()

    const calendarEvents = {};
    const eventDocs = await getDocs(events);

    for (const eventDoc of eventDocs.docs) {
        const { date, text } = eventDoc.data();
        calendarEvents[date] = text;
    }
    console.log(calendarEvents)


    const curr_month = `${month_names[month]}`
    month_picker.innerHTML = curr_month
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
            const detail = calendarEvents[`${year}/${month+1}/${day}`]
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
                calendar_detail_date.innerHTML = `${year}/${month+1}/${i - first_day.getDay() + 1}`
                calendar.dataset.curDate = `${year}/${month+1}/${i - first_day.getDay() + 1}`;
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

const month_list = calendar.querySelector('.month-list')

month_names.forEach((e, index) => {
    const month = document.createElement('div')
    month.innerHTML = `<div data-month="${index}">${e}</div>`
    month.querySelector('div').onclick = () => {
        month_list.classList.remove('show')
        curr_month.value = index
        generateCalendar(index, curr_year.value)
    }
    month_list.appendChild(month)
})

const month_picker = calendar.querySelector('#month-picker')

month_picker.onclick = () => {
    month_list.classList.add('show')
}

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