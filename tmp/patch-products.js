const fs = require('fs');
const path = 'src/components/admin/AdminProducts.tsx';
let c = fs.readFileSync(path, 'utf8');

// Add UsageBar import
c = c.replace(
    `import AdminTextures from "@/components/admin/AdminTextures";`,
    `import AdminTextures from "@/components/admin/AdminTextures";\nimport UsageBar from "@/components/admin/UsageBar";`
);

// Add usage state after the studioIndex state line
c = c.replace(
    `const [studioIndex, setStudioIndex] = useState(0);`,
    `const [studioIndex, setStudioIndex] = useState(0);
    const [usageData, setUsageData] = useState<any>(null);

    // Fetch plan usage info
    useEffect(() => {
        fetch("/api/tenant/usage")
            .then(res => res.json())
            .then(res => {
                if (res.success && res.data) setUsageData(res.data);
            })
            .catch(() => {});
    }, []);`
);

// Add UsageBar before the Header section in the products tab
const headerMarker = `{/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-pink-500 flex items-center gap-2">
                            <Package className="w-6 h-6" />`;
                            
c = c.replace(headerMarker,
    `{/* Plan Usage Bar */}
                    {usageData && (
                        <div className="mb-4">
                            <UsageBar
                                label="จำนวนสินค้า"
                                labelEn="Products"
                                current={usageData.products.current}
                                max={usageData.products.max}
                                icon="📦"
                                onUpgrade={() => {
                                    window.location.hash = "Upgrade";
                                }}
                            />
                        </div>
                    )}

                    ${headerMarker}`
);

fs.writeFileSync(path, c);
console.log('AdminProducts.tsx updated successfully');
