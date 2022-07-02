import { firestore } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import 'webrtc-adapter';
import { Button, Cam, Peer } from './conponents.js';
import { MINUTE, delay, debounce, getLocalUser, getUserData, randomLowerCaseString, replaceAll, getRandom, setIntervalImmediately } from './util.js';

const socket = io('/');

// HTML elements
const camPrefab  = document.querySelector('.cam');
const msgPrefab  = document.querySelector('.msg');

const micBtn         = document.querySelector('#mic-btn');
const webcamBtn      = document.querySelector('#webcam-btn');
const enterBtn       = document.querySelector('#enter-btn');
const screenShareBtn = document.querySelector('#screen-share-btn');
const hangUpBtn      = document.querySelector('#hang-up-btn');
const messageBtn     = document.querySelector('#message-btn');
const sendMsgBtn     = document.querySelector('#send-msg-btn');
const alertBtn       = document.querySelector('#alert-btn');
const alertBtnTime   = document.querySelector('#alert-btn__time');

const confirmPanel   = document.querySelector('#confirm-panel');
const meetingPanel   = document.querySelector('#meeting-panel');

const cpCamContainer = document.querySelector('#confirm-panel__cam-container');
const camContainer   = document.querySelector('#cam-container');
const camArea        = document.querySelector('#cam-area');
const toolbar        = document.querySelector('#toolbar');
const chat           = document.querySelector('#chat');
const chatRoom       = document.querySelector('#chat__room')
const msgInput       = document.querySelector('#msg-input');
const callId         = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

// Global variable
let localUserId = null;
let webcamStream = null;
const localStreams = {
    'webcam': null,
    'screenShare': null,
    'audio': null,
};
Cam.init(camArea, camContainer);
Peer.init(localStreams, socket);
let unmute = true;
let webcamOn = false;
const localCams = {
    'webcam': new Cam('local', 'webcam', cpCamContainer),
    'screenShare': new Cam('local', 'screen-share', cpCamContainer),
}

// Default state
webcamBtn.disabled = true;
hangUpBtn.disabled = true;
localCams.screenShare.node.hidden = true;

// Delete prefab
camPrefab.remove();
msgPrefab.remove();

// Firestore
const calls = collection(firestore, 'calls');
const callDoc = doc(calls, callId);
const participants = collection(callDoc, 'participants');
const alertRecords = collection(callDoc, 'alertRecords');
let messages = collection(callDoc, 'messages');

document.onreadystatechange = async () => {
    const user = await getLocalUser();
    let callDocSnapshot;

    console.log('checking permission');
    try {
        callDocSnapshot = await getDoc(callDoc);
    }
    catch (err) {
        console.log('no permission');
        return;
    }
    localUserId = user.uid;
    Peer.localUserId = localUserId;
    localCams.webcam.name.innerHTML = user.displayName;
    localCams.webcam.profile.src = user.photoURL;
    localCams.screenShare.name.innerHTML = user.displayName;
    localCams.screenShare.profile.hidden = true;
    micBtn.disabled = false;
    webcamBtn.disabled = false;
    screenShareBtn.disabled = false;
    enterBtn.disabled = false;
    await requestStreamPermission();
    await refreshStream();
}

micBtn.addEventListener('click', async () => {
    try {
        localStreams.audio = localStreams.audio || await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    }
    catch {
        unmute = false;
        return;
    }

    unmute = !unmute;
    Button.toggleOpen(micBtn, unmute);
    console.log(`microphone is ${unmute?'on':'off'}`);
    localStreams.audio.getAudioTracks()[0].enabled = unmute;
    await refreshStream();
});

webcamBtn.addEventListener('click', async () => {
    try {
        webcamStream = webcamStream || await navigator.mediaDevices.getUserMedia({ video: {undefined}, audio: false });
    }
    catch {
        webcamOn = false;
        return;
    }
    webcamOn = !webcamOn;
    Button.toggleOpen(webcamBtn, webcamOn);
    if (webcamOn) {
        localCams.webcam.profile.hidden = true;
        localCams.webcam.video.srcObject = webcamStream;
    }
    else {
        localCams.webcam.profile.hidden = false;
        localCams.webcam.video.srcObject = null;
    }
    await refreshStream();
});

