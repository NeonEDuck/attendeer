import './navbar.js'

const textareas = document.querySelectorAll('textarea.auto-resize');

for (const textarea of textareas) {
    textarea.addEventListener('input', (e) => {
        e.target.style.height = "2em";
        e.target.style.height = (e.target.scrollHeight) + "px";
    });
}