import fs from 'fs';
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

code = code.replace(
    /onClick=\{\(\) => setLocale\(locale === 'th' \? 'en' : 'th'\)\}/g,
    `onClick={() => { setLocale(locale === 'th' ? 'en' : 'th'); setTimeout(() => window.location.reload(), 50); }}`
);

fs.writeFileSync('src/app/admin/page.tsx', code);
console.log('Fixed admin page reload');
