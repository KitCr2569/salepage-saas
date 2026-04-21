import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // 1. Clean up old test data (optional but good for repeatable tests)
        await prisma.tenant.deleteMany({ where: { email: { contains: "testtenant" } } });
        
        // 2. Create 2 Tenants
        const tenant1 = await prisma.tenant.create({
            data: {
                email: "testtenant1@example.com",
                passwordHash: "dummy",
                name: "Tenant 1 Owner",
                shops: {
                    create: {
                        pageId: "PAGE_111",
                        slug: "shop1",
                        name: "Shop Number 1",
                    }
                }
            },
            include: { shops: true }
        });

        const tenant2 = await prisma.tenant.create({
            data: {
                email: "testtenant2@example.com",
                passwordHash: "dummy",
                name: "Tenant 2 Owner",
                shops: {
                    create: {
                        pageId: "PAGE_222",
                        slug: "shop2",
                        name: "Shop Number 2",
                    }
                }
            },
            include: { shops: true }
        });

        const shop1 = tenant1.shops[0];
        const shop2 = tenant2.shops[0];

        // 3. Create products in Shop 1
        await prisma.shopProduct.create({
            data: {
                shopId: shop1.id,
                name: "Product A for Shop 1",
                price: 100,
            }
        });

        // 4. Create products in Shop 2
        await prisma.shopProduct.create({
            data: {
                shopId: shop2.id,
                name: "Product B for Shop 2",
                price: 200,
            }
        });

        // 5. Query Products without shopId filter (should return all for now to verify creation)
        const allProductsCount = await prisma.shopProduct.count({ where: { name: { contains: "for Shop" } }});

        // 6. Test Isolation: Fetch products passing x-shop-id header to the API using local fetch
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        
        // Try to fetch products for Shop 1
        const res1 = await fetch(`${baseUrl}/api/products`, {
            headers: { 'x-shop-id': shop1.id }
        });
        const data1 = await res1.json();

        // Try to fetch products for Shop 2
        const res2 = await fetch(`${baseUrl}/api/products`, {
            headers: { 'x-shop-id': shop2.id }
        });
        const data2 = await res2.json();

        // 7. Verify Results
        const shop1HasCorrectProduct = data1.products?.length === 1 && data1.products[0].name === "Product A for Shop 1";
        const shop2HasCorrectProduct = data2.products?.length === 1 && data2.products[0].name === "Product B for Shop 2";

        // Clean up
        await prisma.tenant.deleteMany({ where: { email: { contains: "testtenant" } } });

        return NextResponse.json({
            success: true,
            isolationWorking: shop1HasCorrectProduct && shop2HasCorrectProduct,
            details: {
                totalTestProductsCreated: allProductsCount,
                shop1Result: data1.products,
                shop2Result: data2.products,
            }
        });

    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
