import { firestore, auth } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import './base.js'

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

// HTML elements
const camPrefab = document.querySelector('.cam');
const msgPrefab  = document.querySelector('.msg');
const webcamBtn = document.querySelector('#webcam-btn');
const callBtn   = document.querySelector('#call-btn');
const screenShareBtn = document.querySelector('#screen-share-btn');
const hangUpBtn = document.querySelector('#hang-up-btn');
const callInput = document.querySelector('#call-input');
const videoTray = document.querySelector('#video-tray');
const chat       = document.querySelector('#chat');
const chatRoom   = document.querySelector('#chat__room')
const msgInput   = document.querySelector('#msg-input')
const sendMsgBtn = document.querySelector('#send-msg-btn')

// Default state
webcamBtn.disabled = true;
callBtn.disabled = true;
hangUpBtn.disabled = true;
callInput.disabled = true;

// Delete prefab
camPrefab.remove()
camPrefab.removeAttribute('hidden');
msgPrefab.remove()
msgPrefab.removeAttribute('hidden');

// Global variable
const peerDict = {};
let localUserId = null;
let localStreams = {
    'webcam': null,
    'screenShare': null,
};
let localCam = createCam();
localCam.cam.id = `user-local-webcam`;
videoTray.appendChild(localCam.cam);
let localScreenShare = createCam();
localScreenShare.cam.id = `user-local-screen-share`;
localScreenShare.cam.hidden = true;
videoTray.appendChild(localScreenShare.cam);

// Firestore
const calls = collection(firestore, 'calls');
let callDoc;
let participants;
let messages;
let localUserDoc;
let localClients;

// Check login
onAuthStateChanged(auth, (user) => {
    if (user) {
        localUserId = user.uid;
        localCam.name.innerHTML = localUserId;
        localScreenShare.name.innerHTML = localUserId;
        webcamBtn.disabled = false;
        screenShareBtn.disabled = false;
        callBtn.disabled = false;
        callInput.disabled = false;
    }
});

webcamBtn.addEventListener('click', async () => {
    setupLocalStream();
});

callBtn.addEventListener('click', async () => {
    if (callInput.value) {
        callDoc = doc(calls, callInput.value);
    }
    else {
        callDoc = doc(calls);
        await setDoc(callDoc, {})
        callInput.value = callDoc.id;
    }
    participants = collection(callDoc, 'participants');
    messages = collection(callDoc, 'messages');
    localUserDoc = doc(participants, localUserId);
    localClients = collection(localUserDoc, 'clients')

    console.log('create user doc');
    await setDoc(localUserDoc, {});

    setupNewUserListener();

    const userDocs = await getDocs(participants);
    userDocs.forEach(async (remoteDoc) => {
        if (remoteDoc.id === localUserId) {
            return;
        }

        offerToUser(remoteDoc.id);
        console.log('userDocs offer setupUserListener');
        setupUserListener(remoteDoc.id);
        setupCandidateListener(remoteDoc.id);
    });

    onSnapshot(messages, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const { user, text, timestamp } = change.doc.data();
                const timeString = new Date(timestamp).toLocaleString();

                const msg = msgPrefab.cloneNode(true);
                const msgUser = msg.querySelector('.msg__user');
                const msgTime = msg.querySelector('.msg__timestamp');
                const msgText = msg.querySelector('.msg__text');
                msgUser.innerHTML = user;
                msgTime.innerHTML = timeString;
                msgText.innerHTML = text;
                chatRoom.appendChild(msg);
            }
        });
        chatRoom.scrollTop = chatRoom.scrollHeight - chatRoom.clientHeight;
    });

    chat.hidden = false;
    callBtn.disabled = true;
    hangUpBtn.disabled = false;
});

hangUpBtn.addEventListener('click', async () => {
    for (let userId in peerDict) {
        closePeer(userId);
    }

    hangUpBtn.disabled = true;
    callBtn.disabled = false;
});

screenShareBtn.addEventListener('click', async () => {
    setupScreenShare();
})

