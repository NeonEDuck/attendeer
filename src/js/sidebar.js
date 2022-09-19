import { firestore } from './firebase-config.js';
import { collection, doc, getDocs, getDoc, addDoc, setDoc, deleteDoc, onSnapshot, updateDoc, query, orderBy } from 'firebase/firestore';
import 'webrtc-adapter';
import { MINUTE, delay, debounce, getUser, randomLowerCaseString, replaceAll, getRandom, setIntervalImmediately } from './util.js';
import { setupAlertScheduler, setupAlertListener, intervalID, alertDocCurrently } from './meeting.js';

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
      classModelForm     = document.querySelector('#close-modal__form'),
      classModelTitle    = document.querySelector('#class-modal__title'),
      alertType          = document.querySelector('.alert-type'),
      alertInterval      = document.querySelectorAll(".alert-interval"),
      alertTime          = document.querySelectorAll(".alert-time"),
      settingBtn         = document.querySelector('#setting'),
      centerBtns         = document.querySelectorAll('.center-btn'),
      submitSettingBtn   = document.querySelector('#submit-setting'),
      cancelSettingBtn   = document.querySelector('#cancel-setting'),
      submitForm         = document.querySelector('#submit-form');

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
      buttonSetting = document.querySelector('.button-setting'),
      alertBtnReturn = document.querySelector('#alert-btn-return'),
      alertBtnFinish = document.querySelector('#alert-btn-finish'),
      multipleChoiceSetting = document.querySelector('.multiple-choice-setting'),
      container = multipleChoiceSetting.querySelector('.container'),
      choose1    = floatingAlertA.querySelector('#choose-1'),
      choose2    = floatingAlertA.querySelector('#choose-2'),
      choose3    = floatingAlertA.querySelector('#choose-3'),
      choose4    = floatingAlertA.querySelector('#choose-4');
const floatingAlertB  = document.querySelector('#floating-alert-b');

const slidePage = container.querySelector(".slidepage");
let page2 = container.querySelector(".page-2");
const options = container.querySelector(".options");
let option = container.querySelectorAll(".option");
const prev1 = container.querySelector(".prev-1");
const next1 = container.querySelector(".next-1");
const addBtn = container.querySelector(".add_options");
let bxX = container.querySelectorAll(".bx-x");
let divNo = container.querySelectorAll(".div_no");
const prev2 = container.querySelector(".prev-2");
const next2 = container.querySelector(".next-2");
const prev3 = container.querySelector(".prev-3");
const next3 = container.querySelector(".next-3");
const progressText = container.querySelectorAll(".step p");
const progressCheck = container.querySelectorAll(".step .check");
const bullet = container.querySelectorAll(".step .bullet");
const qstText = container.querySelector(".qst_text");

// Global variable
let max = 3;
let current = 0;
let optionsTotal = 0;
let globalInterval;
let globalTime;
let globalTpye;
let globalmultipleChoice;
let answearID;
let question, answear;
export let dataMultipleChoice = {}; 
let action;
let localUserId = null;

// Firestore
const calls = collection(firestore, 'calls');
const callId     = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();
const callDoc = doc(calls, callId);

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
        bxX = container.querySelectorAll(".bx-x");
        let spansNo = container.querySelectorAll(".span_no");
        let x = 0;
        Array.from(bxX).forEach((item) => {
            spansNo[x].innerHTML = x+1;
            x += 1; 
            if(optionsTotal <= 2){
                item.style.display = "none";
            }else if(optionsTotal < 5){
                addBtn.style.display = "block";
            }else{
                item.style.display = "block";
            }
        });
    });
    divNo.addEventListener('click', () => {
        let no = container.querySelectorAll(".div_no");
        Array.from(no).forEach((item) => {
            item.classList.remove("answear-chosen");
        });
        divNo.classList.toggle("answear-chosen");
    });
    bxX = container.querySelectorAll(".bx-x");
    let spansNo = container.querySelectorAll(".span_no");
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
    if(optionsTotal >= 5){
        addBtn.style.display = "none";
    }
}

