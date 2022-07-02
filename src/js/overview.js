import { onSnapshot, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import './base.js'
import { generateCallId, getLocalUser } from './util.js';

const addClassTemplate   = document.querySelector('#add-class-template');
const addClassBtn        = document.querySelector('#add-class-btn');
const classList          = document.querySelector('.class-list');
const classCardPrefab    = document.querySelector('.class-card');
const attendeeRowPrefab  = document.querySelector('.attendee-row');

const classModel         = document.querySelector('#class-modal');
const classModelForm     = classModel.querySelector('#close-modal__form');
const classModelTitle    = classModel.querySelector('#class-modal__title');

const confirmModel       = document.querySelector('#confirm-modal');
const confirmModelTitle  = document.querySelector('#confirm-modal__title');
const cancelBtn          = document.querySelector('#modal-cancel-btn');
const confirmBtn         = document.querySelector('#modal-confirm-btn');

const classId            = classModel.querySelector("#class-id");
const className          = classModel.querySelector("#class-name");
const alertInterval      = classModel.querySelector("#alert-interval");
const alertTime          = classModel.querySelector("#alert-time");
const attendeeInput      = document.querySelector('#attendee-input');
const addAttendeeBtn     = document.querySelector('#add-attendee-btn');
const attendeeTable      = document.querySelector('#attendee-table');
const attendeeTableTBody = attendeeTable.querySelector('tbody');

const submitForm         = document.querySelector('#submit-form');
const submitClassBtn     = document.querySelector('#submit-class');
const submitSettingBtn   = document.querySelector('#submit-setting');
const closeModalBtn      = document.querySelector('#close-modal-btn');

classCardPrefab.remove();
attendeeRowPrefab.remove();

const calls = collection(firestore, 'calls');
const users = collection(firestore, 'users');

let action;
let attendeeDict = {}

document.onreadystatechange = async () => {
    const user = await getLocalUser();
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
                const classCardSetting = classCard.querySelector('.class-card__setting');
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
                    window.location.href = `/meeting/${classCard.dataset.id}`;
                });

                classCardSetting.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    classId.value       = classCard.dataset.id;
                    className.value     = classCard.dataset.name;
                    alertInterval.value = classCard.dataset.alertInterval;
                    alertTime.value     = classCard.dataset.alertTime;
                    attendeeInput.value = '';

                    attendeeTableTBody.innerHTML = '';
                    for (const userId of classCard.dataset.attendees.split(',')) {
                        const user = doc(users, userId);
                        const data = (await getDoc(user)).data();
                        attendeeDict[data.email] = user.id;

                        const row = attendeeRowPrefab.cloneNode(true);
                        const rowName  = row.querySelector('.attendee-row__name');
                        const rowEmail = row.querySelector('.attendee-row__email');
                        row.dataset.id = user.id;
                        rowName.innerHTML  = data.name;
                        rowEmail.innerHTML = data.email;

                        attendeeTableTBody.append(row);
                    }

                    classModelTitle.innerHTML = '設定';
                    submitClassBtn.hidden = true;
                    submitSettingBtn.hidden = false;
                    classModel.showModal();
                });

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
    classId.value       = '';
    className.value     = '';
    alertInterval.value = '';
    alertTime.value     = '';
    attendeeInput.value = '';
    attendeeTableTBody.innerHTML = '';
    attendeeDict = [];
    submitClassBtn.hidden = false;
    submitSettingBtn.hidden = true;
    classModelTitle.innerHTML = '新增課程';

    classModel.showModal();
});

closeModalBtn.addEventListener('click', () => {
    classModel.close();
});

submitClassBtn.addEventListener('click', () => {
    console.log('submitClass');
    action = 'add';
    submitForm.disabled = false;
    submitForm.click();
    submitForm.disabled = true;
});

submitSettingBtn.addEventListener('click', () => {
    console.log('submitSetting');
    action = 'update';
    submitForm.disabled = false;
    submitForm.click();
    submitForm.disabled = true;
});

classModelForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const classId       = classModel.querySelector("#class-id");
    const className     = classModel.querySelector("#class-name");
    const alertInterval = classModel.querySelector("#alert-interval");
    const alertTime     = classModel.querySelector("#alert-time");

    const name     = className.value.trim();
    const interval = Number(alertInterval.value);
    const time     = Number(alertTime.value);
    const notifies = false;

    const { uid } = await getLocalUser();
    const attendees = Object.values(attendeeDict);
    if (!attendees.includes(uid)) {
        attendees.push(uid);
    }
    const data = {
        name,
        alert: {
            interval,
            time,
            notifies,
        },
        attendees,
        host: uid,
    }

    if (action === 'add') {
        const callDoc = doc(calls, generateCallId());
        await setDoc(callDoc, data);
    }
    else if (action === 'update') {
        const callDoc = doc(calls, classId.value);
        await updateDoc(callDoc, data);
    }

    classModel.close();
});

addAttendeeBtn.addEventListener('click', async () => {
    let email;
    if ((email = attendeeInput.value?.trim()) && !attendeeDict[email]) {
        const q = query(users, where('email', '==', email), limit(1))
        const userDocs = await getDocs(q);

        userDocs.forEach((user) => {
            const data = user.data();
            attendeeDict[email] = user.id;
            const row = attendeeRowPrefab.cloneNode(true);
            const rowName  = row.querySelector('.attendee-row__name');
            const rowEmail = row.querySelector('.attendee-row__email');
            row.dataset.id = user.id;
            rowName.innerHTML  = data.name;
            rowEmail.innerHTML = data.email;
            attendeeTableTBody.append(row);
            attendeeInput.value = '';
        });
    }
});

attendeeInput.addEventListener('keydown', function(event){
    if (event.keyCode === 13) {
        addAttendeeBtn.click();
    }
});