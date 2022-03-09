import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

var firebaseConfig = {
    apiKey: "AIzaSyBcOgvoBMGm_t6UMjzLvWY1cp1Q5LsbubU",
    authDomain: "potato-bca49.firebaseapp.com",
    databaseURL: "https://potato-bca49-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "potato-bca49",
    storageBucket: "potato-bca49.appspot.com",
    messagingSenderId: "1025456188307",
    appId: "1:1025456188307:web:540bb94a47221fce975666",
    measurementId: "G-585JHJPWQC"
};

initializeApp(firebaseConfig);

export const firestore = getFirestore();
export const auth = getAuth();