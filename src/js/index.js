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
        const classCard           = classCardPrefab.cloneNode(true);
        const classCardName       = classCard.querySelector('.class-card__name');
        const classCardLink       = classCard.querySelector('.class-card__button');
        const classCardHour       = classCard.querySelector('.class-card__hour');
        const classCardClasssId   = classCard.querySelector('.class-card__class-id');
        const classCardHost       = classCard.querySelector('.class-card__host');
        classCard.style.setProperty('--class-color', `var(--clr-class-${classData.ClassColor})`);
        classCardName.innerHTML = classData.ClassName;
        classCardLink.href      = `/${classData.ClassId}`;
        classCardHour.innerHTML = classData.ClassHour;
        classCardClasssId.innerHTML = classData.ClassId;
        classCardHost.innerHTML = classData.HostName;

        console.log(classData);

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