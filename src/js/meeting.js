import { firestore } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { prefab } from './prefab.js';
import 'webrtc-adapter';
import { Button, Cam, Peer } from './conponents.js';
import { MINUTE, delay, debounce, getUser, getUserData, getRandom, fetchData, setIntervalImmediately, dateToMinutes, htmlToElement, apiCall, AlertTypeEnum } from './util.js';
import { sidebarListener, dataMultipleChoice } from './sidebar.js';

const socket = io('/');

// HTML elements
const body = document.querySelector('body');

const camPrefab    = prefab.querySelector('.cam');
const msgPrefab    = prefab.querySelector('.msg');
const myMsgPrefab  = prefab.querySelector('.my-msg');
const notificationPrefab  = prefab.querySelector('.notification');

const sidebarRight      = document.querySelector(".sidebar-right");
const icons             = document.querySelectorAll('.ico');

const micBtn            = document.querySelector('#mic-btn');
const webcamBtn         = document.querySelector('#webcam-btn');
const enterBtn          = document.querySelector('#enter-btn');
const screenShareBtn    = document.querySelector('#screen-share-btn');
const notifyDismissBtn  = document.querySelector('#notify-dismiss-btn');
const plusTestBtn       = document.querySelector('#plus-test-btn');
const minusTestBtn      = document.querySelector('#minus-test-btn');
const hangUpBtn         = document.querySelector('#hang-up-btn');
const messageBtn        = document.querySelector('#message-btn');
const sendMsgBtn        = document.querySelector('#send-msg-btn');
// const alertBtn       = document.querySelector('#alert-btn');
// const alertBtnTime   = document.querySelector('#alert-btn__time');
const alertModule = document.querySelector('#alert');

const confirmPanel   = document.querySelector('#confirm-panel');
const meetingPanel   = document.querySelector('#meeting-panel');

const cpCamContainer        = document.querySelector('#confirm-panel__cam-container');
const camContainer          = document.querySelector('#cam-container');
const pinnedCamContainer    = document.querySelector('#pinned-cam-container');
const camArea               = document.querySelector('#cam-area');
const notificationContainer = document.querySelector('#notification-container');
const toolbar               = document.querySelector('#toolbar');
const chat                  = document.querySelector('#chat');
const chatRoom              = document.querySelector('#chat__room')
const msgInput              = document.querySelector('#msg-input');
const classId               = document.querySelector('#class-id')?.value?.trim()  || document.querySelector('#class-id').innerHTML?.trim();
const localUserId           = document.querySelector('#user-id')?.value?.trim()   || document.querySelector('#user-id').innerHTML?.trim();
const userName              = document.querySelector('#user-name')?.value?.trim() || document.querySelector('#user-name').innerHTML?.trim();
const photoURL              = document.querySelector('#photo-URL')?.value?.trim() || document.querySelector('#photo-URL').innerHTML?.trim();
const hostId                = document.querySelector('#host-id')?.value?.trim()   || document.querySelector('#host-id').innerHTML?.trim();

// Audio
const notificationSound = new Audio('/audio/notification_sound.wav');

// Global variable
let isHost = localUserId === hostId;
let webcamStream = null;
const localStreams = {
    'webcam': null,
    'screenShare': null,
    'audio': null,
};
Cam.init(camArea, camContainer, pinnedCamContainer);
Peer.init(localUserId, localStreams, socket);
let unmute = true;
let webcamOn = false;
const localCams = {
    'webcam': new Cam('local', 'webcam', cpCamContainer),
    'screenShare': new Cam('local', 'screen-share', cpCamContainer),
}
const dismissTimePadding = 10;
let schoolPeriods;
let notifyDismissCoolDownTimeInMinute = 1;
let inNotifyDismissCoolDown = false;
let dismissedClasses = [];
export let globalAlertType;
export let globalInterval;
export let globalTime;
export let globalQuestion;
export let globalAnswear;
export let globalMultipleChoice;

export function setGlobalAlert(alertType, interval, time, question, answear, globalmultipleChoice) {
    globalAlertType = alertType;
    globalInterval = interval;
    globalTime = time;
    globalQuestion = question;
    globalAnswear = answear;
    globalMultipleChoice = globalmultipleChoice;
}

// Default state
webcamBtn.disabled = true;
hangUpBtn.disabled = true;
localCams.webcam.node.querySelector('.cam__menu').hidden = true;
localCams.screenShare.node.hidden = true;
localCams.screenShare.video.muted = true;

export let intervalID;

// Firestore
const calls = collection(firestore, 'calls');
const callDoc = doc(calls, classId);
const alertRecords = collection(callDoc, 'alertRecords');
let messages = collection(callDoc, 'messages');

