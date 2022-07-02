import './base.js'

const callInput = document.querySelector('#call-input');
const callBtn   = document.querySelector('#call-btn');

callBtn.addEventListener('click', () => {
    if (callInput?.value) {
        window.location.href = `meeting/${callInput.value}`
    }
});

callInput.addEventListener('keydown', (event) => {
    if (event.keyCode === 13) {
        callBtn.click();
    }
});