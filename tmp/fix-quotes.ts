import * as fs from 'fs';
import * as path from 'path';

function fixQuotes(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(/กด "เพิ่ม\/แก้ไข" เพื่อแก้ไข/g, 'กด &quot;เพิ่ม/แก้ไข&quot; เพื่อแก้ไข');
    content = content.replace(/กด "ตรวจสอบ\/แก้ไข" เพื่อแก้ไข/g, 'กด &quot;ตรวจสอบ/แก้ไข&quot; เพื่อแก้ไข');
    fs.writeFileSync(filePath, content);
}

fixQuotes('src/components/admin/AdminPayment.tsx');
fixQuotes('src/components/chat/settings/SettingsPanel.tsx');

console.log('Fixed quotes');
