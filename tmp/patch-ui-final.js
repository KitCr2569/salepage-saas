const fs = require('fs');
const path = 'src/components/admin/AdminProducts.tsx';
let c = fs.readFileSync(path, 'utf8');

// Find the {/* Header */} marker and insert before it
const headerMarker = '{/* Header */}';
const idx = c.indexOf(headerMarker);
if (idx === -1) {
    console.log('ERROR: Could not find {/* Header */} marker');
    process.exit(1);
}

const insert = `{/* Plan Usage Bar */}
                    {usageData && (
                        <div className="mb-4">
                            <UsageBar
                                label="จำนวนสินค้า"
                                labelEn="Products"
                                current={usageData.products.current}
                                max={usageData.products.max}
                                icon="📦"
                                onUpgrade={() => { window.location.hash = "Upgrade"; }}
                            />
                        </div>
                    )}

                    {/* Low Stock Alert */}
                    {lowStockItems.length > 0 && (
                        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">⚠️</span>
                                <span className="text-sm font-bold text-amber-700">
                                    สินค้าใกล้หมด ({lowStockItems.length} รายการ)
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {lowStockItems.slice(0, 8).map((item) => (
                                    <span key={item.productId + item.variantId}
                                        className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium \${
                                            item.stock === 0 
                                                ? 'bg-red-100 text-red-700' 
                                                : 'bg-amber-100 text-amber-700'
                                        }\`}
                                    >
                                        {item.productName} ({item.variantName}): {item.stock === 0 ? '❌ หมด!' : \`เหลือ \${item.stock}\`}
                                    </span>
                                ))}
                                {lowStockItems.length > 8 && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                                        +{lowStockItems.length - 8} รายการ
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    `;

c = c.slice(0, idx) + insert + c.slice(idx);
fs.writeFileSync(path, c);
console.log('✅ Added UsageBar + Low Stock Alert before Header');