screenShareBtn.addEventListener('click', async () => {
    if (localStreams.screenShare) {
        console.log('turn off screen share');
        localStreams.screenShare.getTracks().forEach(function(track) {
            track.stop();
        });
        localStreams.screenShare = null;
        localCams.screenShare.node.hidden = true;
        localCams.screenShare.video.srcObject = null;
        for (const [id, peer] of Object.entries(Peer.peers)) {
            for (let sender of peer.senders.screenShare) {
                console.log(`remove from ${id} ${sender}`)
                peer.pc.removeTrack(sender);
            }
            peer.senders.screenShare = [];
        }
    }
    else {
        console.log('turn on screen share');
        const displayMediaStreamConstraints = {
            localStream: true // or pass HINTS
        };
        if (navigator.mediaDevices.getDisplayMedia) {
            localStreams.screenShare = await navigator.mediaDevices.getDisplayMedia(displayMediaStreamConstraints);
        } else {
            localStreams.screenShare = await navigator.getDisplayMedia(displayMediaStreamConstraints);
        }
        localCams.screenShare.node.hidden = false;
        localCams.screenShare.video.srcObject = localStreams.screenShare;
        for (const [id, peer] of Object.entries(peerDict)) {
            localStreams.screenShare.getTracks().forEach((track) => {
                console.log(`add to ${id}`)
                peer.senders.screenShare.push(peer.pc.addTrack(track, localStreams.screenShare));
            });
        }
    }
})

