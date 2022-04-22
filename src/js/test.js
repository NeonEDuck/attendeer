// /calls/{roomId}/users/{userId}
// /calls/{cakkId}/messages/{messageId}

import { firestore, auth } from "./firebase-config.js";
import { collection, doc, getDocs, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from 'firebase/auth';

// const roomInput = document.querySelector('#room-input');
// const userInput = document.querySelector('#user-input');
const callInput = document.querySelector('#call-input');
// const listenBtn = document.querySelector('#listen-btn');
const sendMsgBtn = document.querySelector('#send-msg-btn')
// const getMsgBtn = document.querySelector('#get-msg-btn');
const msgInput = document.getElementById('msg')

let localUserId;

// Check login
onAuthStateChanged(auth, (user) => {
    localUserId = user.uid;
})

sendMsgBtn.addEventListener('click', async () => {
    let msg = msgInput.value
    if (msg != '') {
        let calls = collection(firestore, 'calls');
        let callDoc = doc(calls, callInput.value);
        let messages = collection(callDoc, 'messages');
        let date = new Date();
        let msgDoc = doc(messages, date.toISOString());
        
        await setDoc(msgDoc, {user: localUserId, text: msg,date:date.toISOString().split('T')[0], time:date.toLocaleTimeString(), timestamp:date });
    }
});

// getMsgBtn.addEventListener('click', async () => {
//     let calls = collection(firestore, 'calls');
//     let callDoc = doc(calls, callInput.value);
//     let messages = collection(callDoc, 'messages');
//     let messageDocs = await getDocs(messages);
    
//     document.getElementById("messages").innerHTML = "";

//     messageDocs.forEach((msg) => {
//         let msgData = msg.data();
//         console.log(msgData.user);
//         console.log(msgData.text);
//         console.log(msgData.time);
//         var html;
//         html += '<li style="text-align:left;">';
//             html += msgData.user + " " + msgData.time + "<br>" + msgData.text;
//         html += "</li>";
    
//         document.getElementById("messages").innerHTML += html;
//     })

//     getMsgBtn.style.display = 'none';

// });

// listenBtn.addEventListener('click', () => {
//     let calls = collection(firestore, 'calls');
//     let callDoc = doc(calls, callInput.value);
//     let messages = collection(callDoc, 'messages');
    
//     onSnapshot(messages, (snapshot) => {
//         snapshot.docChanges().forEach((change) => {
//             if (change.type === 'added') {
//                 console.log(change.doc.data().user);
//                 console.log(change.doc.data().text);
//                 console.log(change.doc.data().time);
//             }
//         });
//     });
// });