import * as fs from 'fs';

function fixFile(file: string, replacements: {from: RegExp, to: string}[]) {
    if (!fs.existsSync(file)) return;
    let content = fs.readFileSync(file, 'utf8');
    for (const {from, to} of replacements) {
        content = content.replace(from, to);
    }
    fs.writeFileSync(file, content);
}

fixFile('src/components/admin/AdminPayment.tsx', [
    { from: /"เสร็จ"/g, to: '&quot;เสร็จ&quot;' }
]);

fixFile('src/components/chat/settings/SettingsPanel.tsx', [
    { from: /"ตรวจสอบ\/แก้ไข"/g, to: '&quot;ตรวจสอบ/แก้ไข&quot;' },
    { from: /"เสร็จ"/g, to: '&quot;เสร็จ&quot;' }
]);

console.log('Fixed more quotes');