sendMsgBtn.addEventListener('click', async () => {
    let text = msgInput?.value?.trim();
    if (text) {
        const calls = collection(firestore, 'calls');
        const callDoc = doc(calls, callInput.value);
        const messages = collection(callDoc, 'messages');
        const msgDoc = doc(messages);
        const data = {
            user: localUserId,
            text,
            timestamp: (new Date()).toJSON(),
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
    peerDict[remoteId].pc.onicecandidate = (event) => {
        event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
    };

    const offerDesc = await peerDict[remoteId].pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
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
    }
    await setDoc(remoteClientsLocalDoc, data);
    console.log('throw answer');
}

function setupNewUserListener() {
    console.log('setup new user listener');
    onSnapshot(collection(localUserDoc, 'clients'), (snapshot) => {
        snapshot.docChanges().forEach( async (change) => {
            if (change.type === 'added') {
                console.log('saw new user: ', change.doc.id);
                if (!peerDict[change.doc.id]) {
                    addPeer(change.doc.id);
                    console.log('setupNewUserListener setupUserListener');
                    setupUserListener(change.doc.id);
                    setupCandidateListener(change.doc.id);
                }
            }
            else if (change.type === 'removed') {
                if (peerDict[change.doc.id]) {
                    closePeer(change.doc.id);
                }
            }
        });
    });
}

function setupUserListener(remoteId) {
    console.log('setup user listener for: ' + remoteId);
    const remoteDoc = doc(localClients, remoteId);

    peerDict[remoteId].usersListener = onSnapshot(remoteDoc, (doc) => {
        listenerLogic(doc);
    });
}

function setupCandidateListener(remoteId) {
    console.log('setup candidate listener');
    const remoteDoc = doc(localClients, remoteId);

    if (peerDict[remoteId].candidatesListener) {
        peerDict[remoteId].candidatesListener();
    }

    peerDict[remoteId].candidatesListener = onSnapshot(collection(remoteDoc, 'candidates'), (snapshot) => {
        snapshot.docChanges().forEach( async (change) => {
            if (change.type === 'added') {
                console.log('saw new candidate');
                let data = change.doc.data();
                peerDict[remoteId].pc.addIceCandidate(new RTCIceCandidate(data));
            }
        });
    });
}

function listenerLogic(doc) {
    let { desc, streams } = doc.data() || {};
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
            addPeer(doc.id);
            peerDict[doc.id].pc.setRemoteDescription(desc);
            peerDict[doc.id].oldStreams = peerDict[doc.id].streams || streams;
            peerDict[doc.id].streams = streams;
            console.log('set remote offer');
            answerToUser(doc.id);
        }
        else {
            console.error('unknown sdp type');
            return;
        }
        createRemoteCam(doc.id, 'webcam');
    }
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
            peerDict[id].pc.close();
            peerDict[id].pc.onicecandidate = null;
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
    if (!peerDict[id]) {
        console.log('add peer');
        let [pc, senders] = createPC(id);
        peerDict[id] = {
            pc,
            senders,
            usersListener: null,
            candidatesListener: null,
            streams: null,
            oldStreams: null,
        };
    }
}

function createPC(userId) {
    console.log('create PC');
    let pc = new RTCPeerConnection(servers);
    let senders = {};
    for (let streamType in localStreams) {
        senders[streamType] = []
        localStreams[streamType]?.getTracks().forEach((track) => {
            console.log(`set track of ${streamType}`);
            senders[streamType].push(pc.addTrack(track, localStreams[streamType]));
        });
    }

    console.log('set ontrack');
    pc.ontrack = (event) => {
        console.log('ontrack');
        event.streams.forEach((stream) => {
            stream.onremovetrack = ({track}) => {
                console.log(`${track.kind} track was removed.`);
                removeStreamFromRemoteVideo(stream, userId);

                if (!stream.getTracks().length) {
                    console.log(`stream ${stream.id} emptied (effectively removed).`);
                }
            };
            addStreamToRemoteVideo(stream, userId);
            console.log(`stream ${stream.id} was added.`);
        });
    };
    pc.onconnectionstatechange = (event) => {
        switch (pc.connectionState) {
            case "disconnected":
                console.log('disconnected');
                closePeer(userId);
                break;
        }
    };

    return [pc, senders];
}

