const fs = require('fs');
const path = require('path');
const thaiRegex = /[\\u0E00-\\u0E7F]+/;

function scanDir(dir) {
    let files = [];
    for (const file of fs.readdirSync(dir)) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            files = files.concat(scanDir(fullPath));
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            files.push(fullPath);
        }
    }
    return files;
}

const files = scanDir('./src');
const uniqueStrings = new Set();

const stringLiteralRegex = new RegExp('(?:[\\"\\\'\\`](.*?[\\\\u0E00-\\\\u0E7F]+.*?)[\\"\\\'\\`])|(?:>([^<]*?[\\\\u0E00-\\\\u0E7F]+[^<]*?)<\\/)', 'g');

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = stringLiteralRegex.exec(content)) !== null) {
        let str = match[1];
        if (str === undefined) str = match[2];
        if (str) {
            str = str.trim();
            if (thaiRegex.test(str)) {
                uniqueStrings.add(str);
            }
        }
    }
}
console.log('Total unique Thai strings:', uniqueStrings.size);
fs.writeFileSync('tmp/thai-strings.json', JSON.stringify(Array.from(uniqueStrings), null, 2));
