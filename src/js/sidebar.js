import { firestore } from './firebase-config.js';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import 'webrtc-adapter';
import { getKeyByValue, apiCall, AlertTypeEnum } from './util.js';
import { prefab } from './prefab.js';
import { setupAlertScheduler, globalAlertType, setGlobalAlert, globalInterval, globalTime, globalQuestion, globalAnswear, globalMultipleChoice, setWebcamStream } from './meeting.js';
import { async } from '@firebase/util';

// HTML elements

const body       = document.querySelector("body");
const sidebar    = document.querySelector(".sidebar"),
      toggle     = sidebar.querySelector(".toggle"),
      modeSwitch = sidebar.querySelector(".toggle-switch"),
      modeText   = sidebar.querySelector(".mode-text"),
      navBtn     = sidebar.querySelectorAll('.nav-btn');

const alertSetting               = prefab.querySelector('.alert-setting');
const alertButtonSetting         = document.querySelector('.button-setting');

const alertMultipleChoiceSetting = prefab.querySelector('.alert-multiple-choice-setting');
const fieldOption                = prefab.querySelector('.option');
const multipleChoiceSetting      = document.querySelector('.multiple-choice-setting');

const alertEssayQuestionSetting  = prefab.querySelector('.alert-essay-question-setting');
const essayQuestionSetting       = document.querySelector('.essay-question-setting');

const alertVoteSetting           = prefab.querySelector('.alert-vote-setting');
const voteOptionInput            = prefab.querySelector('.vote-option_input');
const voteSetting                = document.querySelector('.vote-setting');


const fltCntr             = document.querySelector(".floating-container"),
      closeFloatingButton = fltCntr.querySelector('.close-floating_button'),
      floatingAlert       = fltCntr.querySelector('#floating-alert'),
      floatingUserMedia       = fltCntr.querySelector('#floating-user-media'),
      alertInfo           = fltCntr.querySelector('.alert-info'),
      infoType            = alertInfo.querySelector('#info-type'),
      infoInterval        = floatingAlert.querySelector("#info-interval"),
      infoTime            = floatingAlert.querySelector("#info-time"),
      centerBtns          = floatingAlert.querySelectorAll('.center-btn'),
      settingBtn          = alertInfo.querySelector('#setting'),
      submitSettingBtn    = alertInfo.querySelector('#submit-setting'),
      cancelSettingBtn    = alertInfo.querySelector('#cancel-setting');

const fieldset            = document.querySelector('.fieldset');

const alertInfoErrorText       = alertInfo.querySelector('.error-text'),
      alertChoose              = floatingAlert.querySelector('.alert-choose'),
      alertExchange            = floatingAlert.querySelector('#alert-exchange'),
      alertReturn              = floatingAlert.querySelector('#alert-return'),
      buttonSetting            = floatingAlert.querySelector('.button-setting'),
      essayQuestion            = floatingAlert.querySelector('.essay-question-setting'),
      choose1                  = floatingAlert.querySelector('#choose-1'),
      choose2                  = floatingAlert.querySelector('#choose-2'),
      choose3                  = floatingAlert.querySelector('#choose-3'),
      choose4                  = floatingAlert.querySelector('#choose-4');

const classId               = document.querySelector('#class-id')?.value?.trim()  || document.querySelector('#class-id').innerHTML?.trim();
const localUserId           = document.querySelector('#user-id')?.value?.trim()   || document.querySelector('#user-id').innerHTML?.trim();
const hostId                = document.querySelector('#host-id')?.value?.trim()   || document.querySelector('#host-id').innerHTML?.trim();

// Global variable
let current = 0;
let optionsTotal = 0;
let alertType;
let interval;
let time;
let question;
let answearID;
let multipleChoice;
export let dataMultipleChoice = {};
let isHost = localUserId === hostId;
export let constraints = {};

//開關sidebar
toggle.addEventListener("click", () =>{
    sidebar.classList.toggle("close");
});

