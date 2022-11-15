import './navbar.js'
import { setIntervalImmediately } from './util.js'

setIntervalImmediately(() => {
    const textareas = document.querySelectorAll('main textarea.auto-resize:not(.settle)');

    for (const textarea of textareas) {
        textarea.style.height = "2em";
        textarea.style.height = `${textarea.scrollHeight}px`;
        textarea.addEventListener('input', (e) => {
            e.target.style.height = "2em";
            e.target.style.height = `${e.target.scrollHeight}px`;
        });
        textarea.classList.add('settle');
    }
}, 500);