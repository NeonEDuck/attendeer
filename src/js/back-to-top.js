const backToTopBtn = document.querySelector('#back-to-top-btn');
let currentFadeout;

window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        if (!backToTopBtn.classList.contains('btn-enter')){
            backToTopBtn.classList.add('btn-enter');
            backToTopBtn.classList.remove('btn-exit');
            backToTopBtn.hidden = false;
            clearTimeout(currentFadeout);
        }
    }
    else {
        if (backToTopBtn.classList.contains('btn-enter')){
            backToTopBtn.classList.remove('btn-enter');
            backToTopBtn.classList.add('btn-exit');
        }
    }
});

backToTopBtn.addEventListener('animationend', () => {
    if (backToTopBtn.classList.contains('btn-exit')) {
        backToTopBtn.hidden = true;
    }
});

backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});