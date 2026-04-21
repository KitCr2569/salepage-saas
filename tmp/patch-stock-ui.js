const fs = require('fs');
const path = 'src/components/admin/AdminProducts.tsx';
let c = fs.readFileSync(path, 'utf8');

// Add low stock state after usageData state
const usageDataHook = `const [usageData, setUsageData] = useState<any>(null);`;
const lowStockState = `const [usageData, setUsageData] = useState<any>(null);
    const [lowStockItems, setLowStockItems] = useState<any[]>([]);`;

if (c.includes(usageDataHook)) {
    c = c.replace(usageDataHook, lowStockState);
    console.log('Added lowStockItems state');
} else {
    console.log('Could not find usageData state hook');
}

// Add low stock fetch after the usage fetch useEffect
const usageFetch = `.catch(() => {});
    }, []);`;
const usageFetchWithStock = `.catch(() => {});
        // Fetch low stock items
        fetch("/api/stock?threshold=5")
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) setLowStockItems(res.data.items || []);
            })
            .catch(() => {});
    }, []);`;

if (c.includes(usageFetch)) {
    c = c.replace(usageFetch, usageFetchWithStock);
    console.log('Added low stock fetch');
} else {
    console.log('Could not find usage fetch block');
}

// Add low stock alert after UsageBar in the products tab
const usageBarEnd = `</div>
                    )}

                    {/* Header */}`;

const usageBarEndWithLowStock = `</div>
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
                                {lowStockItems.slice(0, 5).map((item: any) => (
                                    <span key={item.productId + item.variantId}
                                        className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium \${
                                            item.stock === 0 
                                                ? 'bg-red-100 text-red-700' 
                                                : 'bg-amber-100 text-amber-700'
                                        }\`}
                                    >
                                        {item.productName} ({item.variantName}): {item.stock === 0 ? 'หมด!' : \`เหลือ \${item.stock}\`}
                                    </span>
                                ))}
                                {lowStockItems.length > 5 && (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                                        +{lowStockItems.length - 5} อีก
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Header */}`;

if (c.includes(usageBarEnd)) {
    c = c.replace(usageBarEnd, usageBarEndWithLowStock);
    console.log('Added low stock alert UI');
} else {
    console.log('Could not find UsageBar end marker');
}

fs.writeFileSync(path, c);
console.log('AdminProducts.tsx patched successfully');
