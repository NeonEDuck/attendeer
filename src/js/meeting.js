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
const webcamBtn = document.querySelector('#webcam-btn');
const callBtn   = document.querySelector('#call-btn');
const hangUpBtn = document.querySelector('#hang-up-btn');
const callInput = document.querySelector('#call-input');
const videoTray = document.querySelector('#video-tray');

// Default state
webcamBtn.disabled = true;
callBtn.disabled = true;
hangUpBtn.disabled = true;
callInput.disabled = true;

// Delete prefab
camPrefab.remove()
camPrefab.removeAttribute('hidden');

// Global variable
const peerDict = {};
let localUserId = null;
let localStreams = {
    'webcam': null,
    'screenShare': null,
};
let localCam = createCam();
localCam.cam.id = `user-local`;
videoTray.appendChild(localCam.cam);

// Firestore
const calls = collection(firestore, 'calls');
let callDoc;
let participants;
let localUserDoc;
let localClients;

// Check login
onAuthStateChanged(auth, (user) => {
    if (user) {
        localUserId = user.uid;
        localCam.name.innerHTML = localUserId;
        // start();
        webcamBtn.disabled = false;
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

    callBtn.disabled = true;
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
    for (let type in localStreams) {
        streams[type] = localStreams[type]?.id;
    }

    const data = {
        desc: JSON.stringify(peerDict[remoteId].pc.localDescription),
        streams: JSON.stringify(streams),
    }
    await setDoc(remoteClientsLocalDoc, data);
    console.log('throw offer');

    // closePeer(remoteId);
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
    for (let type in localStreams) {
        streams[type] = localStreams[type]?.id;
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
            peerDict[doc.id].streams = streams;
            console.log('set remote answer');
        }
        else if (desc.type === 'offer') {
            console.log('saw offer');
            addPeer(doc.id);
            peerDict[doc.id].pc.setRemoteDescription(desc);
            peerDict[doc.id].streams = streams;
            console.log('set remote offer');
            // console.log(peerDict[doc.id].usersListener)
            // console.log(!peerDict[doc.id].usersListener)
            // if (!peerDict[doc.id].usersListener) {
            //     setupUserListener(doc.id);
            // }
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
            peerDict[id].pc.onaddstream = null;
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
            senders: {
                webcam: senders
            },
            usersListener: null,
            candidatesListener: null,
            streams: null,
        };
    }
}

function createPC(userId) {
    console.log('create PC');
    let pc = new RTCPeerConnection(servers);
    let senders = [];
    // pc.onaddstream = () => {
    //     console.log('onaddstream');
    // }
    webcamOn && localStreams.webcam?.getTracks().forEach((track) => {
        console.log('set track');
        senders.push(pc.addTrack(track, localStreams.webcam));
    });

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
            // stream.getTracks().forEach((track) => {
            //     addTrackToRemoteVideo(track, userId);
            // });
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
    let streamType = Object.keys(peerDict[userId].streams).find(key => peerDict[userId].streams[key] === stream.id);
    let remoteCam = createRemoteCam(userId, streamType);
    let remoteVideo = remoteCam.querySelector('.cam__video');
    let remoteProfile = remoteCam.querySelector('.cam__profile');
    remoteProfile.style.display = 'none';
    let remoteStream = new MediaStream();
    remoteStream.addTrack(track);
    remoteVideo.srcObject = remoteStream;
}

function removeStreamFromRemoteVideo(stream, userId) {
    console.log('removeStreamFromRemoteVideo');
    let streamType = Object.keys(peerDict[userId].streams).find(key => peerDict[userId].streams[key] === stream.id);
    let remoteCam = createRemoteCam(userId, streamType);
    let remoteVideo = remoteCam.querySelector('.cam__video');
    remoteVideo.srcObject = null;
    let remoteProfile = remoteCam.querySelector('.cam__profile');
    remoteProfile.style.display = 'block';
}

let webcamOn = false;
async function setupLocalStream() {
    if (!localStreams.webcam) {
        console.log('init webcam');
        localStreams.webcam = await navigator.mediaDevices.getUserMedia({ video: {undefined}, audio: false });
    }

    if (webcamOn) {
        console.log('turn off webcam');
        localCam.profile.style.display = 'block';
        localCam.video.srcObject = null;
        for (const [id, peer] of Object.entries(peerDict)) {
            localCam.profile.hidden = false;
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
        localCam.profile.style.display = 'none';
        localCam.video.srcObject = localStreams.webcam;
        for (const [id, peer] of Object.entries(peerDict)) {
            localStreams.webcam.getTracks().forEach((track) => {
                console.log(`add to ${id}`)
                peer.senders.webcam.push(peer.pc.addTrack(track, localStreams.webcam));
            });
            offerToUser(id);
        }
    }
    webcamOn = !webcamOn;
}

function createCam() {
    let cam = camPrefab.cloneNode(true);
    let video = cam.querySelector('.cam__video');
    let name = cam.querySelector('.cam__name');
    let profile = cam.querySelector('.cam__profile');
    return { cam, video, name, profile };
}