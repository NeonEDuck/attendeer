import { firestore, auth } from './firebase-config.js';
import { collection, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

const lowerCase = 'abcdefghjiklnmopqrstuvwxyz';

export function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

export function randomLowerCaseString(length) {
    let randomString = '';
    for (let i = 0; i < length; i++) {
        randomString += lowerCase.charAt(Math.floor(Math.random() * lowerCase.length));
    }
    return randomString;
}

export function generateCallId() {
    return randomLowerCaseString(3) + '-' + randomLowerCaseString(3);
}

export function replaceAll(str, find, replace) {
    return str.replace(find, replace);
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

let _user = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        _user = user
        const users = collection(firestore, 'users');
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