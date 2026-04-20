import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import https from 'https';

async function translateText(text) {
    if (!text.trim()) return text;
    return new Promise((resolve) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    resolve(json[0][0][0]);
                } catch {
                    resolve(text);
                }
            });
        }).on('error', () => resolve(text));
    });
}

function processNodeSync(node, dict) {
    if (node.getKind() === SyntaxKind.JsxText) {
        const text = node.getText();
        const trimText = text.trim();
        if (/[\u0E00-\u0E7F]/.test(trimText) && dict[trimText]) {
            const eng = dict[trimText];
            if (eng) {
                if (text === trimText) {
                    node.replaceWithText(`{<Trans th="${text}" en="${eng}" />}`);
                } else {
                    const before = text.substring(0, text.indexOf(trimText));
                    const after = text.substring(text.indexOf(trimText) + trimText.length);
                    node.replaceWithText(`${before}<Trans th="${trimText}" en="${eng}" />${after}`);
                }
            }
        }
    } else if (node.getKind() === SyntaxKind.StringLiteral) {
        const text = node.getLiteralText();
        if (/[\u0E00-\u0E7F]/.test(text) && dict[text]) {
            let eng = dict[text];
            if (eng) {
                const parent = node.getParent();
                if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
		    node.replaceWithText(`(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "${eng}" : "${text}")`);
		} else if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
                    node.replaceWithText(`{(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "${eng}" : "${text}")}`);
                }
            }
        }
    } else {
        node.forEachChild(c => processNodeSync(c, dict));
    }
}

async function run() {
    console.log("Extracting...");
    const project = new Project();
    project.addSourceFilesAtPaths("src/components/admin/*.tsx");
    const files = project.getSourceFiles().filter(f => !['SalesToolPages.tsx', 'AdminAnalytics.tsx'].includes(f.getBaseName()));

    let allThaiStrings = new Set();
    
    // First pass: gather all strings
    files.forEach(f => {
        const content = f.getFullText();
        const matches = content.match(/[\u0E00-\u0E7F]+/g) || [];
        matches.forEach(m => allThaiStrings.add(m));
    });

    const strings = Array.from(allThaiStrings);
    console.log(`Translating ${strings.length} strings in parallel chunks...`);
    
    const dict = {};
    const chunkSize = 20;
    for (let i = 0; i < strings.length; i += chunkSize) {
        const chunk = strings.slice(i, i + chunkSize);
        const results = await Promise.all(chunk.map(s => translateText(s)));
        chunk.forEach((s, idx) => dict[s] = results[idx]?.replace(/"/g, "'"));
    }

    console.log("Applying translations to AST...");
    
    for (const file of files) {
        let originalContent = file.getFullText();
        if (!/[\u0E00-\u0E7F]/.test(originalContent)) continue;
        
        if (!file.getImportDeclaration(d => d.getModuleSpecifierValue() === '@/components/Trans')) {
            file.addImportDeclaration({
                namedImports: ['Trans'],
                moduleSpecifier: '@/components/Trans'
            });
        }
        
        file.forEachChild(c => processNodeSync(c, dict));
        file.saveSync();
        console.log(`Updated ${file.getBaseName()}`);
    }
}

run();
