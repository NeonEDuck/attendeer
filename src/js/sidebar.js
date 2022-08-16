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

const fltCntr             = document.querySelector(".floating-container"),
      floatingAlert       = fltCntr.querySelector('.floating-alert'),
      closeFloatingButton = fltCntr.querySelector('.close-floating_button');

const navBtn  = document.querySelectorAll('.nav-btn');

const classModel         = document.querySelector('#class-modal'),
      classModelForm     = classModel.querySelector('#close-modal__form'),
      classModelTitle    = classModel.querySelector('#class-modal__title'),
      alertType          = classModel.querySelector('#alert-type'),
      alertInterval      = classModel.querySelector("#alert-interval"),
      alertTime          = classModel.querySelector("#alert-time"),
      submitSettingBtn   = classModel.querySelector('#submit-setting'),
      submitForm         = classModel.querySelector('#submit-form');

const switchCtn = document.querySelector('#switch-cnt'),
      switchC1  = switchCtn.querySelector('#switch-c1'),
      switchC2  = switchCtn.querySelector('#switch-c2'),
      switchCircle  = switchCtn.querySelectorAll('.switch__circle'),
      switchBtn  = switchCtn.querySelectorAll('.switch-btn');
const floatingAlertA    = document.querySelector('#floating-alert-a'),
      alertInfo         = document.querySelector('.alert-info'),
      alertChoose       = document.querySelector('.alert-choose'),
      alertExchange     = floatingAlertA.querySelector('#alert-exchange'),
      alertReturn       = floatingAlertA.querySelector('#alert-return'),
      alertStepProgress = document.querySelector('.alert-step-progress'),
      choose1    = floatingAlertA.querySelector('#choose-1'),
      choose2    = floatingAlertA.querySelector('#choose-2'),
      choose3    = floatingAlertA.querySelector('#choose-3'),
      choose4    = floatingAlertA.querySelector('#choose-4');

const slidePage = document.querySelector(".slidepage");
let page2 = document.querySelector(".page-2");
const options = document.querySelector(".options");
let option = document.querySelectorAll(".option");
const prev1 = document.querySelector(".prev-1");
const next1 = document.querySelector(".next-1");
const addBtn = document.querySelector(".add_options");
let bxX = document.querySelectorAll(".bx-x");
const prev2 = document.querySelector(".prev-2");
const next2 = document.querySelector(".next-2");
const prev3 = document.querySelector(".prev-3");
const next3 = document.querySelector(".next-3");
const progressText = document.querySelectorAll(".step p");
const progressCheck = document.querySelectorAll(".step .check");
const bullet = document.querySelectorAll(".step .bullet");
let max = 3;
let current = 1;
let optionsTotal = 0;

const floatingAlertB  = document.querySelector('#floating-alert-b');

const callId     = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();

for(let i = 0; i < 2; i++){
    addOptions();
}

addBtn.addEventListener('click', () => {
    addOptions();
});

function addOptions(){
    optionsTotal += 1;
    const div = document.createElement('div');
    div.classList.add("field", "option");
    options.appendChild(div);
    const divNo = document.createElement('div');
    divNo.classList.add("div_no");
    div.appendChild(divNo);
    const spanNo = document.createElement('span');
    spanNo.classList.add("span_no");
    divNo.appendChild(spanNo);
    const input = document.createElement('input');
    input.setAttribute("type", "text");
    input.classList.add("option_input");
    div.appendChild(input);
    const icon = document.createElement('i');
    icon.classList.add("bx", "bx-x");
    div.appendChild(icon);
    icon.addEventListener('click', () => {
        div.remove();
        optionsTotal -= 1;
        bxX = document.querySelectorAll(".bx-x");
        let spansNo = document.querySelectorAll(".span_no");
        let x = 0;
        Array.from(bxX).forEach((item) => {
            spansNo[x].innerHTML = x+1;
            x += 1;
            if(optionsTotal <= 2){
                item.style.display = "none";
            }else if(optionsTotal < 6){
                addBtn.style.display = "block";
            }else{
                item.style.display = "block";
            }
        });
    });
    bxX = document.querySelectorAll(".bx-x");
    let spansNo = document.querySelectorAll(".span_no");
    let x = 0;
    Array.from(bxX).forEach((item) => {
        spansNo[x].innerHTML = x+1;
        x += 1;
        if(optionsTotal >= 3){
            item.style.display = "block";
        }else{
            item.style.display = "none";
        }
    });
    if(optionsTotal >= 6){
        addBtn.style.display = "none";
    }
}