function createRemoteCam(userId, streamType) {
    console.log(`add remote cam for ${userId}`);
    let remoteCam = videoTray.querySelector(`#user-${userId}-${streamType}`);

    if (!remoteCam) {
        let { cam, name } = createCam();
        cam.id = `user-${userId}-${streamType}`;
        cam.setAttribute('data-user', userId);
        name.innerHTML = userId;

        remoteCam = cam;
        videoTray.appendChild(remoteCam);
    }
    return remoteCam;
}

function removeRemoteCam(userId, streamType) {
    console.log(`remove remote cam for ${userId}`);
    if (streamType) {
        let remoteCam = videoTray.querySelector(`#user-${userId}-${streamType}`);
        remoteCam?.remove();
    }
    else {
        let remoteCams = videoTray.querySelectorAll(`[data-user="${userId}"]`);
        remoteCams.forEach((remoteCam) => {
            remoteCam.remove();
        })
    }
}

function addStreamToRemoteVideo(stream, userId) {
    console.log('addStreamToRemoteVideo');
    let [ track ] = stream.getTracks();
    let streamType = Object.keys(peerDict[userId].streams).find(key => peerDict[userId].streams[key] === stream.id)
                    || Object.keys(peerDict[userId].oldStreams).find(key => peerDict[userId].oldStreams[key] === stream.id);
    let remoteCam = createRemoteCam(userId, streamType);
    let remoteVideo = remoteCam.querySelector('.cam__video');
    let remoteProfile = remoteCam.querySelector('.cam__profile');
    remoteProfile.hidden = true;
    let remoteStream = new MediaStream();
    remoteStream.addTrack(track);
    remoteVideo.srcObject = remoteStream;
}

function removeStreamFromRemoteVideo(stream, userId) {
    console.log('removeStreamFromRemoteVideo');
    let streamType = Object.keys(peerDict[userId].streams).find(key => peerDict[userId].streams[key] === stream.id)
                    || Object.keys(peerDict[userId].oldStreams).find(key => peerDict[userId].oldStreams[key] === stream.id);
    let remoteCam = createRemoteCam(userId, streamType);
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

    if (localStreams.webcam) {
        console.log('turn off webcam');
        localStreams.webcam = null;
        localCam.profile.hidden = false;
        localCam.video.srcObject = null;
        for (const [id, peer] of Object.entries(peerDict)) {
            for (let sender of peer.senders.webcam) {
                console.log(`remove from ${id} ${sender}`)
                peer.pc.removeTrack(sender);
            }
            peer.senders.webcam = [];
            offerToUser(id);
        }
    }
    else {
        console.log('turn on webcam');
        localStreams.webcam = await navigator.mediaDevices.getUserMedia({ video: {undefined}, audio: false });
        localCam.profile.hidden = true;
        localCam.video.srcObject = localStreams.webcam;
        for (const [id, peer] of Object.entries(peerDict)) {
            localStreams.webcam.getTracks().forEach((track) => {
                console.log(`add to ${id}`)
                peer.senders.webcam.push(peer.pc.addTrack(track, localStreams.webcam));
            });
            offerToUser(id);
        }
    }
}

async function setupScreenShare() {
    if (localStreams.screenShare) {
        console.log('turn off screen share');
        localStreams.screenShare = null;
        localScreenShare.cam.hidden = true;
        localScreenShare.video.srcObject = null;
        for (const [id, peer] of Object.entries(peerDict)) {
            for (let sender of peer.senders.screenShare) {
                console.log(`remove from ${id} ${sender}`)
                peer.pc.removeTrack(sender);
            }
            peer.senders.screenShare = [];
            offerToUser(id);
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
            offerToUser(id);
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