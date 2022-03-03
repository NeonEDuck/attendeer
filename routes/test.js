import { Router } from "express";
const router = Router();
import { addData, getData } from "../api/test.js"

/* GET home page. */
router.get('/get', async (req, res, next) => {
    let snapshot = await getData();
    let text = "";
    snapshot.forEach((doc) => {
        text += `<p>${doc.id} => { abc: ${doc.data()["abc"]}, cde: ${doc.data()["cde"]} }</p>`;
    });

    res.send(text);
});

router.get('/add', async (req, res, next) => {
    let data = {
        abc: "123123",
        cde: "212312"
    };
    await addData(data);

    res.send("Add one data");
});

export default router;