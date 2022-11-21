import { firestore } from './firebase-config.js';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import 'webrtc-adapter';
import { htmlToElement, getKeyByValue, apiCall, AlertTypeEnum } from './util.js';
import { prefab } from './prefab.js';
import { setupAlertScheduler, globalAlertType, setGlobalAlert, globalInterval, globalTime, globalQuestion, globalAnswear, globalMultipleChoice, setWebcamStream, setLocalStreams } from './meeting.js';

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
      floatingUserMedia   = fltCntr.querySelector('#floating-user-media'),
      floatingAlertRecord   = fltCntr.querySelector('#floating-alert-record'),
      alertInfo           = fltCntr.querySelector('.alert-info'),
      infoType            = fltCntr.querySelector('#info-type'),
      infoInterval        = fltCntr.querySelector("#info-interval"),
      infoTime            = fltCntr.querySelector("#info-time"),
      centerBtns          = fltCntr.querySelectorAll('.center-btn'),
      settingBtn          = fltCntr.querySelector('#setting'),
      submitSettingBtn    = fltCntr.querySelector('#submit-setting'),
      cancelSettingBtn    = fltCntr.querySelector('#cancel-setting');

const fieldset            = document.querySelector('.fieldset');

const alertInfoErrorText       = fltCntr.querySelector('.error-text'),
      alertChoose              = fltCntr.querySelector('.alert-choose'),
      alertExchange            = fltCntr.querySelector('#alert-exchange'),
      alertReturn              = fltCntr.querySelector('#alert-return'),
      buttonSetting            = fltCntr.querySelector('.button-setting'),
      essayQuestion            = fltCntr.querySelector('.essay-question-setting'),
      choose1                  = fltCntr.querySelector('#choose-1'),
      choose2                  = fltCntr.querySelector('#choose-2'),
      choose3                  = fltCntr.querySelector('#choose-3'),
      choose4                  = fltCntr.querySelector('#choose-4');

const alertSearch            = document.querySelector('#alert-lookup__search');
const alertLookupTable       = document.querySelector('.alert-lookup__table[data-type="alert"]');
const alertDetailLookupTable = document.querySelector('.alert-lookup__table[data-type="alert-detail"]');
const alertLog               = document.querySelector('#alert-log');
const alertDetailLog         = document.querySelector('#alert-detail-log');
const alertLookupDetail      = document.querySelector('#lookup__detail');
const downloadAlertBtn       = document.querySelector('#download-alert-btn');

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

if (isHost){
    addEventListeners();
    generateAlertLog();
    alertSearch.addEventListener('keyup', () => {
        const filter = alertSearch.value.toUpperCase();
        const rows = alertLog.querySelectorAll('tr');

        for (const row of rows) {
            const text = [...row.querySelectorAll("td")].map((e) => {e.textContent || e.innerText}).join('').toUpperCase()

            if (text.indexOf(filter) !== -1) {
                row.style.display = "none";
            }
            else {
                row.style.display = "";
            }
        }
    })
}

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
                floatingAlert.hidden = false;
                console.log('會議主辦人警醒資訊');
                closeModalForm();
            }else if( navText === '裝置設定' ) {
                floatingUserMedia.hidden = false;
                userMedia();
            }else if( navText === '警醒紀錄' ) {
                floatingAlertRecord.hidden = false;
            }
            sidebar.classList.toggle("close");
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


