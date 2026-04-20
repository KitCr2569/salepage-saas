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

async function run() {
    const project = new Project();
    project.addSourceFilesAtPaths("src/components/admin/*.tsx");

    const files = project.getSourceFiles();

    for (const file of files) {
        let changed = false;
        
        // Use regex for simpler global string replacement instead of deep JSX AST parsing which can fail
        let content = file.getFullText();
        
        // Find all Thai substrings
        const thaiMatches = Array.from(new Set(content.match(/[\u0E00-\u0E7F]+/g) || []));
        if (thaiMatches.length === 0) continue;

        console.log(`Processing ${file.getBaseName()} - ${thaiMatches.length} strings`);
        
        // For each JSX text line containing Thai
        const jsxTextRegex = />([^<]*?[\u0E00-\u0E7F]+[^<]*?)</g;
        let match;
        let replacements = [];
        while ((match = jsxTextRegex.exec(content)) !== null) {
            const original = match[1];
            if (!original.trim()) continue;
            const translated = await translateText(original.trim());
            replacements.push({
                old: `>${original}<`,
                new: `><Trans th="${original.trim()}" en="${translated.replace(/"/g, '&quot;')}" /><`
            });
        }

        // Replace attributes like tooltip="ภาษาไทย" or placeholder="ค้นหา"
        const attrRegex = /([a-zA-Z0-9_]+)="([^"]*?[\u0E00-\u0E7F]+[^"]*?)"/g;
        while ((match = attrRegex.exec(content)) !== null) {
            const attrName = match[1];
            if (attrName === "th" || attrName === "en") continue;
            const original = match[2];
            const translated = await translateText(original);
            replacements.push({
                old: `${attrName}="${original}"`,
                new: `${attrName}={t("${original}", "${translated.replace(/"/g, '\\"')}")}`
            });
        }

        // Apply replacements
        let newContent = content;
        for (const rep of Object.values(replacements.reduce((a,c)=>({...a, [c.old]:c}), {}))) {
            newContent = newContent.replaceAll(rep.old, rep.new);
        }

        if (newContent !== content) {
            // Add imports if they don't exist
            if (!newContent.includes('Trans') && newContent.includes('<Trans')) {
                newContent = `import { Trans } from '@/components/Trans';\n` + newContent;
            }
            if (!newContent.includes('useT') && newContent.includes('{t(')) {
                newContent = `import { useT } from '@/components/Trans';\n` + newContent;
                // Add const t = useT() to the component... bit hacky with regex
                newContent = newContent.replace(/export function ([^\(]+)\(([^\)]*)\)\s*\{/g, "export function $1($2) {\n    const t = useT();");
                newContent = newContent.replace(/export default function ([^\(]+)\(([^\)]*)\)\s*\{/g, "export default function $1($2) {\n    const t = useT();");
            }
            fs.writeFileSync(file.getFilePath(), newContent);
            console.log(`Updated ${file.getBaseName()}`);
        }
    }
}

run();
