import { collection, getDocs, addDoc } from "firebase/firestore";
import { Router } from "express";
import db from "../config.js";

export let addData = async (data) => {
    let col = collection(db, "user");
    await addDoc(col, data);
}

export let getData = () => {
    let col = collection(db, "user");
    return getDocs(col);
}