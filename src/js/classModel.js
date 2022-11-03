import { prefab } from './prefab.js'
import { apiCall } from './util.js';

const attendeeRowPrefab = prefab.querySelector('.attendee-row');

const classModal         = document.querySelector('#class-modal');
const classModalForm     = document.querySelector('#close-modal__form');
const classModalTitle    = classModal.querySelector('#class-modal__title');

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

export class ClassModal {
    action = '';
    attendeeList = [];
    classId = '';
    constructor() {
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
        className.value     = '';
        alertInterval.value = '';
        alertTime.value     = '';
        attendeeInput.value = '';
        attendeeTableTBody.innerHTML = '';
        this.attendeeList = [];
    }

    openAddModal() {
        this.resetModal();
        submitClassBtn.hidden = false;
        submitDeleteBtn.hidden = true;
        submitSettingBtn.hidden = true;
        classModalTitle.innerHTML = '新增課程';

        classModal.showModal();
    }

    async openModifyModal(classId) {
        const classInfo = await (await apiCall('getClass', {classId})).json();
        const attendees = await (await apiCall('getClassAttendees', {classId})).json();

        console.log(classId)

        className.value     = classInfo.ClassName;
        schoolSelect.value  = classInfo.SchoolId;
        alertInterval.value = classInfo.Interval;
        alertTime.value     = classInfo.Duration;
        attendeeInput.value = '';

        attendeeTableTBody.innerHTML = '';
        for (const attnedee of attendees) {
            // const user = doc(users, userId);
            // const data = (await getDoc(user)).data();
            this.attendeeList.push(attnedee.Email);

            const row = attendeeRowPrefab.cloneNode(true);
            // console.log(row);
            const rowName  = row.querySelector('.attendee-row__name');
            const rowEmail = row.querySelector('.attendee-row__email');
            // row.dataset.id = attnedee.UserId;
            rowName.innerHTML  = attnedee.UserName;
            rowEmail.innerHTML = attnedee.Email;

            attendeeTableTBody.append(row);
        }

        this.classId = classId;
        submitClassBtn.hidden = true;
        submitDeleteBtn.hidden = false;
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
        const response = await apiCall('deleteClass', {classId: this.classId});
        if (response.status === 201) {
            window.location.href = '/';
        }
    }

    async _submitForm(e) {
        e.preventDefault()
        submitClassBtn.disabled = true;
        submitSettingBtn.disabled = true;

        const name     = className.value.trim();
        const schoolId = schoolSelect.value;
        const interval = Number(alertInterval.value);
        const duration = Number(alertTime.value);

        const data = {
            classId: this.classId,
            className: name,
            schoolId,
            interval,
            duration,
            attendees: this.attendeeList,
        }

        if (this.action === 'add') {
            const response = await apiCall('addClass', data);

            if (response.status !== 201) {
                submitClassBtn.disabled = false;
                submitSettingBtn.disabled = false;
                this._showErrorMessage(attendeeTable, '鍵入的資料有錯誤');
                return false;
            }
        }
        else if (this.action === 'update') {
            console.log(data);
            const response = await apiCall('updateClass', data);

            if (response.status !== 201) {
                submitClassBtn.disabled = false;
                submitSettingBtn.disabled = false;
                this._showErrorMessage(attendeeTable, '鍵入的資料有錯誤');
                return false;
            }
        }

        classModal.close();
        return true;
    }

    async _addAttendee(e) {
        let email;
        if ((email = attendeeInput.value?.trim()) && !this.attendeeList.includes(email)) {
            const response = await apiCall('getUserInfo', {email});
            const user = await response.json();

            if (!user.UserId) {
                this._showErrorMessage(attendeeInput, '找不到使用者');
                return;
            }

            this.attendeeList.push(email);
            const row = attendeeRowPrefab.cloneNode(true);
            const rowName  = row.querySelector('.attendee-row__name');
            const rowEmail = row.querySelector('.attendee-row__email');
            row.dataset.email = email;
            rowName.innerHTML  = user.UserName;
            rowEmail.innerHTML = email;
            const tBody = attendeeTable.querySelector('tbody');
            tBody.append(row);
            attendeeInput.value = '';
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
        errorMessage.style.top = `${classModal.scrollTop + rect.bottom - modalRect.top}px`;
        errorMessage.innerHTML = msg;
        errorMessage.classList.add('show');
    }
}

errorMessage.addEventListener('transitionend', () => {
    errorMessage.classList.remove('show');
    errorMessage.style.left = ``;
    errorMessage.style.top = ``;
});