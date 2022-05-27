import { firestore, auth } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import 'webrtc-adapter';
import { getUser } from './login.js';
import { delay, randomLowerCaseString, replaceAll } from './util.js';

const servers = {
    iceServers: [
        {
            urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};


// HTML elements
const camPrefab  = document.querySelector('.cam');
const msgPrefab  = document.querySelector('.msg');
const confirmPanel = document.querySelector('#confirm-panel');
const cpVideoTray  = document.querySelector('#confirm-panel__video-tray');
const meetingPanel = document.querySelector('#meeting-panel');
const micBtn  = document.querySelector('#mic-btn');
const webcamBtn  = document.querySelector('#webcam-btn');
const enterBtn   = document.querySelector('#enter-btn');
const screenShareBtn = document.querySelector('#screen-share-btn');
const hangUpBtn  = document.querySelector('#hang-up-btn');
const videoTray  = document.querySelector('#video-tray');
const chat       = document.querySelector('#chat');
const chatRoom   = document.querySelector('#chat__room')
const toolbar    = document.querySelector('#toolbar');
const msgInput   = document.querySelector('#msg-input');
const sendMsgBtn = document.querySelector('#send-msg-btn');
const messageBtn = document.querySelector('#message-btn');
const callId     = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

// Default state
webcamBtn.disabled = true;
hangUpBtn.disabled = true;

// Delete prefab
camPrefab.remove()
msgPrefab.remove()

// Global variable
const userDict = {};
const peerDict = {};
let localUserId = null;
let localStreams = {
    'webcam': null,
    'screenShare': null,
    'audio': null,
};
let webcamStream;
let webcamOn = false;
let unmute = true;
let localCam = createCam();
localCam.cam.id = `user-local-webcam`;
cpVideoTray.appendChild(localCam.cam);
let localScreenShare = createCam();
localScreenShare.cam.id = `user-local-screen-share`;
localScreenShare.cam.hidden = true;
cpVideoTray.appendChild(localScreenShare.cam);
const videoTrayDict = {};

// Firestore
const calls = collection(firestore, 'calls');
const users = collection(firestore, 'users');
const callDoc = doc(calls, callId);
const participants = collection(callDoc, 'participants');
let messages = collection(callDoc, 'messages');
let localUserDoc;
let localClients;

// Check login
document.onreadystatechange = async () => {
    const user = await getUser();
    let callDocSnapshot;

    console.log('check login state');
    if (!user) {
        console.log('did not login');
        return;
    }

    console.log('checking permission');
    try {
        callDocSnapshot = await getDoc(callDoc);
    }
    catch (err) {
        console.log('no permission');
        return;
    }

    localUserId = user.uid;
    localCam.name.innerHTML = user.displayName;
    localCam.profile.src = user.photoURL;
    localScreenShare.name.innerHTML = user.displayName;
    localScreenShare.profile.hidden = true;
    micBtn.disabled = false;
    webcamBtn.disabled = false;
    screenShareBtn.disabled = false;
    enterBtn.disabled = false;
    localUserDoc = doc(participants, localUserId);
    localClients = collection(localUserDoc, 'clients');
    setupLocalStream();
}

micBtn.addEventListener('click', async () => {
    try {
        localStreams.audio = localStreams.audio || await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    }
    catch {
        micBtn.classList.remove('btn-on');
        unmute = false;
        return;
    }
    unmute = !unmute;
    console.log(`microphone is ${unmute?'on':'off'}`);
    localStreams.audio.getAudioTracks()[0].enabled = unmute;
    if (unmute) {
        micBtn.classList.add('btn-on');
    }
    else {
        micBtn.classList.remove('btn-on');
    }
});

webcamBtn.addEventListener('click', async () => {
    webcamOn = !webcamOn;
    setupLocalStream();
});

enterBtn.addEventListener('click', async () => {
    console.log('create user doc');
    await setDoc(localUserDoc, {});

    const userDocs = await getDocs(participants);
    userDocs.forEach(async (remoteDoc) => {
        if (remoteDoc.id === localUserId) {
            return;
        }

        const localClientsRemoteDoc = doc(localClients, remoteDoc.id)
        await deleteDoc(localClientsRemoteDoc);

        const remoteClients = collection(remoteDoc.ref, 'clients')
        const remoteClientsLocalDoc = doc(remoteClients, localUserId);
        if (!(await getDoc(remoteClientsLocalDoc)).exists()) {
            await setDoc(remoteClientsLocalDoc, {});
        }
    });

    setupNewUserListener();

    let chatInit = true;

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

    confirmPanel.remove();
    videoTray.appendChild(localCam.cam);
    videoTray.appendChild(localScreenShare.cam);
    toolbar.insertBefore(micBtn, hangUpBtn);
    toolbar.insertBefore(webcamBtn, hangUpBtn);
    toolbar.insertBefore(screenShareBtn, hangUpBtn);
    hangUpBtn.disabled = false;
    enterBtn.disabled = true;
});

hangUpBtn.addEventListener('click', async () => {
    for (let userId in peerDict) {
        await closePeer(userId);
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

    // hangUpBtn.disabled = true;
});

screenShareBtn.addEventListener('click', async () => {
    setupScreenShare();
})

messageBtn.addEventListener('click', async () => {
    if (meetingPanel.classList.contains('open-message')) {
        meetingPanel.classList.remove('open-message');
        chat.hidden = false;
    }
    else {
        meetingPanel.classList.add('open-message');
        chat.hidden = true;
    }
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

async function offerToUser(remoteId) {
    console.log('offer to user');
    const remoteUserDoc = doc(participants, remoteId);
    const remoteClients = collection(remoteUserDoc, 'clients');
    const remoteClientsLocalDoc = doc(remoteClients, localUserId);
    const offerCandidates = collection(remoteClientsLocalDoc, 'candidates');

    addPeer(remoteId);
    peerDict[remoteId].offerCreated = true;
    peerDict[remoteId].pc.onicecandidate = (event) => {
        console.log('throw candidate')
        event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
    };

    const offerDesc = await peerDict[remoteId].pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true});
    console.log(offerDesc)
    await peerDict[remoteId].pc.setLocalDescription(offerDesc);
    console.log('set local offer');

    const streams = {};
    for (let streamType in localStreams) {
        if (localStreams[streamType] && localStreams[streamType].length != 0) {
            streams[streamType] = localStreams[streamType].id;
        }
    }

    const data = {
        desc: JSON.stringify(peerDict[remoteId].pc.localDescription),
        streams: JSON.stringify(streams),
        timestamp: Date.now(),
    }
    await setDoc(remoteClientsLocalDoc, data);
    console.log('throw offer');
}

async function answerToUser(remoteId) {
    console.log('answer to user');
    const remoteUserDoc = doc(participants, remoteId);
    const remoteClients = collection(remoteUserDoc, 'clients');
    const remoteClientsLocalDoc = doc(remoteClients, localUserId);
    const answerCandidates = collection(remoteClientsLocalDoc, 'candidates');

    peerDict[remoteId].pc.onicecandidate = (event) => {
        event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
    };
    const answerDesc = await peerDict[remoteId].pc.createAnswer();
    console.log(answerDesc);
    // answerDesc.sdp = replaceAll(answerDesc.sdp, /setup:(actpass|active)/g, "setup:actpass");
    // console.log(answerDesc);
    await peerDict[remoteId].pc.setLocalDescription(answerDesc);
    console.log('set local answer');

    const streams = {};
    for (let streamType in localStreams) {
        if (localStreams[streamType] && localStreams[streamType].length != 0) {
            streams[streamType] = localStreams[streamType].id;
        }
    }

    const data = {
        desc: JSON.stringify(peerDict[remoteId].pc.localDescription),
        streams: JSON.stringify(streams),
        timestamp: Date.now(),
    }
    await setDoc(remoteClientsLocalDoc, data);
    console.log('throw answer');
}

function setupNewUserListener() {
    console.log('setup new user listener');
    let firstRun = false;
    onSnapshot(collection(localUserDoc, 'clients'), (snapshot) => {
        if (!firstRun) {
            firstRun = true;
        }
        else {
            snapshot.docChanges().forEach( async (change) => {
                if (change.type === 'added') {
                    console.log('saw new user: ', change.doc.id);
                    if (!peerDict[change.doc.id]) {
                        console.log('setupNewUserListener setupUserListener');
                        addPeer(change.doc.id);
                        await setupUserListener(change.doc.id);
                        await setupCandidateListener(change.doc.id);
                    }
                }
                else if (change.type === 'removed') {
                    console.log('saw user exit: ', change.doc.id);
                    if (peerDict[change.doc.id]) {
                        await closePeer(change.doc.id);
                    }
                }
            });
        }
    });
}

async function setupUserListener(remoteId) {
    console.log('setup user listener for: ' + remoteId);
    const remoteDoc = doc(localClients, remoteId);

    peerDict[remoteId].usersListener = onSnapshot(remoteDoc, async (doc) => {
        let { desc, streams, timestamp } = doc.data() || {};
        console.log(`timestamp: ${timestamp}`)
        if ( desc ) {
            desc = JSON.parse(desc);
            streams = JSON.parse(streams);
            if (desc.type === 'answer') {
                console.log('saw answer');
                peerDict[doc.id].pc.setRemoteDescription(desc);
                peerDict[doc.id].oldStreams = peerDict[doc.id].streams || streams;
                peerDict[doc.id].streams = streams;
                console.log('set remote answer');
            }
            else if (desc.type === 'offer') {
                console.log('saw offer');
                console.log(`offer condition: ${!peerDict[doc.id]?.offerCreated}`);
                console.log(`offer condition: ${timestamp > peerDict[doc.id]?.timestamp}`);
                if (!peerDict[doc.id]?.offerCreated || timestamp > peerDict[doc.id]?.timestamp) {
                    console.log('confirm to throw answer');
                    // if (peerDict[doc.id]) {
                    //     console.log('close old pc');
                    //     addPeer(doc.id);
                    // }
                    peerDict[doc.id].pc.setRemoteDescription(desc);
                    peerDict[doc.id].oldStreams = peerDict[doc.id].streams || streams;
                    peerDict[doc.id].streams = streams;
                    console.log('set remote offer');
                    answerToUser(doc.id);
                }
                else {
                    console.log('reject to set offer');
                }
            }
            else {
                console.error('unknown sdp type');
                return;
            }
            await createRemoteCam(doc.id, 'webcam');
        }
    });
}

async function setupCandidateListener(remoteId) {
    console.log('setup candidate listener');
    const remoteDoc = doc(localClients, remoteId);

    if (peerDict[remoteId].candidatesListener) {
        peerDict[remoteId].candidatesListener();
    }
    let candidates = collection(remoteDoc, 'candidates');

    let candidateDocs = await getDocs(candidates);
    candidateDocs.forEach( async (doc) => {
        await deleteDoc(doc.ref);
    });

    let firstRun = false;
    peerDict[remoteId].candidatesListener = onSnapshot(candidates, (snapshot) => {
        if (!firstRun) {
            firstRun = true;
            return;
        }
        snapshot.docChanges().forEach( async (change) => {
            if (change.type === 'added') {
                console.log('saw new candidate');
                let data = change.doc.data();
                while (!peerDict[remoteId].pc.currentRemoteDescription) {
                    await delay(100);
                }
                let candidate = new RTCIceCandidate(data);
                if (candidate && data) {
                    peerDict[remoteId].pc.addIceCandidate(candidate);
                }
            }
        });
    });
}

async function closePeer(id) {
    console.log('close peer');
    if (peerDict[id]) {
        if (peerDict[id].usersListener) {
            peerDict[id].usersListener();
        }
        if (peerDict[id].candidatesListener) {
            peerDict[id].candidatesListener();
        }
        if (peerDict[id].pc) {
            peerDict[id].pc.onicecandidate = null;
            peerDict[id].pc.close();
            peerDict[id].pc = null;
        }
        peerDict[id] = null;
        const localClientsRemoteDoc = doc(localClients, id);
        const remoteDoc = doc(participants, id);
        const remoteClients = collection(remoteDoc, 'clients');
        const remoteClientsLocalDoc = doc(remoteClients, localUserId);
        await deleteUserDoc(localClientsRemoteDoc);
        await deleteUserDoc(remoteClientsLocalDoc);
        removeRemoteCam(id);
    }
}

async function deleteUserDoc(userDoc) {
    const candidates = collection(userDoc, 'candidates');

    const candidateDocs = await getDocs(candidates);

    candidateDocs.forEach((candidateDoc) => {
        deleteDoc(candidateDoc.ref);
    })
    deleteDoc(userDoc);
}

function addPeer(id) {
    console.log('add peer');

    if (!peerDict[id]) {
        let [pc, senders] = createPC(id);
        peerDict[id] = {
            pc,
            senders,
            offerCreated: false,
            timestamp: Date.now(),
            usersListener: null,
            candidatesListener: null,
            streams: null,
            oldStreams: null,
        };
    }
    else {
        peerDict[id].offerCreated = false;
    }
}

function createPC(userId) {
    console.log('create PC');
    console.log(localStreams)
    let pc = new RTCPeerConnection(servers);
    let senders = {};
    for (let streamType in localStreams) {
        senders[streamType] = []
        if (localStreams[streamType]) {
            for (const track of localStreams[streamType].getTracks()) {
                console.log(`set track of ${streamType}`);
                senders[streamType].push(pc.addTrack(track, localStreams[streamType]));
            }
        }
    }

    console.log('set ontrack');
    pc.ontrack = async (event) => {
        console.log('ontrack');
        for (const stream of event.streams) {
            // const stream = event.streams[0]

            stream.onremovetrack = ({track}) => {
                console.log(`${track.kind} track was removed.`);
                removeStreamFromRemoteVideo(stream, userId);

                if (!stream.getTracks().length) {
                    console.log(`stream ${stream.id} emptied (effectively removed).`);
                }
            };
            await addStreamToRemoteVideo(stream, userId);
            console.log(`stream ${stream.id} was added.`);
        }
    };
    console.log('set onconnectionstatechange');
    pc.onconnectionstatechange = async (event) => {
        switch (pc.connectionState) {
            case "disconnected":
                console.log(`connectionState: ${userId} disconnected`);
                await closePeer(userId);
                break;

            case "new":
                console.log(`connectionState: ${userId} new`);
                break;

            case "connecting":
                console.log(`connectionState: ${userId} connecting`);
                break;

            case "connected":
                for (const streamType in peerDict[userId]?.streams) {
                    const remoteCam = await createRemoteCam(userId, streamType);
                    remoteCam.querySelector('.cam__warning').hidden = true;
                }
                console.log(`connectionState: ${userId} connected`);
                break;

            case "failed":
                for (const streamType in peerDict[userId]?.streams) {
                    const remoteCam = await createRemoteCam(userId, streamType);
                    remoteCam.querySelector('.cam__warning').hidden = false;
                }
                console.log(`connectionState: ${userId} failed`);

                //? 嘗試重新連線，不確定是否能成功，需要測試
                peerDict[userId].pc.restartIce();
                break;

        }
    };
    console.log('set onnegotiationneeded');
    pc.onnegotiationneeded  = async (event) => {
        console.log('onnegotiationneeded');
        offerToUser(userId);
    };

    return [pc, senders];
}

async function createRemoteCam(userId, streamType) {
    console.log(`add remote cam for ${userId}`);
    let remoteCam = videoTrayDict[`#user-${userId}-${streamType}`];
    console.log(`streamType ${streamType}: videoTrayDict ${videoTrayDict[`#user-${userId}-${streamType}`]}`);

    if (!remoteCam) {

        const { cam, name, profile } = createCam();
        remoteCam = cam;
        videoTrayDict[`#user-${userId}-${streamType}`] = remoteCam;

        cam.id = `user-${userId}-${streamType}`;
        cam.setAttribute('data-user', userId);

        const remoteUserData = await getUserData(userId);
        name.innerHTML = remoteUserData.name;
        profile.src = remoteUserData.photo;

        videoTray.appendChild(remoteCam);
        console.log(videoTrayDict[`#user-${userId}-${streamType}`]);
    }
    return remoteCam;
}

function removeRemoteCam(userId, streamType) {
    console.log(`remove remote cam for ${userId}`);
    if (streamType) {
        let remoteCam = videoTrayDict[`#user-${userId}-${streamType}`];
        remoteCam?.remove();
        videoTrayDict[`#user-${userId}-${streamType}`] = null;
    }
    else {
        for (const id in videoTrayDict) {
            if (id.startsWith(`#user-${userId}`)) {
                console.log(`deleting ${id}`)
                delete videoTrayDict[id];
            }
        }
        for (const id in videoTrayDict) {
            console.log(`remaiding ${id}`)
            console.log(videoTrayDict[id])
        }
        let remoteCams = videoTray.querySelectorAll(`[data-user="${userId}"]`);
        remoteCams.forEach((remoteCam) => {
            remoteCam.remove();
        })
    }
}

async function addStreamToRemoteVideo(stream, userId) {
    console.log('addStreamToRemoteVideo');
    let [ track ] = stream.getTracks();
    let streamType = Object.keys(peerDict[userId].streams).find(key => peerDict[userId].streams[key] === stream.id)
                    || Object.keys(peerDict[userId].oldStreams).find(key => peerDict[userId].oldStreams[key] === stream.id);
    console.log(`streamType ${streamType}`);
    let remoteCam = await createRemoteCam(userId, streamType);
    let remoteVideo = remoteCam.querySelector('.cam__video');
    let remoteProfile = remoteCam.querySelector('.cam__profile');
    remoteProfile.hidden = true;
    let remoteStream = new MediaStream();
    remoteStream.addTrack(track);
    remoteVideo.srcObject = remoteStream;
}

async function removeStreamFromRemoteVideo(stream, userId) {
    console.log('removeStreamFromRemoteVideo');
    let streamType = Object.keys(peerDict[userId].streams).find(key => peerDict[userId].streams[key] === stream.id)
                    || Object.keys(peerDict[userId].oldStreams).find(key => peerDict[userId].oldStreams[key] === stream.id);
    let remoteCam = await createRemoteCam(userId, streamType);
    let remoteVideo = remoteCam.querySelector('.cam__video');
    remoteVideo.srcObject = null;
    if (streamType === 'webcam') {
        let remoteProfile = remoteCam.querySelector('.cam__profile');
        remoteProfile.hidden = false;
    }
    else {
        remoteCam.remove();
    }
}

async function setupLocalStream() {
    try {
        localStreams.audio = localStreams.audio || await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
    }
    catch {
        console.log('microphone request failed');
        micBtn.classList.remove('btn-on');
        unmute = false;
    }
    try {
        webcamStream = webcamStream || await navigator.mediaDevices.getUserMedia({ video: {undefined}, audio: false });
    }
    catch {
        console.log('webcam request failed');
        webcamOn = false;
    }

    if (webcamOn) {
        console.log('turn on webcam');
        webcamBtn.classList.add('btn-on');
        localStreams.webcam = webcamStream;
        localCam.profile.hidden = true;
        localCam.video.srcObject = localStreams.webcam;
        for (const [id, peer] of Object.entries(peerDict)) {
            localStreams.webcam.getTracks().forEach((track) => {
                console.log(`add webcam to ${id}`)
                peer.senders.webcam.push(peer.pc.addTrack(track, localStreams.webcam));
            });
        }
    }
    else {
        console.log('turn off webcam');
        webcamBtn.classList.remove('btn-on');
        localStreams.webcam = null;
        localCam.profile.hidden = false;
        localCam.video.srcObject = null;
        for (const [id, peer] of Object.entries(peerDict)) {
            for (let sender of peer.senders.webcam) {
                console.log(`remove webcam from ${id} ${sender}`)
                peer.pc.removeTrack(sender);
            }
            peer.senders.webcam = [];
        }
    }

    for (const [id, peer] of Object.entries(peerDict)) {
        if (!peer.senders.audio) {
            localStreams.audio?.getTracks().forEach((track) => {
                console.log(`add audio to ${id}`)
                peer.senders.audio.push(peer.pc.addTrack(track, localStreams.audio));
            });
        }
    }
}

async function setupScreenShare() {
    if (localStreams.screenShare) {
        console.log('turn off screen share');
        localStreams.screenShare.getTracks().forEach(function(track) {
            track.stop()
        });
        localStreams.screenShare = null;
        localScreenShare.cam.hidden = true;
        localScreenShare.video.srcObject = null;
        for (const [id, peer] of Object.entries(peerDict)) {
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
        localScreenShare.cam.hidden = false;
        localScreenShare.video.srcObject = localStreams.screenShare;
        for (const [id, peer] of Object.entries(peerDict)) {
            localStreams.screenShare.getTracks().forEach((track) => {
                console.log(`add to ${id}`)
                peer.senders.screenShare.push(peer.pc.addTrack(track, localStreams.screenShare));
            });
        }
    }
}

function createCam() {
    let cam = camPrefab.cloneNode(true);
    let video = cam.querySelector('.cam__video');
    let name = cam.querySelector('.cam__name');
    let profile = cam.querySelector('.cam__profile');
    return { cam, video, name, profile };
}

async function getUserData(userId) {
    if (!userDict[userId]) {
        const userDoc = doc(users, userId);

        const userSnapshot = await getDoc(userDoc)
        userDict[userId] = userSnapshot.data();
    }

    return userDict[userId];
}

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

// async function clearDoc() {
//     console.log('remove all the doc')
//     const userDocs = await getDocs(participants);
//     userDocs.forEach(async (remoteDoc) => {
//         if (remoteDoc.id === localUserId) {
//             return;
//         }

//         await closePeer(remoteDoc.id);
//     });
//     await deleteDoc(localUserDoc);
//     console.log('remove all the doc')
// }


// window.onbeforeunload = async function(e) {
//     await clearDoc();
//     e.preventDefault();
// };