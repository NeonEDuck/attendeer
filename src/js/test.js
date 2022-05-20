import { firestore, auth } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getUser } from './login.js';
import { delay } from './util.js';

const alertBtn = document.querySelector('#alert-btn');
const callId     = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

// Firestore
const calls = collection(firestore, 'calls');
const callDoc = doc(calls, callId);
getDoc(callDoc).then(docSnap => {
    const { alert, attendees } = docSnap.data();
    const { interval, time } = alert;
    console.log(interval,time);
})

function getRandom(x){
    return Math.floor(Math.random()*x);
};

alertBtn.style.left = getRandom(90)+'%';
alertBtn.style.top = getRandom(70)+'%';



alertBtn.addEventListener('click', async () => {
    alertBtn.hidden = true;
});