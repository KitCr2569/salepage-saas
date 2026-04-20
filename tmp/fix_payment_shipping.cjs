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

replaceFile('src/components/admin/AdminShipping.tsx', [
    [`<p className="text-sm font-medium text-gray-800">{method.name}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs text-gray-400">{method.nameEn}</p>`, 
     `<p className="text-sm font-medium text-gray-800">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? method.nameEn : method.name}</p>
                                    <div className="flex items-center gap-2">`]
]);

replaceFile('src/components/admin/AdminPayment.tsx', [
    [`<p className="text-sm font-medium text-gray-800">{method.name}</p>
                                        <p className="text-xs text-gray-400">{method.nameEn}</p>`, 
     `<p className="text-sm font-medium text-gray-800">{typeof window !== "undefined" && window.localStorage.getItem("hdg-locale") === "en" ? method.nameEn : method.name}</p>`]
]);
