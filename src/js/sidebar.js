import { firestore } from './firebase-config.js';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import 'webrtc-adapter';
import { getUser } from './util.js';
import { prefab } from './prefab.js';
import { setupAlertScheduler, alertDocCurrently, globalAlertType, setGlobalAlert, globalInterval, globalTime } from './meeting.js';

// HTML elements

const body       = document.querySelector("body");
const sidebar    = document.querySelector(".sidebar"),
      toggle     = sidebar.querySelector(".toggle"),
      modeSwitch = sidebar.querySelector(".toggle-switch"),
      modeText   = sidebar.querySelector(".mode-text"),
      navBtn     = sidebar.querySelectorAll('.nav-btn');

const alertSetting       = prefab.querySelector('.alert-setting');
const alertButtonSetting = document.querySelector('.button-setting');

const fltCntr             = document.querySelector(".floating-container"),
      closeFloatingButton = fltCntr.querySelector('.close-floating_button'),
      floatingAlert       = fltCntr.querySelector('#floating-alert'),
      alertInfo           = fltCntr.querySelector('.alert-info'),
      classModel          = alertInfo.querySelector('.class-modal'),
      infoType            = alertInfo.querySelector('#info-type'),
      infoInterval        = floatingAlert.querySelector("#info-interval"),
      infoTime            = floatingAlert.querySelector("#info-time"),
      centerBtns          = floatingAlert.querySelectorAll('.center-btn'),
      settingBtn          = alertInfo.querySelector('#setting'),
      submitSettingBtn    = alertInfo.querySelector('#submit-setting'),
      cancelSettingBtn    = alertInfo.querySelector('#cancel-setting');

const mcsInterval = document.querySelector("#mcs-interval");
const eqsInterval = document.querySelector("#eqs-interval");
const vsInterval  = document.querySelector("#vs-interval");

const mcsTime     = document.querySelector("#mcs-time");
const eqsTime     = document.querySelector("#eqs-time");
const vsTime      = document.querySelector("#vs-time");

const alertInfoErrorText       = alertInfo.querySelector('.error-text'),
      alertChoose              = floatingAlert.querySelector('.alert-choose'),
      alertExchange            = floatingAlert.querySelector('#alert-exchange'),
      alertReturn              = floatingAlert.querySelector('#alert-return'),
      alertEssayQuestionReturn = floatingAlert.querySelector('#alert-essay-question-return'),
      voteSettingReturn        = floatingAlert.querySelector('#vote-setting-return'),
      alertStepProgress        = floatingAlert.querySelectorAll('.alert-step-progress'),
      buttonSetting            = floatingAlert.querySelector('.button-setting'),
      multipleChoiceSetting    = floatingAlert.querySelector('.multiple-choice-setting'),
      essayQuestion            = floatingAlert.querySelector('.essay-question'),
      voteSetting              = floatingAlert.querySelector('.vote-setting'),
      essayQuestionFinish      = essayQuestion.querySelector('#essay-question-finish'),
      voteSettingFinish        = voteSetting.querySelector('#vote-setting-finish'),
      errorText                = alertStepProgress[1].querySelectorAll('.error-text'),
      container                = floatingAlert.querySelectorAll('.container'),
      choose1                  = floatingAlert.querySelector('#choose-1'),
      choose2                  = floatingAlert.querySelector('#choose-2'),
      choose3                  = floatingAlert.querySelector('#choose-3'),
      choose4                  = floatingAlert.querySelector('#choose-4');

//multiple choice
const slidePage      = container[0].querySelector(".slidepage");
const options        = container[0].querySelector(".options");
const prev1          = container[0].querySelector(".prev-1");
const next1          = container[0].querySelector(".next-1");
const addBtn         = container[0].querySelector(".add_options");
const fieldAdd       = container[0].querySelector(".add");
const prev2          = container[0].querySelector(".prev-2");
const next2          = container[0].querySelector(".next-2");
const prev3          = container[0].querySelector(".prev-3");
const next3          = container[0].querySelector(".next-3");
const progressText   = container[0].querySelectorAll(".step p");
const progressCheck  = container[0].querySelectorAll(".step .check");
const bullet         = container[0].querySelectorAll(".step .bullet");
const qstText        = container[0].querySelectorAll(".qst_text");
let bxX              = container[0].querySelectorAll(".bx-x");

