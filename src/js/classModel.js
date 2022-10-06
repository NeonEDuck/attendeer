import { collection, doc, getDoc, deleteDoc, setDoc, updateDoc, getDocs, query, where, limit } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import { prefab } from './prefab.js'
import { generateCallId, htmlToElement, fetchData, showErrorMessage, getUser } from './util.js';

const attendeeRowPrefab = prefab.querySelector('.attendee-row');

const classModal         = document.querySelector('#class-modal');
const classModalForm     = document.querySelector('#close-modal__form');
const classModalTitle    = classModal.querySelector('#class-modal__title');

const classId            = document.querySelector('#class-modal__class-id');
const className          = document.querySelector('#class-modal__class-name');
const schoolSelect       = document.querySelector('#class-modal__school-select');
const alertInterval      = document.querySelector('#class-modal__alert-interval');
const alertTime          = document.querySelector('#class-modal__alert-time');

const attendeeInput      = document.querySelector('#attendee-input');
const addAttendeeBtn     = document.querySelector('#add-attendee-btn');
const attendeeTable      = document.querySelector('#attendee-table');
const attendeeTableTBody = attendeeTable.querySelector('tbody');

const errorMessage       = document.querySelector('#modal-error-message');
const submitForm         = document.querySelector('#submit-form');
const submitClassBtn     = document.querySelector('#submit-class');
const submitDeleteBtn    = document.querySelector('#submit-delete');
const submitSettingBtn   = document.querySelector('#submit-setting');
const closeModalBtn      = document.querySelector('#close-modal-btn');

const confirmDeleteModal         = document.querySelector('#confirm-delete-modal');
const closeConfirmDeleteModalBtn = document.querySelector('#close-confirm-delete-modal-btn');
const confirmDeleteBtn           = document.querySelector('#confirm-delete');

const calls = collection(firestore, 'calls');
const users = collection(firestore, 'users');

export class ClassModal {
    action = '';
    attendeeDict = {};
    callId = '';
    constructor() {
        fetchData('/school_time_table.json')
            .then((data) => {
                for (const s of data) {
                    schoolSelect.appendChild(htmlToElement(`
                        <option value="${s.id}">
                            ${s.name}
                        </option>
                    `));
                }
            });
        closeModalBtn.addEventListener('click', (e) => {
            this._closeModal(e);
        });
        closeConfirmDeleteModalBtn.addEventListener('click', (e) => {
            this._closeConfirmDeleteModal(e);
        })
        submitClassBtn.addEventListener('click', (e) => {
            this._submitAddClass(e);
        });
        submitDeleteBtn.addEventListener('click', (e) => {
            this._submitDeleteSetting(e);
        });
        submitSettingBtn.addEventListener('click', (e) => {
            this._submitModifySetting(e);
        });
        confirmDeleteBtn.addEventListener('click', (e) => {
            this._confirmDelete(e);
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
        this.callId = callId;
        const callDoc = await getDoc(doc(calls, callId));
        const { name, school, alert, attendees } = callDoc.data();

        classId.value       = callDoc.id;
        className.value     = name;
        schoolSelect.value  = school;
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

    openDeleteModal() {
        confirmDeleteModal.showModal();
    }

    _closeModal(e) {
        classModal.close();
    }
    _closeConfirmDeleteModal(e) {
        confirmDeleteModal.close();
    }

    _submitAddClass(e) {
        console.log('submitClass');
        this.action = 'add';
        submitForm.disabled = false;
        submitForm.click();
        submitForm.disabled = true;
    }
    _submitDeleteSetting(e) {
        this.openDeleteModal();
    }

    _submitModifySetting(e) {
        console.log('submitSetting');
        this.action = 'update';
        submitForm.disabled = false;
        submitForm.click();
        submitForm.disabled = true;
    }

    async _confirmDelete(e) {
        console.log('confirmDelete');
        const callDoc = doc(calls, this.callId);

        // const participants = collection(callDoc, 'participants');
        // const userDocs = await getDocs(participants);
        // for (const userDoc of userDocs.docs) {
        //     const clients = collection(userDoc.ref, 'clients');
        //     const clientDocs = await getDocs(clients);
        //     for (const clientDoc of clientDocs.docs) {
        //         const candidates = collection(clientDoc.ref, 'candidates');
        //         const candidateDocs = await getDocs(candidates);
        //         for (const c of candidateDocs.docs) {
        //             await deleteDoc(c.ref);
        //         }
        //         await deleteDoc(clientDoc.ref);
        //     }
        //     await deleteDoc(userDoc.ref);
        // }

        // const messages = collection(callDoc, 'messages');
        // const messageDocs = await getDocs(messages);
        // for (const msg of messageDocs.docs) {
        //     await deleteDoc(msg.ref);
        // }

        //! 警醒加進來後要更新

        await deleteDoc(callDoc);

        window.location.href = '/';
    }

    async _submitForm(e) {
        e.preventDefault()

        const name     = className.value.trim();
        const school   = schoolSelect.value;
        const interval = Number(alertInterval.value);
        const time     = Number(alertTime.value);
        const notifies = false;

        if (school === '') {
            console.log('no');
            return;
        }

        const { uid } = await getUser();
        console.log(this.attendeeDict);
        const attendees = Object.values(this.attendeeDict);
        if (!attendees.includes(uid)) {
            attendees.push(uid);
        }
        const data = {
            name,
            school,
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
        return true;
    }

    async _addAttendee(e) {
        let email;
        if ((email = attendeeInput.value?.trim()) && !this.attendeeDict[email]) {
            const q = query(users, where('email', '==', email), limit(1))
            const userDocs = await getDocs(q);
            if (userDocs.docs.length === 0) {
                this._showErrorMessage(attendeeInput, '找不到使用者');
            }
            else {
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
    }

    _attendeeInput(e) {
        if (e.keyCode === 13) {
            addAttendeeBtn.click();
        }
    }

    _showErrorMessage(element, msg) {
        const modalRect = classModal.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        errorMessage.style.left = `${rect.left - modalRect.left}px`;
        errorMessage.style.top = `${rect.bottom - modalRect.top}px`;
        errorMessage.innerHTML = msg;
        errorMessage.classList.add('show');
    }
}

errorMessage.addEventListener('transitionend', () => {
    errorMessage.classList.remove('show');
    errorMessage.style.left = ``;
    errorMessage.style.top = ``;
});