enterBtn.addEventListener('click', async () => {
    console.log(`join call: ${callId} as ${localUserId}`);
    socket.emit('join-call', callId, localUserId);

    socket.on('user-connected', async (socketId, userId) => {
        console.log(`user connected: ${userId}`);
        if (userId in Peer.peers) {
            // wtf?
            return;
        }
        Peer.peers[userId] = new Peer(socketId, userId);
    });

    socket.on('user-disconnected', async (userId) => {
        console.log(`user disconnected: ${userId}`);
        if (!(userId in Peer.peers)) {
            return;
        }

        Peer.peers[userId].release();
        delete Peer.peers[userId];
    });

    socket.on('catch-offer', async (socketId, data) => {
        const { userId, desc, streams, timestamp } = data;
        console.log(`catch offer from: ${userId}`);
        if (!Peer.peers[userId]) {
            Peer.peers[userId] = new Peer(socketId, userId);
        }
        const peer = Peer.peers[userId];
        const isStateGood = peer.pc.signalingState === 'stable' ||
                            (peer.polite === false && peer.pc.signalingState === 'have-local-offer');
        // console.log(`offer condition [signalingState]: ${isStateGood}, state = ${peer.pc.signalingState}`);
        // console.log(`offer condition [!offerCreated]: ${!peer?.offerCreated}`);
        // console.log(`offer condition [new timestamp]: ${timestamp > peer?.timestamp}`);

        if (!isStateGood || (peer?.offerCreated && timestamp <= peer?.timestamp)) {
            console.log('reject to set offer');
            return;
        }
        console.log('confirm to throw answer');
        peer.pc.setRemoteDescription(desc);
        peer.oldStreams = peer.streams || streams;
        peer.streams = streams;
        peer.polite = false;
        console.log('set remote offer');

        console.log('answer to user');
        {
            const { pc } = peer;
            pc.onicecandidate = (event) => {
                event.candidate && socket.emit('throw-candidate', socketId, {userId: localUserId, candidate: event.candidate.toJSON()});
            };
            const answerDesc = await pc.createAnswer();
            await pc.setLocalDescription(answerDesc);

            const streams = {};
            for (const streamType in localStreams) {
                if (localStreams[streamType] && localStreams[streamType].length != 0) {
                    streams[streamType] = localStreams[streamType].id;
                }
            }

            const data = {
                userId: localUserId,
                desc: pc.localDescription,
                streams,
                timestamp: Date.now(),
            };

            console.log(`throw answer to: ${userId}`);
            socket.emit('throw-answer', socketId, data);
        }
    });

    socket.on('catch-answer', async (socketId, data) => {
        const { userId, desc, streams, timestamp } = data;
        console.log(`catch answer to: ${userId}`);
        const peer = Peer.peers[userId];
        const isStateGood = peer.pc.signalingState === 'have-local-offer';
        // console.log(`answer condition [signalingState]: ${isStateGood}, state = ${peerDict[doc.id].pc.signalingState}`);

        if (!isStateGood) {
            console.log('reject to set answer');
            return;
        }
        peer.pc.setRemoteDescription(desc);
        peer.oldStreams = peer.streams || streams;
        peer.streams = streams;
        peer.polite = true;
        console.log('set remote answer');
    });

    socket.on('catch-candidate', async (data) => {
        console.log(`catch candidate`);
        const { userId, candidate } = data;
        const peer = Peer.peers[userId];
        while (!peer.pc.currentRemoteDescription) {
            await delay(100);
        }
        const iceCandidate = new RTCIceCandidate(candidate);
        if (iceCandidate && data) {
            peer.pc.addIceCandidate(iceCandidate);
        }
    });

    let chatInit = true;

    async function addMessageToChat(msgData) {
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
        chatRoom.appendChild(msg);
    }
    onSnapshot(messages, async (snapshot) => {
        if (chatInit) {
            chatInit = false;

            const q = query(messages, orderBy('timestamp', 'asc'));
            const messageDocs = await getDocs(q);
            for (const msgDoc of messageDocs.docs) {
                await addMessageToChat(msgDoc.data());
            }
        }
        else {
            snapshot.docChanges().forEach( async (change) => {
                if (change.type === 'added') {
                    await addMessageToChat(change.doc.data());
                }
            });
        }

        await delay(100);

        chatRoom.scrollTop = chatRoom.scrollHeight;
    });

    const { alert, host } = (await getDoc(callDoc)).data();
    const { interval, time: duration } = alert;
    if (localUserId === host){
        console.log('您是會議主辦人');
        setupAlertScheduler(interval, duration);
    }
    else {
        console.log('您不是會議主辦人');
        setupAlertListener();
    }

    confirmPanel.remove();
    camContainer.appendChild(localCams.webcam.node);
    camContainer.appendChild(localCams.screenShare.node);
    Cam.resizeAll();
    toolbar.insertBefore(micBtn, hangUpBtn);
    toolbar.insertBefore(webcamBtn, hangUpBtn);
    toolbar.insertBefore(screenShareBtn, hangUpBtn);
    hangUpBtn.disabled = false;
    enterBtn.disabled = true;
});

hangUpBtn.addEventListener('click', async () => {
    socket.emit('leave-call');
    for (const userId in Peer.peers) {
        Peer.peers[userId].release();
    }
    for (let streamType in localStreams) {
        if (localStreams[streamType] && localStreams[streamType].length != 0) {
            localStreams[streamType].getTracks().forEach(function(track) {
                track.stop()
            });
            localStreams[streamType] = null;
        }
    }

    meetingPanel.hidden = true;
    hangUpBtn.disabled = true;
});

messageBtn.addEventListener('click', async () => {
    if (meetingPanel.classList.contains('open-message')) {
        meetingPanel.classList.remove('open-message');
        chat.hidden = false;
    }
    else {
        meetingPanel.classList.add('open-message');
        chat.hidden = true;
    }
    resizeCam();
});

sendMsgBtn.addEventListener('click', async () => {
    let text = msgInput?.value?.trim();
    if (text) {
        const msgDoc = doc(messages);
        const data = {
            user: localUserId,
            text,
            timestamp: new Date(),
        };

        await setDoc(msgDoc, data);
    }
    msgInput.value = '';
});

msgInput.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // press enter
        event.preventDefault();
        sendMsgBtn.click();
    }
});