async function generateAlertLog() {
    alertLog.innerHTML = '';
    const response = await apiCall('getAlertRecords', {classId});
    if (response.status !== 200) {
        return;
    }
    const alertRecords = await response.json()
    for (const alertRecord of alertRecords) {
        const record = htmlToElement(`
            <tr class="alert-record">
                <td class="alert-record__type">${alertRecord.AlertType}</td>
                <td class="alert-record__interval">${alertRecord.Interval}</td>
                <td class="alert-record__duration">${alertRecord.Duration}</td>
                <td class="alert-record__timestamp">${new Date(alertRecord.Timestamp).toLocaleString()}</td>
                <td class="alert-record__question">${(alertRecord.AlertTypeId !== AlertTypeEnum.Click)?alertRecord.Question:'-'}</td>
            </tr>
        `);
        record.addEventListener('click', async (e) => {
            alertLookupTable.hidden = true;
            alertSearch.hidden = true;
            alertDetailLog.hidden = true;
            document.querySelector('#alert-lookup__list').style.height = '80%';

            while (alertDetailLog.lastChild) {
                alertDetailLog.removeChild(alertDetailLog.lastChild);
            }

            const alertDetail = htmlToElement(`
                <div id="alert-detail">
                    <button id="return-alert-list">返回</button>
                    <div id="alert-type" class="nested">警醒類型：${alertRecord.AlertType}</div>
                    <div id="alert-interval" class="nested">警醒間隔：${alertRecord.Interval}</div>
                    <div id="alert-time" class="nested">警醒持續時間：${alertRecord.Duration}</div>
                    <div id="time-start" class="nested">建立時間：${new Date(alertRecord.Timestamp).toLocaleString()}</div>
                </div>
            `);

            alertDetail.querySelector('#return-alert-list').addEventListener('click', async (e) => {
                alertSearch.hidden = false;
                alertDetailLog.hidden = true;
                alertLookupTable.hidden = false;
                alertDetailLookupTable.hidden = true;
                alertSearch.hidden = false;
                alertLookupDetail.hidden = true;
                document.querySelector('#alert-lookup__list').style.height = '94%';
                while (alertLookupDetail.lastChild) {
                    alertLookupDetail.removeChild(alertLookupDetail.lastChild);
                }
            });
            alertLookupDetail.appendChild(alertDetail);

            const response = await apiCall('getAlertRecordReacts', {classId, recordId: alertRecord.RecordId})
            const alertReacts = await response.json();

            generateAlertSummary(alertRecord, alertReacts);

            for (const alertReact of alertReacts) {
                alertReact.Answer = (alertRecord.MultipleChoice)?alertRecord.MultipleChoice[Number(alertReact.Answer)-1] : alertReact.Answer;
                generateReactDetail(alertRecord.AlertTypeId, alertReact);
            }

            alertDetailLog.hidden = false;
            alertDetailLookupTable.hidden = false;
            alertSearch.hidden = true;
            alertLookupDetail.hidden = false;
        });
        alertLog.insertBefore(record, alertLog.firstChild);
    }

    alertSearch.addEventListener('keyup', () => {
        const filter = alertSearch.value.toUpperCase();
        const rows = alertLog.querySelectorAll('tr');
    
        for (const row of rows) {
            const text = [...row.querySelectorAll("td")].map((e) => {e.textContent || e.innerText}).join('').toUpperCase()
    
            if (text.indexOf(filter) !== -1) {
                row.style.display = "none";
            }
            else {
                row.style.display = "";
            }
        }
    })

    const b64toBlob = (b64Data, contentType='', sliceSize=512) => {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
    
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
    
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
    
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
    
        const blob = new Blob(byteArrays, {type: contentType});
        return blob;
    }
    
    downloadAlertBtn.addEventListener('click', async () => {
        const response = await apiCall('getAlertLog', {classId});
        const b64file = await response.text();
        const blob = b64toBlob(b64file, 'application/vnd.ms-excel');
    
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = 'alertLog.xlsx';
        link.click();
        link.remove();
    });
}

function generateAlertSummary(alertRecord, alertReacts) {
    // 1 == click
    // 2 == multiple choice
    // 3 == essay question
    // 4 == vote
    if (alertRecord.AlertTypeId !== AlertTypeEnum.Click) {
        alertLookupDetail.appendChild(htmlToElement(`
            <div id="alert-question">題目：${alertRecord.Question}</div>
        `));

        if (alertRecord.AlertTypeId === AlertTypeEnum.MultipleChoice || alertRecord.AlertTypeId === AlertTypeEnum.Vote) {
            const alertSummary = htmlToElement(`<div id="alert-summary"></div>`);
            let i = 0;
            for (const option of alertRecord.MultipleChoice) {
                const amount = alertReacts.filter((x) => (x.Answer === i.toString())).length;
                const total  = alertReacts.filter((x) => (x.Answer !== null)).length;

                alertSummary.appendChild(htmlToElement(`
                    <div class="alert-summary__option ${(alertRecord.Answer === i.toString())?'answer' : ''}">
                        <p>( ${i+1} ) ${option}</p>
                        <p>${amount}人</p>
                        <p>${total>0 ? amount/total*100 : 0}%</p>
                    </div>
                `));
                i++;
            }
            alertLookupDetail.appendChild(alertSummary);
        }
    }
}