alertBtnReturn.addEventListener('click', () => {
    buttonSetting.classList.toggle("close");
    alertChoose.classList.remove("close");
});

prev1.addEventListener('click', () => {
    multipleChoiceSetting.classList.toggle("close");
    alertChoose.classList.remove("close");
});
prev2.addEventListener('click', () => {
    slidePage.style.marginLeft = "0%";
    bullet[current-1].classList.remove("active");
    progressText[current-1].classList.remove("active");
    progressCheck[current-1].classList.remove("active");
    current -= 1;
});
prev3.addEventListener('click', () => {
    slidePage.style.marginLeft = "-25%";
    bullet[current-1].classList.remove("active");
    progressText[current-1].classList.remove("active");
    progressCheck[current-1].classList.remove("active");
    current -= 1;
});
next1.addEventListener('click', () => {
    if(qstText.value != ''){
        slidePage.style.marginLeft = "-25%";
        bullet[current].classList.add("active");
        progressText[current].classList.add("active");
        progressCheck[current].classList.add("active");
        current += 1;
    }
});
next2.addEventListener('click', () => {
    let optionInput = container.querySelectorAll('.option_input');
    let x = 0;
    for(let i = 0; i < optionInput.length; i++){
        if(optionInput[i].value != ''){
            x += 1;
        }
    }

    const answearChosen = container.querySelector(".answear-chosen");

    if(answearChosen != null) {
        answear = answearChosen.children[0].innerHTML;
    }

    if(x === optionInput.length && answearChosen != null ){
        slidePage.style.marginLeft = "-50%";
        bullet[current].classList.add("active");
        progressText[current].classList.add("active");
        progressCheck[current].classList.add("active");
        current += 1;
    }
});

alertBtnFinish.addEventListener('click', async () => {
    const alertInterval = document.querySelectorAll(".alert-interval");
    const alertTime     = document.querySelectorAll(".alert-time");

    const interval = Number(alertInterval[1].value);
    const time     = Number(alertTime[1].value);
    const alertType = 'click';

    const data = {
        alert: {
            interval,
            time,
            alertType,
        },
    }
    
    const callDoc = doc(calls, callId);
    await updateDoc(callDoc, data);

    alertInfo.classList.remove("close");
    alertChoose.classList.toggle("close");
    fltCntr.classList.remove("show");
    buttonSetting.classList.toggle("close");
    alertChoose.classList.toggle("close");
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });

    AlertReplace();
});

next3.addEventListener('click', async () => {

    const alertInterval = document.querySelectorAll(".alert-interval");
    const alertTime     = document.querySelectorAll(".alert-time");
    question = qstText.value;
    const interval = Number(alertInterval[2].value);
    const time     = Number(alertTime[2].value);
    const alertType = 'multiple choice';
    answearID = answear;

    const optionInput = container.querySelectorAll(".option_input");
    let multipleChoiceDict = {};
    
    for(let i=0; i < optionInput.length; i++){
        multipleChoiceDict[i] = optionInput[i].value;
    }

    let multipleChoice = Object.values(multipleChoiceDict);

    dataMultipleChoice = {
        question: question,
        answear: answearID,
        multipleChoice: multipleChoice,
    }

    let dataAlert = {
        alert: {
            interval: interval,
            time: time,
            alertType: alertType,
        },
    }
    
    const callDoc = doc(calls, callId);
    await updateDoc(callDoc, dataAlert);

    slidePage.style.marginLeft = "0%";
    bullet[current - 1].classList.remove("active");
    progressText[current - 1 ].classList.remove("active");
    progressCheck[current - 1 ].classList.remove("active");
    current -= 1;
    bullet[current - 1 ].classList.remove("active");
    progressText[current - 1 ].classList.remove("active");
    progressCheck[current - 1 ].classList.remove("active");
    current -= 1;
    qstText.value = "";
    for(let i=0; i < optionInput.length; i++){
        optionInput[i].value = "";
    }
    container.querySelector(".answear-chosen").classList.remove("answear-chosen");
    
    alertInfo.classList.remove("close");
    alertChoose.classList.toggle("close");
    fltCntr.classList.remove("show");
    multipleChoiceSetting.classList.toggle("close");
    alertChoose.classList.toggle("close");
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });

    AlertReplace();

    const option = multipleChoiceSetting.querySelectorAll('.option');

    option.forEach(option => {
        option.remove();
    });

    optionsTotal = 0;

    addBtn.style.display = "block";

    for(let i = 0; i < 2; i++){
        addOptions();
    }
});
choose1.addEventListener('click', () => {
    buttonSetting.classList.remove("close");
    alertChoose.classList.toggle("close");
    alertInterval[1].value = globalInterval;
    alertTime[1].value     = globalTime;
});

