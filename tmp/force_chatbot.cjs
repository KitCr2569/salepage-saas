const fs = require('fs');
let f = 'src/components/admin/AdminChatbot.tsx';
let t = fs.readFileSync(f, 'utf8');

if (!t.includes('useLocaleStore')) {
    t = t.replace(/import .*?from ["'][^"']+["'];/, (m) => m + '\nimport { useLocaleStore } from "@/store/useLocaleStore";');
}

t = t.replace(/(export default function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/, (m) => {
    if (!t.includes('_localeTrigger')) {
        return m + '\n    const _localeTrigger = useLocaleStore((s) => s.locale);';
    }
    return m;
});

t = t.replace(/typeof window !== ['"]undefined['"] && window\.localStorage\.getItem\(['"]hdg-locale['"]\) === ['"]en['"]/g, "_localeTrigger === 'en'");

fs.writeFileSync(f, t);
console.log('Fixed AdminChatbot');