prev1.addEventListener('click', () => {
    alertStepProgress.classList.toggle("close");
    alertChoose.classList.remove("close");
    bullet[current - 2 ].classList.remove("active");
    progressText[current - 2 ].classList.remove("active");
    progressCheck[current - 2 ].classList.remove("active");
    current -= 1;
});
prev2.addEventListener('click', () => {
    slidePage.style.marginLeft = "0%";
    bullet[current - 2 ].classList.remove("active");
    progressText[current - 2 ].classList.remove("active");
    progressCheck[current - 2 ].classList.remove("active");
    current -= 1;
});
prev3.addEventListener('click', () => {
    slidePage.style.marginLeft = "-25%";
    bullet[current - 2 ].classList.remove("active");
    progressText[current - 2 ].classList.remove("active");
    progressCheck[current - 2 ].classList.remove("active");
    current -= 1;
});
next1.addEventListener('click', () => {
    if(document.getElementById('qst_text').value != ''){
        slidePage.style.marginLeft = "-25%";
        bullet[current - 1 ].classList.add("active");
        progressText[current - 1 ].classList.add("active");
        progressCheck[current - 1 ].classList.add("active");
        current += 1;
    }
});
next2.addEventListener('click', () => {
    let optionInput = document.querySelectorAll('.option_input');
    let x = 0;
    for(let i = 0; i < optionInput.length; i++){
        if(optionInput[i].value != ''){
            x += 1;
        }
    }
    if(x === optionInput.length){
        slidePage.style.marginLeft = "-50%";
        bullet[current - 1 ].classList.add("active");
        progressText[current - 1 ].classList.add("active");
        progressCheck[current - 1 ].classList.add("active");
        current += 1;
    }
});

next3.addEventListener('click', () => {
    bullet[current - 1 ].classList.add("active");
    progressText[current - 1 ].classList.add("active");
    progressCheck[current - 1 ].classList.add("active");
    current += 1;
});

choose2.addEventListener('click', () => {
    alertStepProgress.classList.remove("close");
    alertChoose.classList.toggle("close");
});

alertExchange.addEventListener('click', () => {
    alertInfo.classList.toggle("close");
    alertChoose.classList.remove("close");
});

alertReturn.addEventListener('click', () => {
    alertInfo.classList.remove("close");
    alertChoose.classList.toggle("close");
});

closeFloatingButton.addEventListener('click', () => {
    fltCntr.classList.remove("show");
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });
});

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
                floatingAlertA.style.opacity = 0;
                floatingAlertB.style.opacity = 0;
                switchCtn.style.opacity = 0;
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

                    floatingAlertA.style.opacity = 1;
                    floatingAlertB.style.opacity = 1;
                    switchCtn.style.opacity = 1;
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

let changeForm = (e) => {
    switchCtn.classList.add('is-gx');
    setTimeout(function () {
      switchCtn.classList.remove('is-gx');
    }, 1500);
  
    switchCtn.classList.toggle('is-txr');
    switchCircle[0].classList.toggle('is-txr');
    switchCircle[1].classList.toggle('is-txr');
  
    switchC1.classList.toggle('is-hidden');
    switchC2.classList.toggle('is-hidden');
    floatingAlertA.classList.toggle('is-txl');
    floatingAlertB.classList.toggle('is-txl');
    floatingAlertB.classList.toggle('is-z200');
  };
  
  let mainF = (e) => {
    for (let i = 0; i < switchBtn.length; i++) switchBtn[i].addEventListener('click', changeForm);
  };
  
  window.addEventListener('load', mainF);
