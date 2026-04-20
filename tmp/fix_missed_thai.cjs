const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        text = text.replace(search, replace);
    }
    fs.writeFileSync(path, text);
    console.log('Fixed', path);
}

replaceFile('src/components/admin/AdminPayment.tsx', [
    [/<p className="text-sm font-medium text-gray-800">\{method\.name\}<\/p>[\s\S]*?<p className="text-xs text-gray-400">\{method\.nameEn\}<\/p>/, 
     '<p className="text-sm font-medium text-gray-800">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? method.nameEn : method.name}</p>']
]);

replaceFile('src/components/admin/AdminShipping.tsx', [
    [/<p className="font-bold text-gray-800">\{method\.name\}<\/p>[\s\S]*?<p className="text-xs text-gray-500">\{method\.nameEn\}<\/p>/, 
     '<p className="font-bold text-gray-800">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? method.nameEn : method.name}</p>']
]);

replaceFile('src/components/admin/AdminProducts.tsx', [
    [/\{reorderMode \? "💾 บันทึกลำดับ" : "จัดลำดับสินค้า"\}/, 
     '{reorderMode ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "💾 Save Order" : "💾 บันทึกลำดับ") : (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "⇅ Sort Products" : "จัดลำดับสินค้า")}']
]);

replaceFile('src/components/admin/AdminOrders.tsx', [
    [/\{selectedIds\.size === filtered\.length && filtered\.length > 0 \? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"\}/g, 
     '{selectedIds.size === filtered.length && filtered.length > 0 ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "Deselect All" : "ยกเลิกเลือกทั้งหมด") : (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "Select All" : "เลือกทั้งหมด")}']
]);

replaceFile('src/components/admin/AdminUnifiedChat.tsx', [
    [/\{isFullscreen \? '🗗 ย่อ' : '⛶ เต็มจอ'\}/, 
     '{isFullscreen ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "🗗 Restore" : "🗗 ย่อ") : (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "⛶ Fullscreen" : "⛶ เต็มจอ")}']
]);