//essay-question
const qstText3       = container[1].querySelector(".qst_text");

//vote-settig
const optionSelected = container[2].querySelector("#option-selected");

// Global variable
let current = 0;
let optionsTotal = 0;
let globalmultipleChoice;
let answearID;
let question, answear;
let localUserId = null;
export let dataMultipleChoice = {}; 

// Firestore
const calls   = collection(firestore, 'calls');
const callId  = document.querySelector('#call-id')?.value?.trim() || document.querySelector('#call-id').innerHTML?.trim();
const callDoc = doc(calls, callId);

//開關sidebar
toggle.addEventListener("click", () =>{
    sidebar.classList.toggle("close");
});

//黑白模式
if (body.classList.contains("dark")) {
    modeSwitch.classList.add("open");
    modeText.innerHTML = "燈光模式";
}

modeSwitch.addEventListener("click", () =>{
    modeSwitch.classList.toggle("open");

    if (modeSwitch.classList.contains("open")){
        body.classList.add("dark");
        localStorage.setItem('color-scheme', 'dark');
        modeText.innerHTML = "燈光模式";
    }
    else{
        body.classList.remove("dark");
        localStorage.setItem('color-scheme', 'light');
        modeText.innerHTML = "黑暗模式";
    }
});

//sidebar 點擊監聽
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
                const { host } = (await getDoc(callDoc)).data();
                const user = await getUser();
                localUserId = user.uid;

                if (localUserId === host){
                    console.log('會議主辦人警醒資訊');
                    closeModalForm();
                }else {
                    console.log('不是主辦人只提供個人警醒資訊');
                }
            }
        });
    });
}

//關閉浮動視窗的按鈕
closeFloatingButton.addEventListener('click', () => {

    fltCntr.classList.remove("show");
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });

    alertInfo.classList.remove('close');
    alertChoose.classList.add("close");
    buttonSetting.hidden = true;
    multipleChoiceSetting.classList.add("close");
    essayQuestion.classList.add("close");
    voteSetting.classList.add("close");
    slidePage.style.marginLeft = "0%";
    let progressLength = current;
    for (let i = 0; i < progressLength; i++) {
        bullet[current - 1 ].classList.remove("active");
        progressText[current - 1 ].classList.remove("active");
        progressCheck[current - 1 ].classList.remove("active");
        current -= 1;
    }
    qstText[0].value = "";
    const optionInput = container[1].querySelectorAll(".option_input");
    for(let i=0; i < optionInput.length; i++){
        optionInput[i].value = "";
    }

    if( multipleChoiceSetting.querySelector(".answear-chosen") != null ) {
        multipleChoiceSetting.querySelector(".answear-chosen").classList.remove("answear-chosen");
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
    errorText.forEach(errorText => {
        errorText.innerHTML = '';
    })
    const essayQuestionErrorText = alertStepProgress[2].querySelector('.error-text');
    const voteSettingErrorText = alertStepProgress[3].querySelector('.error-text');
    essayQuestionErrorText.innerHTML = '';
    alertInfoErrorText.innerHTML = '';
    voteSettingErrorText.innerHTML = '';
    
    const voteOptionInput = alertStepProgress[3].querySelectorAll(".option_input");
    const voteQst = alertStepProgress[3].querySelector("#vote__qst");

    qstText3.value = '';
    voteQst.value = '';
    optionSelected.value = '';
    voteOptionInput.forEach( optionInput => {
        optionInput.remove();
    });

    const alertSetting = document.querySelector('.alert-setting');
    alertSetting.remove();
});

