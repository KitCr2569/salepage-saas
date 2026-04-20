const fs = require('fs');

const files = [
    'src/components/chat/orders/CreateOrderModal.tsx',
    'src/components/chat/orders/OrdersPanel.tsx',
    'src/components/chat/settings/SettingsPanel.tsx',
    'src/components/chat/inbox/InboxPanel.tsx',
    'src/components/admin/AdminFacebookTools.tsx',
    'src/components/admin/AdminUpgrade.tsx',
];

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let text = fs.readFileSync(file, 'utf8');
    
    // Add import if missing
    if (!text.includes('useLocaleStore')) {
        text = text.replace(/import .*?from ["'][^"']+["'];[\r\n]/, (match) => {
            return match + `import { useLocaleStore } from "@/store/useLocaleStore";\n`;
        });
    }

    // Add hook call inside component
    // Need to find the main react component or any exported default function.
    // We can do a string search for `export default function ` and insert it right after the `{`
    text = text.replace(/(export default function [a-zA-Z0-9_]+\s*\([^)]*\)\s*\{)/g, (match) => {
        if (!text.includes('useLocaleStore((s) => s.locale)')) {
            return match + `\n    const _localeTrigger = useLocaleStore((s) => s.locale); // Force re-render on translation change\n`;
        }
        return match;
    });

    // Also replace `typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en'` with exactly `_localeTrigger === 'en'`
    text = text.replace(/typeof window !== ['"]undefined['"] && window\.localStorage\.getItem\(['"]hdg-locale['"]\) === ['"]en['"]/g, "_localeTrigger === 'en'");

    fs.writeFileSync(file, text);
    console.log(`Updated reactivity for ${file}`);
}
