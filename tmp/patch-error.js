const fs = require('fs');
const path = 'src/components/admin/AdminProducts.tsx';
let c = fs.readFileSync(path, 'utf8');

// Replace the POST product error handling to detect 403 plan limit
const oldHandler = `if (res.ok) { syncWithPage(); }
                    else { const err = await res.text(); console.error("POST product failed:", err); showError("เพิ่มสินค้าไม่สำเร็จ: " + (err.length > 100 ? err.substring(0, 100) : err)); }`;

const newHandler = `if (res.ok) { syncWithPage(); }
                    else {
                        const errJson = await res.json().catch(() => null);
                        if (res.status === 403 && errJson?.upgradeRequired) {
                            deleteProduct(newProduct.id);
                            Swal.fire({
                                icon: 'warning',
                                title: 'ถึงขีดจำกัดแล้ว',
                                html: \`<p>\${errJson.error}</p><p class="text-sm text-gray-500 mt-2">กรุณาอัปเกรดแพ็กเกจเพื่อเพิ่มสินค้า</p>\`,
                                confirmButtonText: '⚡ อัปเกรดแพ็กเกจ',
                                showCancelButton: true,
                                cancelButtonText: 'ปิด',
                                confirmButtonColor: '#ec4899',
                            }).then((result) => {
                                if (result.isConfirmed) window.location.hash = 'Upgrade';
                            });
                            setModalOpen(false);
                            return;
                        }
                        console.error("POST product failed:", errJson);
                        showError("เพิ่มสินค้าไม่สำเร็จ: " + (errJson?.error || "Unknown error").substring(0, 100));
                    }`;

if (c.includes(oldHandler)) {
    c = c.replace(oldHandler, newHandler);
    fs.writeFileSync(path, c);
    console.log('Product limit error handler updated');
} else {
    console.log('Could not find exact match, trying normalized...');
    // Try with normalized whitespace
    const normalizedOld = 'if (res.ok) { syncWithPage(); }\n                    else { const err = await res.text()';
    if (c.includes(normalizedOld)) {
        console.log('Found normalized match');
    }
    // Just note it was not found - the API will return 403 but frontend won't have sweet alert
    console.log('Skipping - API enforcement is in place, frontend UX can be added later');
}
