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

// Global variable
const pcDict = {};
const snapshotListeners = [];
let localUserId = null;
let localStream = null;

// HTML elements
const camPrefab = document.querySelector('.cam');
const webcamBtn = document.querySelector('#webcam-btn');
const callBtn   = document.querySelector('#call-btn');
const hangUpBtn = document.querySelector('#hang-up-btn');
const callInput = document.querySelector('#call-input');
const videoTray = document.querySelector('#video-tray');
var chatForm = document.getElementById('chat-form');

// Default state
webcamBtn.disabled = true;
callBtn.disabled = true;
hangUpBtn.disabled = true;

// Delete prefab
camPrefab.remove()
camPrefab.removeAttribute('hidden');

// Check login
onAuthStateChanged(auth, (user) => {
    localUserId = user.uid;
    webcamBtn.disabled = !Boolean(localUserId);
})

function addTrackToRemoteVideo(track, userId) {
    let remoteCam = videoTray.querySelector(`#user-${userId}`);
    let remoteStream;

    if (!remoteCam) {
        remoteCam = camPrefab.cloneNode(true);
        remoteCam.id = `user-${userId}`;
        videoTray.appendChild(remoteCam);
        remoteStream = new MediaStream();
    }
    else {
        remoteStream = remoteVideo.srcObject;
    }

    let remoteVideo = remoteCam.querySelector('.cam__video');
    let remoteName = remoteCam.querySelector('.cam__name');

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
        event.streams.forEach((stream) => {
            stream.getTracks().forEach((track) => {
                addTrackToRemoteVideo(track, userId);
            });
        });
    };
    return pc;
}

webcamBtn.addEventListener('click', async () => {
    localStream = await navigator.mediaDevices.getUserMedia({ video: {undefined}, audio: false });
    let localCam = camPrefab.cloneNode(true);
    let localVideo = localCam.querySelector('.cam__video');
    let localName = localCam.querySelector('.cam__name');

    localName.innerHTML = localUserId;
    localVideo.srcObject = localStream;
    videoTray.appendChild(localCam);

    callBtn.disabled = false;
    webcamBtn.disabled = true;
});

callBtn.addEventListener('click', async () => {
    const calls = collection(firestore, 'calls');
    let callDoc;
    if (callInput.value) {
        callDoc = doc(calls, callInput.value);
    }
    else {
        callDoc = doc(calls);
        await setDoc(callDoc, {});
    }
    const participants = collection(callDoc, 'participants');
    const localUserDoc = doc(participants, localUserId);
    await setDoc(localUserDoc, {});

    callInput.value = callDoc.id;

    // Offer to every other user in the call
    const userDocs = await getDocs(participants);
    userDocs.forEach(async (remoteUserDoc) => {
        if (remoteUserDoc.id === localUserId) {
            return;
        }

        const localUserDoc = doc(collection(remoteUserDoc.ref, 'clients'), localUserId);
        const offerCandidates = collection(localUserDoc, 'offerCandidates');
        const answerCandidates = collection(localUserDoc, 'answerCandidates');
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

        await deleteDoc(localUserDoc);
        await setDoc(localUserDoc, { offer });

        // Listening for user to answer back
        snapshotListeners.push(
            onSnapshot(localUserDoc, (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    if (!pcDict[remoteUserDoc.id].currentRemoteDescription && data?.answer) {
                        const answerDescription = new RTCSessionDescription(data.answer);
                        pcDict[remoteUserDoc.id].setRemoteDescription(answerDescription);
                    }
                }
                else {

                    pcDict[remoteUserDoc.id].close();
                    pcDict[remoteUserDoc.id].onicecandidate = null;
                    pcDict[remoteUserDoc.id].onaddstream = null;
                    pcDict[remoteUserDoc.id] = null;
                    let remoteCam = videoTray.querySelector(`#user-${remoteUserDoc.id}`);
                    remoteCam.remove();
                }
            })
        );

        // Listening for answer candidates
        snapshotListeners.push(
            onSnapshot(answerCandidates, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        let data = change.doc.data();
                        pcDict[remoteUserDoc.id].addIceCandidate(new RTCIceCandidate(data));
                    }
                });
            })
        );
    });

    // New clients that want us to answer
    snapshotListeners.push(
        onSnapshot(collection(localUserDoc, 'clients'), (snapshot) => {
            snapshot.docChanges().forEach( async (change) => {
                if (change.type === 'added') {
                    const offerCandidates = collection(change.doc.ref, 'offerCandidates');
                    const answerCandidates = collection(change.doc.ref, 'answerCandidates');

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
                    snapshotListeners.push(
                        onSnapshot(offerCandidates, (snapshot) => {
                            snapshot.docChanges().forEach((change) => {
                                if (change.type === 'added') {
                                    let data = change.doc.data();
                                    pcDict[remoteUserDoc.id].addIceCandidate(new RTCIceCandidate(data));
                                }
                            });
                        })
                    );
                }
                else if (change.type === 'removed') {
                    let remoteUserDoc = change.doc.ref;

                    pcDict[remoteUserDoc.id].close();
                    pcDict[remoteUserDoc.id].onicecandidate = null;
                    pcDict[remoteUserDoc.id].onaddstream = null;
                    pcDict[remoteUserDoc.id] = null;
                    let remoteCam = videoTray.querySelector(`#user-${remoteUserDoc.id}`);
                    remoteCam.remove();
                }
            });
        })
    );

    callBtn.disabled = true;
    hangUpBtn.disabled = false;

    //-----------------------------------------------------------------//

    chatForm.style.display = 'block';

    let messages = collection(callDoc, 'messages');
    
    var html;
    onSnapshot(messages, (snapshot) => {    
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                console.log(change.doc.data().user);
                console.log(change.doc.data().text);
                console.log(change.doc.data().time);
                console.log(change.doc.data().timestamp); 

                html ="";
                html += '<li style="text-align:left;">';
                html += change.doc.data().user + " " + change.doc.data().time.substring(0,6) + "<br>" + change.doc.data().text;
                html += "</li>";
    
                document.getElementById("messages").innerHTML += html;
            }
        });
        var messageBody = document.querySelector('#messageBody');
        messageBody.scrollTop = messageBody.scrollHeight - messageBody.clientHeight;
    });

     //-----------------------------------------------------------------//
});

