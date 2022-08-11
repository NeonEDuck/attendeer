import { onSnapshot, collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import './base.js'
import { getUser, getUserData } from './util.js';

const anPostPrefab      = document.querySelector('.prefab > .post[data-catagory="announce"]');
const hwPostPrefab      = document.querySelector('.prefab > .post[data-catagory="homework"]');
const postreplyPrefab   = document.querySelector('.post-reply');
const className         = document.querySelector('#class-name');
const callBtn           = document.querySelector('#call-btn');
const classSchedule     = document.querySelector('#class-schedule');

const tabs              = document.querySelectorAll('#bulletin-tab-container button');
const backToTopTab      = document.querySelector('#back-to-top-tab');
const entireTab   = document.querySelector('#bulletin-tab-container > [data-catagory="entire"]');
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
    entireTab.click();
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
});

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