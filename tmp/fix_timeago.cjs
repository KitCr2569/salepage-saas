const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        text = text.replace(search, replace);
    }
    fs.writeFileSync(path, text);
    console.log('Fixed', path);
}

replaceFile('src/components/chat/inbox/InboxPanel.tsx', [
    [`function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return (typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "Just a moment ago" : "เมื่อสักครู่");
    if (diff < 3600) return \`\${Math.floor(diff / 60)} นาที\`;
    if (diff < 86400) return \`\${Math.floor(diff / 3600)} ชม.\`;
    if (diff < 604800) return \`\${Math.floor(diff / 86400)} วัน\`;
    return date.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}`, `function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    const isEn = typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en';

    if (diff < 60) return isEn ? "Just now" : "เมื่อสักครู่";
    if (diff < 3600) return isEn ? \`\${Math.floor(diff / 60)} min\` : \`\${Math.floor(diff / 60)} นาที\`;
    if (diff < 86400) return isEn ? \`\${Math.floor(diff / 3600)} hr\` : \`\${Math.floor(diff / 3600)} ชม.\`;
    if (diff < 604800) return isEn ? \`\${Math.floor(diff / 86400)} days\` : \`\${Math.floor(diff / 86400)} วัน\`;
    return date.toLocaleDateString(isEn ? 'en-US' : 'th-TH', { month: 'short', day: 'numeric' });
}`]
]);

