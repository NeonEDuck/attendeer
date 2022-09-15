import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where, limit } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import { prefab } from './prefab.js'
import { generateCallId, getUser } from './util.js';

const attendeeRowPrefab = prefab.querySelector('.attendee-row');

const classModal         = document.querySelector('#class-modal');
const classModalForm     = document.querySelector('#close-modal__form');
const classModalTitle    = classModal.querySelector('#class-modal__title');

const classId            = document.querySelector("#class-modal__class-id");
const className          = document.querySelector("#class-modal__class-name");
const alertInterval      = document.querySelector("#class-modal__alert-interval");
const alertTime          = document.querySelector("#class-modal__alert-time");

const attendeeInput      = document.querySelector('#attendee-input');
const addAttendeeBtn     = document.querySelector('#add-attendee-btn');
const attendeeTable      = document.querySelector('#attendee-table');
const attendeeTableTBody = attendeeTable.querySelector('tbody');

const submitForm         = document.querySelector('#submit-form');
const submitClassBtn     = document.querySelector('#submit-class');
const submitSettingBtn   = document.querySelector('#submit-setting');
const closeModalBtn      = document.querySelector('#close-modal-btn');

const calls = collection(firestore, 'calls');
const users = collection(firestore, 'users');

export class ClassModal {
    action = '';
    attendeeDict = {};
    constructor() {
        closeModalBtn.addEventListener('click', (e) => {
            this._closeModal(e);
        });
        submitClassBtn.addEventListener('click', (e) => {
            this._submitAddClass(e);
        });
        submitSettingBtn.addEventListener('click', (e) => {
            this._submitModifySetting(e);
        });
        classModalForm.addEventListener('submit', (e) => {
            this._submitForm(e);
        });
        addAttendeeBtn.addEventListener('click', (e) => {
            this._addAttendee(e);
        });
        attendeeInput.addEventListener('keydown', (e) => {
            this._attendeeInput(e);
        });
    }

    resetModal() {
        classId.value       = '';
        className.value     = '';
        alertInterval.value = '';
        alertTime.value     = '';
        attendeeInput.value = '';
        attendeeTableTBody.innerHTML = '';
        this.attendeeDict = {};
    }

    openAddModal() {
        this.resetModal();
        submitClassBtn.hidden = false;
        submitSettingBtn.hidden = true;
        classModalTitle.innerHTML = '新增課程';

        classModal.showModal();
    }

    async openModifyModal(callId) {
        const callDoc = await getDoc(doc(calls, callId));
        const { name, alert, attendees } = callDoc.data();

        classId.value       = callDoc.id;
        className.value     = name;
        alertInterval.value = alert.interval;
        alertTime.value     = alert.time;
        attendeeInput.value = '';

        attendeeTableTBody.innerHTML = '';
        for (const userId of attendees) {
            const user = doc(users, userId);
            const data = (await getDoc(user)).data();
            this.attendeeDict[data.email] = user.id;

            const row = attendeeRowPrefab.cloneNode(true);
            console.log(row);
            const rowName  = row.querySelector('.attendee-row__name');
            const rowEmail = row.querySelector('.attendee-row__email');
            row.dataset.id = user.id;
            rowName.innerHTML  = data.name;
            rowEmail.innerHTML = data.email;

            attendeeTableTBody.append(row);
        }

        submitClassBtn.hidden = true;
        submitSettingBtn.hidden = false;
        classModalTitle.innerHTML = '設定';
        classModal.showModal();
    }

    _closeModal(e) {
        classModal.close();
    }

    _submitAddClass(e) {
        console.log('submitClass');
        this.action = 'add';
        submitForm.disabled = false;
        submitForm.click();
        submitForm.disabled = true;
    }

    _submitModifySetting(e) {
        console.log('submitSetting');
        this.action = 'update';
        submitForm.disabled = false;
        submitForm.click();
        submitForm.disabled = true;
    }

    async _submitForm(e) {
        e.preventDefault()

        const name     = className.value.trim();
        const interval = Number(alertInterval.value);
        const time     = Number(alertTime.value);
        const notifies = false;

        const { uid } = await getUser();
        console.log(this.attendeeDict);
        const attendees = Object.values(this.attendeeDict);
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

        if (this.action === 'add') {
            const callDoc = doc(calls, generateCallId());
            await setDoc(callDoc, data);
        }
        else if (this.action === 'update') {
            const callDoc = doc(calls, classId.value);
            await updateDoc(callDoc, data);
        }

        classModal.close();
    }

    async _addAttendee(e) {
        let email;
        if ((email = attendeeInput.value?.trim()) && !this.attendeeDict[email]) {
            const q = query(users, where('email', '==', email), limit(1))
            const userDocs = await getDocs(q);

            userDocs.forEach((user) => {
                const data = user.data();
                this.attendeeDict[email] = user.id;
                const row = attendeeRowPrefab.cloneNode(true);
                const rowName  = row.querySelector('.attendee-row__name');
                const rowEmail = row.querySelector('.attendee-row__email');
                row.dataset.id = user.id;
                rowName.innerHTML  = data.name;
                rowEmail.innerHTML = data.email;
                const tBody = attendeeTable.querySelector('tbody');
                tBody.append(row);
                attendeeInput.value = '';
            });
        }
    }

    _attendeeInput(e) {
        if (e.keyCode === 13) {
            addAttendeeBtn.click();
        }
    }
}