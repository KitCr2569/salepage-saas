const fs = require('fs');

let code = fs.readFileSync('src/components/admin/AdminFacebookTools.tsx', 'utf8');

code = code.replace(
    /`\$\{diffMins\} นาทีที่แล้ว`/g,
    '`${diffMins} ${typeof window !== \'undefined\' && window.localStorage.getItem(\'hdg-locale\') === \'en\' ? \'mins ago\' : \'นาทีที่แล้ว\'}`'
);

code = code.replace(
    /`\$\{diffHours\} ชม\.ที่แล้ว`/g,
    '`${diffHours} ${typeof window !== \'undefined\' && window.localStorage.getItem(\'hdg-locale\') === \'en\' ? \'hours ago\' : \'ชม.ที่แล้ว\'}`'
);

code = code.replace(
    /`\$\{diffDays\} วันที่แล้ว`/g,
    '`${diffDays} ${typeof window !== \'undefined\' && window.localStorage.getItem(\'hdg-locale\') === \'en\' ? \'days ago\' : \'วันที่แล้ว\'}`'
);

fs.writeFileSync('src/components/admin/AdminFacebookTools.tsx', code);
console.log('Replaced AdminFacebookTools time strings');
