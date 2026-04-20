const fs = require('fs');
let c = fs.readFileSync('src/components/admin/AdminFacebookTools.tsx', 'utf8');

c = c.replace(/title: \(typeof window !== 'undefined'.+?"Retrieve Inbox information" : "ดึงข้อมูล Inbox"\),/g, 'title: <Trans th="ดึงข้อมูล Inbox" en="Retrieve Inbox information" />,');
c = c.replace(/subtitle: \(typeof window !== 'undefined'.+?"View messages from the fan page message box." : "ดูข้อความจากกล่องข้อความแฟนเพจ"\),/g, 'subtitle: <Trans th="ดูข้อความจากกล่องข้อความแฟนเพจ" en="View messages from the fan page message box." />,');

c = c.replace(/title: \(typeof window !== 'undefined'.+?"Pull post comments" : "ดึงคอมเมนต์โพสต์"\),/g, 'title: <Trans th="ดึงคอมเมนต์โพสต์" en="Pull post comments" />,');
c = c.replace(/subtitle: \(typeof window !== 'undefined'.+?"Extract name, message, number, email from comments" : "ดึงชื่อ, ข้อความ, เบอร์, อีเมลจากคอมเมนต์"\),/g, 'subtitle: <Trans th="ดึงชื่อ, ข้อความ, เบอร์, อีเมลจากคอมเมนต์" en="Extract name, message, number, email from comments" />,');

c = c.replace(/title: \(typeof window !== 'undefined'.+?"Random prize draw" : "สุ่มจับรางวัล"\),/g, 'title: <Trans th="สุ่มจับรางวัล" en="Random prize draw" />,');
c = c.replace(/subtitle: \(typeof window !== 'undefined'.+?"Randomly select lucky winners from comments." : "สุ่มเลือกผู้โชคดีจากคอมเมนต์"\),/g, 'subtitle: <Trans th="สุ่มเลือกผู้โชคดีจากคอมเมนต์" en="Randomly select lucky winners from comments." />,');

c = c.replace(/title: \(typeof window !== 'undefined'.+?"Find the page\/group ID" : "หา ID เพจ\/กลุ่ม"\),/g, 'title: <Trans th="หา ID เพจ/กลุ่ม" en="Find the page/group ID" />,');
c = c.replace(/subtitle: \(typeof window !== 'undefined'.+?"Find ID from Facebook URL" : "ค้นหา ID จาก URL ของ Facebook"\),/g, 'subtitle: <Trans th="ค้นหา ID จาก URL ของ Facebook" en="Find ID from Facebook URL" />,');

fs.writeFileSync('src/components/admin/AdminFacebookTools.tsx', c);
