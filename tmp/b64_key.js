const fs = require('fs');
const text = fs.readFileSync('.env', 'utf-8');
const match = text.match(/GOOGLE_PRIVATE_KEY="([^"]+)"/);
if (match) {
    const key = match[1];
    console.log(Buffer.from(key).toString('base64'));
} else {
    console.log("NOT FOUND");
}
