import { onSnapshot, collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import './base.js';
import { prefab } from './prefab.js';
import { ClassModal } from './classModel.js';
import { getUser, getUserData, delay } from './util.js';

const anPostPrefab      = prefab.querySelector('.post[data-catagory="announce"]');
const hwPostPrefab      = prefab.querySelector('.post[data-catagory="homework"]');
const msgPrefab         = prefab.querySelector('.msg');
const postreplyPrefab   = prefab.querySelector('.post-reply');
const className         = document.querySelector('#class-name');
const settingBtn        = document.querySelector('#setting-btn');
const callBtn           = document.querySelector('#call-btn');
const classSchedule     = document.querySelector('#class-schedule');
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

const callId = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

const calls    = collection(firestore, 'calls');
const callDoc  = doc(calls, callId);
const users    = collection(firestore, 'users');
const posts    = collection(callDoc, 'posts');
const messages = collection(callDoc, 'messages');

const classModal = new ClassModal();
let prevSchedule = [];
let editingSchedule = false;

document.onreadystatechange = async () => {
    const user = await getUser();

    const callDoc = await getDoc(doc(calls, callId));
    const { name, host, schedule } = callDoc.data();
    if (user.uid === host){
        settingBtn.hidden = false;
        scheduleEditBtn.hidden = false;
        writeTab.hidden = false;
    }

    className.innerHTML = name;

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
        if (catagory !== 'write' && catagory !== 'chat') {
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
    const element = document.createElement('a');
    const chatLogString = await getChatLog();
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(chatLogString));
    element.setAttribute('download', 'chatLog.txt');

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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