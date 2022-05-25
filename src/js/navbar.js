import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInWithRedirect, signOut, GoogleAuthProvider } from "firebase/auth";

const loginText = document.querySelector('#login-text');
const signInBtn = document.querySelector('#sign-in');
const signOutBtn = document.querySelector('#sign-out');

// 鎖住所有按鈕與連結
document.querySelectorAll('button').forEach((btn) => {
    btn.disabled = true;
});
document.querySelectorAll('a').forEach((a) => {
    a.setAttribute('disabled', '');
});
document.querySelectorAll('.prefab button').forEach((btn) => {
    btn.disabled = false;
});
document.querySelectorAll('.prefab a').forEach((a) => {
    a.removeAttribute('disabled');
});

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
    // 解鎖所有按鈕與連結
    document.querySelectorAll('button').forEach((btn) => {
        btn.disabled = false;
    });
    document.querySelectorAll('a').forEach((a) => {
        a.removeAttribute('disabled');
    });
})

const provider = new GoogleAuthProvider();

signInBtn.addEventListener('click', async () => {
    await signInWithRedirect(auth, provider);
});

signOutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = "/";
});