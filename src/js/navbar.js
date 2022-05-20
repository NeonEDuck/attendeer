import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInWithRedirect, signOut, GoogleAuthProvider } from "firebase/auth";

const loginText = document.querySelector('#login-text');
const signInBtn = document.querySelector('#sign-in');
const signOutBtn = document.querySelector('#sign-out');

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginText.innerHTML = user.displayName;
        signInBtn.hidden = true;
        signOutBtn.hidden = false;
    }
    else {
        loginText.innerHTML = '未登入';
        signInBtn.hidden = false;
        signOutBtn.hidden = true;
    }
})

const provider = new GoogleAuthProvider();

signInBtn.addEventListener('click', async () => {
    await signInWithRedirect(auth, provider);
});

signOutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "/";
});