//警醒浮動視窗 開啟
async function closeModalForm() {

    alertInfoErrorText.innerHTML = '';

    infoInterval.setAttribute("readonly", "readonly");
    infoTime.setAttribute("readonly", "readonly");

    infoInterval.classList.remove('Revise');
    infoTime.classList.remove('Revise');

    centerBtns[0].hidden = false;
    centerBtns[1].hidden = true;

    const { answear, question, multipleChoice } = (await getDoc(alertDocCurrently)).data();

    floatingAlert.style.opacity = 1;
                    
    infoType.innerHTML = globalAlertType;
    infoInterval.value = globalInterval;
    infoTime.value     = globalTime;

    const fieldset = document.querySelector('.fieldset');
    if(fieldset != null){
        fieldset.remove();
    }

    if(globalAlertType === 'multiple choice') {

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
    }else if(globalAlertType === 'essay question') {
        const typeInfo = document.querySelector('.type-info');
        const fieldset2 = document.createElement('fieldset');
        fieldset2.classList.add("fieldset");
        typeInfo.appendChild(fieldset2);
        const legend = document.createElement('legend');
        legend.innerHTML = '問答題';
        fieldset2.appendChild(legend);
        const label = document.createElement('label');
        label.innerHTML = '問題:';
        fieldset2.appendChild(label);
        const textarea = document.createElement('textarea');
        textarea.classList.add("info-textarea");
        textarea.setAttribute("readonly", "readonly");
        textarea.innerHTML = question;
        fieldset2.appendChild(textarea);
    }else if(globalAlertType === 'vote') {

        const typeInfo = document.querySelector('.type-info');
        const fieldset = document.querySelector('.fieldset');
        if(fieldset != null){
            fieldset.remove();
        }
        const fieldset2 = document.createElement('fieldset');
        fieldset2.classList.add("fieldset");
        typeInfo.appendChild(fieldset2);
        const legend = document.createElement('legend');
        legend.innerHTML = '投票';
        fieldset2.appendChild(legend);
        const label = document.createElement('label');
        label.innerHTML = '投票題目:';
        fieldset2.appendChild(label);
        const textarea = document.createElement('textarea');
        textarea.classList.add("info-textarea");
        textarea.setAttribute("readonly", "readonly");
        textarea.innerHTML = question;
        fieldset2.appendChild(textarea);
        const div = document.createElement('div');
        div.classList.add('field','select');
        fieldset2.appendChild(div);
        const label2 = document.createElement('label');
        label2.innerHTML = '投票選項:';
        div.appendChild(label2);
        const div2 = document.createElement('div');
        div2.classList.add('field','voteOptions');
        fieldset2.appendChild(div2);
        for (let i = 0; i < multipleChoice.length; i++) {
            const input = document.createElement('input');
            input.classList.add("option_Input");
            input.setAttribute("type", "text");
            input.setAttribute("readonly", "readonly");
            input.value = multipleChoice[i];
            div2.appendChild(input);
        }
    }
}

