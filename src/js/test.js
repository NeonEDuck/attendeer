import { firestore, auth } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import { getAuth,onAuthStateChanged } from 'firebase/auth';
import { getUser } from "./login.js";
import { delay } from './util.js';

// HTML elements
const enterBtn   = document.querySelector('#enter-btn');

const alertBtn = document.querySelector('#alert-btn');
const callId     = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();
let localUserId = null;
let hostId = null;

// Firestore
const calls = collection(firestore, 'calls');
const callDoc = doc(calls, callId);

enterBtn.addEventListener('click', async () => {
    //取得當前登入使用者ID
    const Auth = getAuth();
    onAuthStateChanged(Auth, (user) => {
    if (user) {
        localUserId = user.uid;
        console.log(localUserId);
        //獲取會議室資訊
        getDoc(callDoc).then(docSnap => {
            const { alert, attendees, host } = docSnap.data();
            hostId = host;
            console.log(host);
            if(localUserId === hostId){
                console.log('您是會議主辦人');
                const { interval, time, notifies} = alert;
                console.log(interval,time,notifies);
                setInterval(intervalFunc, interval*1000, interval, time, notifies);
            }else{
                console.log('您不是會議主辦人');
            }
        })
    }
    });
});

function intervalFunc(interval, time, notifies) {
    console.log(interval,time,notifies);

    setTimeout(closeAlert, time*1000, interval, time, notifies);

    alertBtn.hidden = false;

    function getRandom(x){
        return Math.floor(Math.random()*x);
    };

    alertBtn.style.left = getRandom(90)+'%';
    alertBtn.style.top = getRandom(70)+'%';

    notifies = true;

    const data = {
        alert: {
            interval,
            time,
            notifies,
        },
    }

    const callDoc = doc(calls, callId);
    updateDoc(callDoc, data);
}

function closeAlert(interval, time, notifies) {
    alertBtn.hidden = true;

    notifies = false;

    const data = {
        alert: {
            interval,
            time,
            notifies,
        },
    }

    const callDoc = doc(calls, callId);
    updateDoc(callDoc, data);
}

alertBtn.addEventListener('click', async () => {
    alertBtn.hidden = true;
});