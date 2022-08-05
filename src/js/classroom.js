import { onSnapshot, collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import './base.js'
import { getUser } from './util.js';

const postPrefab        = document.querySelector('.post');
const postCommentPrefab = document.querySelector('.post-comment');
const className         = document.querySelector('#class-name');
const callBtn           = document.querySelector('#call-btn');
const classSchedule     = document.querySelector('#class-schedule');

const tabs              = document.querySelectorAll('#bulletin-tab-container button');
const backToTopTab      = document.querySelector('#back-to-top-tab');
const announcementTab   = document.querySelector('#bulletin-tab-container > [data-catagory="announcement"]');
const catagoryTabs      = document.querySelectorAll('#bulletin-tab-container [data-catagory]');
const pages             = document.querySelectorAll('#bulletin > [data-catagory]');
const postDetail        = document.querySelector('#bulletin > [data-catagory="detail"]');

const writeCatagory     = document.querySelector('#write-catagory');
const writeTitle        = document.querySelector('#write-title');
const writeContent      = document.querySelector('#write-content');
const writeSubmitBtn    = document.querySelector('#write-submit-btn');

const callId = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

const calls    = collection(firestore, 'calls');
const callDoc  = doc(calls, callId);
const users    = collection(firestore, 'users');
const posts    = collection(callDoc, 'posts');

document.onreadystatechange = async () => {
    const user = await getUser();

    const callDoc = await getDoc(doc(calls, callId));
    console.log(callId)
    console.log(className)
    const { name } = callDoc.data();

    className.innerHTML = name;

    const rows = classSchedule.querySelector('tbody').querySelectorAll('tr');
    for (const row of rows) {
        const cells = row.querySelectorAll('td');
        cells[3].classList.add('on');
    }
    announcementTab.click();
};

callBtn.addEventListener('click', () => {
    window.location.href = `/${callId}/meeting`
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
        if (catagory !== 'write') {
            targetPage.innerHTML = '';
            let q = query(posts, orderBy('timestamp', 'desc'));
            if (catagory === 'homework') {
                q = query(posts, where('catagory', '==', 'homework'), orderBy('timestamp', 'desc'));
            }

            const postDocs = await getDocs(q);
            for (const postDoc of postDocs.docs) {
                const { title, content, timestamp, catagory } = postDoc.data();

                const post = postPrefab.cloneNode(true);

                post.querySelector('.post__title').innerHTML = title;
                post.querySelector('.post__content').innerHTML = content;
                post.querySelector('.post__date').innerHTML = timestamp.toDate().toLocaleDateString();
                post.querySelector('.post__catagory').innerHTML = catagory === 'announcement' ? '公告' : '作業';

                if (catagory === 'homework') {
                    post.querySelector('.post-comment-container').remove();
                    post.querySelector('.post-comment-writer').remove();
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
                }
                else {

                    post.querySelector('.post__upload-btn').remove();
                    const submitInput  = post.querySelector('.post-comment-writer textarea');
                    const submitButton = post.querySelector('.post-comment-writer button');
                    // submitButton.addEventListener('click', () => {
                    //     const message = submitInput.value.trim();
                    //     if (message.length > 0) {

                    //         message.value = '';
                    //     }
                    // });
                }

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
});

function turnOnTab(target) {
    for (const tab of tabs) {
        tab.classList.remove('btn-on');
    }
    target?.classList?.add('btn-on');
}