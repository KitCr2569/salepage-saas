import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths("src/components/admin/*.tsx");

// Filter out already processed files
const processed = ['AdminBroadcast.tsx', 'AdminSalesTools.tsx', 'SalesToolPages.tsx', 'AdminAnalytics.tsx', 'AdminLogin.tsx'];
const files = project.getSourceFiles().filter(f => !processed.includes(f.getBaseName()));

let thaiStrings = new Set();
files.forEach(f => {
    f.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.JsxText || node.getKind() === SyntaxKind.StringLiteral) {
            let text = node.getKind() === SyntaxKind.JsxText ? node.getText().trim() : node.getLiteralText();
            if (/[\u0E00-\u0E7F]/.test(text)) {
                thaiStrings.add(text);
            }
        }
    });
});

fs.writeFileSync('tmp/remaining_thai.json', JSON.stringify(Array.from(thaiStrings), null, 2));
console.log(`Found ${thaiStrings.size} unique strings.`);
