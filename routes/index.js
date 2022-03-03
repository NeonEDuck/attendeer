import {Router} from "express";
let router = Router();

/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index');
});

export default router;