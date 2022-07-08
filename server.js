const app = require('./app.js');

const PORT = 443;

app.listen(process.env.PORT || PORT, () => console.log(`server started`));