//修改警醒資訊
settingBtn.addEventListener('click', async () => {
    centerBtns[0].hidden = true;
    centerBtns[1].hidden = false;

    const infoInterval = classModel.querySelector("#info-interval");
    const infoTime     = classModel.querySelector("#info-time");
    const textarea = classModel.querySelector('.info-textarea');
    const input = classModel.querySelectorAll('.option_Input');
    const spanNo = classModel.querySelectorAll('.span_No');
    const fieldset = classModel.querySelector('.fieldset');

    infoInterval.classList.add('Revise');
    infoTime.classList.add('Revise');

    infoInterval.removeAttribute('readonly');
    infoTime.removeAttribute('readonly');

    if( globalAlertType === 'multiple choice' ) {

        let optionsTotal = 0;

        textarea.removeAttribute('readonly');
        input.forEach(input => {
            input.removeAttribute('readonly');
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
        let bxX = fieldset.querySelectorAll(".bx-x");
        Array.from(bxX).forEach((item) => {
            if(optionsTotal >= 3){
                item.style.display = "block";
            }else{
                item.style.display = "none";
            }
        });
        if(optionsTotal >= 5){
            button.style.display = "none";
        }
    }else if( globalAlertType === 'essay question' ) {
        textarea.removeAttribute('readonly');
    }else if( globalAlertType === 'vote' ) {
        textarea.removeAttribute('readonly');
        let i = 0;
        input.forEach(input => {
            input.removeAttribute('readonly');
            i++;
        });
        const selectOptions = classModel.querySelector('.select');
        const select = document.createElement('select');
        select.setAttribute('id','option-selected');
        selectOptions.appendChild(select);
        let id = new Array(2,3,4);
        let value = new Array('2','3','4');
        select.length = 1;
        for( let x = 0; x < id.length ; x++ ) {
            let option = document.createElement('option');
            option.setAttribute('value',id[x]);
            option.appendChild(document.createTextNode(value[x]));
            select.appendChild(option);
        }
        select.options[i - 1].selected = true;

        select.addEventListener("change",alertInfoSelected);
    }


});

function alertInfoSelected(event){
    console.log(event.target.value);

    const fieldOptions = classModel.querySelector(".voteOptions");
    const optionInput = fieldOptions.querySelectorAll(".option_Input");

    optionInput.forEach( optionInput => {
        optionInput.remove();
    })

    if(event.target.value != '') {
        for(let i = 0; i < parseInt(event.target.value); i++) {
            const input = document.createElement('input');
            input.setAttribute("type", "text");
            input.classList.add("option_Input");
            fieldOptions.appendChild(input);
        }
    }
}

//取消修改警醒資訊
cancelSettingBtn.addEventListener('click', async () => {

    closeModalForm();

});

//確定修改警醒資訊
submitSettingBtn.addEventListener('click', async () => {
    const infoInterval = classModel.querySelector("#info-interval");
    const infoTime     = classModel.querySelector("#info-time");

    const interval = Number(infoInterval.value);
    const time     = Number(infoTime.value);
    const alertType = globalAlertType;
    setGlobalAlert(alertType, interval, time);

    const infoTextarea = classModel.querySelector(".info-textarea");
    const spanNoAnswear = classModel.querySelector(".answear");
    const optionInput = classModel.querySelectorAll(".option_Input");

    if( interval < 10 || interval > 50 ) {
        alertInfoErrorText.innerHTML = '警醒間隔範圍：10 ~ 50';
    }else if( time < 1 || time > 3) {
        alertInfoErrorText.innerHTML = '持續時間範圍：1 ~ 3';
    }else {

        if (alertType === 'multiple choice') {

            let x = 0;
            for(let i = 0; i < optionInput.length; i++){
                if(optionInput[i].value != ''){
                    x += 1;
                }
            }

            if(infoTextarea.value === '') {
                alertInfoErrorText.innerHTML = '問題禁止為空字串';
                return;
            }else if(spanNoAnswear === null) {
                alertInfoErrorText.innerHTML = '請選擇正確答案';
                return;
            }else if( x != optionInput.length ){
                alertInfoErrorText.innerHTML = '選項禁止為空字串！'
                return;
            }else {
                question = infoTextarea.value;

                answear = spanNoAnswear.innerHTML;

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


        }else if(alertType === 'essay question') {
        
            if(infoTextarea.value === '') {
                alertInfoErrorText.innerHTML = '問題禁止為空字串';
                return;
            }else {
                question = infoTextarea.value;

                dataMultipleChoice = {
                    question: question,
                }
            }
        }else if(alertType === 'vote') {
            const optionSelected = classModel.querySelector("#option-selected");
            if(infoTextarea.value === '') {
                alertInfoErrorText.innerHTML = '問題禁止為空字串';
                return;
            }else if( optionSelected.value === '' ){
                alertInfoErrorText.innerHTML = '請選擇投票選項數量';
                return;
            }
            const optionInput = classModel.querySelectorAll(".option_Input");

            let i = 0;
            optionInput.forEach( optionInput => {
                if( optionInput.value === '' ) {
                    alertInfoErrorText.innerHTML = '選項必須有值';
                    i++;
                }
            })
            if( i > 0 ) {
                return;
            }
            question = infoTextarea.value;

            let multipleChoiceDict = {};

            for(let i=0; i < optionInput.length; i++){
                multipleChoiceDict[i] = optionInput[i].value;
            }

            globalmultipleChoice = Object.values(multipleChoiceDict);

            dataMultipleChoice = {
                question: question,
                multipleChoice: globalmultipleChoice,
            }
        }

        infoInterval.classList.remove('Revise');
        infoTime.classList.remove('Revise');

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

        infoInterval.setAttribute('readonly','true');
        infoTime.setAttribute('readonly','true');

        Array.from(navBtn).forEach((item) => {
            item.className = "nav-btn";
        });

        AlertReplace();
    }
});

//進入警醒選項選擇畫面
alertExchange.addEventListener('click', () => {
    alertInfo.classList.toggle("close");
    alertChoose.classList.remove("close");
    closeModalForm();
});

//返回警醒資訊畫面
alertReturn.addEventListener('click', () => {
    alertInfo.classList.remove("close");
    alertChoose.classList.toggle("close");
});

choose1.addEventListener('click', () => {
    buttonSetting.hidden = false;
    alertChoose.classList.toggle("close");

    const alert = alertSetting.cloneNode(true);
    const title = alert.querySelector('.class-modal__title');
    const alertInterval = alert.querySelector('.alert-interval');
    const alertTime = alert.querySelector('.alert-time');
    const alertFinish = alert.querySelector('#alert-finish');
    const alertReturn = alert.querySelector('#alert-return');
    const errorText = alert.querySelector('.error-text');
    
    title.innerHTML = "警醒按鈕設定";
    alertInterval.value = globalInterval;
    alertTime.value = globalTime;

    alertButtonSetting.appendChild(alert);

    alertFinish.addEventListener('click', async () => {

        const type = 'click';
        const interval = Number(alertInterval.value);
        const time     = Number(alertTime.value);
        setGlobalAlert(type,interval,time);
    
        if( interval >= 10 && interval <= 50 && time >= 1 && time <= 3 ) {
    
            const data = {
                alert: {
                    interval:interval,
                    time:time,
                    alertType:type,
                },
            }
    
            const callDoc = doc(calls, callId);
            await updateDoc(callDoc, data);
    
            alertInfo.classList.remove("close");
    
            AlertReplace();
    
            closeModalForm();
    
            errorText.innerHTML = '';
            
            alert.remove();

            buttonSetting.hidden = true;

        }else if( interval < 10 || interval > 50 ) {
            errorText.innerHTML = '警醒間隔範圍：10 ~ 50';
        }else if( time < 1 || time > 3 ) {
            errorText.innerHTML = '持續時間範圍：1 ~ 3';
        }
    });

    alertReturn.addEventListener('click', () => {
        buttonSetting.hidden = true;
        alertChoose.classList.remove("close");
        errorText.innerHTML = '';
        alert.remove();
    });
});

choose2.addEventListener('click', () => {
    multipleChoiceSetting.classList.remove("close");
    alertChoose.classList.toggle("close");
    mcsInterval.value = globalInterval;
    mcsTime.value     = globalTime;
});

choose3.addEventListener('click', () => {
    essayQuestion.classList.remove("close");
    alertChoose.classList.toggle("close");
    eqsInterval.value = globalInterval;
    eqsTime.value     = globalTime;
});

choose4.addEventListener('click', () => {
    voteSetting.classList.remove("close");
    alertChoose.classList.toggle("close");
    vsInterval.value = globalInterval;
    vsTime.value     = globalTime;
});

prev1.addEventListener('click', () => {
    multipleChoiceSetting.classList.toggle("close");
    alertChoose.classList.remove("close");

    errorText.forEach(errorText => {
        errorText.innerHTML = '';
    })
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
    if(qstText[0].value != ''){
        slidePage.style.marginLeft = "-25%";
        bullet[current].classList.add("active");
        progressText[current].classList.add("active");
        progressCheck[current].classList.add("active");
        current += 1;
        errorText.forEach(errorText => {
            errorText.innerHTML = '';
        })
    }else {
        errorText[0].innerHTML = '禁止輸入空字串！';
    }
});
next2.addEventListener('click', () => {
    let optionInput = container[1].querySelectorAll('.option_input');
    let x = 0;
    for(let i = 0; i < optionInput.length; i++){
        if(optionInput[i].value != ''){
            x += 1;
        }
    }

    const answearChosen = container[1].querySelector(".answear-chosen");

    if(answearChosen != null) {
        answear = answearChosen.children[0].innerHTML;
    }

    if(x === optionInput.length && answearChosen != null ){
        slidePage.style.marginLeft = "-50%";
        bullet[current].classList.add("active");
        progressText[current].classList.add("active");
        progressCheck[current].classList.add("active");
        current += 1;
        errorText[1].innerHTML = ''
    }else if( x != optionInput.length ){
        errorText[1].innerHTML = '選項禁止為空字串！'
    }else if( answearChosen === null ) {
        errorText[1].innerHTML = '請選擇答案選項！'
    }
});

next3.addEventListener('click', async () => {

    const mcsInterval = document.querySelector("#mcs-interval");
    const mcsTime     = document.querySelector("#mcs-time");
    question = qstText[0].value;
    const interval = Number(mcsInterval.value);
    const time     = Number(mcsTime.value);
    const alertType = 'multiple choice';
    setGlobalAlert(alertType ,interval ,time);

    if( interval >= 10 && interval <= 50 && time >= 1 && time <= 3 ) {
        answearID = answear;

        const optionInput = container[1].querySelectorAll(".option_input");
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
        qstText[0].value = "";
        for(let i=0; i < optionInput.length; i++){
            optionInput[i].value = "";
        }
        container[1].querySelector(".answear-chosen").classList.remove("answear-chosen");

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
    }else if( interval < 10 || interval >50 ) {
        errorText[2].innerHTML = '警醒間隔範圍：10 ~ 50';
    }else if( time < 1 || time > 3 ) {
        errorText[2].innerHTML = '持續時間範圍：1 ~ 3';
    }

});

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
    options.insertBefore(div,fieldAdd);
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
        bxX = container[1].querySelectorAll(".bx-x");
        let spansNo = container[1].querySelectorAll(".span_no");
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
        let no = container[1].querySelectorAll(".div_no");
        Array.from(no).forEach((item) => {
            item.classList.remove("answear-chosen");
        });
        divNo.classList.toggle("answear-chosen");
    });
    bxX = container[1].querySelectorAll(".bx-x");
    let spansNo = container[1].querySelectorAll(".span_no");
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

essayQuestionFinish.addEventListener("click", async () =>{

    const eqsInterval = essayQuestion.querySelector("#eqs-interval");
    const eqsTime     = essayQuestion.querySelector("#eqs-time");
    const interval = Number(eqsInterval.value);
    const time     = Number(eqsTime.value);
    const alertType = 'essay question';
    setGlobalAlert(alertType,interval,time);
    const essayQuestionErrorText = alertStepProgress[2].querySelector('.error-text');
    if( qstText3.value === '' ) {
        essayQuestionErrorText.innerHTML = '問題禁止為空字串';
        return;
    }else if( interval < 10 || interval > 50 ) {
        essayQuestionErrorText.innerHTML = '警醒間隔範圍：10 ~ 50';
        return;
    }else if( time < 1 || time > 3) {
        essayQuestionErrorText.innerHTML = '持續時間範圍：1 ~ 3';
        return;
    }
    question = qstText3.value;

    dataMultipleChoice = {
        question: question,
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

    alertInfo.classList.remove("close");
    fltCntr.classList.remove("show");
    essayQuestion.classList.toggle("close");
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });

    essayQuestionErrorText.innerHTML = '';
    qstText3.value = '';

    AlertReplace();
});

