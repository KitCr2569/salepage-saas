import fs from 'fs';

const file = 'src/components/admin/SalesToolPages.tsx';
let content = fs.readFileSync(file, 'utf8');

// The AST script outputted t("thai", "english")
// We can replace it with: window?.localStorage?.getItem('hdg-locale') === 'en' ? "english" : "thai"
content = content.replace(/t\("([^"\n]*)",\s*"([^"\n]*)"\)/g, "(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? \"$2\" : \"$1\")");

// Also check for t('thai', 'english') just in case
content = content.replace(/t\('([^'\n]*)',\s*'([^'\n]*)'\)/g, "(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? '$2' : '$1')");

fs.writeFileSync(file, content);
console.log("Fixed t calls in SalesToolPages.tsx");
