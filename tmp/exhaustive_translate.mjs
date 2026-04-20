import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';
import https from 'https';

async function translateText(text) {
    if (!text.trim()) return text;
    // Simple fast proxy/google translate
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
        // Timeout
        req.setTimeout(5000, () => resolve(null));
    });
}

function tReplacer(text, eng) {
    // If it contains double quotes, use single quotes string
    if (eng.includes('"')) {
        return `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? '${eng}' : '${text}')`;
    }
    return `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "${eng}" : "${text}")`;
}

function processNodeSync(node, dict) {
    if (node.getKind() === SyntaxKind.JsxText) {
        const text = node.getText();
        const trimText = text.trim();
        if (/[\u0E00-\u0E7F]/.test(trimText) && dict[trimText]) {
            const eng = dict[trimText].replace(/"/g, "'");
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
            let eng = dict[text].replace(/"/g, "'");
            if (eng) {
                const parent = node.getParent();
                if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
		            node.replaceWithText(tReplacer(text, eng));
		        } else if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
                    node.replaceWithText(`{${tReplacer(text, eng)}}`);
                }
            }
        }
    } else {
        node.forEachChild(c => processNodeSync(c, dict));
    }
}

async function run() {
    console.log("Loading files...");
    const project = new Project();
    project.addSourceFilesAtPaths("src/components/admin/*.tsx");
    const processed = ['AdminBroadcast.tsx', 'AdminSalesTools.tsx', 'SalesToolPages.tsx', 'AdminAnalytics.tsx', 'AdminLogin.tsx', 'AdminDashboard.tsx'];
    const files = project.getSourceFiles().filter(f => !processed.includes(f.getBaseName()));

    const strings = JSON.parse(fs.readFileSync('tmp/remaining_thai.json', 'utf8'));
    let dict = {};
    if (fs.existsSync('tmp/thai_to_en_dict.json')) {
        dict = JSON.parse(fs.readFileSync('tmp/thai_to_en_dict.json', 'utf8'));
    }

    let toTranslate = strings.filter(s => !dict[s]);
    console.log(`Translating ${toTranslate.length} missing strings sequentially to avoid rate limits...`);
    
    let count = 0;
    for (const text of toTranslate) {
        const res = await translateText(text);
        if (res) {
            dict[text] = res;
        } else {
            // keep original if failed to avoid breaking
            dict[text] = text;
        }
        count++;
        if (count % 10 === 0) {
            console.log(`Translated ${count}/${toTranslate.length}`);
            fs.writeFileSync('tmp/thai_to_en_dict.json', JSON.stringify(dict, null, 2));
        }
    }
    fs.writeFileSync('tmp/thai_to_en_dict.json', JSON.stringify(dict, null, 2));

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