//黑白模式
if (document.documentElement.classList.contains("dark")) {
    modeSwitch.classList.add("open");
    modeText.innerHTML = "燈光模式";
}

modeSwitch.addEventListener("click", () =>{
    modeSwitch.classList.toggle("open");

    if (modeSwitch.classList.contains("open")){
        document.documentElement.classList.add("dark");
        localStorage.setItem('color-scheme', 'dark');
        modeText.innerHTML = "燈光模式";
    }
    else{
        document.documentElement.classList.remove("dark");
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
            });
            navBtn[index].classList.toggle("open");
            let navText = navBtn[index].querySelector('.nav-text').innerHTML;
            fltCntr.hidden = false;
            hiddenAllFloating();

            if(navText === '警醒資訊') {
                // const { host } = (await getDoc(callDoc)).data();
                // const user = await getUser();

                floatingAlert.hidden = false;
                if (isHost){
                    console.log('會議主辦人警醒資訊');
                    closeModalForm();
                }else {
                    console.log('不是主辦人只提供個人警醒資訊');
                }
            }else if( navText === '裝置設定' ) {
                floatingUserMedia.hidden = false;
                userMedia();
            }
        });
    });
}

//關閉浮動視窗的按鈕
closeFloatingButton.addEventListener('click', () => {

    fltCntr.hidden = true;
    Array.from(navBtn).forEach((item) => {
        item.className = "nav-btn";
    });

    hiddenAllFloating();
});

function hiddenAllFloating() {
    optionsTotal = 0;
    current = 0;
    floatingUserMedia.hidden = true;
    floatingAlert.hidden = true;
    alertInfo.classList.remove('close');
    alertChoose.classList.add("close");
    buttonSetting.hidden = true;
    multipleChoiceSetting.hidden = true;
    essayQuestion.hidden = true;
    voteSetting.hidden = true;
    const alertStepProgress = document.querySelectorAll('.alert-step-progress');
    alertStepProgress.forEach( alertStepProgress => {
        alertStepProgress.innerHTML = '';
    })
    alertInfo.classList.remove('Revise');
}

