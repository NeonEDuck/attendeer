import { Router } from 'express';
const router = Router();
import { addData, getData, checkIfAuthenticated } from '../api/test.js'

/* GET home page. */
router.get('/get', async (req, res) => {
    let snapshot = await getData();
    let text = '';
    snapshot.forEach((doc) => {
        text += `<p>${doc.id} => { abc: ${doc.data()['abc']}, cde: ${doc.data()['cde']} }</p>`;
    });

    res.send(text);
});

router.get('/add', async (req, res) => {
    let data = {
        abc: '123123',
        cde: '212312'
    };
    await addData(data);

    res.send('Add one data');
});

router.get('/auth', checkIfAuthenticated, async (_, res) => {
    return res.send('You have access');
});

export default router;