async function generateReactDetail(alertType, alertReact) {
    let clickColor = 'var(--text-color)';
    let clicked = '未加入';
    let answer  = '-';
    let timeStamp = '-';
    if (alertReact.Clicked !== null) {
        if (alertReact.Clicked) {
            clicked = '完成';
            answer = alertReact.Answer;
            clickColor = '#7CFC00'
            timeStamp = new Date(alertReact.Timestamp).toLocaleString();
        }
        else {
            clicked = '未完成';
            answer = '';
            clickColor = '#ff0000'
        }
    }

    const alertReactElement = htmlToElement(`
        <tr class="alert-react">
            <td class="alert-react__name">${alertReact.UserName}</td>
            <td class="alert-react__click" style="color: ${clickColor}">${clicked}</td>
            <td class="alert-react__ans">${(alertType !== 1)?answer:'-'}</td>
            <td class="alert-react__timestamp">${timeStamp}</td>
        </tr>
    `);
    alertDetailLog.insertBefore(alertReactElement, alertDetailLog.firstChild);
}

function hiddenAllFloating() {
    optionsTotal = 0;
    current = 0;
    floatingAlertRecord.hidden = true;
    floatingUserMedia.hidden = true;
    floatingAlert.hidden = true;
    alertInfo.hidden = true;
    alertChoose.hidden = true;
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

    alertInfo.hidden = false;

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

function addEventListeners() {
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
        alertInfo.hidden = true;
        alertChoose.hidden = false;
    });

    //返回警醒資訊畫面
    alertReturn.addEventListener('click', () => {
        alertInfo.hidden = false;
        alertChoose.hidden = true;
    });

    choose1.addEventListener('click', () => {
        buttonSetting.hidden = false;
        alertChoose.hidden = true;

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

                alertInfo.hidden = false;
                AlertReplace();
                closeModalForm();
                container.remove();
                title.remove();
                buttonSetting.hidden = true;
            }
        });

        alertReturn.addEventListener('click', () => {
            buttonSetting.hidden = true;
            alertChoose.hidden = false;
            container.remove();
            title.remove();
        });
    });

    choose2.addEventListener('click', () => {
        multipleChoiceSetting.hidden = false;
        alertChoose.hidden = true;

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
            alertChoose.hidden = false;
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

                alertInfo.hidden = false;
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
        alertChoose.hidden = true;
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

            alertInfo.hidden = false;
            essayQuestion.hidden = true;

            AlertReplace();
            closeModalForm();
            container.remove();
            title.remove();
        });

        alertReturn.addEventListener('click', () => {
            essayQuestion.hidden = true;
            alertChoose.hidden = false;
            container.remove();
            title.remove();
        });
    });

    choose4.addEventListener('click', () => {
        alertChoose.hidden = true;
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
            alertInfo.hidden = false;
            AlertReplace();
            closeModalForm();
            container.remove();
            title.remove();
        });

        alertReturn.addEventListener('click', () => {
            voteSetting.hidden = true;
            alertChoose.hidden = false;
            container.remove();
            title.remove();
        });
    });
}

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

async function AlertReplace() {
    setupAlertScheduler();
    console.log( alertType );
}

async function userMedia() {
    // 取得標籤
    const videoElement = document.querySelector('#video')
    const audioInputSelect = document.querySelector('select#audioSource')
    const videoSelect = document.querySelector('select#videoSource')
    const selectors = [audioInputSelect, videoSelect]

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
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        gotDevices(devices);
    }
    catch (err) {
        handleError(err);
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
    async function startVideo() {
        const videoSource = videoSelect.value
        let constraints = {
            audio: false,
            video: { deviceId: videoSource ? { exact: videoSource } : undefined },
        }
        navigator.mediaDevices
            .getUserMedia(constraints)
            .then(gotStream)
            .then(gotDevices)
            .catch(handleError)

        setWebcamStream(constraints);
        localStorage.setItem('video-source', videoSource)
    }
    // 播放輸入音訊
    async function startAudio() {
        const audioSource = audioInputSelect.value
        let constraints = {
            audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
            video: false ,
        }
        setLocalStreams(constraints);
        localStorage.setItem('audio-source', audioSource)
    }

    audioInputSelect.value = localStorage.getItem('audio-source') || 'default';
    videoSelect.value      = localStorage.getItem('video-source') || 'default';

    audioInputSelect.onchange = startAudio
    videoSelect.onchange = startVideo

    startVideo();
    startAudio();
}