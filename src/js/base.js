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

[...document.querySelectorAll('button[href]')].forEach((e) => {
    e.addEventListener('click', () => {
        window.location.href = e.getAttribute('href');
    });
});

[...document.querySelectorAll('.tab-group')].forEach((tabGroup) => {
    const tabGroupSlider = tabGroup.querySelector('.slider');
    const tabGroupLabels = tabGroup.querySelectorAll('label');
    const tabGroupTabs   = tabGroup.querySelectorAll('input[type="radio"]');
    let currentIndex = 0;

    tabGroup.style.setProperty('--length', tabGroupTabs.length);
    tabGroupLabels.forEach((e, idx) => {
        e.addEventListener('mouseleave', () => {
            tabGroupSlider.style.setProperty('--offset', '0');
        });
        e.addEventListener('mouseenter', () => {
            const offset = Math.sign(idx - currentIndex);
            tabGroupSlider.style.setProperty('--offset', offset);
        });
    });
    tabGroupTabs.forEach((tab, idx) => {
        tab.addEventListener('click', async () => {
            currentIndex = idx;
            tabGroupSlider.style.setProperty('--index', currentIndex);
            tabGroupSlider.style.setProperty('--offset', 0);
            tabGroupLabels.forEach((e) => {
                e.classList.remove('checked');
            });
            tabGroupLabels[currentIndex].classList.add('checked');
        });
    });
});