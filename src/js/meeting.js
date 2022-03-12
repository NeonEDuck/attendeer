import { firestore } from './firebase-config.js';
import { collection, doc, getDocs, addDoc, setDoc, onSnapshot } from 'firebase/firestore';
import './navbar.js'

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

// Global variable
const pcDict = {};
let localUserId = null;
let localStream = null;

// HTML elements
const camPrefab = document.querySelector('.cam');
const uidInput = document.querySelector('#uid-input');
const webcamBtn = document.querySelector('#webcam-btn');
const callBtn = document.querySelector('#call-btn');
const callInput = document.querySelector('#call-input');
const videoTray = document.querySelector('#video-tray');

// Delete prefab
camPrefab.remove()
camPrefab.removeAttribute('hidden');

function addTrackToRemoteVideo(track, userId) {
    let remoteCam = videoTray.querySelector(`#user-${userId}`);
    if (!remoteCam) {
        remoteCam = camPrefab.cloneNode(true);
        remoteCam.id = `user-${userId}`;
        videoTray.appendChild(remoteCam);
    }
    let remoteVideo = remoteCam.querySelector('.cam__video');
    let remoteName = remoteCam.querySelector('.cam__name');
    let remoteStream = new MediaStream();
    remoteName.innerHTML = userId;
    remoteStream.addTrack(track);
    remoteVideo.srcObject = remoteStream;
}

function createPc(userId) {
    let pc = new RTCPeerConnection(servers);
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
        event.streams.forEach((stream, idx) => {
            stream.getTracks().forEach((track) => {
                addTrackToRemoteVideo(track, userId);
            });
        });
    };
    return pc;
}

webcamBtn.addEventListener('click', async () => {
    localUserId = uidInput.value || null;
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    let localCam = camPrefab.cloneNode(true);
    let localVideo = localCam.querySelector('.cam__video');
    let localName = localCam.querySelector('.cam__name');
    localName.innerHTML = localUserId;
    localVideo.srcObject = localStream;
    videoTray.appendChild(localCam);

    uidInput.disabled = true;
    callBtn.disabled = false;
    webcamBtn.disabled = true;
});

callBtn.addEventListener('click', async () => {
    const calls = collection(firestore, 'calls');
    let callDoc = doc(calls);
    if (callInput.value) {
        callDoc = doc(calls, callInput.value);
    }
    else {
        setDoc(callDoc, {});
    }
    const participants = collection(callDoc, 'participants');
    const userDocs = await getDocs(participants);
    const localUserDoc = doc(participants, localUserId);
    await setDoc(localUserDoc, {});

    callInput.value = callDoc.id;

    // Offer to every other user in the call
    userDocs.forEach(async (remoteUserDoc) => {
        if (remoteUserDoc.id === localUserId) {
            return;
        }

        const localUserDoc = doc(collection(remoteUserDoc.ref, 'clients'), localUserId);
        const offerCandidates = collection(localUserDoc, 'offerCandidates');
        pcDict[remoteUserDoc.id] = createPc(remoteUserDoc.id);

        pcDict[remoteUserDoc.id].onicecandidate = (event) => {
            event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
        };

        const offerDescription = await pcDict[remoteUserDoc.id].createOffer();
        await pcDict[remoteUserDoc.id].setLocalDescription(offerDescription);

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };

        await setDoc(localUserDoc, { offer });

        // Listening for user to answer back
        const answerCandidates = collection(localUserDoc, 'answerCandidates');
        onSnapshot(localUserDoc, (snapshot) => {
            const data = snapshot.data();
            if (!pcDict[remoteUserDoc.id].currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pcDict[remoteUserDoc.id].setRemoteDescription(answerDescription);
            }
        });

        // Listening for answer candidates
        onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    let i = 0;
                    let data = change.doc.data();
                    console.log(data);
                    pcDict[remoteUserDoc.id].addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
    });

    // New clients that want us to answer
    onSnapshot(collection(localUserDoc, 'clients'), (snapshot) => {
        snapshot.docChanges().forEach( async (change) => {
            if (change.type === 'added') {
                const offerCandidates = collection(change.doc.ref, 'offerCandidates');
                const answerCandidates = collection(change.doc.ref, 'answerCandidates');
                console.log(change.doc.id);

                let remoteUserDoc = change.doc.ref;
                pcDict[remoteUserDoc.id] = new createPc(remoteUserDoc.id);

                pcDict[remoteUserDoc.id].onicecandidate = (event) => {
                    event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
                };

                const docData = change.doc.data();
                const offerDescription = docData.offer;
                await pcDict[remoteUserDoc.id].setRemoteDescription(new RTCSessionDescription(offerDescription));

                const answerDescription = await pcDict[remoteUserDoc.id].createAnswer();
                await pcDict[remoteUserDoc.id].setLocalDescription(answerDescription);

                docData.answer = {
                    type: answerDescription.type,
                    sdp: answerDescription.sdp,
                };

                await setDoc(remoteUserDoc, docData);

                // Listening for offer candidates
                onSnapshot(offerCandidates, (snapshot) => {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === 'added') {
                            let data = change.doc.data();
                            pcDict[remoteUserDoc.id].addIceCandidate(new RTCIceCandidate(data));
                        }
                    });
                });
            }
        });
    });
});

window.addEventListener('beforeOnLoad', (e) => {
    e.preventDefault();

    if (confirm('You sure you want to leave?')) {
        alert('good bye');
    }
    // else {

    // }

    // e.returnValue = 'Do you want to leave?';
    return '';
});

//TODO: Handle failed, disconnection and hangup