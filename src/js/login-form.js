import { auth } from './firebase-config.js';
import { signInWithRedirect, signOut, GoogleAuthProvider } from 'firebase/auth';

const signInBtn = document.querySelector('#sign-in');
const signOutBtn = document.querySelector('#sign-out');

const provider = new GoogleAuthProvider();

signInBtn.addEventListener('click', async () => {
    await signInWithRedirect(auth, provider);
    // window.location.href = '/login';
});

signOutBtn.addEventListener('click', async () => {
    await signOut(auth);
    // window.location.href = '/logout';
});