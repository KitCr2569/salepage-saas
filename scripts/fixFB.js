const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'src', 'app', 'api');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let originalContent = content;

            // Only process if it has process.env.PAGE_ACCESS_TOKEN and doesn't have getFacebookPageConfig
            if (content.includes('process.env.PAGE_ACCESS_TOKEN') && !content.includes('getFacebookPageConfig') && !content.includes('await prisma.channel.findFirst')) {
                
                // Add Import
                let importStatement = "import { getFacebookPageConfig } from '@/lib/facebook';\n";
                // find last import
                const lines = content.split('\n');
                let lastImportLine = -1;
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].startsWith('import ')) {
                        lastImportLine = i;
                    }
                }
                if (lastImportLine > -1) {
                    lines.splice(lastImportLine + 1, 0, importStatement);
                    content = lines.join('\n');
                } else {
                    content = importStatement + content;
                }

                // Replace the assignments
                content = content.replace(/(?:const|let)\s+pageAccessToken\s*=\s*.*?(?:META_)?PAGE_ACCESS_TOKEN.*?[;]?\r?\n/g, "");
                content = content.replace(/(?:const|let)\s+pageId\s*=\s*.*?(?:FACEBOOK_PAGE_ID|NEXT_PUBLIC_FACEBOOK_PAGE_ID).*?[;]?\r?\n/g, "");

                // Because each route usually starts reading them like:
                // if (!pageAccessToken || !pageId) 
                // or just uses pageAccessToken, we will inject before they first use `pageAccessToken` or `pageId`
                
                let replacedObj = { replaced: false };
                content = content.replace(/(\s*)(if\s*\(\!pageAccessToken.*?\)|const\s+.*?\s*=\s*await\s+fetch|let\s+url\s*=.*pageAccessToken|const\s+url\s*=.*pageAccessToken|await\s+fetch\s*\([^)]*pageAccessToken|console\.log\(['"`].*?PAGE_ACCESS_TOKEN[^)]*\))/g, (match, prefix, nextPart) => {
                    // Only replace the FIRST occurrence
                    if (!replacedObj.replaced) {
                        replacedObj.replaced = true;
                        return prefix + `const { pageAccessToken, pageId } = await getFacebookPageConfig();\n` + prefix + nextPart;
                    }
                    return match;
                });

                if (content !== originalContent) {
                    fs.writeFileSync(fullPath, content);
                    console.log("Updated", fullPath);
                }
            }
        }
    }
}
processDir(targetDir);
