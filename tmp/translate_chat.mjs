import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import https from 'https';

async function translateText(text) {
    if (!text.trim()) return text;
    return new Promise((resolve) => {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=th&tl=en&dt=t&q=${encodeURIComponent(text)}`;
        const req = https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    let eng = json[0].map(x => x[0]).join('');
                    resolve(eng);
                } catch {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
        req.setTimeout(5000, () => resolve(null));
    });
}

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
    file.forEachDescendant(node => {
        try {
            if (node.getKind() === SyntaxKind.JsxText) {
                const text = node.getText();
                const trimText = text.trim();
                let isTransProp = false;
                let p = node.getParent();
                while(p && p.getKind() !== SyntaxKind.SourceFile) {
                    if (p.getKind() === SyntaxKind.JsxSelfClosingElement || p.getKind() === SyntaxKind.JsxOpeningElement) {
                        if (p.getTagNameNode && p.getTagNameNode().getText() === 'Trans') {
                            isTransProp = true; break;
                        }
                    }
                    p = p.getParent();
                }
                if (!isTransProp && /[\u0E00-\u0E7F]/.test(trimText) && dict[trimText]) {
                    const eng = dict[trimText].replace(/"/g, "'").replace(/\n/g, " ");
                    if (eng && eng !== trimText) {
                        hasTrans = true;
                        if (text === trimText) {
                            node.replaceWithText(`{<Trans th="${text}" en="${eng}" />}`);
                        } else {
                            const before = text.substring(0, text.indexOf(trimText));
                            const after = text.substring(text.indexOf(trimText) + trimText.length);
                            node.replaceWithText(`${before}<Trans th="${trimText}" en="${eng}" />${after}`);
                        }
                    }
                }
            } else if (node.getKind() === SyntaxKind.StringLiteral || node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
                const text = node.getLiteralText ? node.getLiteralText() : node.getText();
                let isTransProp = false;
                let parentText = node.getParent().getText();
                if (parentText.includes('hdg-locale') || parentText.includes("locale === 'en'") || parentText.includes('useLocaleStore')) {
                    isTransProp = true;
                } else {
                    let p = node.getParent();
                    while(p && p.getKind() !== SyntaxKind.SourceFile) {
                        if (p.getKind() === SyntaxKind.JsxSelfClosingElement || p.getKind() === SyntaxKind.JsxOpeningElement) {
                            if (p.getTagNameNode && p.getTagNameNode().getText() === 'Trans') {
                                isTransProp = true; break;
                            }
                        }
                        if (p.getKind() === SyntaxKind.CallExpression) {
                            const exp = p.getExpression().getText();
                            if (exp === 't' || exp.includes('.t')) {
                                isTransProp = true; break;
                            }
                        }
                        p = p.getParent();
                    }
                }
                
                if (!isTransProp && /[\u0E00-\u0E7F]/.test(text) && dict[text]) {
                    const eng = dict[text].replace(/"/g, "'").replace(/\n/g, " ");
                    if (eng && eng !== text) {
                        const parent = node.getParent();
                        if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
		                    node.replaceWithText(tReplacer(text, eng));
		                } else if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
                            if (!node.getText().startsWith('{')) {
                                node.replaceWithText(`{${tReplacer(text, eng)}}`);
                            } else {
                                node.replaceWithText(tReplacer(text, eng));
                            }
                        } else if (node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral || (parent && parent.getKind() === SyntaxKind.BinaryExpression)) {
                            // If it's something like "text " + var
                            node.replaceWithText(tReplacer(text, eng));
                        } else if (parent && parent.getKind() === SyntaxKind.CallExpression) {
                            node.replaceWithText(tReplacer(text, eng));
                        } else if (parent && parent.getKind() === SyntaxKind.ConditionalExpression) {
                            node.replaceWithText(tReplacer(text, eng));
                        } else {
                            // general string replace
                             node.replaceWithText(tReplacer(text, eng));
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

async function run() {
    console.log("Loading project for Chat components...");
    const project = new Project();
    project.addSourceFilesAtPaths("src/components/chat/**/*.tsx");
    // Add Dashboard and others remaining
    project.addSourceFilesAtPaths("src/components/BottomBar.tsx");
    project.addSourceFilesAtPaths("src/components/Header.tsx");
    project.addSourceFilesAtPaths("src/components/CartDrawer.tsx");
    project.addSourceFilesAtPaths("src/app/admin/page.tsx");
    project.addSourceFilesAtPaths("src/components/admin/AdminDashboard.tsx");

    const files = project.getSourceFiles();
    
    // Extract strings
    let thaiStrings = new Set();
    files.forEach(f => {
        f.forEachDescendant(node => {
            try {
                if (node.getKind() === SyntaxKind.JsxText) {
                    const text = node.getText().trim();
                    if (/[\u0E00-\u0E7F]/.test(text)) {
                        let isTransProp = false;
                        let p = node.getParent();
                        while(p && p.getKind() !== SyntaxKind.SourceFile) {
                            if (p.getKind() === SyntaxKind.JsxSelfClosingElement || p.getKind() === SyntaxKind.JsxOpeningElement) {
                                if (p.getTagNameNode && p.getTagNameNode().getText() === 'Trans') {
                                    isTransProp = true; break;
                                }
                            }
                            p = p.getParent();
                        }
                        if (!isTransProp) thaiStrings.add(text);
                    }
                } else if (node.getKind() === SyntaxKind.StringLiteral || node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
                    const text = node.getLiteralText ? node.getLiteralText() : node.getText();
                    if (/[\u0E00-\u0E7F]/.test(text)) {
                        let parentText = node.getParent().getText();
                        if (!parentText.includes('hdg-locale') && !parentText.includes("locale === 'en'") && !parentText.includes('useLocaleStore')) {
                            let isTransProp = false;
                            let p = node.getParent();
                            while(p && p.getKind() !== SyntaxKind.SourceFile) {
                                if (p.getKind() === SyntaxKind.JsxSelfClosingElement || p.getKind() === SyntaxKind.JsxOpeningElement) {
                                    if (p.getTagNameNode && p.getTagNameNode().getText() === 'Trans') {
                                        isTransProp = true; break;
                                    }
                                }
                                if (p.getKind() === SyntaxKind.CallExpression) {
                                    const exp = p.getExpression().getText();
                                    if (exp === 't' || exp.includes('.t')) {
                                        isTransProp = true; break;
                                    }
                                }
                                p = p.getParent();
                            }
                            if (!isTransProp) thaiStrings.add(text);
                        }
                    }
                }
            } catch(e) {}
        });
    });

    const strings = Array.from(thaiStrings);
    console.log(`Found ${strings.length} raw strings.`);
    
    let dict = {};
    if (fs.existsSync('tmp/chat_dict.json')) {
        dict = JSON.parse(fs.readFileSync('tmp/chat_dict.json', 'utf8'));
    }

    let toTranslate = strings.filter(s => !dict[s]);
    console.log(`Translating ${toTranslate.length} missing strings sequentially...`);
    
    let count = 0;
    for (const text of toTranslate) {
        const res = await translateText(text);
        if (res) {
            dict[text] = res;
        } else {
            dict[text] = text;
        }
        count++;
        if (count % 10 === 0) {
            console.log(`Translated ${count}/${toTranslate.length}`);
            fs.writeFileSync('tmp/chat_dict.json', JSON.stringify(dict, null, 2));
        }
    }
    fs.writeFileSync('tmp/chat_dict.json', JSON.stringify(dict, null, 2));

    for (const file of files) {
        console.log("Applying to", file.getBaseName());
        try {
            processFile(file, dict);
        } catch (e) {
            console.error("Crash on", file.getBaseName(), e.message);
        }
    }
}
run();
