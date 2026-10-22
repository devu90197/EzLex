import fs from 'fs';
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('d:\\EzLex\\rent.pdf');
pdf(dataBuffer).then(function(data: any) {
    console.log(data.text);
}).catch(console.error);
