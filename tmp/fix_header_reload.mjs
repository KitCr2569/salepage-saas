import fs from 'fs';
let code = fs.readFileSync('src/components/Header.tsx', 'utf8');

code = code.replace(
    /import\("@\/store\/useLocaleStore"\).then\(m => m.useLocaleStore.getState\(\).setLocale\(newLang\)\);/g,
    `import("@/store/useLocaleStore").then(m => m.useLocaleStore.getState().setLocale(newLang)); setTimeout(() => window.location.reload(), 50);`
);

fs.writeFileSync('src/components/Header.tsx', code);
console.log('Fixed Header reload');
