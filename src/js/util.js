import { firestore, auth } from './firebase-config.js';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const LOWER_CASE = 'abcdefghjiklnmopqrstuvwxyz';
export const MINUTE = 60 * 1000;

export function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function getRandom(x){
    return Math.floor(Math.random() * x);
};

export function randomLowerCaseString(length) {
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += LOWER_CASE.charAt(getRandom(LOWER_CASE.length));
    }
    return randomString;
}

export function generateCallId() {
    return randomLowerCaseString(3) + '-' + randomLowerCaseString(3);
}

export function replaceAll(str, find, replace) {
    return str.replace(find, replace);
}

export function dateToMinutes(date) {
    return date.getHours() * 60 + date.getMinutes();
}

export function timeToMinutes({hour, minute}) {
    return hour * 60 + minute;
}

export function htmlToElement(html) {
    let template = document.createElement('template');
    template.innerHTML = html;
    return template.content.firstElementChild;
}

const fetchedData = {}

export async function fetchData(path) {
    if (path in fetchedData) {
        return new Promise((res, rej) => {
            return fetchedData[path];
        });
    }
    const response = await fetch(path, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
    })

    return response.json();
}

export function setIntervalImmediately(callback, ms) {
    callback();
    return setInterval(callback, ms);
}

export function debounce(cb, delay=1000) {
    let timeout;

    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            cb(...args);
        }, delay);
    }
}

const users = collection(firestore, 'users');
let _user = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        _user = user
        const userDoc = doc(users, user.uid);
        const userSnapshot = await getDoc(userDoc);

        let data = {
            name: user.displayName,
            email: user.email,
            photo: user.photoURL,
        };

        if (!userSnapshot.exists()) {
            await setDoc(userDoc, data);
        }
        else {
            // 先檢查是否有改變，再上傳資料
            //?不知道更新流量比較需要注意還是獲取流量才比較需要注意
            const {name, photo} = userSnapshot.data();
            if (data.name !== name || data.photo !== photo) {
                await updateDoc(userDoc, data);
            }
        }
    }
});

export function getUser() {
    return new Promise(async (resolve) => {
        while (_user === null) {
            await delay(100);
        }
        resolve(_user);
    });
}

const userDict = {};

export async function getUserData(userId) {
    if (!userDict[userId]) {
        const userDoc = doc(users, userId);

        const userSnapshot = await getDoc(userDoc)
        userDict[userId] = userSnapshot.data();
    }

    return userDict[userId];
}