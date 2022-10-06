import { prefab } from './prefab.js';
import { getUserData, debounce } from './util.js';

const camPrefab = prefab.querySelector('.cam');

const servers = {
    iceServers: [
        {
            urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

export class Button {
    static toggleOpen(button, state) {
        if (state) {
            button.classList.add('btn-on');
        }
        else {
            button.classList.remove('btn-on');
        }
    }
}

export class Cam {
    static camDict = {};
    static area = null;
    static container = null;
    static pinnedContainer = null;
    static pinned = false;
    static Type = {
        Webcam: 'webcam',
        ScreenShare: 'screenShare',
        Audio: 'audio',
    };

    static init(area, container, pinnedContainer) {
        Cam.area = area;
        Cam.container = container;
        Cam.pinnedContainer = pinnedContainer;
    }

    static getCam(userId, streamType) {
        return Cam.camDict[`#user-${userId}-${streamType}`];
    }

    static resizeAll() {
        const em = 16;
        const containerWidth = Cam.container.clientWidth - (4*em);
        const containerHeight = Cam.container.clientHeight - (4*em);
        const camWidth = 15*em;
        const camHeight = camWidth/16*9;
        const x = 1 + Math.floor((containerWidth - camWidth) / (camWidth + 1.0*em));
        const y = 1 + Math.floor((containerHeight - camHeight) / (camHeight + 1.0*em));
        const count = Cam.container.children.length;
        const reorderedArray = [...Cam.container.children];
        reorderedArray.sort((a, b) => {return (a.id < b.id)?1:-1});
        reorderedArray.forEach((e) => {
            e.classList.remove('pinned');
            Cam.container.appendChild(e);
        });
        const cams = [...Cam.container.querySelectorAll('.cam:not([hidden], [id*="-audio"])')];
        const firstCam = cams[0];

        cams.slice(0, x*y).forEach((cam) => {
            cam.removeAttribute('overflowed');
        });
        cams.slice(Math.max(x*y, 1)).forEach((cam) => {
            cam.setAttribute('overflowed', '');
        });

        for (let i = y-1; i >= 0; i--) {
            if (count > i * x) {
                cams.forEach((cam, idx) => {
                    cam.style.maxHeight = `calc((100% - ${i}em) / ${(i+1)})`;
                    cam.style.maxWidth = (count > x && idx >= i*x)?`${firstCam.clientWidth}px`: 'initial';
                });
                break;
            }
        }
    }

    constructor(userId, streamType, parent=Cam.container) {
        this.id = `#user-${userId}-${streamType}`;
        let remoteCam = Cam.camDict[this.id];

        if (!remoteCam) {
            this.node = camPrefab.cloneNode(true);
            this.video = this.node.querySelector('.cam__video');
            this.name = this.node.querySelector('.cam__name');
            this.profile = this.node.querySelector('.cam__profile');
            this.warning = this.node.querySelector('.cam__warning');
            this.pinBtn = this.node.querySelector('.cam__pin-btn');
            this.owner = userId;
            this.streamType = streamType;

            remoteCam = this;
            Cam.camDict[this.id] = remoteCam;

            this.node.id = `user-${userId}-${streamType}`;
            this.node.setAttribute('data-user', userId);

            this.name.innerHTML = userId;
            console.log(userId);
            getUserData(userId).then((data) => {
                if (data) {
                    this.name.innerHTML = data.name;
                    this.profile.src = data.photo;
                }
            });
            this.pinBtn.addEventListener('click', () => {
                [...Cam.pinnedContainer.children].forEach((e) => {
                    Cam.container.appendChild(e);
                });
                if (this.node.classList.contains('pinned')) {
                    Cam.area.classList.remove('pinned-mode');
                    this.node.classList.remove('pinned');
                    Cam.resizeAll();
                }
                else {
                    this.node.classList.add('pinned');
                    Cam.area.classList.add('pinned-mode');
                    Cam.pinnedContainer.appendChild(this.node);
                    this.node.removeAttribute('overflowed');
                    this.node.style.maxHeight = '';
                    this.node.style.maxWidth = '';
                    Cam.resizeAll();
                }
            });

            parent?.appendChild(this.node);
            Cam.resizeAll();
        }
        return remoteCam;
    }

    turnOn(stream) {
        this.profile.hidden = true;
        const mediaStream = new MediaStream();
        const [ track ] = stream.getTracks();
        mediaStream.addTrack(track);
        this.video.srcObject = mediaStream;
    }

    turnOff() {
        this.video.srcObject = null;
        if (this.streamType === Cam.Type.Webcam) {
            this.profile.hidden = false;
        }
        else {
            this.destory();
        }
    }

    destory() {
        this.node.remove();
        delete Cam.camDict[this.id];
        Cam.resizeAll();
    }
}

export class Peer {
    static peers = {};
    static localUserId = null;
    static localStreams = null;
    static socket = null;

    static init(localStreams, socket) {
        Peer.localStreams = localStreams;
        Peer.socket = socket;
    }

    constructor(socketId, userId) {
        this.socketId = socketId;
        this.userId = userId;
        this.pc = new RTCPeerConnection(servers);
        this.senders = {};
        this.offerCreated = false;
        this.timestamp = Date.now();
        this.usersListener = null;
        this.candidatesListener = null;
        this.streams = {};
        this.oldStreams = {};
        this.polite = null;
        console.log(`created peer for ${this.userId}`);

        new Cam(this.userId, 'webcam');

        // Push all streamss in pc, then record the senders
        console.log('???');
        console.log(Peer.localStreams);
        for (const streamType in Peer.localStreams) {
            this.senders[streamType] = []
            if (Peer.localStreams[streamType]) {
                console.log(Peer.localStreams[streamType]);
                for (const track of Peer.localStreams[streamType].getTracks()) {
                    this.senders[streamType].push(this.pc.addTrack(track, Peer.localStreams[streamType]));
                }
            }
        }

        // // console.log('set ontrack');
        this.pc.ontrack = async (event) => {
            console.log('ontrack');
            for (const stream of event.streams) {
                // const stream = event.streams[0]
                const streamType = Object.keys(this.streams).find(key => this.streams[key] === stream.id)
                                || Object.keys(this.oldStreams).find(key => this.oldStreams[key] === stream.id);
                console.log(`get cam of ${this.userId}`);
                const cam = Cam.getCam(this.userId, streamType) || new Cam(this.userId, streamType);
                cam.turnOn(stream);

                stream.onremovetrack = ({track}) => {
                    console.log(`${track.kind} track was removed.`);
                    cam?.turnOff();

                    if (!stream.getTracks().length) {
                        console.log(`stream ${stream.id} emptied (effectively removed).`);
                    }
                };
                console.log(`stream ${stream.id} was added.`);
            }
        };
        // console.log('set onconnectionstatechange');
        this.pc.onconnectionstatechange = async (event) => {
            switch (this.pc.connectionState) {
                case "disconnected":
                    console.log(`connectionState: ${this.userId} disconnected`);
                    // await closePeer(this.userId);
                    break;

                case "new":
                    console.log(`connectionState: ${this.userId} new`);
                    break;

                case "connecting":
                    console.log(`connectionState: ${this.userId} connecting`);
                    break;

                case "connected":
                    for (const streamType in Peer.peers[this.userId]?.streams) {
                        Cam.getCam(this.userId, streamType).warning.hidden = true;
                    }
                    console.log(`connectionState: ${this.userId} connected`);
                    break;

                case "failed":
                    Cam.getCam(this.userId, streamType).warning.hidden = false;
                    console.log(`connectionState: ${this.userId} failed`);

                    //? 嘗試重新連線，不確定是否能成功，需要測試
                    pc.onnegotiationneeded({ iceRestart: true });
                    break;

            }
        };
        // console.log('set onnegotiationneeded');
        const offerToUserDebounce = debounce(async (userId) => {
            // const { pc } = Peer.peers[this.userId];
            this.pc.onicecandidate = (event) => {
                event.candidate && Peer.socket.emit('throw-candidate', this.socketId, {userId: Peer.localUserId, candidate: event.candidate.toJSON()});
            };

            const offerDesc = await this.pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true});
            await this.pc.setLocalDescription(offerDesc);

            const streams = {};
            for (const streamType in Peer.localStreams) {
                if (Peer.localStreams[streamType] && Peer.localStreams[streamType].length != 0) {
                    streams[streamType] = Peer.localStreams[streamType].id;
                }
            }

            const data = {
                userId: Peer.localUserId,
                desc: this.pc.localDescription,
                streams,
                timestamp: Date.now(),
            }

            console.log(`throw offer to: ${this.socketId} ${this.userId}`);
            Peer.socket.emit('throw-offer', this.socketId, data);
        });
        this.pc.onnegotiationneeded = (event) => {
            console.log('onnegotiationneeded');
            offerToUserDebounce(this.userId);
        };
    }

    release() {
        if (this.usersListener) {
            this.usersListener();
        }
        if (this.candidatesListener) {
            this.candidatesListener();
        }
        if (this.pc) {
            this.pc.onicecandidate = null;
            this.pc.close();
            this.pc = null;
        }

        for (const [id, cam] of Object.entries(Cam.camDict)) {
            if (id.startsWith(`#user-${this.userId}`)) {
                console.log(`match`)
                cam.destory();
            }
        }
    }
}