//警醒浮動視窗 開啟
async function closeModalForm() {

    alertInfoErrorText.innerHTML = '';

    infoInterval.setAttribute("readonly", "readonly");
    infoTime.setAttribute("readonly", "readonly");

    infoInterval.classList.remove('Revise');
    infoTime.classList.remove('Revise');
    alertInfo.classList.remove('Revise');

    centerBtns[0].hidden = false;
    centerBtns[1].hidden = true;

    floatingAlert.style.opacity = 1;

    infoType.innerHTML = getKeyByValue(AlertTypeEnum, globalAlertType);
    infoInterval.value = globalInterval;
    infoTime.value     = globalTime;
    fieldset.innerHTML = '';

    const legend = document.createElement('legend');
    const div = document.createElement('div');
    const label = document.createElement('label');
    const textarea = document.createElement('textarea');

    if(globalAlertType === AlertTypeEnum.Click) {
        fieldset.hidden = true;
    }else {
        fieldset.hidden = false;
        fieldset.appendChild(legend);
        div.classList.add("div-label");
        fieldset.appendChild(div);
        div.appendChild(label);
        textarea.classList.add("info-textarea");
        textarea.setAttribute("readonly", "readonly");
        textarea.innerHTML = globalQuestion;
        fieldset.appendChild(textarea);
    }
    if(globalAlertType === AlertTypeEnum.MultipleChoice) {
        legend.innerHTML = '選擇題';
        label.innerHTML = '問題:';

        for (let i = 0; i < globalMultipleChoice.length; i++) {
            const option    = fieldOption.cloneNode(true);
            const spanNo = option.querySelector(".span_No");
            const input = option.querySelector('.option_input');
            const icon = option.querySelector('.bx-x');
            fieldset.appendChild(option);
            icon.remove();
            input.setAttribute("readonly", "readonly");
            spanNo.innerHTML = i+1;
            input.value = globalMultipleChoice[i];
            if(globalAnswear === (i+1).toString()){
                answearID = globalAnswear;
                spanNo.classList.toggle('answear');
            }
        }
    }else if(globalAlertType === AlertTypeEnum.EssayQuestion) {
        legend.innerHTML = '問答題';
        label.innerHTML = '問題:';
    }else if(globalAlertType === AlertTypeEnum.Vote) {
        legend.innerHTML = '投票';
        label.innerHTML = '投票題目:';
        const div = document.createElement('div');
        div.classList.add('field','select');
        fieldset.appendChild(div);
        const label2 = document.createElement('label');
        label2.innerHTML = '投票選項:';
        div.appendChild(label2);
        const div2 = document.createElement('div');
        div2.classList.add('field','voteOptions');
        fieldset.appendChild(div2);
        for (let i = 0; i < multipleChoice.length; i++) {
            const input = document.createElement('input');
            input.classList.add("option_input");
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
    alertInfo.classList.add('Revise');

    const infoInterval = alertInfo.querySelector("#info-interval");
    const infoTime     = alertInfo.querySelector("#info-time");
    const textarea = alertInfo.querySelector('.info-textarea');
    const input = alertInfo.querySelectorAll('.option_input');
    const spanNo = alertInfo.querySelectorAll('.span_No');
    const fieldset = alertInfo.querySelector('.fieldset');

    infoInterval.removeAttribute('readonly');
    infoTime.removeAttribute('readonly');

    if( globalAlertType != AlertTypeEnum.Click ) {
        textarea.removeAttribute('readonly');
    }
    if( globalAlertType === AlertTypeEnum.MultipleChoice ) {
        optionsTotal = 0;
        input.forEach(input => {
            input.removeAttribute('readonly');
            optionsTotal ++;
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

        const addOption = alertInfo.querySelector('.div-label');
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
            div.classList.add("field",'option');
            fieldset.appendChild(div);
            let spanNo = document.createElement('span');
            spanNo.classList.add("span_No");
            div.appendChild(spanNo);
            const input = document.createElement('input');
            input.classList.add("option_input");
            input.setAttribute("type", "text");
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
    }else if( globalAlertType === AlertTypeEnum.EssayQuestion ) {
        textarea.removeAttribute('readonly');
    }else if( globalAlertType === AlertTypeEnum.Vote ) {
        textarea.removeAttribute('readonly');
        let i = 0;
        input.forEach(input => {
            input.removeAttribute('readonly');
            i++;
        });
        const selectOptions = alertInfo.querySelector('.select');
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
    const fieldOptions = alertInfo.querySelector(".voteOptions");
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

//取消修改警醒資訊
cancelSettingBtn.addEventListener('click', async () => {
    closeModalForm();
});

//確定修改警醒資訊
submitSettingBtn.addEventListener('click', async () => {
    const infoInterval = alertInfo.querySelector("#info-interval");
    const infoTime     = alertInfo.querySelector("#info-time");
    const infoTextarea = alertInfo.querySelector(".info-textarea");
    const spanNoAnswear = alertInfo.querySelector(".answear");
    const optionInput = alertInfo.querySelectorAll(".option_input");

    if( Number(infoInterval.value) < 10 || Number(infoInterval.value) > 50 ) {
        alertInfoErrorText.innerHTML = '警醒間隔範圍：10 ~ 50';
    }else if( Number(infoTime.value) < 1 || Number(infoTime.value) > 3) {
        alertInfoErrorText.innerHTML = '持續時間範圍：1 ~ 3';
    }else {
        if (globalAlertType === AlertTypeEnum.MultipleChoice) {
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
                answearID = spanNoAnswear.innerHTML;

                let multipleChoiceDict = {};
                for(let i=0; i < optionInput.length; i++){
                    multipleChoiceDict[i] = optionInput[i].value;
                }
                multipleChoice = Object.values(multipleChoiceDict);

                dataMultipleChoice = {
                    Question: question,
                    Answear: answearID,
                    MultipleChoice: multipleChoice,
                }
            }
        }else if(globalAlertType === AlertTypeEnum.EssayQuestion) {
            if(infoTextarea.value === '') {
                alertInfoErrorText.innerHTML = '問題禁止為空字串';
                return;
            }else {
                question = infoTextarea.value;
                dataMultipleChoice = {
                    Question: question,
                }
            }
        }else if(globalAlertType === AlertTypeEnum.Vote) {
            const optionSelected = alertInfo.querySelector("#option-selected");
            if(infoTextarea.value === '') {
                alertInfoErrorText.innerHTML = '問題禁止為空字串';
                return;
            }else if( optionSelected.value === '' ){
                alertInfoErrorText.innerHTML = '請選擇投票選項數量';
                return;
            }
            const optionInput = alertInfo.querySelectorAll(".option_input");
            let i = 0;
            optionInput.forEach( optionInput => {
                if( optionInput.value === '' ) {
                    alertInfoErrorText.innerHTML = '選項必須有值';
                    i++;
                }
            })
            if( i > 0 ) {return;}
            question = infoTextarea.value;

            let multipleChoiceDict = {};
            for(let i=0; i < optionInput.length; i++){
                multipleChoiceDict[i] = optionInput[i].value;
            }
            multipleChoice = Object.values(multipleChoiceDict);

            dataMultipleChoice = {
                Question: question,
                MultipleChoice: multipleChoice,
            }
        }

        infoInterval.classList.remove('Revise');
        infoTime.classList.remove('Revise');

        interval = Number(infoInterval.value);
        time     = Number(infoTime.value);
        alertType = globalAlertType;

        const data = {
            classId,
            interval:interval,
            duration:time,
        }
        // UPDATE Classes SET Interval = :interval, Duration= :time WHERE ClassId = :classId
        await apiCall('updateClassAlertRecord', data)
        // const callDoc = doc(calls, classId);
        // await updateDoc(callDoc, data);

        setGlobalAlert(alertType, interval, time, question, answearID, multipleChoice);

        centerBtns[0].hidden = false;
        centerBtns[1].hidden = true;

        infoInterval.setAttribute('readonly','true');
        infoTime.setAttribute('readonly','true');

        closeModalForm();
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
    const container = alert.querySelector('.container');
    const alertInterval = alert.querySelector('.alert-interval');
    const alertTime = alert.querySelector('.alert-time');
    const alertFinish = alert.querySelector('#alert-finish');
    const alertReturn = alert.querySelector('#alert-return');
    const errorText = alert.querySelector('.error-text');
    title.innerHTML = "警醒按鈕設定";
    alertInterval.value = globalInterval;
    alertTime.value = globalTime;
    alertButtonSetting.appendChild(title);
    alertButtonSetting.appendChild(container);

    alertFinish.addEventListener('click', async () => {
        if( Number(alertInterval.value) < 10 || Number(alertInterval.value) > 50 ) {
            errorText.innerHTML = '警醒間隔範圍：10 ~ 50';
            return;
        }else if( Number(alertTime.value) < 1 || Number(alertTime.value) > 3 ) {
            errorText.innerHTML = '持續時間範圍：1 ~ 3';
            return;
        }else {
            alertType = AlertTypeEnum.Click;
            interval = Number(alertInterval.value);
            time     = Number(alertTime.value);

            // const data = {
            //     alert: {
            //         interval:interval,
            //         time:time,
            //     },
            // }
            // const callDoc = doc(calls, classId);
            // await updateDoc(callDoc, data);

            const data = {
                classId,
                interval:interval,
                duration:time,
            }
            await apiCall('updateClassAlertRecord', data)

            setGlobalAlert(alertType, interval, time, question, answearID, multipleChoice);

            alertInfo.classList.remove("close");
            AlertReplace();
            closeModalForm();
            container.remove();
            title.remove();
            buttonSetting.hidden = true;
        }
    });

    alertReturn.addEventListener('click', () => {
        buttonSetting.hidden = true;
        alertChoose.classList.remove("close");
        container.remove();
        title.remove();
    });
});

choose2.addEventListener('click', () => {
    multipleChoiceSetting.hidden = false;
    alertChoose.classList.toggle("close");

    const alert          = alertMultipleChoiceSetting.cloneNode(true);
    const title          = alert.querySelector('.class-modal__title');
    const alertInterval  = alert.querySelector('.alert-interval');
    const alertTime      = alert.querySelector('.alert-time');
    const errorText      = alert.querySelector('.error-text');
    const slidePage      = alert.querySelector(".slidepage");
    const options        = alert.querySelector(".options");
    const prev1          = alert.querySelector(".prev-1");
    const next1          = alert.querySelector(".next-1");
    const prev2          = alert.querySelector(".prev-2");
    const next2          = alert.querySelector(".next-2");
    const prev3          = alert.querySelector(".prev-3");
    const next3          = alert.querySelector(".next-3");
    const addBtn         = alert.querySelector(".add_options");
    const fieldAdd       = alert.querySelector(".add");
    const progressText   = alert.querySelectorAll(".step p");
    const progressCheck  = alert.querySelectorAll(".step .check");
    const bullet         = alert.querySelectorAll(".step .bullet");
    const qstText        = alert.querySelectorAll(".qst_text");
    const container      = alert.querySelector('.container');
    multipleChoiceSetting.appendChild(title);
    multipleChoiceSetting.appendChild(container);

    alertInterval.value = globalInterval;
    alertTime.value     = globalTime;

    prev1.addEventListener('click', () => {
        multipleChoiceSetting.hidden = true;
        alertChoose.classList.remove("close");
        container.remove();
        title.remove();
        optionsTotal = 0;
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
            errorText.innerHTML = '';
        }else {
            errorText.innerHTML = '禁止輸入空字串！';
        }
    });
    next2.addEventListener('click', () => {
        let optionInput = multipleChoiceSetting.querySelectorAll('.option_input');
        let x = 0;
        for(let i = 0; i < optionInput.length; i++){
            if(optionInput[i].value != ''){
                x += 1;
            }
        }
        const answearChosen = multipleChoiceSetting.querySelector(".answear");
        if(x === optionInput.length && answearChosen != null ){
            slidePage.style.marginLeft = "-50%";
            bullet[current].classList.add("active");
            progressText[current].classList.add("active");
            progressCheck[current].classList.add("active");
            current += 1;
            errorText.innerHTML = '';
        }else if( x != optionInput.length ){
            errorText.innerHTML = '選項禁止為空字串！'
        }else if( answearChosen === null ) {
            errorText.innerHTML = '請選擇答案選項！'
        }
    });

    next3.addEventListener('click', async () => {

        if ( Number(alertInterval.value) < 10 || Number(alertInterval.value) >50 ) {
            errorText.innerHTML = '警醒間隔範圍：10 ~ 50';
            return;
        }else if ( Number(alertTime.value) < 1 || Number(alertTime.value) > 3 ) {
            errorText.innerHTML = '持續時間範圍：1 ~ 3';
            return;
        }else {
            const optionInput = multipleChoiceSetting.querySelectorAll(".option_input");
            let multipleChoiceDict = {};
            for(let i=0; i < optionInput.length; i++){
                multipleChoiceDict[i] = optionInput[i].value;
            }
            multipleChoice = Object.values(multipleChoiceDict);

            const answearChosen = multipleChoiceSetting.querySelector(".answear");
            if(answearChosen != null) {
                answearID = answearChosen.innerHTML;
            }

            question = qstText[0].value;
            interval = Number(alertInterval.value);
            time     = Number(alertTime.value);
            alertType = AlertTypeEnum.MultipleChoice;

            setGlobalAlert(alertType, interval, time, question, answearID, multipleChoice);

            dataMultipleChoice = {
                Question: globalQuestion,
                Answear: globalAnswear,
                MultipleChoice: globalMultipleChoice,
            }
            // let dataAlert = {
            //     alert: {
            //         interval: globalInterval,
            //         time: globalTime,
            //     },
            // }
            // const callDoc = doc(calls, classId);
            // await updateDoc(callDoc, dataAlert);

            const data = {
                classId,
                interval:interval,
                duration:time,
            }
            await apiCall('updateClassAlertRecord', data)


            current = 0;
            optionsTotal = 0;

            alertInfo.classList.remove("close");
            multipleChoiceSetting.hidden = true;

            AlertReplace();
            closeModalForm();
            container.remove();
            title.remove();
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
        const option    = fieldOption.cloneNode(true);
        const icon = option.querySelector(".bx-x");
        const spanNo = option.querySelector(".span_No");
        options.insertBefore(option,fieldAdd);
        icon.addEventListener('click', () => {
            option.remove();
            optionsTotal -= 1;
            const bxX = multipleChoiceSetting.querySelectorAll(".bx-x");
            let spanNo = multipleChoiceSetting.querySelectorAll(".span_No");
            let x = 0;
            Array.from(bxX).forEach((item) => {
                spanNo[x].innerHTML = x+1;
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
        spanNo.addEventListener('click', () => {
            let no = multipleChoiceSetting.querySelectorAll(".span_No");
            Array.from(no).forEach((item) => {
                item.classList.remove("answear");
            });
            spanNo.classList.add("answear");
        });
        const bxX = multipleChoiceSetting.querySelectorAll(".bx-x");
        let no = multipleChoiceSetting.querySelectorAll(".span_No");
        let x = 0;
        Array.from(bxX).forEach((item) => {
            no[x].innerHTML = x+1;
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
});

choose3.addEventListener('click', () => {
    alertChoose.classList.toggle("close");
    essayQuestion.hidden = false;

    const alert = alertSetting.cloneNode(true);
    const title = alert.querySelector('.class-modal__title');
    const alertInterval = alert.querySelector('.alert-interval');
    const alertTime = alert.querySelector('.alert-time');
    const alertFinish = alert.querySelector('#alert-finish');
    const alertReturn = alert.querySelector('#alert-return');
    const errorText = alert.querySelector('.error-text');
    const container = alert.querySelector('.container');
    const fieldsetAlert = alert.querySelector('.fieldset-alert');
    essayQuestionSetting.appendChild(title);
    essayQuestionSetting.appendChild(container);
    const alertqst = alertEssayQuestionSetting.cloneNode(true);
    const fieldsetEssayQuestion = alertqst.querySelector('.fieldset-essay-question');
    const qstText = alertqst.querySelector('.qst_text');
    container.insertBefore(fieldsetEssayQuestion,fieldsetAlert);

    title.innerHTML = "設定問答題";
    alertInterval.value = globalInterval;
    alertTime.value = globalTime;

    alertFinish.addEventListener('click', async () => {

        if( qstText.value === '' ) {
            errorText.innerHTML = '問題禁止為空字串';
            return;
        }else if( Number(alertInterval.value) < 10 || Number(alertInterval.value) > 50 ) {
            errorText.innerHTML = '警醒間隔範圍：10 ~ 50';
            return;
        }else if( Number(alertTime.value) < 1 || Number(alertTime.value) > 10) {
            errorText.innerHTML = '持續時間範圍：1 ~ 3';
            return;
        }

        alertType = AlertTypeEnum.EssayQuestion;
        interval = Number(alertInterval.value);
        time     = Number(alertTime.value);

        question = qstText.value;

        dataMultipleChoice = {
            Question: question,
        }

        // let dataAlert = {
        //     alert: {
        //         interval: interval,
        //         time: time,
        //     },
        // }
        // const callDoc = doc(calls, classId);
        // await updateDoc(callDoc, dataAlert);

        const data = {
            classId,
            interval:interval,
            duration:time,
        }
        await apiCall('updateClassAlertRecord', data)

        setGlobalAlert(alertType, interval, time, question, answearID, multipleChoice);

        alertInfo.classList.remove("close");
        essayQuestion.hidden = true;

        AlertReplace();
        closeModalForm();
        container.remove();
        title.remove();
    });

    alertReturn.addEventListener('click', () => {
        essayQuestion.hidden = true;
        alertChoose.classList.remove("close");
        container.remove();
        title.remove();
    });
});

choose4.addEventListener('click', () => {
    alertChoose.classList.toggle("close");
    voteSetting.hidden = false;

    const alert = alertSetting.cloneNode(true);
    const title = alert.querySelector('.class-modal__title');
    const alertInterval = alert.querySelector('.alert-interval');
    const alertTime = alert.querySelector('.alert-time');
    const alertFinish = alert.querySelector('#alert-finish');
    const alertReturn = alert.querySelector('#alert-return');
    const errorText = alert.querySelector('.error-text');
    const container = alert.querySelector('.container');
    const fieldsetAlert = alert.querySelector('.fieldset-alert');
    voteSetting.appendChild(title);
    voteSetting.appendChild(container);
    const alertvote = alertVoteSetting.cloneNode(true);
    const fieldsetVote = alertvote.querySelector('.fieldset-vote');
    const qstText = alertvote.querySelector('.qst_text');
    const optionSelected = alertvote.querySelector("#option-selected");
    const fieldOptions = alertvote.querySelector(".options");
    container.insertBefore(fieldsetVote,fieldsetAlert);

    title.innerHTML = "設定投票警醒";
    alertInterval.value = globalInterval;
    alertTime.value = globalTime;

    optionSelected.addEventListener("change",Selected);

    function Selected(event){
        const optionInput = fieldOptions.querySelectorAll(".option_input");

        optionInput.forEach( optionInput => {
            optionInput.remove();
        })

        if(event.target.value != '') {
            for(let i = 0; i < parseInt(event.target.value); i++) {
                const optionsInput = voteOptionInput.cloneNode(true);
                const optionInput = optionsInput.querySelector('.option_input');
                fieldOptions.appendChild(optionInput);
            }
        }
    }

    alertFinish.addEventListener("click", async () =>{
        if( qstText.value === '' ) {
            errorText.innerHTML = '問題禁止為空字串';
            return;
        }else if( optionSelected.value === '' ) {
            errorText.innerHTML = '請選擇投票選項數量';
            return;
        }

        const optionInput = fieldOptions.querySelectorAll(".option_input");
        let i = 0;
        optionInput.forEach( optionInput => {
            if( optionInput.value === '' ) {
                errorText.innerHTML = '選項必須有值';
                i++;
            }
        })
        if( i > 0 ) { return; }
        if( Number(alertInterval.value) < 10 || Number(alertInterval.value) > 50 ) {
            errorText.innerHTML = '警醒間隔範圍：10 ~ 50';
            return;
        }else if( Number(alertTime.value) < 1 || Number(alertTime.value) > 10) {
            errorText.innerHTML = '持續時間範圍：1 ~ 3';
            return;
        }

        alertType = AlertTypeEnum.Vote;
        interval = Number(alertInterval.value);
        time     = Number(alertTime.value);
        question = qstText.value;

        let multipleChoiceDict = {};
        for(let i=0; i < optionInput.length; i++){
            multipleChoiceDict[i] = optionInput[i].value;
        }
        multipleChoice = Object.values(multipleChoiceDict);

        dataMultipleChoice = {
            Question: question,
            MultipleChoice: multipleChoice,
        }

        // let dataAlert = {
        //     alert: {
        //         interval: interval,
        //         time: time,
        //     },
        // }

        // const callDoc = doc(calls, classId);
        // await updateDoc(callDoc, dataAlert);

        const data = {
            classId,
            interval:interval,
            duration:time,
        }
        await apiCall('updateClassAlertRecord', data)

        setGlobalAlert(alertType, interval, time, question, answearID, multipleChoice);

        voteSetting.hidden = true;
        alertInfo.classList.remove("close");
        AlertReplace();
        closeModalForm();
        container.remove();
        title.remove();
    });

    alertReturn.addEventListener('click', () => {
        voteSetting.hidden = true;
        alertChoose.classList.remove("close");
        container.remove();
        title.remove();
    });
});

async function AlertReplace() {
    setupAlertScheduler();
    console.log( alertType );
}

function userMedia() {
    // 取得標籤
    const camVideo = document.querySelector('.cam__video');
    const videoElement = document.querySelector('#player')
    const audioInputSelect = document.querySelector('select#audioSource')
    const audioOutputSelect = document.querySelector('select#audioOutput')
    const videoSelect = document.querySelector('select#videoSource')
    const selectors = [audioInputSelect, audioOutputSelect, videoSelect]

    audioOutputSelect.disabled = !('sinkId' in HTMLMediaElement.prototype)

    // 將讀取到的設備加入到 select 標籤中
    function gotDevices(deviceInfos) {
        // Handles being called several times to update labels. Preserve values.
        const values = selectors.map((select) => select.value)
        selectors.forEach((select) => {
            while (select.firstChild) {
                select.removeChild(select.firstChild)
            }
        })
        for (let i = 0; i !== deviceInfos.length; ++i) {
            const deviceInfo = deviceInfos[i]
            const option = document.createElement('option')
            option.value = deviceInfo.deviceId
            if (deviceInfo.kind === 'audioinput') {
                option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`
                audioInputSelect.appendChild(option)
            } else if (deviceInfo.kind === 'audiooutput') {
                option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`
                audioOutputSelect.appendChild(option)
            } else if (deviceInfo.kind === 'videoinput') {
                option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`
                videoSelect.appendChild(option)
            } else {
                console.log('Some other kind of source/device: ', deviceInfo)
            }
        }
        selectors.forEach((select, selectorIndex) => {
            if (
                Array.prototype.slice
                    .call(select.childNodes)
                    .some((n) => n.value === values[selectorIndex])
            ) {
                select.value = values[selectorIndex]
            }
        })
    }

    // 讀取設備
    navigator.mediaDevices.enumerateDevices().then(gotDevices).catch(handleError)

    // 手動修改音訊的輸出 例如預設耳機切換成喇叭
    function attachSinkId(element, sinkId) {
        if (typeof element.sinkId !== 'undefined') {
            element
            .setSinkId(sinkId) 
            .then(() => {
                console.log(`Success, audio output device attached: ${sinkId}`)
            })
            .catch((error) => {
                let errorMessage = error
                if (error.name === 'SecurityError') {
                    errorMessage = `You need to use HTTPS for selecting audio output device: ${error}`
                }
                console.error(errorMessage)
                // Jump back to first output device in the list as it's the default.
                audioOutputSelect.selectedIndex = 0
            })
        } else {
            console.warn('Browser does not support output device selection.')
        }
    }

    // 處理音訊改變的方法
    function changeAudioDestination() {
        const audioDestination = audioOutputSelect.value
        attachSinkId(videoElement, audioDestination)
    }

    // 將視訊顯示在 video 標籤上
    function gotStream(stream) {
        videoElement.srcObject = stream
        return navigator.mediaDevices.enumerateDevices()
    }

    // 錯誤處理
    function handleError(error) {
        console.log(
            'navigator.MediaDevices.getUserMedia error: ',
            error.message,
            error.name,
        )
    }

    // 播放自己的視訊
    async function start() {
        const audioSource = audioInputSelect.value
        const videoSource = videoSelect.value
        console.log(videoSource);
        constraints = {
            audio: false,
            // audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
            video: { deviceId: videoSource ? { exact: videoSource } : undefined },
        }
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(gotStream)
            .then(gotDevices)
            .catch(handleError)
        
        setWebcamStream(constraints);
    }

    audioInputSelect.onchange = start
    audioOutputSelect.onchange = changeAudioDestination

    videoSelect.onchange = start

    start();
}