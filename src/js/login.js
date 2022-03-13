import { auth } from './firebase-config.js';
import { signInWithRedirect, signOut, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import Cookies from 'js-cookie';

const provider = new GoogleAuthProvider();

getRedirectResult(auth)
    .then(async (userCredential) => {
        if (!userCredential) {
            Cookies.set('referrer', document.referrer);
            await signInWithRedirect(auth, provider);
        };

        let idToken = await userCredential.user.getIdToken();
        console.log(idToken);

        fetch('/sessionLogin', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'CSRF-Token': Cookies.get('XSRF-TOKEN'),
            },
            body: JSON.stringify({ idToken }),
        })
        .then(() => {
            return signOut(auth);
        })
        .then(() => {
            let referrer = Cookies.get('referrer');
            Cookies.remove('referrer')
            window.location.replace(referrer || '/');
        });
    })
    .catch(async (error) => {
        console.log('RedirectResult::error:', error);
    });