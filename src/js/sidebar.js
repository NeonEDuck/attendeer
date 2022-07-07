import { firestore } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import 'webrtc-adapter';
import { MINUTE, delay, debounce, getUser, randomLowerCaseString, replaceAll, getRandom, setIntervalImmediately } from './util.js';

// HTML elements
const body       = document.querySelector('body'),
      sidebar    = body.querySelector(".sidebar"),
      toggle     = body.querySelector(".toggle"),
      modeSwitch = body.querySelector(".toggle-switch"),
      modeText   = body.querySelector(".mode-text");

const fltCntr        = document.querySelector(".floating-container"),
      floatingAlert  = fltCntr.querySelector('.floating-alert');

const navBtn  = document.querySelectorAll('.nav-btn');

const classModel         = document.querySelector('#class-modal'),
      classModelForm     = classModel.querySelector('#close-modal__form'),
      classModelTitle    = classModel.querySelector('#class-modal__title'),
      alertType          = classModel.querySelector('#alert-type'),
      alertInterval      = classModel.querySelector("#alert-interval"),
      alertTime          = classModel.querySelector("#alert-time"),
      submitSettingBtn   = classModel.querySelector('#submit-setting'),
      submitForm         = classModel.querySelector('#submit-form');
      
const callId     = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

// Global variable
let action;
let localUserId = null;
// Firestore
const calls = collection(firestore, 'calls');
const callDoc = doc(calls, callId);

export function sidebarListener() {
    Array.from(navBtn).forEach((item, index) => {
        item.addEventListener("click",async (e) => {
            Array.from(navBtn).forEach((item) => {
                item.className = "nav-btn";
                floatingAlert.style.opacity = 0;
            });
            navBtn[index].classList.toggle("open");

            let navText = navBtn[index].querySelector('.nav-text').innerHTML;

            fltCntr.classList.add("show");

            if(navText === '警醒資訊') {

                const { alert, host } = (await getDoc(callDoc)).data();
                const { interval, time: duration, alertType:type } = alert;     

                const user = await getUser();

                localUserId = user.uid;

                if (localUserId === host){
                    console.log('會議主辦人警醒資訊');

                    floatingAlert.style.opacity = 1;
                    classModelTitle.innerHTML = '警醒資訊';
                    
                    alertType.innerHTML = type;
                    alertInterval.value = interval;
                    alertTime.value     = duration;
                }
                else {
                    console.log('不是主辦人只提供個人警醒資訊');
                }      
            }

        });
    });
}

submitSettingBtn.addEventListener('click', () => {
    console.log('submitSetting');
    action = 'update';
    submitForm.disabled = false;
    submitForm.click();
    submitForm.disabled = true;
});

classModelForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    const alertInterval = classModel.querySelector("#alert-interval");
    const alertTime     = classModel.querySelector("#alert-time");

    const interval = Number(alertInterval.value);
    const time     = Number(alertTime.value);
    const alertType = 'click';

    const data = {
        alert: {
            interval,
            time,
            alertType,
        },
    }

    if (action === 'update') {
        const callDoc = doc(calls, callId);
        await updateDoc(callDoc, data);
    }

    fltCntr.classList.remove("show");
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });
});

modeSwitch.addEventListener("click", () =>{
    body.classList.toggle("dark");
    
    if(body.classList.contains("dark")){
        modeText.innerHTML = "燈光模式";
    }else{
        modeText.innerHTML = "黑暗模式";
    }
});

toggle.addEventListener("click", () =>{
    sidebar.classList.toggle("close");
});