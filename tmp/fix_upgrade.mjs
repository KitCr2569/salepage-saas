import fs from 'fs';
import { Project, SyntaxKind } from 'ts-morph';

const project = new Project();
project.addSourceFilesAtPaths("src/components/admin/AdminUpgrade.tsx");
project.addSourceFilesAtPaths("src/components/admin/AdminChatbot.tsx");

const dict = {
    '✅ ขายสินค้า 10 รายการ': '✅ Sell 10 items',
    '✅ รับออเดอร์ไม่จำกัด': '✅ Unlimited orders',
    '✅ แชท Messenger': '✅ Messenger Chat',
    '✅ เซลเพจพื้นฐาน': '✅ Basic Sale Page',
    '❌ บรอดแคสต์ (จำกัด 100 คน/วัน)': '❌ Broadcast (Limit 100/day)',
    '❌ AI Chatbot': '❌ AI Chatbot',
    '❌ วิเคราะห์ขั้นสูง': '❌ Advanced Analytics',
    
    '✅ ขายสินค้าไม่จำกัด': '✅ Unlimited items',
    '✅ แชท Messenger + LINE': '✅ Messenger + LINE Chat',
    '✅ เซลเพจ Premium': '✅ Premium Sale Page',
    '✅ บรอดแคสต์ไม่จำกัด': '✅ Unlimited Broadcast',
    '✅ คูปองส่วนลด': '✅ Discount Coupons',
    
    '✅ ทุกอย่างใน โปร': '✅ Everything in Pro',
    '✅ TikTok Shop Integration': '✅ TikTok Shop Integration',
    '✅ Retarget ลูกค้า': '✅ Customer Retargeting',
    '✅ Email Marketing': '✅ Email Marketing',
    '✅ หลายร้านค้า': '✅ Multiple stores',
    '✅ API ส่วนตัว': '✅ Private API',
    '✅ ซัพพอร์ตเฉพาะ': '✅ Dedicated support',
    
    'ฟรี': 'Free',
    '✅ ใช้งานอยู่': '✅ Active',
    'เลือกแพ็กเกจนี้': 'Select this plan',
    
    'ดูสินค้าทั้งหมด': 'View all items',
    'ติดต่อแอดมิน': 'Contact Admin',
    'โปรโมชั่น': 'Promotions'
};

function tReplacer(text, eng) {
    return `(typeof window !== 'undefined' && window.localStorage.getItem('hdg-locale') === 'en' ? '${eng}' : '${text}')`;
}

project.getSourceFiles().forEach(file => {
    let modified = false;
    file.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.StringLiteral || node.getKind() === SyntaxKind.NoSubstitutionTemplateLiteral) {
            const text = node.getLiteralText ? node.getLiteralText() : node.getText();
            if (dict[text]) {
                const parent = node.getParent();
                if (parent && (parent.getKind() === SyntaxKind.ArrayLiteralExpression || 
                               parent.getKind() === SyntaxKind.BinaryExpression ||
                               parent.getKind() === SyntaxKind.ConditionalExpression)) {
                   node.replaceWithText(tReplacer(text, dict[text]));
                   modified = true;
                }
            }
        }
    });
    if (modified) {
        file.saveSync();
        console.log("Updated", file.getBaseName());
    }
});
