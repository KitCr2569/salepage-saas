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

replaceFile('src/components/admin/AdminUnifiedChat.tsx', [
    [`const res = await fetch(\`/api/chat/inbox?\${params.toString()}\`, {
                headers: { Authorization: \`Bearer \${token}\` },
            });`, `const res = await fetch(\`/api/chat/inbox?\${params.toString()}\`, {
                headers: { Authorization: \`Bearer \${token}\` },
                cache: 'no-store',
            });`]
]);
