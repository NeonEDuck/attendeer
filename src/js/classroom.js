import { onSnapshot, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import './base.js'
import { getUser } from './util.js';

const className = document.querySelector('#class-name');
const callBtn = document.querySelector('#call-btn');
const classSchedule = document.querySelector('#class-schedule');
const callId = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

const calls = collection(firestore, 'calls');

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
};

callBtn.addEventListener('click', () => {
    window.location.href = `/${callId}/meeting`
});