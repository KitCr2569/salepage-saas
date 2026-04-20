import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const dict = {
  "กลับไปหน้าหลัก": "Return to Home",
  "วิเคราะห์": "Analytics",
  "สถิติยอดขายและข้อมูลร้านค้า": "Sales statistics and store data",
  "วันนี้": "Today",
  "7 วัน": "7 Days",
  "30 วัน": "30 Days",
  "ทั้งหมด": "All time",
  "ยอดขาย": "Total Sales",
  "จำนวนออเดอร์": "Total Orders",
  "ยอดเฉลี่ย/ออเดอร์": "Average/Order",
  "📊 ยอดขายรายวัน": "📊 Daily Sales",
  "ออเดอร์": "Orders",
  "ไม่มีข้อมูลในช่วงนี้": "No data in this period",
  "🏆 สินค้ายอดนิยม": "🏆 Top Products",
  "ชิ้น": "Pieces",
  "ไม่มีข้อมูลสินค้า": "No product data"
};

const project = new Project();
project.addSourceFilesAtPaths("src/components/admin/AdminAnalytics.tsx");

const srcFile = project.getSourceFileOrThrow("src/components/admin/AdminAnalytics.tsx");

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
            let eng = dict[trimText];
            if (eng) {
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
        if (/[\u0E00-\u0E7F]/.test(text)) {
            let eng = dict[text];
            if (eng) {
                // If it's a property assignment like label: 'วันนี้'
                const parent = node.getParent();
                if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
		    node.replaceWithText(`(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "${eng}" : "${text}")`);
		} else if (parent && parent.getKind() === SyntaxKind.JsxAttribute) {
                    node.replaceWithText(`{(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "${eng}" : "${text}")}`);
                }
            }
        }
    } else {
        node.forEachChild(processNode);
    }
}

srcFile.forEachChild(processNode);
srcFile.saveSync();
console.log("Analytics translated.");
