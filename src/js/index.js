import { onSnapshot, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import { prefab } from './prefab.js'
import { ClassModal } from './classModel.js';
import { generateCallId, getUser } from './util.js';

const addClassTemplate   = document.querySelector('#add-class-template');
const addClassBtn        = document.querySelector('#add-class-btn');
const classList          = document.querySelector('.class-list');
const classCardPrefab    = prefab.querySelector('.class-card');

const confirmModel       = document.querySelector('#confirm-modal');
const confirmModelTitle  = document.querySelector('#confirm-modal__title');

const calls = collection(firestore, 'calls');

const classModal = new ClassModal();

document.onreadystatechange = async () => {
    const user = await getUser();
    if (user) {
        addClassTemplate.hidden = false;
    }

    const q = query(calls, where('attendees', 'array-contains', user.uid));
    onSnapshot(q, async (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added') {
                const data = change.doc.data();
                const classCard        = classCardPrefab.cloneNode(true);
                const classCardName    = classCard.querySelector('.class-card__name');
                const classCardId      = classCard.querySelector('.class-card__id');
                const classCardRemove  = classCard.querySelector('.class-card__remove');
                const classCardLink    = classCard.querySelector('.class-card__link');
                classCardName.innerHTML = data.name || 'Unnamed';
                classCardId.innerHTML = change.doc.id;

                classCard.dataset.id = change.doc.id;
                classCard.dataset.name = classCardName.innerHTML;
                classCard.dataset.alertInterval = data.alert?.interval;
                classCard.dataset.alertTime = data.alert?.time;
                classCard.dataset.attendees = data.attendees;

                classCardLink.addEventListener('click', () => {
                    window.location.href = `/${classCard.dataset.id}`;
                });

                if (user.uid === data.host) {
                    classCardRemove.hidden = false;
                }

                classCardRemove.addEventListener('click', (e) => {
                    e.stopPropagation();
                    confirmModelTitle.querySelector('span').innerHTML = classCard.dataset.name;
                    const confirmBtn = confirmModel.querySelector('#modal-confirm-btn');
                    const cancelBtn  = confirmModel.querySelector('#modal-cancel-btn');
                    confirmBtn.addEventListener('click', async () => {
                        const callDoc = doc(calls, classCard.dataset.id);

                        const participants = collection(callDoc, 'participants');
                        const userDocs = await getDocs(participants);
                        userDocs.forEach(async (userDoc) => {
                            const clients = collection(userDoc.ref, 'clients');
                            const clientDocs = await getDocs(clients);
                            clientDocs.forEach(async (clientDoc) => {
                                const candidates = collection(clientDoc.ref, 'candidates');
                                const candidateDocs = await getDocs(candidates);
                                candidateDocs.forEach(async (c) => {
                                    deleteDoc(c.ref);
                                });
                                deleteDoc(clientDoc.ref);
                            });
                            deleteDoc(userDoc.ref);
                        });

                        const messages = collection(callDoc, 'messages');
                        const messageDocs = await getDocs(messages);
                        messageDocs.forEach((msg) => {
                            deleteDoc(msg.ref);
                        });

                        //! 警醒加進來後要更新

                        deleteDoc(callDoc);
                        confirmModel.close();
                    });
                    cancelBtn.addEventListener('click', () => {
                        confirmModel.close();
                    });
                    confirmModel.showModal();
                });

                classList.insertBefore(classCard, addClassTemplate);
            }
            else if (change.type === 'modified') {
                const data = change.doc.data();
                const classCard = document.querySelector(`.class-card[data-id=${change.doc.id}]`);
                const classCardName    = classCard.querySelector('.class-card__name');
                const classCardId      = classCard.querySelector('.class-card__id');
                classCardName.innerHTML = data.name || 'Unnamed';

                classCard.dataset.name = classCardName.innerHTML;
                classCard.dataset.alertInterval = data.alert?.interval;
                classCard.dataset.alertTime = data.alert?.time;
                classCard.dataset.attendees = data.attendees;
            }
            else if (change.type === 'removed') {
                const data = change.doc.data();
                const classCard = document.querySelector(`.class-card[data-id=${change.doc.id}]`);
                classCard.remove();
            }
        });
    });
};

addClassBtn.addEventListener('click', async () => {
    classModal.openAddModal();
});