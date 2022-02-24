import express from "express";
import nunjucks from "nunjucks";

let PORT = 80;
let app = express();

nunjucks.configure('views', {
    autoescape: true,
    cache: false,
    express: app
})

app.set('views', './views');
app.set('view engine', 'njk');
app.engine('njk', nunjucks.render);

import index from "./routes/index.js";
app.use('/', index);

app.listen(PORT, () => {console.log(`> Listening on port ${PORT}`)});