document.onreadystatechange = async () => {
    localCams.webcam.name.innerHTML = userName;
    localCams.webcam.profile.src = photoURL;
    localCams.screenShare.name.innerHTML = userName;
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

    const turnOffScreenShare = async () => {
        console.log('turn off screen share');
        localStreams.screenShare.getTracks().forEach(function(track) {
            track.stop();
        });
        localStreams.screenShare = null;
        localCams.screenShare.turnOff();
        for (const [id, peer] of Object.entries(Peer.peers)) {
            for (let sender of peer.senders.screenShare) {
                console.log(`remove from ${id} ${sender}`)
                peer.pc.removeTrack(sender);
            }
            peer.senders.screenShare = [];
        }
    }
    const turnOnScreenShare = async () => {
        console.log('turn on screen share');
        const displayMediaStreamConstraints = {
            localStream: true, // or pass HINTS
            video: {
                cursor: "always"
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        };
        if (navigator.mediaDevices.getDisplayMedia) {
            localStreams.screenShare = await navigator.mediaDevices.getDisplayMedia(displayMediaStreamConstraints);
        } else {
            localStreams.screenShare = await navigator.getDisplayMedia(displayMediaStreamConstraints);
        }
        localCams.screenShare.node.hidden = false;
        localCams.screenShare.video.srcObject = localStreams.screenShare;
        localStreams.screenShare.getVideoTracks()[0].onended = function () {
            turnOffScreenShare();
        };
        for (const [id, peer] of Object.entries(Peer.peers)) {
            localStreams.screenShare.getTracks().forEach((track) => {
                console.log(`add to ${id}`)
                peer.senders.screenShare.push(peer.pc.addTrack(track, localStreams.screenShare));
            });
        }
    }

    if (localStreams.screenShare) {
        turnOffScreenShare();
    }
    else {
        turnOnScreenShare();
    }
})

notifyDismissBtn.addEventListener('click', async () => {
    if (isHost) {
        console.log('click')
        const [ name, timeInMinute ] = getDismissTime();
        if (name && !dismissedClasses.find(item => item.name === name)) {
            dismissedClasses.push({name, time: new Date()});
            console.log(dismissedClasses);

            notifyDismissBtn.disabled = true;
            notificationContainer.querySelectorAll('.notification[data-type="dismiss-class"] .notification__close-btn').forEach((e) => {
                e.click();
            });
            let dismissEndTime = new Date((new Date()).getTime() + timeInMinute * MINUTE);
            socket.emit('throw-dismiss-class', {name, time: dismissEndTime});
            spawnDismissTimerNotification(dismissEndTime);
        }
    }
    else {
        socket.emit('throw-notify-dismiss', {localUserId});
        notifyDismissBtn.disabled = true;
    }
});

