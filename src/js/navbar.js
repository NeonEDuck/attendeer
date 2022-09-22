import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInWithRedirect, signOut, GoogleAuthProvider } from "firebase/auth";

const body       = document.querySelector('body');
const profile    = document.querySelector('#navbar-profile');
const profilePic = document.querySelector('#navbar-profile__picture');
const loginText  = document.querySelector('#login-text');
const signInBtn  = document.querySelector('#sign-in');
const signOutBtn = document.querySelector('#sign-out');
const modeText   = document.querySelector('#mode-text');
const modeSwitch = document.querySelector('#mode-switch');

const provider = new GoogleAuthProvider();

if (document.querySelector('#navbar') !== null) {
    onAuthStateChanged(auth, (user) => {
        if (user) {
            loginText.innerHTML = user.displayName;
            profilePic.src = user.photoURL
            signInBtn.hidden = true;
            signOutBtn.hidden = false;
        }
        else {
            loginText.innerHTML = '未登入';
            signInBtn.hidden = false;
            signOutBtn.hidden = true;
        }
    })

    signInBtn.addEventListener('click', async () => {
        // window.location.href = `/login${window.location.pathname}`;
        signInWithRedirect(auth, provider);
    });

    signOutBtn.addEventListener('click', async () => {
        await signOut(auth);
        window.location.href = "/";
    });

    profilePic.addEventListener('click', () => {
        if (profile.classList.contains('open')) {
            profile.classList.remove('open');
        }
        else {
            profile.classList.add('open');
        }
    });

    if (localStorage.getItem('color-scheme') === "dark") {
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
}