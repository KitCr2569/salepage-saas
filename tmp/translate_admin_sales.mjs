import { Project, SyntaxKind } from 'ts-morph';
import fs from 'fs';

const project = new Project();
project.addSourceFilesAtPaths("src/components/admin/AdminSalesTools.tsx");

const file = project.getSourceFileOrThrow("src/components/admin/AdminSalesTools.tsx");

if (!file.getImportDeclaration(d => d.getModuleSpecifierValue() === '@/components/Trans')) {
    file.addImportDeclaration({
        namedImports: ['Trans'],
        moduleSpecifier: '@/components/Trans'
    });
}

function tReplacer(text, eng) {
    return `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? "${eng}" : "${text}")`;
}

function process(node) {
    if (node.getKind() === SyntaxKind.JsxText) {
        let text = node.getText().trim();
        if (text === "เครื่องมือเพิ่มยอดขาย") node.replaceWithText(`{<Trans th="เครื่องมือเพิ่มยอดขาย" en="Sales Tools" />}`);
        else if (text === "เครื่องมือช่วยโปรโมทและเพิ่มยอดขาย") node.replaceWithText(`{<Trans th="เครื่องมือช่วยโปรโมทและเพิ่มยอดขาย" en="Tools for promoting and increasing sales" />}`);
    } else if (node.getKind() === SyntaxKind.StringLiteral) {
        const text = node.getLiteralText();
        const parent = node.getParent();
        if (parent && parent.getKind() === SyntaxKind.PropertyAssignment) {
            if (text === "บรอดแคสต์") node.replaceWithText(tReplacer(text, "Broadcast"));
            else if (text === "ส่งข้อความถึงลูกค้าหลายคนพร้อมกัน") node.replaceWithText(tReplacer(text, "Mass messaging"));
            else if (text === "พร้อมใช้") node.replaceWithText(tReplacer(text, "Ready"));
            else if (text === "เครื่องมือจัดการ Facebook Page") node.replaceWithText(tReplacer(text, "Facebook Page Management"));
            else if (text === "คูปองส่วนลด") node.replaceWithText(tReplacer(text, "Discount Coupons"));
            else if (text === "สร้างและจัดการคูปองลดราคา") node.replaceWithText(tReplacer(text, "Create and manage coupons"));
            else if (text === "วิเคราะห์ลูกค้า") node.replaceWithText(tReplacer(text, "Customer Analysis"));
            else if (text === "ดูข้อมูลพฤติกรรมการซื้อ") node.replaceWithText(tReplacer(text, "View purchase behavior"));
            else if (text === "ส่งข้อความเฉพาะกลุ่มที่สนใจ") node.replaceWithText(tReplacer(text, "Retarget specific groups"));
            else if (text === "ตั้งเวลาโพสต์ Facebook อัตโนมัติ") node.replaceWithText(tReplacer(text, "Auto-schedule FB Posts"));
            else if (text === "ตั้งเวลาโพสต์") node.replaceWithText(tReplacer(text, "Scheduled Posting"));
            else if (text === "ส่ง Email ถึงลูกค้าที่ซื้อแล้ว") node.replaceWithText(tReplacer(text, "Send emails to buyers"));
            else if (text === "แนะนำสินค้าที่เกี่ยวข้องอัตโนมัติ") node.replaceWithText(tReplacer(text, "Auto cross-sell products"));
        }
    } else {
        node.forEachChild(process);
    }
}

file.forEachChild(process);
file.saveSync();
console.log("Translated AdminSalesTools");
