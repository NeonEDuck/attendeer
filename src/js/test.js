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
let alertRecords = collection(callDoc, 'alertRecords');

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
            const { interval, time} = alert;
            console.log(interval,time);
            console.log(host);
            if(localUserId === hostId){
                console.log('您是會議主辦人');
                setInterval(intervalFunc, interval*1000, interval, time, attendees, host); //interval*60000
            }else{
                console.log('您不是會議主辦人');

                onSnapshot(alertRecords, async (snapshot) => {
                    snapshot.docChanges().forEach( async (change) => {
                        if (change.type === 'added') {
                            console.log(change.doc.data());

                            alertBtn.hidden = false;

                            function getRandom(x){
                                return Math.floor(Math.random()*x);
                            };

                            alertBtn.style.left = getRandom(90)+'%';
                            alertBtn.style.top = getRandom(70)+'%';

                            setTimeout(closeAlert, time*1000, interval, time); //time*60000
                        }
                    });
                });
            }
        })
    }
    });
});

async function intervalFunc(interval, time, attendees, host) {
    console.log(interval,time);

    const alertDoc = doc(alertRecords);
    const data = {
        timestamp: new Date(),
        time: time, //時長
        alertType: 'Click', 
    };

    await setDoc(alertDoc, data);
    
    let participants = collection(alertDoc, 'participants');

    attendees.forEach( async (user) => {
        if (user != host) {
            const userId = doc(participants,user);

            const data2 = {
                text: '未點擊',
                clickTime: new Date(),
            }
        
            await setDoc(userId, data2);
        } 
    });
}

function closeAlert(interval, time) {
    alertBtn.hidden = true;
}

alertBtn.addEventListener('click', async () => {
    alertBtn.hidden = true;
});