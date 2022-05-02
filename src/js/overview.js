
import { collection, doc, setDoc, updateDoc, getDocs, query, where } from "firebase/firestore";
import { firestore } from "./firebase-config.js";
import { getUser } from "./login.js";
import { generateCallId } from './util.js';

const addClassBtn      = document.querySelector('#add-class-btn');
const classList        = document.querySelector('.class-list');
const classCardPrefab  = document.querySelector('.class-card');
const settingModel     = document.querySelector('#setting-modal');
const addClassModel    = document.querySelector('#add-class-modal');
// const submitClassModel = document.querySelector('#submit-class-modal');
const closeModalBtns  = document.querySelectorAll('.close-modal-btn');
classCardPrefab.hidden = false;
classCardPrefab.remove();

const calls = collection(firestore, 'calls');
const users = collection(firestore, 'users');

document.onreadystatechange = async () => {
    const user = await getUser();

    console.log(user);

    const q = query(calls, where('attendees', 'array-contains', user.uid));
    const callDocs = await getDocs(q);
    callDocs.forEach((doc) => {
        const data = doc.data();
        const classCard = classCardPrefab.cloneNode(true);
        const classCardName = classCard.querySelector('.class-card__name');
        const classCardId = classCard.querySelector('.class-card__id');
        const classCardSetting = classCard.querySelector('.class-card__setting');
        classCardName.innerHTML = data.name || 'Unnamed';
        classCardId.innerHTML = doc.id;

        classCard.setAttribute('data-id', doc.id);
        classCard.setAttribute('data-name', classCardName.innerHTML);
        classCard.setAttribute('data-alert-interval', data.alert?.interval);
        classCard.setAttribute('data-alert-time', data.alert?.time);

        classCard.addEventListener('click', () => {
            window.location.href = `/meeting/${doc.id}`;
        });

        classCardSetting.addEventListener('click', (e) => {
            e.stopPropagation();
            const classId = settingModel.querySelector("#classId");
            const className = settingModel.querySelector("#className");
            const alertInterval = settingModel.querySelector("#alertInterval");
            const alertTime = settingModel.querySelector("#alertTime");

            classId.value       = classCard.getAttribute('data-id');
            className.value     = classCard.getAttribute('data-name');
            alertInterval.value = classCard.getAttribute('data-alert-interval');
            alertTime.value     = classCard.getAttribute('data-alert-time');

            settingModel.showModal();
        });

        classList.append(classCard);
        console.log();
    })
};

addClassBtn.addEventListener('click', async () => {
    addClassModel.showModal();
});

closeModalBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        settingModel.close();
        addClassModel.close();
    });
});

addClassModel.addEventListener('submit', async (e) => {
    e.preventDefault()

    const className = addClassModel.querySelector("#className");
    const alertInterval = addClassModel.querySelector("#alertInterval");
    const alertTime = addClassModel.querySelector("#alertTime");

    const name = className.value.trim();
    const interval = Number(alertInterval.value);
    const time     = Number(alertTime.value);

    const calls = collection(firestore, 'calls');
    const callDoc = doc(calls, generateCallId());

    const { uid } = await getUser();
    const data = {
        name,
        alert: {
            interval,
            time,
        },
        attendees: [ uid ],
        host: uid,
    }

    await setDoc(callDoc, data);

    addClassModel.close();
    window.location.reload();
});

settingModel.addEventListener('submit', async (e) => {
    e.preventDefault()

    const classId       = settingModel.querySelector("#classId");
    const className     = settingModel.querySelector("#className");
    const alertInterval = settingModel.querySelector("#alertInterval");
    const alertTime     = settingModel.querySelector("#alertTime");

    const name = className.value.trim();
    const interval = Number(alertInterval.value);
    const time     = Number(alertTime.value);

    const calls = collection(firestore, 'calls');
    const callDoc = doc(calls, classId.value);

    const { uid } = await getUser();
    const data = {
        name,
        alert: {
            interval,
            time,
        },
        attendees: [ uid ],
        host: uid,
    }

    await updateDoc(callDoc, data);

    addClassModel.close();
    window.location.reload();
});