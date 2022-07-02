import { auth } from "./firebase-config.js";
import { onAuthStateChanged, signInWithRedirect, GoogleAuthProvider } from "firebase/auth";

const provider = new GoogleAuthProvider();

onAuthStateChanged(auth, (user) => {
    if (!user) {
        signInWithRedirect(auth, provider);
    }
    else {
        window.location.href = window.location.pathname.match(/^\/login(.*)/i)[1];
    }
});