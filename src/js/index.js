import { onSnapshot, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, query, where, limit } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import { prefab } from './prefab.js'
import { ClassModal } from './classModel.js';
import { generateCallId, getUser } from './util.js';

const addClassTemplate   = document.querySelector('#add-class-template');
const addClassBtn        = document.querySelector('#add-class-btn');
const classList          = document.querySelector('.class-list');
const classCardPrefab    = prefab.querySelector('.class-card');

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