enterBtn.addEventListener('click', async () => {
    const response1 = await apiCall('getClass', {classId});
    const classData = await response1.json();
    const { Interval: interval, Duration: duration } = classData;
    console.log(classData);
    console.log(classData.Interval);
    console.log(interval);
    const response2 = await apiCall('getSchoolPeriods', {schoolId: classData.SchoolId});
    schoolPeriods = await response2.json();
    schoolPeriods = schoolPeriods.map((e) => {
        e.StartTime = new Date(e.StartTime);
        e.EndTime = new Date(e.EndTime);
        return e;
    })

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

    socket.on('catch-disable-notify-dismiss', async () => {
        console.log(`catch disable notify dismiss cooldown`);
        notifyDismissBtn.disabled = true;
        notifyDismissBtn.dataset.tooltip = '老師已收到下課鈴';
    });

    socket.on('catch-enable-notify-dismiss', async () => {
        console.log(`catch enable notify dismiss cooldown`);
        notifyDismissBtn.disabled = false;
        delete notifyDismissBtn.dataset.tooltip;
    });

    socket.on('catch-dismiss-class', (data) => {
        console.log(`catch dismiss class`);
        const { name, time } = data;
        dismissedClasses.push(data);

        spawnDismissTimerNotification(new Date(time));
    });

    socket.on('catch-inform-status', (data) => {
        console.log(`catch inform status`);
        console.log(data);

        dismissedClasses = data.dismissedClasses;
        if (dismissedClasses.length > 0) {
            const recentDismiss = dismissedClasses[dismissedClasses.length-1];
            const classTimeInfo = schoolPeriods.data.find(item => item.PeriodName === recentDismiss.name);
            const recentDismissTimeInMinute = dateToMinutes(classTimeInfo.EndTime) - dateToMinutes(classTimeInfo.StartTime);
            const recentDismissEndTime = new Date(new Date(recentDismiss.time).getTime() + recentDismissTimeInMinute * MINUTE);

            if (recentDismissEndTime - (new Date()) > 0) {
                spawnDismissTimerNotification(recentDismissEndTime);
            }
        }

        inNotifyDismissCoolDown = data.inNotifyDismissCoolDown;
        const notified = !inCanNotifyTime() || inNotifyDismissCoolDown;
        notifyDismissBtn.disabled = notified;
        const firstDismissed = [];
        notified && firstDismissed.push(getDismissTime()[0]);
        // setTimeout(() => {
        setIntervalImmediately(() => {
            const [ name ] = getDismissTime();
            // console.log(dismissedClasses);

            if (!inCanNotifyTime() || !name || dismissedClasses.find(item => item.name === name)) {
                notifyDismissBtn.disabled = true;
            }
            else if (!firstDismissed.includes(name)) {
                firstDismissed.push(name);
                notifyDismissBtn.disabled = false;
            }
        }, 1000);
        // }, 60 - (new Date()).getSeconds());
    });

    if (isHost) {
        socket.on('catch-notify-dismiss', async (data) => {
            console.log(`catch notify dismiss`);
            const { userId } = data;
            const [ name ] = getDismissTime();
            console.log(inNotifyDismissCoolDown)
            // console.log(`inClassTime: ${inClassTime()}`)
            console.log(`dismissedClasses`)
            console.log(dismissedClasses)

            if (inCanNotifyTime() && name && !dismissedClasses.find(item => item.name === name)) {
                if (!inNotifyDismissCoolDown) {
                    inNotifyDismissCoolDown = true
                    console.log(`現在是下課時間`);
                    const notification = spawnNotification();
                    socket.emit('throw-disable-notify-dismiss');

                    setTimeout(() => {
                        inNotifyDismissCoolDown = false
                        const [ name ] = getDismissTime();
                        if (inCanNotifyTime() && name && !dismissedClasses.find(item => item.name === name)) {
                            socket.emit('throw-enable-notify-dismiss');
                        }
                    }, notifyDismissCoolDownTimeInMinute * MINUTE);
                }
            }
        });

        socket.on('catch-request-status', (socketId) => {
            console.log('catch request status');
            socket.emit('throw-inform-status', socketId, {dismissedClasses, inNotifyDismissCoolDown});
        });

        setIntervalImmediately(() => {
            const [ name ] = getDismissTime();
            notifyDismissBtn.disabled = !name || dismissedClasses.find(item => item.name === name);
        }, 1000);
    }
    else {
        socket.emit('throw-request-status');
    }

    console.log(`join call: ${classId} as ${localUserId}`);
    socket.emit('join-call', classId, localUserId);

    let chatInit = true;

    // async function addMessageToChat(msgData) {
    //     const { user, text, timestamp } = msgData;
    //     const timeString = timestamp.toDate().toLocaleString();
    //     const { name } = await getUserData(user) || { name: "???" };

    //     const msg = msgPrefab.cloneNode(true);
    //     const msgUser = msg.querySelector('.msg__user');
    //     const msgTime = msg.querySelector('.msg__timestamp');
    //     const msgText = msg.querySelector('.msg__text');
    //     msgUser.innerHTML = name;
    //     msgTime.innerHTML = timeString;
    //     msgText.innerHTML = text;
    //     chatRoom.appendChild(msg);
    // }
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

    if (isHost) {
        console.log('您是會議主辦人');

        // DELETE FROM AlertRecords WHERE ClassId = :classId and Finished = 0 (true?)
        await apiCall('deleteUnfinishedRecords', {classId})
        console.log('del alert');

        // const q1 = query(alertRecords, where('done', '==', false ));
        // const snapshot1 = await getDocs(q1);

        // snapshot1.forEach(async (alert) => {;
        //     const alertDoc  =   doc(alertRecords, alert.id);
        //     await deleteDoc(alertDoc);

        // });

        // let dataAlert = {
        //     alert: {
        //         interval: interval,
        //         time: duration,
        //     },
        // }
        // await updateDoc(callDoc, dataAlert);

        globalAlertType = AlertTypeEnum.Click;
        globalInterval = interval;
        globalTime = duration;

        setupAlertScheduler();
    }
    else {
        console.log('您不是會議主辦人');

        socket.on('catch-alert-start', async (recordId) => {
            console.log(`catch-alert-start`)
            console.log(`catch ${recordId}`)
            const response = await apiCall('getAlertRecord', {classId, recordId});
            const alertRecord = await response.json();
            setupAlertListener(alertRecord);
        });
    }

    confirmPanel.remove();
    camContainer.appendChild(localCams.webcam.node);
    camContainer.appendChild(localCams.screenShare.node);
    Cam.resizeAll();
    // toolbar.insertBefore(micBtn, hangUpBtn);
    // toolbar.insertBefore(webcamBtn, hangUpBtn);
    // toolbar.insertBefore(screenShareBtn, hangUpBtn);
    icons[0].appendChild(micBtn);
    icons[1].appendChild(webcamBtn);
    dockListener();
    hangUpBtn.disabled = false;
    enterBtn.disabled = true;

    localCams.webcam.node.querySelector('.cam__menu').hidden = false;

    sidebarListener();

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

// messageBtn.addEventListener('click', async () => {
//     if (meetingPanel.classList.contains('open-message')) {
//         meetingPanel.classList.remove('open-message');
//         chat.hidden = false;
//     }
//     else {
//         meetingPanel.classList.add('open-message');
//         chat.hidden = true;
//     }
//     resizeCam();
// });

messageBtn.addEventListener('click', async () => {
    sidebarRight.classList.toggle("close");
    meetingPanel.classList.toggle("close-message");
    Cam.resizeAll();
});

sendMsgBtn.addEventListener('click', async () => {
    sendMsgBtn.disabled = true;
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
    sendMsgBtn.disabled = false;
});

msgInput.addEventListener("keyup", function(event) {
    if (event.keyCode === 13) { // press enter
        event.preventDefault();
        sendMsgBtn.click();
    }
});

// alertBtn.addEventListener('click', async () => {
//     if (alertBtn.dataset.id) {
//         const alertDoc     = doc(alertRecords, alertBtn.dataset.id);
//         const participants = collection(alertDoc, 'participants');
//         const userDoc      = doc(participants, localUserId);

//         const data = {
//             timestamp: new Date()
//         }
//         await setDoc(userDoc, data);

//         alertBtn.hidden = true;
//     }
// });

async function requestStreamPermission() {
    try {
        localStreams.audio = localStreams.audio || await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    }
    catch {
        console.log('microphone request failed');
        Button.toggleOpen(micBtn, false);
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

function getStartAndEndTimeOfTheDay() {
    const start = schoolPeriods[0].StartTime;
    const end = schoolPeriods[schoolPeriods.length-1].EndTime;

    return [dateToMinutes(start), dateToMinutes(end)]
}

function inCanNotifyTime() {
    const now = new Date();
    const minuteOfToday = dateToMinutes(now);
    const [startTimeOfTheDay, endTimeOfTheDay] = getStartAndEndTimeOfTheDay();

    if (minuteOfToday < startTimeOfTheDay || minuteOfToday >= endTimeOfTheDay) {
        return true;
    }

    for (const period of schoolPeriods) {
        const startTime = dateToMinutes(period.StartTime);
        const endTime   = dateToMinutes(period.EndTime);
        if (minuteOfToday >= startTime + dismissTimePadding && minuteOfToday < endTime) {
            return false;
        }
    }
    return true;
}

function inClassTime() {
    const now = new Date();
    const minuteOfToday = dateToMinutes(now);
    const [startTimeOfTheDay, endTimeOfTheDay] = getStartAndEndTimeOfTheDay();

    if (minuteOfToday < startTimeOfTheDay || minuteOfToday >= endTimeOfTheDay) {
        return true;
    }

    for (const period of schoolPeriods) {
        const startTime = dateToMinutes(period.StartTime);
        const endTime   = dateToMinutes(period.EndTime);
        if (minuteOfToday >= startTime && minuteOfToday < endTime) {
            console.log(`現在是第${period.PeriodName}節課`);
            return true;
        }
    }
    return false;
}

function getDismissTime() {
    const now = new Date();
    const minuteOfToday = dateToMinutes(now);

    let prevEndTime = 0;
    let prevName = '';
    schoolPeriods.forEach((period, i) => {
        const startTime = dateToMinutes(period.StartTime);
        const endTime   = dateToMinutes(period.EndTime);
        if (minuteOfToday >= startTime && minuteOfToday < endTime) {
            const percentage = (minuteOfToday - startTime) / (endTime - startTime);
            if (percentage < 0.5) {
                if (minuteOfToday - startTime < dismissTimePadding) {
                    // console.log(`現在下課會是第${prevName}節下課`);
                    return [prevName, startTime - prevEndTime];
                }
            }
            else {
                if (endTime - minuteOfToday < dismissTimePadding) {
                    // console.log(`現在下課會是第${classTime.name}節下課`);
                    if (i < schoolPeriods.length - 1) {
                        const nextStartTime = dateToMinutes(schoolPeriods[i+1].StartTime);
                        return [period.PeriodName, nextStartTime - endTime];
                    }
                    return [period.PeriodName, 24 * 60 - endTime];
                }
            }
            // console.log(`現在是第${classTime.name}節上課`);
            return [null, 0];
        }
        else {
            if (startTime > minuteOfToday) {
                // console.log(`現在是第${prevName}節下課`);
                // console.log(`${startTime - prevEndTime}`);
                return [prevName, startTime - prevEndTime];
            }
        }
        prevEndTime = endTime;
        prevName = period.PeriodName;
    });

    // console.log(`現在放學了`);
    return [null, 0];
}


function spawnNotification() {
    const notification = notificationPrefab.cloneNode(true);
    notificationSound.play();
    const closeBtn = notification.querySelector('.notification__close-btn');
    notificationContainer.appendChild(notification);
    notification.dataset.type = 'dismiss-class';
    notification.style.height = `${notification.scrollHeight}px`;
    notification.style.opacity = '1';
    closeBtn.addEventListener('click', () => {
        notification.style.height = '';
        notification.style.paddingBlock = '0px';
        notification.style.opacity = '';
        notification.addEventListener('transitionend', () => {
            notification.remove();
        })
    });
    return notification;
}

function spawnDismissTimerNotification(endTime) {
    const notification = spawnNotification();
    const closeBtn = notification.querySelector('.notification__close-btn');
    closeBtn.remove();
    const timerElement = htmlToElement(`
        <span></span>
    `);
    const timer = setIntervalImmediately(() => {
        const timeLeft = endTime - (new Date());
        const min = `${Math.floor(timeLeft/MINUTE)}`.padStart(2, '0');
        const sec = `${Math.floor((timeLeft%MINUTE)/1000)}`.padStart(2, '0');
        timerElement.innerHTML = `${min}:${sec}`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            closeBtn.click();
        }
    }, 1000);

    const title = notification.querySelector('.notification__title');
    const text = notification.querySelector('.notification__text');
    title.innerHTML = '距離上課還有：'
    text.innerHTML = '';
    text.appendChild(timerElement)
}

let alertSchedulerVersion = 0;

export async function setupAlertScheduler() {
    console.log('setupAlertScheduler');

    await startAlert();

    // intervalID = setIntervalImmediately(async () => {

    //     try {

    //         const { alert } = (await getDoc(callDoc)).data();
    //         const { interval, time: duration, alertType} = alert;

    //         alertDocCurrently = doc(alertRecords);

    //         let dataNormal = {
    //             timestamp: new Date(),
    //             duration: duration, //時長
    //             alertType: alertType,
    //             interval: interval,
    //             started: false,
    //             done: false,
    //             outdated: false,
    //         };

    //         if(alertType === 'multiple choice') {
    //             dataNormal = Object.assign(dataNormal, dataMultipleChoice );
    //         }

    //         setDoc(alertDocCurrently, dataNormal);

    //         console.log('add alert');

    //         let alertPrevious = alertDocCurrently;

    //         await delay( interval * MINUTE );

    //         updateDoc(alertPrevious, {started: true});

    //         console.log('alert started');

    //         await delay( duration * MINUTE );

    //         if ((await getDoc(alertPrevious))?.data()?.outdated === true) {
    //             deleteDoc(alertPrevious);
    //         }
    //         else {
    //             updateDoc(alertPrevious, {done: true});
    //             console.log('alert done');

    //             let dataAlert = {
    //                 alert: {
    //                     interval: interval,
    //                     time: duration,
    //                     alertType: 'click',
    //                 },
    //             }
    //             updateDoc(callDoc, dataAlert);
    //         }

    //     } catch (error) {

    //         //因為重新設定警醒時，舊文件會被刪除，所以導致更新文件會顯示錯誤。

    //     }

    // }, (interval+duration) * MINUTE + 2000 );
}

async function startAlert() {
    alertSchedulerVersion++;
    const currentAlertSchedulerVersion = alertSchedulerVersion;

    //UPDATE AlertRecords SET Outdated = 1 WHERE ClassId = :classId and Finished = 0
    await apiCall('expireUnfinishedRecords', {classId})

    // const q1 = query(alertRecords, where('done', '==', false ));
    // const snapshot1 = await getDocs(q1);
    // snapshot1.forEach(async (alert) => {;
    //     const alertDoc  =   doc(alertRecords, alert.id);
    //     await updateDoc(alertDoc, {outdated: true});
    // });

    while (true) {
        try {

            // alertDocCurrently = doc(alertRecords);

            let dataNormal = {
                classId,
                alertType: globalAlertType,
                interval: globalInterval,
                duration: globalTime,
            };

            if( globalAlertType != AlertTypeEnum.Click ) {
                dataNormal = Object.assign(dataNormal, dataMultipleChoice );
            }

            //INSERT INTO AlertRecords VALUES (dataNormal)
            const response = await apiCall('addAlertRecord', dataNormal)
            const { insertId: recordId } = await response.json();

            // setDoc(alertDocCurrently, dataNormal);

            console.log('add alert');

            // let alertPrevious = alertDocCurrently;
            console.log(MINUTE);
            await delay( globalInterval * MINUTE );

            await apiCall('turnOnRecord', { classId, recordId });
            socket.emit('throw-alert-start', recordId);
            console.log(`throw ${recordId}`)

            // updateDoc(alertPrevious, {started: true});

            console.log('alert started');

            await delay( globalTime * MINUTE );

            const response2 = await apiCall('finishRecord', { classId, recordId })
            if (response2.status === 201) { // finished
                globalAlertType = AlertTypeEnum.Click;
            }
            else if (response2.status === 204) { // outdated

            }
            // if (outdated === true) {
            //     await apiCall('DeleteAlertRecord', { classId, recordId })
            // }
            // else {
            //     await apiCall('UpdateAlertRecord', { classId, recordId, finished: true})

            //     console.log('alert done');
            //     globalAlertType = AlertTypeEnum.Click
            // }

            // if ((await getDoc(alertPrevious))?.outdated === true) {
            //     deleteDoc(alertPrevious);
            // }
            // else {
            //     updateDoc(alertPrevious, {done: true});
            //     console.log('alert done');

            //     let dataAlert = {
            //         alert: {
            //             interval: globalInterval,
            //             time: globalTime,
            //         },
            //     }
            //     updateDoc(callDoc, dataAlert);

            //     globalAlertType = AlertTypeEnum.Click
            // }

        } catch (error) {

            //因為重新設定警醒時，舊文件會被刪除，所以導致更新文件會顯示錯誤。

        }

        if (currentAlertSchedulerVersion !== alertSchedulerVersion) {
            console.log('break');
            break;
        }
    }
}

async function listenToAlert(data) {
    const response = await apiCall('addAlertRecordReacts', {recordId: data.RecordId});
}

export async function setupAlertListener(alertRecord) {
    console.log('setupAlertListener');
    if (alertRecord.Finished == false && alertRecord.Outdated == false) {
        console.log('alert started');
        alertRecord.TimestampDate = new Date(alertRecord.Timestamp);
        const timestampEnd = new Date(alertRecord.TimestampDate.getTime() + (alertRecord.Interval + alertRecord.Duration) * MINUTE);
        console.log((new Date()).toISOString())
        console.log(timestampEnd.toISOString())
        const response = await apiCall('getAlertRecordReact', {classId, recordId: alertRecord.RecordId});
        let click = true    

        let reactId = (await response.json()).ReactId;

            if( !reactId ) {
                console.log('no react')
                const response = await apiCall('addAlertRecordReact', {classId,  recordId: alertRecord.RecordId})
                const { insertId } = await response.json()
                reactId = insertId;
                click = false;
                console.log('click:' + click)
            }

            if( click === false ) {
                console.log('see alert');
                alertModule.hidden = false;
                const alertShow = document.createElement('div');
                alertShow.classList.add('alert-show')
                alertModule.appendChild(alertShow);

                if(alertRecord.AlertTypeId === AlertTypeEnum.MultipleChoice) {
                    const textarea = document.createElement('textarea');
                    textarea.setAttribute("readonly", "readonly");
                    textarea.classList.add('qst_show')
                    textarea.innerHTML = alertRecord.Question;
                    alertShow.appendChild(textarea);
                    for (let i = 0; i < alertRecord.MultipleChoice.length; i++) {
                        const field = document.createElement('div');
                        field.classList.add('field')
                        alertShow.appendChild(field);
                        const span = document.createElement('span');
                        span.classList.add('span_No');
                        span.innerHTML = i+1;
                        field.appendChild(span);
                        const input = document.createElement('input');
                        input.classList.add('option_input')
                        input.setAttribute("readonly", "readonly");
                        input.value = alertRecord.MultipleChoice[i];
                        field.appendChild(input);

                        span.addEventListener('click', () => {
                            let no = alertShow.querySelectorAll(".span_No");
                            Array.from(no).forEach((item) => {
                                item.classList.remove("chosen");
                            });
                            span.classList.toggle("chosen");
                        });
                    }
                }else if(alertRecord.AlertTypeId === AlertTypeEnum.EssayQuestion) {
                    const textarea = document.createElement('textarea');
                    textarea.setAttribute("readonly", "readonly");
                    textarea.classList.add('qst_show')
                    textarea.innerHTML = alertRecord.Question;
                    alertShow.appendChild(textarea);
                    const div = document.createElement('div');
                    alertShow.appendChild(div);
                    const textarea1 = document.createElement('textarea');
                    textarea1.classList.add('qst_show_answear')
                    div.appendChild(textarea1);
                }else if(alertRecord.AlertTypeId === AlertTypeEnum.Vote) {
                    const textarea = document.createElement('textarea');
                    textarea.setAttribute("readonly", "readonly");
                    textarea.classList.add('qst_show')
                    textarea.innerHTML = alertRecord.Question;
                    alertShow.appendChild(textarea);
                    const divRadios = document.createElement('div');
                    divRadios.classList.add('radios')
                    alertShow.appendChild(divRadios);
                    for (let i = 0; i < alertRecord.MultipleChoice.length; i++) {
                        const divRadio = document.createElement('div');
                        divRadio.classList.add('radio')
                        divRadios.appendChild(divRadio);
                        const input = document.createElement('input');
                        input.setAttribute("id", "radio" + (i+1) );
                        input.setAttribute("type", "radio");
                        input.setAttribute("name", "radio");
                        input.setAttribute("value", i+1 );
                        divRadio.appendChild(input);
                        const label = document.createElement('label');
                        label.setAttribute("for", "radio" + (i+1) );
                        divRadio.appendChild(label);
                        label.innerHTML = alertRecord.MultipleChoice[i];
                    }
                }

                const alertBtnDiv = document.createElement('div');
                alertBtnDiv.classList.add('alert-btn-div')
                alertShow.appendChild(alertBtnDiv);
                const alertBtn = document.createElement('button');
                alertBtn.setAttribute('id','alert-btn');
                alertBtnDiv.appendChild(alertBtn);
                const alertBtnText = document.createElement('p');
                alertBtnText.setAttribute('id','alert-btn__text');
                alertBtnText.innerHTML = '警醒按鈕';
                alertBtn.appendChild(alertBtnText);
                const alertBtnTime = document.createElement('span');
                alertBtnTime.setAttribute('id','alert-btn__time');
                alertBtnTime.innerHTML = '00:00';
                alertBtn.appendChild(alertBtnTime);

                alertBtn.addEventListener('click', async () => {
                    const answearChosen = document.querySelector(".chosen");
                    const qstShowAnswear = document.querySelector(".qst_show_answear");

                    let DoneClick = false;
                    let data;

                    if( alertRecord.AlertTypeId === AlertTypeEnum.Click) {
                        DoneClick = true;
                        data = {
                            click : true,
                        }
                    }else if(alertRecord.AlertTypeId === AlertTypeEnum.MultipleChoice) {
                        if(answearChosen != null) {

                            DoneClick = true;
                            data = {
                                click: true,
                                answear: answearChosen.innerHTML,
                            }
                        }
                    }else if(alertRecord.AlertTypeId === AlertTypeEnum.EssayQuestion) {
                        if(qstShowAnswear.value != '') {
                            DoneClick = true;
                            data = {
                                click: true,
                                answear: qstShowAnswear.value,
                            }
                        }
                    }else if(alertRecord.AlertTypeId === AlertTypeEnum.Vote) {
                        const radio = document.querySelector(".radios").querySelectorAll('input');
                        for (let x = 0; x < radio.length; x ++) {
                            if (radio[x].checked) {
                                DoneClick = true;
                                data = {
                                    click: true,
                                    answear: radio[x].value,
                                }
                                break;
                            }
                        }
                    }

                    if ( DoneClick === true ) {
                        await apiCall('updateAlertRecordReact', {classId, reactId, data})
                        // await updateDoc(userDoc, data);
                        alertBtnTime.hidden = true;
                        alertBtnText.innerHTML = '簽到完成';
                        alertBtn.classList.add('active');
                        await delay(1000);
                        alertBtn.hidden = true;
                        alertBtnTime.hidden = false;
                        alertBtnText.innerHTML = '警醒按鈕';
                        alertBtn.classList.remove('active');
                        alertModule.hidden = true;
                    }
                });

                // alertBtn.dataset.id = alertRecord.RecordId;

                if (Math.random() < 0.5) {
                    alertModule.style.left  = `${getRandom(50)}%`;
                    alertModule.style.right = `initial`;
                }
                else {
                    alertModule.style.right = `${getRandom(50)}%`;
                    alertModule.style.left  = `initial`;
                }

                if (Math.random() < 0.5) {
                    alertModule.style.top     = `${getRandom(50)}%`;
                    alertModule.style.bottom  = `initial`;
                }
                else {
                    alertModule.style.bottom  = `${getRandom(50)}%`;
                    alertModule.style.top     = `initial`;
                }

                const countDownInterval = setIntervalImmediately(() => {
                    const now = new Date();

                    const distance = timestampEnd.getTime() - now.getTime();

                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                    alertBtnTime.innerHTML = `${minutes}`.padStart(2, '0') + ':' + `${seconds}`.padStart(2, '0')
                }, 1000);

                const now = new Date();
                setTimeout(() => {
                    clearInterval(countDownInterval);
                    alertModule.hidden = true;
                    alertShow.remove();
                }, timestampEnd.getTime() - now.getTime());
            }

    }else if (alertRecord.Finished == false && alertRecord.Outdated == true) {
        const alertShows = document.querySelectorAll('.alert-show');
        alertShows.forEach(alertShow => {
            alertShow.remove();
        });
    }
}

window.onresize = () => {Cam.resizeAll()};

let userAbove = '';

async function addMessageToChat(msgData) {
    const { user, text, timestamp } = msgData;
    const date = new Date(timestamp.seconds * 1000);
    let YY = date.getFullYear();
    let MM = date.getMonth() + 1 < 10 ? "0" + (date.getMonth() + 1) : date.getMonth();
    let DD = date.getDate() < 10 ? "0" + date.getDate() :date.getDate();
    let hh = date.getHours() < 10 ? "0" + date.getHours() :date.getHours();
    let mm = date.getMinutes() < 10 ? "0" + date.getMinutes() :date.getMinutes();
    let YMDhm = YY + "/" + MM + "/" + DD +" " + hh + ":" + mm;

    if (localUserId === user){
        if(user === userAbove) {
            const msg = myMsgPrefab.cloneNode(true);
            const msgText = msg.querySelector('.my-msg__text');
            const myMsgDate = msg.querySelector('.my-msg__date');
            myMsgDate.attributes[1].value = YMDhm;
            msgText.innerHTML = text;
            chatRoom.appendChild(msg);
        }else {
            const msg = myMsgPrefab.cloneNode(true);
            const msgUser = msg.querySelector('.my-msg__user');
            const msgTime = msg.querySelector('.my-msg__timestamp');
            const msgText = msg.querySelector('.my-msg__text');
            const myMsgDate = msg.querySelector('.my-msg__date');
            myMsgDate.attributes[1].value = YMDhm;
            msgUser.innerHTML = '你';
            msgTime.innerHTML = hh + ":" + mm;
            msgText.innerHTML = text;
            chatRoom.appendChild(msg);
        }
    }
    else {
        if(user === userAbove) {
            const msg = msgPrefab.cloneNode(true);
            const msgText = msg.querySelector('.msg__text');
            const myMsgDate = msg.querySelector('.msg__date');
            myMsgDate.attributes[1].value = YMDhm;
            msgText.innerHTML = text;
            chatRoom.appendChild(msg);
        }else {
            const { name } = await getUserData(user) || { name: "???" };
            const msg = msgPrefab.cloneNode(true);
            const msgUser = msg.querySelector('.msg__user');
            const msgTime = msg.querySelector('.msg__timestamp');
            const msgText = msg.querySelector('.msg__text');
            const myMsgDate = msg.querySelector('.msg__date');
            myMsgDate.attributes[1].value = YMDhm;
            const { host } = ( await getDoc(callDoc)).data();
            if ( user === host ) {
                msgUser.innerHTML = name + '老師';
                msgUser.classList.add('host');
            }else {
                msgUser.innerHTML = '匿名者';
            }
            msgTime.innerHTML = hh + ":" + mm;
            msgText.innerHTML = text;
            chatRoom.appendChild(msg);
        }
    }

    userAbove = user;
}

function dockListener() {
    Array.from(icons).forEach((item, index) => {
        item.addEventListener("mouseenter", (e) => {
            focus(e.target, index);
        });
        item.addEventListener("mouseleave", (e) => {
            Array.from(icons).forEach((item) => {
                item.style.transform = "scale(1) translateY(0px)";
            });
        });
    });
    const focus = (elem, index) => {
        let previous = index - 1;
        let next = index + 1;

        if (previous == -1) {
            console.log("first element");
            elem.style.transform = "scale(1.5) translateY(-10px)";
            icons[next].style.transform = "scale(1.2) translateY(-6px)";
        } else if (next == icons.length) {
            elem.style.transform = "scale(1.5) translateY(-10px)";
            icons[previous].style.transform = "scale(1.2) translateY(-6px)";
            console.log("last element");
        } else {
            elem.style.transform = "scale(1.5) translateY(-10px)";
            icons[previous].style.transform = "scale(1.2) translateY(-6px)";
            icons[next].style.transform = "scale(1.2) translateY(-6px)";
        }
    };
}
