import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where, limit } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import { getUser } from "./login.js";
import { generateCallId } from './util.js';

const addClassBtn        = document.querySelector('#add-class-btn');
const classList          = document.querySelector('.class-list');
const classCardPrefab    = document.querySelector('.class-card');
const attendeeRowPrefab  = document.querySelector('.attendee-row');

const classModel         = document.querySelector('#class-modal');
const classModelForm     = classModel.querySelector('#close-modal__form');
const classModelTitle    = classModel.querySelector('#class-modal__title');
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
    const user = await getUser();

    const q = query(calls, where('attendees', 'array-contains', user.uid));
    const callDocs = await getDocs(q);
    callDocs.forEach((callDoc) => {
        const data = callDoc.data();
        const classCard        = classCardPrefab.cloneNode(true);
        const classCardName    = classCard.querySelector('.class-card__name');
        const classCardId      = classCard.querySelector('.class-card__id');
        const classCardSetting = classCard.querySelector('.class-card__setting');
        classCardName.innerHTML = data.name || 'Unnamed';
        classCardId.innerHTML = callDoc.id;

        classCard.dataset.id = callDoc.id;
        classCard.dataset.name = classCardName.innerHTML;
        classCard.dataset.alertInterval = data.alert?.interval;
        classCard.dataset.alertTime = data.alert?.time;
        classCard.dataset.attendees = data.attendees;

        classCard.addEventListener('click', () => {
            window.location.href = `/meeting/${callDoc.id}`;
        });

        classCardSetting.addEventListener('click', (e) => {
            e.stopPropagation();
            classId.value       = classCard.dataset.id;
            className.value     = classCard.dataset.name;
            alertInterval.value = classCard.dataset.alertInterval;
            alertTime.value     = classCard.dataset.alertTime;

            attendeeTableTBody.innerHTML = '';
            classCard.dataset.attendees.split(',').forEach(async (userId) => {
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
            });

            classModelTitle.innerHTML = 'Setting';
            submitClassBtn.hidden = true;
            submitSettingBtn.hidden = false;
            classModel.showModal();
        });

        classList.append(classCard);
    })
};

addClassBtn.addEventListener('click', async () => {
    classId.value       = '';
    className.value     = '';
    alertInterval.value = '';
    alertTime.value     = '';
    attendeeTableTBody.innerHTML = '';
    attendeeDict = [];
    submitClassBtn.hidden = false;
    submitSettingBtn.hidden = true;
    classModelTitle.innerHTML = 'Add a class';

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

    const { uid } = await getUser();
    const attendees = Object.values(attendeeDict);
    if (!attendees.includes(uid)) {
        attendees.push(uid);
    }
    const data = {
        name,
        alert: {
            interval,
            time,
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
    window.location.reload();
});

addAttendeeBtn.addEventListener('click', async () => {
    let email;
    if ((email = attendeeInput.value?.trim()) && !attendeeDict[email]) {
        const q = query(users, where('email', '==', email), limit(1))
        const user = await getDocs(q);

        user.forEach((user) => {
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