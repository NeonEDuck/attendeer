import { firestore } from "./firebase-config.js";
import { collection, doc, getDocs, addDoc, setDoc, onSnapshot } from "firebase/firestore";

const servers = {
    iceServers: [
        {
            urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

// Global State
const pcDict = {};
let localStream = null;

// HTML elements
const localVideo = document.querySelector('#localVideo');
const uidInput = document.querySelector('#uidInput');
const webcamBtn = document.querySelector('#webcamBtn');
const callBtn = document.querySelector('#callBtn');
const callInput = document.querySelector('#callInput');
// const answerBtn = document.querySelector('#answerBtn');
// const hangupBtn = document.querySelector('#hangupBtn');
const remoteVideoTray = document.querySelector('#remoteVideoTray');

function addRemoteVideo(track) {
    let remoteVideo = localVideo.cloneNode(true);
    let remoteStream = new MediaStream();
    remoteStream.addTrack(track);
    remoteVideo.srcObject = remoteStream;
    remoteVideoTray.appendChild(remoteVideo);
}

function createPc() {
    let pc = new RTCPeerConnection(servers);
    localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
    });

    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach((track) => {
            addRemoteVideo(track);
        });
    };
    return pc;
}

webcamBtn.addEventListener('click', async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    callBtn.disabled = false;
    webcamBtn.disabled = true;
});

callBtn.addEventListener('click', async () => {
    const localUserId = uidInput.value || null;
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

    // offer to every other user in the call
    userDocs.forEach(async (remoteUserDoc) => {
        if (remoteUserDoc.id === localUserId) {
            return;
        }

        const localUserDoc = doc(collection(remoteUserDoc.ref, 'clients'), localUserId);
        const offerCandidates = collection(localUserDoc, 'offerCandidates');
        pcDict[remoteUserDoc.id] = createPc();

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

        // await for user to answer back
        const answerCandidates = collection(localUserDoc, 'answerCandidates');
        onSnapshot(localUserDoc, (snapshot) => {
            const data = snapshot.data();
            if (!pcDict[remoteUserDoc.id].currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pcDict[remoteUserDoc.id].setRemoteDescription(answerDescription);
            }
        });

        // listening for answer candidates
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

    // new clients that want us to answer
    onSnapshot(collection(localUserDoc, 'clients'), (snapshot) => {
        snapshot.docChanges().forEach( async (change) => {
            if (change.type === 'added') {
                const offerCandidates = collection(change.doc.ref, 'offerCandidates');
                const answerCandidates = collection(change.doc.ref, 'answerCandidates');
                console.log(change.doc.id);

                let remoteUserDoc = change.doc.ref;
                pcDict[remoteUserDoc.id] = new createPc();

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

                // listening for offer candidates
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