hangUpBtn.addEventListener('click', async () => {
    const calls = collection(firestore, 'calls');
    const callDoc = doc(calls, callInput.value);
    const participants = collection(callDoc, 'participants');
    const localUserDoc = doc(participants, localUserId);
    const userDocs = await getDocs(participants);

    snapshotListeners.forEach((listener) => {
        listener();
    });

    userDocs.forEach(async (remoteUserDoc) => {
        if (remoteUserDoc.id === localUserId || !Object.keys(pcDict).includes(remoteUserDoc.id)) {
            return;
        }

        pcDict[remoteUserDoc.id].close();
        pcDict[remoteUserDoc.id].onicecandidate = null;
        pcDict[remoteUserDoc.id].ontrack = null;
        pcDict[remoteUserDoc.id] = null;
        let remoteCam = videoTray.querySelector(`#user-${remoteUserDoc.id}`);
        remoteCam.remove();

        console.dir(doc(collection(remoteUserDoc.ref, 'clients'), localUserId));
        const localUserDoc = doc(collection(remoteUserDoc.ref, 'clients'), localUserId);
        await deleteDoc(localUserDoc);
    });

    let clientDocs = await getDocs(collection(localUserDoc, 'clients'));
    clientDocs.forEach(async (clientDoc) => {
        let offerCandidates = await getDocs(collection(clientDoc.ref, 'offerCandidates'));
        let answerCandidates = await getDocs(collection(clientDoc.ref, 'answerCandidates'));
        offerCandidates.forEach(async (offerDoc) => {
            await deleteDoc(offerDoc.ref);
        })
        answerCandidates.forEach(async (answerDoc) => {
            await deleteDoc(answerDoc.ref);
        })
        await deleteDoc(clientDoc.ref);
    });
    await deleteDoc(localUserDoc);

    callBtn.disabled = false;
    hangUpBtn.disabled = true;
});

// window.addEventListener('beforeOnLoad', (e) => {
//     e.preventDefault();

//     if (confirm('You sure you want to leave?')) {
//         alert('good bye');
//     }
//     // else {

//     // }

//     // e.returnValue = 'Do you want to leave?';
//     return '';
// });

// TODO: 斷線問題處理，如果回來時使用者底下有answer或offer的話會導致不預期的狀況發生
// TODO: - 主因在於斷線時，使用者資料不會被刪除，造成房間有新成員加入時，會照樣傳送offer給不再通話(斷線)的使用者
// TODO: - 所以當使用者連線回來時，會導致問題發生。