choose2.addEventListener('click', () => {
    multipleChoiceSetting.classList.remove("close");
    alertChoose.classList.toggle("close");
    alertInterval[2].value = globalInterval;
    alertTime[2].value     = globalTime;
});

alertExchange.addEventListener('click', () => {
    alertInfo.classList.toggle("close");
    alertChoose.classList.remove("close");
    closeModalForm();
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

    floatingAlertA.className = "";
    floatingAlertA.classList.add("floating-alert","a");
    floatingAlertB.className = "";
    floatingAlertB.classList.add("floating-alert","b");
    switchCtn.className = "";
    switchCtn.classList.add("switch");

    alertInfo.className = "";
    alertInfo.classList.add("alert-info");
    alertChoose.className = "";
    alertChoose.classList.add("alert-choose","close");
    buttonSetting.className = "";
    buttonSetting.classList.add("alert-step-progress","button-setting","close");
    multipleChoiceSetting.className = "";
    multipleChoiceSetting.classList.add("alert-step-progress","multiple-choice-setting","close");

    slidePage.style.marginLeft = "0%";
    let progressLength = current;
    for (let i = 0; i < progressLength; i++) {
        bullet[current - 1 ].classList.remove("active");
        progressText[current - 1 ].classList.remove("active");
        progressCheck[current - 1 ].classList.remove("active");
        current -= 1;
    }
    
    qstText.value = "";
    const optionInput = container.querySelectorAll(".option_input");
    for(let i=0; i < optionInput.length; i++){
        optionInput[i].value = "";
    }
    
    if( container.querySelector(".answear-chosen") != null ) {
        container.querySelector(".answear-chosen").classList.remove("answear-chosen");
    }
    
    const option = multipleChoiceSetting.querySelectorAll('.option');

    option.forEach(option => {
        option.remove();
    });

    optionsTotal = 0;

    addBtn.style.display = "block";

    for(let i = 0; i < 2; i++){
        addOptions();
    }
});

async function AlertReplace() {

    clearInterval(intervalID);
    setupAlertScheduler();

}

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

                const user = await getUser();
                localUserId = user.uid;

                if (localUserId === host){
                    console.log('會議主辦人警醒資訊');

                    closeModalForm();

                }
                else {
                    console.log('不是主辦人只提供個人警醒資訊');
                }      
            }

        });
    });
}

