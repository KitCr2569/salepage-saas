import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const dict = {
  "วิเคราะห์ลูกค้า": "Customer Analysis",
  "ข้อมูลพฤติกรรมและสถิติลูกค้าทั้งหมด": "Customer behavior and statistics data",
  "ลูกค้าทั้งหมด": "All Customers",
  "แอคทีฟวันนี้": "Active Today",
  "ข้อความเฉลี่ย": "Avg Messages",
  "ค้นหาลูกค้า...": "Search customers...",
  "ล่าสุด": "Latest",
  "ข้อความมากสุด": "Most Messages",
  "กำลังโหลด...": "Loading...",
  "ไม่พบลูกค้า": "No customers found",
  "กลับไปเครื่องมือเพิ่มยอดขาย": "Back to Sales Tools",
  "ไม่ทราบชื่อ": "Unknown",
  "Retarget ลูกค้า": "Retarget Customers",
  "ส่งข้อความเฉพาะกลุ่มที่สนใจ": "Send message to specific interest groups",
  "สร้างกลุ่มใหม่": "Create New Group",
  "ชื่อกลุ่ม เช่น ลูกค้า VIP": "Group Name e.g. VIP Customers",
  "สร้าง": "Create",
  "ยกเลิก": "Cancel",
  "ลูกค้าที่ซื้อ 30 วันที่แล้ว": "Customers who purchased last 30 days",
  "ลูกค้าที่ไม่ active 7 วัน": "Customers inactive for 7 days",
  "ลูกค้าใหม่ยังไม่ได้ซื้อ": "New customers without purchase",
  "คน": "people",
  "ยังไม่เคยส่ง": "Never sent",
  "ส่งล่าสุด:": "Last sent:",
  "กำลังส่ง...": "Sending...",
  "ส่งข้อความ": "Send Message",
  "ตั้งเวลาโพสต์": "Scheduled Posting",
  "ตั้งเวลาโพสต์ Facebook อัตโนมัติ": "Schedule automatic Facebook posts",
  "สร้างโพสต์": "Create Post",
  "เขียนเนื้อหาโพสต์...": "Write post content...",
  "ตั้งเวลา": "Schedule",
  "ยังไม่มีโพสต์ที่ตั้งเวลาไว้": "No scheduled posts yet",
  "กดปุ่ม \"สร้างโพสต์\" เพื่อเริ่มต้น": "Click \"Create Post\" to start",
  "เผยแพร่แล้ว": "Published",
  "ล้มเหลว": "Failed",
  "รอเผยแพร่": "Pending",
  "ส่ง Email ถึงลูกค้าที่ซื้อแล้ว": "Send Email to purchased customers",
  "สร้างแคมเปญ": "Create Campaign",
  "หัวข้อ Email เช่น โปรโมชั่นพิเศษ!": "Email subject e.g. Special Promotion!",
  "ยังไม่มีแคมเปญ Email": "No Email Campaigns yet",
  "สร้างแคมเปญแรกเพื่อส่ง Email ถึงลูกค้า": "Create first campaign to send emails",
  "ส่งแล้ว": "Sent",
  "เปิดอ่าน": "Read",
  "รอส่ง": "Scheduled",
  "แบบร่าง": "Draft",
  "แก้ไข": "Edit",
  "แนะนำสินค้าที่เกี่ยวข้องอัตโนมัติ": "Automatically recommend related products",
  "สร้างกฎใหม่": "Create New Rule",
  "เมื่อลูกค้าซื้อสินค้า A → แนะนำสินค้า B": "When customer buys Product A → Recommend Product B",
  "สินค้า A (Trigger)": "Product A (Trigger)",
  "สินค้า B (แนะนำ)": "Product B (Recommend)",
  "ยังไม่มีกฎ Cross-sell": "No Cross-sell rules yet",
  "สร้างกฎเพื่อแนะนำสินค้าอัตโนมัติเมื่อลูกค้าซื้อสินค้า": "Create rule to auto-recommend when buying"
};

const project = new Project();
project.addSourceFilesAtPaths("src/components/admin/SalesToolPages.tsx");

const srcFile = project.getSourceFileOrThrow("src/components/admin/SalesToolPages.tsx");

// Add Trans import at top
if (!srcFile.getImportDeclaration(d => d.getModuleSpecifierValue() === '@/components/Trans')) {
    srcFile.addImportDeclaration({
        namedImports: ['Trans'],
        moduleSpecifier: '@/components/Trans'
    });
}

function processNode(node) {
    if (node.getKind() === SyntaxKind.JsxText) {
        const text = node.getText();
        const trimText = text.trim();
        if (/[\u0E00-\u0E7F]/.test(trimText)) {
            // Check dictionary
            let eng = dict[trimText];
            if (eng) {
                // If it contains only the thai string exactly
                if (text === trimText) {
                    node.replaceWithText(`{<Trans th="${trimText}" en="${eng}" />}`);
                } else {
                    // It has surrounding spaces/newlines, we construct `<Trans... />` inside them
                    const before = text.substring(0, text.indexOf(trimText));
                    const after = text.substring(text.indexOf(trimText) + trimText.length);
                    node.replaceWithText(`${before}<Trans th="${trimText}" en="${eng}" />${after}`);
                }
            } else if (trimText === "กลับไปเครื่องมือเพิ่มยอดขาย") {
              node.replaceWithText(`{<Trans th="กลับไปเครื่องมือเพิ่มยอดขาย" en="Back to Sales Tools" />}`);
            }
        }
    } else if (node.getKind() === SyntaxKind.StringLiteral) {
        const text = node.getLiteralText();
        if (/[\u0E00-\u0E7F]/.test(text)) {
            let eng = dict[text];
            if (eng) {
                // Determine context. If it's inside JsxAttribute (like placeholder="...")
                const parent = node.getParent();
                if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
                    node.replaceWithText(`{t("${text}", "${eng}")}`);
                } else if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
		    node.replaceWithText(`t("${text}", "${eng}")`);
		}
            }
        }
    } else {
        node.forEachChild(processNode);
    }
}

srcFile.forEachChild(processNode);
srcFile.saveSync();
console.log("Done");