alertBtn.addEventListener('click', async () => {
    if (alertBtn.dataset.id) {
        const alertDoc     = doc(alertRecords, alertBtn.dataset.id);
        const participants = collection(alertDoc, 'participants');
        const userDoc      = doc(participants, localUserId);

        const data = {
            timestamp: new Date()
        }
        await setDoc(userDoc, data);

        alertBtn.hidden = true;
    }
});

async function requestStreamPermission() {
    try {
        localStreams.audio = localStreams.audio || await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    }
    catch {
        console.log('microphone request failed');
        Button.toggleOpen(micBtn.open, false);
        unmute = false;
    }
    try {
        webcamStream = webcamStream || await navigator.mediaDevices.getUserMedia({ video: {undefined}, audio: false });
    }
    catch {
        console.log('webcam request failed');
        webcamOn = false;
    }
}

async function refreshStream() {
    if (webcamOn && localStreams.webcam === null) {
        localStreams.webcam = webcamStream;
        for (const [id, peer] of Object.entries(Peer.peers)) {
            localStreams.webcam.getTracks().forEach((track) => {
                console.log(`add webcam to ${id}`)
                peer.senders.webcam.push(peer.pc.addTrack(track, localStreams.webcam));
            });
        }
    }
    else if (!webcamOn && localStreams.webcam !== null) {
        localStreams.webcam = null;
        for (const [id, peer] of Object.entries(Peer.peers)) {
            for (const sender of peer.senders.webcam) {
                console.log(`remove webcam from ${id} ${sender}`)
                peer.pc.removeTrack(sender);
            }
            peer.senders.webcam = [];
        }
    }

    for (const [id, peer] of Object.entries(Peer.peers)) {
        if (!peer.senders.audio) {
            localStreams.audio?.getTracks().forEach((track) => {
                console.log(`add audio to ${id}`)
                peer.senders.audio.push(peer.pc.addTrack(track, localStreams.audio));
            });
        }
    }
}

function setupAlertScheduler(interval, duration) {
    console.log('setupAlertScheduler');
    setInterval(async () => {
        const alertDoc = doc(alertRecords);
        const data = {
            timestamp: new Date(),
            duration: duration, //時長
            alertType: 'click',
        };
        console.log('add alert');

        await setDoc(alertDoc, data);
    }, interval * MINUTE);
}

function setupAlertListener() {
    console.log('setupAlertListener');
    onSnapshot(alertRecords, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const { alertType, duration, timestamp: timestampStart } = change.doc.data();
                const timestampEnd = new Date(timestampStart.toMillis() + duration * MINUTE);
                const now = new Date();
                if (timestampStart <= now && now < timestampEnd) {
                    console.log('see alert');
                    alertBtn.hidden = false;
                    alertBtn.dataset.id = change.doc.id;

                    if (Math.random() < 0.5) {
                        alertBtn.style.left  = `${getRandom(50)}%`;
                        alertBtn.style.right = `initial`;
                    }
                    else {
                        alertBtn.style.right = `${getRandom(50)}%`;
                        alertBtn.style.left  = `initial`;
                    }

                    if (Math.random() < 0.5) {
                        alertBtn.style.top     = `${getRandom(50)}%`;
                        alertBtn.style.bottom  = `initial`;
                    }
                    else {
                        alertBtn.style.bottom  = `${getRandom(50)}%`;
                        alertBtn.style.top     = `initial`;
                    }

                    const countDownInterval = setIntervalImmediately(() => {
                        const now = new Date();

                        const distance = timestampEnd.getTime() - now.getTime();

                        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                        alertBtnTime.innerHTML = `${minutes}`.padStart(2, '0') + ':' + `${seconds}`.padStart(2, '0')
                    }, 1000);

                    setTimeout(() => {
                        clearInterval(countDownInterval);
                        alertBtn.hidden = true;
                    }, timestampEnd.getTime() - now.getTime());
                }
            }
        });
    });
}

window.onresize = () => {Cam.resizeAll()};