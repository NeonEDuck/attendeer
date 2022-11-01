import { prefab } from './prefab.js'
import { ClassModal } from './classModel.js';
import { apiCall, SECOND } from './util.js';

const addClassTemplate   = document.querySelector('#add-class-template');
const addClassBtn        = document.querySelector('#add-class-btn');
const classList          = document.querySelector('.class-list');
const classCardPrefab    = prefab.querySelector('.class-card');

const classModal = new ClassModal();

async function refreshClasses() {
    const response = await apiCall('getClasses');
    const classes = await response.json();
    classList.querySelectorAll('.class-card').forEach((e) => {
        e.remove();
    });
    for (const classData of classes) {
        const classCard = classCardPrefab.cloneNode(true);
        const classCardName = classCard.querySelector('.class-card__name');
        const classCardId   = classCard.querySelector('.class-card__id');
        const classCardLink = classCard.querySelector('.class-card__link');
        classCardName.innerHTML = classData.ClassName;
        classCardId.innerHTML   = classData.ClassId;
        classCardLink.href      = `/${classData.ClassId}`;

        classList.insertBefore(classCard, addClassTemplate);
    }
}

classModal.__submitAddClass = classModal._submitAddClass;
classModal._submitAddClass = (e) => {
    classModal.__submitAddClass(e);
    refreshClasses();
}

document.onreadystatechange = async () => {
    setInterval(() => {
        refreshClasses()
    }, 5 * SECOND);
};

addClassBtn?.addEventListener('click', async () => {
    classModal.openAddModal();
});