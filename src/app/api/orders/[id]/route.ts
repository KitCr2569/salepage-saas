import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: { id: string } }) {
    try {
        const orderId = params.id;
        const dbOrder = await prisma.ecommerceOrder.findUnique({
            where: { orderNumber: orderId }
        });

        if (!dbOrder) {
            return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
        }

        // Map DbOrder to front-end structure
        const customerData: any = typeof dbOrder.customerData === 'string' ? JSON.parse(dbOrder.customerData) : dbOrder.customerData || {};
        const itemsData: any = typeof dbOrder.itemsData === 'string' ? JSON.parse(dbOrder.itemsData) : dbOrder.itemsData || [];

        // Auto-extract address components if they were stored as a single string (from Chat)
        if (!customerData.province && customerData.address) {
            const rawAddr = customerData.address;
            const pmatch = rawAddr.match(/จังหวัด\s*([^\s,]+)/);
            const dmatch = rawAddr.match(/(?:อำเภอ|เขต)\s*([^\s,]+)/);
            const smatch = rawAddr.match(/(?:ตำบล|แขวง)\s*([^\s,]+)/);
            const zmatch = rawAddr.match(/\b(\d{5})\b/);
            
            if (pmatch) customerData.province = pmatch[1];
            if (dmatch) customerData.district = dmatch[1];
            if (smatch) customerData.subdistrict = smatch[1];
            if (zmatch) customerData.postalCode = zmatch[1];
            
            // Re-assign basic address (remove components)
            let newAddr = rawAddr;
            if (pmatch) newAddr = newAddr.replace(pmatch[0], "");
            if (dmatch) newAddr = newAddr.replace(dmatch[0], "");
            if (smatch) newAddr = newAddr.replace(smatch[0], "");
            if (zmatch) newAddr = newAddr.replace(zmatch[0], "");
            
            newAddr = newAddr.replace(/,+/g, ',').trim().replace(/(^,)|(,$)/g, '').trim();
            customerData.address = newAddr;
        }

        let addressStr = customerData.address || "";
        // Reconstruct the full address for display if components exist
        if (customerData.subdistrict || customerData.district || customerData.province) {
            addressStr = `${customerData.address || ""}`;
            if (customerData.subdistrict) addressStr += `, ตำบล/แขวง ${customerData.subdistrict}`;
            if (customerData.district) addressStr += `, อำเภอ/เขต ${customerData.district}`;
            if (customerData.province) addressStr += `, จังหวัด ${customerData.province}`;
            if (customerData.postalCode) addressStr += `, ${customerData.postalCode}`;
            addressStr = addressStr.replace(/^, /, "");
        }

        const mappedData = {
            orderNumber: dbOrder.orderNumber,
            customer: {
                name: customerData.name || "",
                phone: customerData.phone || "",
                email: customerData.email || "",
                address: customerData.address || "",
                subdistrict: customerData.subdistrict || "",
                district: customerData.district || "",
                province: customerData.province || "",
                postalCode: customerData.postalCode || "",
                fullAddress: addressStr
            },
            cartItems: itemsData,
            itemCount: dbOrder.itemCount,
            total: Number(dbOrder.total),
            subtotal: Number(dbOrder.subtotal),
            shipping: dbOrder.shipping,
            shippingCost: Number(dbOrder.shippingCost),
            payment: dbOrder.payment,
            status: dbOrder.status,
            date: dbOrder.createdAt.toISOString(),
            note: dbOrder.note || "",
            paymentSlipUrl: dbOrder.paymentSlipUrl || null,
            trackingNumber: dbOrder.trackingNumber || ""
        };

        return NextResponse.json({ success: true, order: mappedData });
    } catch (error: any) {
        console.error("GET order error:", error);
        return NextResponse.json({ success: false, error: "Failed to fetch order" }, { status: 500 });
    }
}
