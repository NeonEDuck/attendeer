const profile           = document.querySelector('#navbar-profile');
const profileCloseBtn   = document.querySelector('#navbar-profile__close-btn');
const loginText         = document.querySelector('#login-text');
const signInBtn         = document.querySelector('#sign-in');
const signOutBtn        = document.querySelector('#sign-out');
const modeText          = document.querySelector('#mode-text');
const modeSwitch        = document.querySelector('#mode-switch');

if (document.querySelector('#navbar') !== null) {

    signInBtn?.addEventListener('click', async () => {
        window.location.href = "/auth/google";
    });

    signOutBtn?.addEventListener('click', async () => {
        window.location.href = "/logout";
    });

    profile.addEventListener('click', (e) => {
        e.stopPropagation();
        profile.classList.add('open');
    });
    profileCloseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        profile.classList.remove('open');
    });

    if (localStorage.getItem('color-scheme') === "dark") {
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
}