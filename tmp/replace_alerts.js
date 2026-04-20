const fs = require('fs');
const path = require('path');

const files = [
  "src/app/order/[id]/page.tsx",
  "src/components/admin/AdminBroadcast.tsx",
  "src/components/admin/AdminChatbot.tsx",
  "src/app/checkout/page.tsx",
  "src/components/chat/ChatPanel.tsx",
  "src/components/admin/AdminOrders.tsx",
  "src/components/admin/AdminProducts.tsx",
  "src/components/admin/AdminSalePage.tsx"
];

for (const file of files) {
    const fullPath = path.join(__dirname, '..', file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');

        // Add import if not exists
        if (!content.includes("import Swal from 'sweetalert2'")) {
            // Find the last import line
            const importLines = content.split('\n').filter(line => line.startsWith('import '));
            if (importLines.length > 0) {
                const lastImport = importLines[importLines.length - 1];
                content = content.replace(lastImport, lastImport + "\nimport Swal from 'sweetalert2';");
            } else {
                content = "import Swal from 'sweetalert2';\n" + content;
            }
        }

        // Extremely simple replacement that handles our specific cases.
        // We replace alert("...") or alert(`...`) or alert(...) with Swal.fire(...)
        content = content.replace(/alert\((['"`])(.*?)['"`]\)/g, "Swal.fire({ text: $1$2$1, icon: 'info' })");
        
        // Handle alert with variables (e.g. alert(e.message))
        content = content.replace(/alert\(([^'"`][^\)]*)\)/g, "Swal.fire({ text: String($1), icon: 'info' })");

        // Some specific replacements based on the content (like SUCCESS / ERROR)
        content = content.replace(/icon: 'info' \}\)/g, (match, offset, str) => {
            const before = str.substring(offset - 60, offset);
            if (before.includes('❌') || before.includes('Error') || before.includes('ไม่สำเร็จ') || before.includes('ล้มเหลว') || before.includes('เกินไป')) {
                return "icon: 'error' })";
            }
            if (before.includes('✅') || before.includes('สำเร็จ')) {
                return "icon: 'success' })";
            }
            if (before.includes('⚠️')) {
                return "icon: 'warning' })";
            }
            return match;
        });

        fs.writeFileSync(fullPath, content);
        console.log(`Replaced alerts in ${file}`);
    }
}
