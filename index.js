import express from "express";
import "dotenv/config";

let PORT = 80;
let app = express();

// view engine

import nunjucks from "nunjucks";
nunjucks.configure('views', {
    autoescape: true,
    cache: false,
    express: app
})

app.set('views', './views');
app.set('view engine', 'njk');
app.engine('njk', nunjucks.render);

// router

import index from "./routes/index.js";
import test from "./routes/test.js";

app.use('/', index);
app.use('/test', test);

// listen

app.listen(PORT, () => {console.log(`> Listening on port ${PORT}`)});