alertEssayQuestionReturn.addEventListener('click', () => {
    essayQuestion.classList.toggle("close");
    alertChoose.classList.remove("close");

    const essayQuestionErrorText = alertStepProgress[2].querySelector('.error-text');
    essayQuestionErrorText.innerHTML = '';
    qstText3.value = '';
});

voteSettingFinish.addEventListener("click", async () =>{
    const vsInterval = voteSetting.querySelector("#vs-interval");
    const vsTime     = voteSetting.querySelector("#vs-time");
    const alertType = 'vote';
    const interval = Number(vsInterval.value);
    const time     = Number(vsTime.value);
    setGlobalAlert(alertType,interval,time);
    const voteErrorText = alertStepProgress[3].querySelector('.error-text');
    const voteQst = alertStepProgress[3].querySelector("#vote__qst");
    if( voteQst.value === '' ) {
        voteErrorText.innerHTML = '問題禁止為空字串';
        return;
    }else if( optionSelected.value === '' ) {
        voteErrorText.innerHTML = '請選擇投票選項數量';
        return;
    }
    
    const optionInput = alertStepProgress[3].querySelectorAll(".option_input");
    
    let i = 0;
    optionInput.forEach( optionInput => {
        if( optionInput.value === '' ) {
            voteErrorText.innerHTML = '選項必須有值';
            i++;
        }
    })
    
    if( i > 0 ) {
        return;
    }

    if( interval < 10 || interval > 50 ) {
        voteErrorText.innerHTML = '警醒間隔範圍：10 ~ 50';
        return;
    }else if( time < 1 || time > 3) {
        voteErrorText.innerHTML = '持續時間範圍：1 ~ 3';
        return;
    }

    question = voteQst.value;

    let multipleChoiceDict = {};

    for(let i=0; i < optionInput.length; i++){
        multipleChoiceDict[i] = optionInput[i].value;
    }

    globalmultipleChoice = Object.values(multipleChoiceDict);

    dataMultipleChoice = {
        question: question,
        multipleChoice: globalmultipleChoice,
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

    const voteSettingErrorText = alertStepProgress[3].querySelector('.error-text');
    voteSettingErrorText.innerHTML = '';
    
    const voteOptionInput = alertStepProgress[3].querySelectorAll(".option_input");

    voteQst.value = '';
    optionSelected.value = '';
    voteOptionInput.forEach( optionInput => {
        optionInput.remove();
    })

    fltCntr.classList.remove("show");
    voteSetting.classList.toggle("close");
    alertInfo.classList.remove("close");
    
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });

    AlertReplace();
});

optionSelected.addEventListener("change",Selected);

function Selected(event){
    const fieldOptions = container[2].querySelector(".options");
    const optionInput = fieldOptions.querySelectorAll(".option_input");

    optionInput.forEach( optionInput => {
        optionInput.remove();
    })

    if(event.target.value != '') {

        for(let i = 0; i < parseInt(event.target.value); i++) {
            const input = document.createElement('input');
            input.setAttribute("type", "text");
            input.classList.add("option_input");
            fieldOptions.appendChild(input);
        }
    }
}

voteSettingReturn.addEventListener('click', () => {
    voteSetting.classList.toggle("close");
    alertChoose.classList.remove("close");

    const voteSettingErrorText = alertStepProgress[3].querySelector('.error-text');
    voteSettingErrorText.innerHTML = '';
    
    const optionInput = alertStepProgress[3].querySelectorAll(".option_input");
    const voteQst = alertStepProgress[3].querySelector("#vote__qst");

    voteQst.value = '';
    optionSelected.value = '';
    optionInput.forEach( optionInput => {
        optionInput.remove();
    })
});

async function AlertReplace() {
    setupAlertScheduler();
}