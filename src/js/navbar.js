import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "firebase/auth";
import './login-form.js'

const loginText = document.querySelector('#login-text');

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginText.innerHTML = user.uid;
    }
    else {
        loginText.innerHTML = 'You are not login!';
    }
})