settingBtn.addEventListener('click', async () => {
    centerBtns[0].hidden = true;
    centerBtns[1].hidden = false;

    const alertInterval = classModel.querySelector("#alert-interval");
    const alertTime     = classModel.querySelector("#alert-time");
    const textarea = classModel.querySelector('.info-textarea');
    const input = classModel.querySelectorAll('.option_Input');
    const spanNo = classModel.querySelectorAll('.span_No');
    const fieldset = classModel.querySelector('.fieldset');

    alertInterval.classList.add('Revise');
    alertTime.classList.add('Revise');

    alertInterval.removeAttribute('readOnly');
    alertTime.removeAttribute('readOnly');

    if( globalTpye === 'multiple choice' ) {

        let optionsTotal = 0;

        textarea.removeAttribute('readOnly');
        input.forEach(input => {
            input.removeAttribute('readOnly');
            optionsTotal +=1;
        });

        spanNo.forEach(spanNo => {
            spanNo.classList.remove('disable');
        });

        Array.from(spanNo).forEach((item, index) => {
            item.addEventListener("click", async (e) => {
                Array.from(spanNo).forEach((item) => {
                    item.classList.remove("answear");
                });
                item.classList.add("answear");
            });
        });

        const addOption = classModel.querySelector('.addOption');
        const button = document.createElement('button');
        button.classList.add('infoAddBtn');
        button.type = "button";  
        button.innerHTML = '新增';
        addOption.appendChild(button);
        
        const field = fieldset.querySelectorAll('.field');
        Array.from(field).forEach((item, index) => {
            const icon = document.createElement('i');
            icon.classList.add("bx", "bx-x");
            item.appendChild(icon);
            icon.addEventListener("click", async (e) => {
                item.remove();
                optionsTotal -= 1;
                bxX = fieldset.querySelectorAll(".bx-x");
                let spanNo = fieldset.querySelectorAll(".span_No");
                let x = 0;
                Array.from(bxX).forEach((item) => {
                    spanNo[x].innerHTML = x+1;
                    x += 1;
                    if(optionsTotal <= 2){
                        item.style.display = "none";
                    }else if(optionsTotal < 5){
                        button.style.display = "block";
                    }else{
                        item.style.display = "block";
                    }
                });
            });
        });

        button.addEventListener('click', async () => {
            optionsTotal += 1;
            const div = document.createElement('div');
            div.classList.add("field");
            fieldset.appendChild(div);
            let spanNo = document.createElement('span');
            spanNo.classList.add("span_No");
            div.appendChild(spanNo);
            const input = document.createElement('input');
            input.classList.add("option_Input");
            div.appendChild(input);
            const icon = document.createElement('i');
            icon.classList.add("bx", "bx-x");
            div.appendChild(icon);
            icon.addEventListener('click', () => {
                div.remove();
                optionsTotal -= 1;
                bxX = fieldset.querySelectorAll(".bx-x");
                let spanNo = fieldset.querySelectorAll(".span_No");
                let x = 0;
                Array.from(bxX).forEach((item) => {
                    spanNo[x].innerHTML = x+1;
                    x += 1;
                    if(optionsTotal <= 2){
                        item.style.display = "none";
                    }else if(optionsTotal < 5){
                        button.style.display = "block";
                    }else{
                        item.style.display = "block";
                    }
                });
            });
            spanNo = fieldset.querySelectorAll(".span_No");
            Array.from(spanNo).forEach((item) => {
                item.addEventListener('click', () => {
                    let no = fieldset.querySelectorAll(".span_No");
                    Array.from(no).forEach((item) => {
                        item.classList.remove("answear");
                    });
                    item.classList.toggle("answear");
                });
            });
            
            let bxX = fieldset.querySelectorAll(".bx-x");
            let spansNo = fieldset.querySelectorAll(".span_No");
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
            if(optionsTotal >= 5){
                button.style.display = "none";
            }
        });


    }


});

cancelSettingBtn.addEventListener('click', async () => {

    closeModalForm();
    
});

