import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

function tReplacer(text, eng) {
    if (eng.includes('"')) {
        return `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? '${eng}' : '${text}')`;
    }
    return `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "${eng}" : "${text}")`;
}

function processFile(file, dict) {
    let original = file.getFullText();
    if (!/[\u0E00-\u0E7F]/.test(original)) return false;

    let hasTrans = false;
    // We collect all node replacements first to apply them carefully, or just replace normally
    file.forEachDescendant(node => {
        try {
            if (node.getKind() === SyntaxKind.JsxText) {
                const text = node.getText();
                const trimText = text.trim();
                if (/[\u0E00-\u0E7F]/.test(trimText) && dict[trimText]) {
                    const eng = dict[trimText].replace(/"/g, "'").replace(/\n/g, " ");
                    if (eng && eng !== trimText) {
                        hasTrans = true;
                        if (text === trimText) {
                            node.replaceWithText(`{<Trans th="${trimText}" en="${eng}" />}`);
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
                    const eng = dict[text].replace(/"/g, "'").replace(/\n/g, " ");
                    if (eng && eng !== text) {
                        const parent = node.getParent();
                        if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
		                    node.replaceWithText(tReplacer(text, eng));
		                } else if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
                            node.replaceWithText(`{${tReplacer(text, eng)}}`);
                        }
                    }
                }
            }
        } catch (e) {
            // Ignore node error
        }
    });

    if (hasTrans && !file.getImportDeclaration(d => d.getModuleSpecifierValue() === '@/components/Trans')) {
        file.addImportDeclaration({
            namedImports: ['Trans'],
            moduleSpecifier: '@/components/Trans'
        });
    }

    try {
        file.saveSync();
        return true;
    } catch (e) {
        console.error("Failed to save", file.getBaseName());
        return false;
    }
}

function run() {
    console.log("Loading project...");
    const project = new Project();
    project.addSourceFilesAtPaths("src/components/admin/*.tsx");
    const processed = ['AdminBroadcast.tsx', 'AdminSalesTools.tsx', 'SalesToolPages.tsx', 'AdminAnalytics.tsx', 'AdminLogin.tsx', 'AdminDashboard.tsx'];
    const files = project.getSourceFiles().filter(f => !processed.includes(f.getBaseName()));

    const dict = JSON.parse(fs.readFileSync('tmp/thai_to_en_dict.json', 'utf8'));

    for (const file of files) {
        console.log("Processing", file.getBaseName());
        try {
            processFile(file, dict);
        } catch (e) {
            console.error("Crash on", file.getBaseName(), e.message);
        }
    }
}
run();
