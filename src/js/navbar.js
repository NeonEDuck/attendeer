import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signOut, GoogleAuthProvider } from "firebase/auth";

const profile    = document.querySelector('#navbar-profile');
const profilePic = document.querySelector('#navbar-profile__picture');
const loginText  = document.querySelector('#login-text');
const signInBtn  = document.querySelector('#sign-in');
const signOutBtn = document.querySelector('#sign-out');

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

    const provider = new GoogleAuthProvider();

    signInBtn.addEventListener('click', async () => {
        window.location.href = `/login${window.location.pathname}`;
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
}