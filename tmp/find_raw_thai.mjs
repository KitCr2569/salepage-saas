import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths("src/**/*.tsx");

let remainingRaw = [];

project.getSourceFiles().forEach(f => {
    if (f.getFilePath().includes('AutoTranslator')) return;

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
                    if (!isTransProp) {
                        remainingRaw.push({ file: f.getBaseName(), text: text, type: 'JsxText' });
                    }
                }
            } else if (node.getKind() === SyntaxKind.StringLiteral || node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
                const text = node.getLiteralText ? node.getLiteralText() : node.getText();
                if (/[\u0E00-\u0E7F]/.test(text)) {
                    const parentText = node.getParent().getText();
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
                                if (exp === 'toast' || exp.includes('.success') || exp.includes('.error') || exp === 'alert') {
                                    isTransProp = true; break; // ignore toasts and alerts
                                }
                            }
                            p = p.getParent();
                        }
                        if (!isTransProp) {
                            remainingRaw.push({ file: f.getBaseName(), text: text, type: 'String' });
                        }
                    }
                }
            }
        } catch (e) {}
    });
});

const unique = Array.from(new Set(remainingRaw.map(x => `${x.file}: ${x.text.replace(/\n/g, ' ')}`)));
console.log(`Found ${unique.length} raw Thai spots.`);
unique.forEach(x => console.log(x));