submitSettingBtn.addEventListener('click', async () => {
    const alertInterval = classModel.querySelector("#alert-interval");
    const alertTime     = classModel.querySelector("#alert-time");

    const interval = Number(alertInterval.value);
    const time     = Number(alertTime.value);
    const alertType = globalTpye;

    alertInterval.classList.remove('Revise');
    alertTime.classList.remove('Revise');

    if (alertType === 'multiple choice') {

        const spanNoAnswear = classModel.querySelector(".answear");
        if(spanNoAnswear != null) {
            answear = spanNoAnswear.innerHTML;
        }
        const optionInput = classModel.querySelectorAll(".option_Input");
        let multipleChoiceDict = {};
        
        for(let i=0; i < optionInput.length; i++){
            multipleChoiceDict[i] = optionInput[i].value;
        }

        globalmultipleChoice = Object.values(multipleChoiceDict);

        dataMultipleChoice = {
            question: question,
            answear: answear,
            multipleChoice: globalmultipleChoice,
        }
    }
    
    const data = {
        alert: {
            interval,
            time,
            alertType,
        },
    }
    const callDoc = doc(calls, callId);
    await updateDoc(callDoc, data);

    fltCntr.classList.remove("show");

    centerBtns[0].hidden = false;
    centerBtns[1].hidden = true;

    alertInterval.setAttribute('readOnly','true');
    alertTime.setAttribute('readOnly','true');

    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });

    AlertReplace();
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

    closeModalForm();
};
  
let mainF = (e) => {
    for (let i = 0; i < switchBtn.length; i++) switchBtn[i].addEventListener('click', changeForm);
};
  
window.addEventListener('load', mainF);

async function closeModalForm() {

    const Interval = classModel.querySelector("#alert-interval");
    const Time     = classModel.querySelector("#alert-time");

    Interval.classList.remove('Revise');
    Time.classList.remove('Revise');

    centerBtns[0].hidden = false;
    centerBtns[1].hidden = true;

    const { alert } = (await getDoc(callDoc)).data();
    const { interval, time: duration, alertType:type } = alert;   
    const { answear, question, multipleChoice } = (await getDoc(alertDocCurrently)).data();
    globalInterval = interval;
    globalTime = duration;
    globalTpye = type;

    floatingAlertA.style.opacity = 1;
    floatingAlertB.style.opacity = 1;
    switchCtn.style.opacity = 1;
    classModelTitle.innerHTML = '警醒資訊';
                    
    alertType.innerHTML = type;
    alertInterval[0].value = interval;
    alertTime[0].value     = duration;

    if(type === 'click') {
        const fieldset = document.querySelector('.fieldset');
        if(fieldset != null){
            fieldset.remove();
        }
    }else if(type === 'multiple choice') {

        // globalAnswear = answear;
        // globalQuestion = question;
        globalmultipleChoice = multipleChoice;

        const typeInfo = document.querySelector('.type-info');
        const fieldset = document.querySelector('.fieldset');
        if(fieldset != null){
            fieldset.remove();
        }
        const fieldset2 = document.createElement('fieldset');
        fieldset2.classList.add("fieldset");    
        typeInfo.appendChild(fieldset2);
        const legend = document.createElement('legend');
        legend.innerHTML = '選擇題';
        fieldset2.appendChild(legend);
        const div = document.createElement('div');
        div.classList.add("addOption");
        fieldset2.appendChild(div);
        const label = document.createElement('label');
        label.innerHTML = '問題:';
        div.appendChild(label);
        const textarea = document.createElement('textarea');
        textarea.classList.add("info-textarea");
        textarea.setAttribute("readonly", "readonly");
        textarea.innerHTML = question;
        fieldset2.appendChild(textarea);
        for (let i = 0; i < multipleChoice.length; i++) {
            const div = document.createElement('div');
            div.classList.add("field");
            fieldset2.appendChild(div);
            const span = document.createElement('span');
            span.classList.add("span_No" , "disable");
            span.innerHTML = i+1;
            div.appendChild(span);
            const input = document.createElement('input');
            input.classList.add("option_Input");
            input.setAttribute("readonly", "readonly");
            input.value = multipleChoice[i];
            div.appendChild(input);
            if(answear === (i+1).toString()){
                answearID = answear;
                span.classList.toggle('answear');
            }
        }
    }

}