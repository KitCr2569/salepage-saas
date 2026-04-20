const fs = require('fs');
const glob = require('glob');
const files = glob.sync('src/components/**/*.tsx');
let remaining = [];

for (let file of files) {
  if (file.includes('Trans.tsx')) continue;
  let text = fs.readFileSync(file, 'utf8');
  
  // Clean multiline Trans component manually if there are many formatting
  text = text.replace(/<Trans\s+th=\{?[^}]*\}?\s+en=\{?[^}]*\}?\s*\/>/g, '');
  text = text.replace(/<Trans\s+th="[^"]*"\s+en="[^"]*"\s*\/>/g, '');
  text = text.replace(/typeof window !== 'undefined' && window\.localStorage\.getItem\('hdg-locale'\) === 'en' \? '[^']*' : '[^']*'/g, '');
  text = text.replace(/typeof window !== 'undefined' \? 'en' : 'th'/g, '');

  if (/[\u0E00-\u0E7F]/.test(text)) {
    remaining.push(file);
  }
}
console.log(remaining.join('\n'));
