import fs from 'fs';
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.tsx");

project.getSourceFiles().forEach(file => {
    let modified = false;
    // Replace 'th-TH' with dynamic locale resolver
    if (file.getFullText().includes("'th-TH'") || file.getFullText().includes('"th-TH"')) {
        let text = file.getFullText();
        text = text.replace(/'th-TH'/g, `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH')`);
        text = text.replace(/"th-TH"/g, `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? 'en-US' : 'th-TH')`);
        fs.writeFileSync(file.getFilePath(), text);
        console.log("Updated th-TH in", file.getBaseName());
    }

    // Now look for formatTime from InboxPanel
    // like `${diffHours} ชม.`
});
