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

replaceFile('src/components/admin/AdminProducts.tsx', [
    [/\{cat\.name\}/g, '{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name}'],
    [/const catName = catList\.find\(\(c\) => c\.id === catId\)\?\.name \|\| catId;/g, 'const cat = catList.find((c) => c.id === catId); const catName = cat ? (typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? (cat.nameEn || cat.name) : cat.name) : catId;'],
]);

replaceFile('src/components/admin/AdminOrders.tsx', [
    [/<option value="all">\{\<Trans th="ทั้งหมด \(" en="all \(" \/>\}\{orders\.length\}\)<\/option>/g, '<option value="all">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? "All (" : "ทั้งหมด ("}{orders.length})</option>']
]);

