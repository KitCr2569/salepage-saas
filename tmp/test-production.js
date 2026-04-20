// Test the production API's ability to send messages
// by calling the same endpoint OpenClaw uses

async function main() {
    const res = await fetch("https://www.hdgwrapskin.com/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            orderNumber: `TEST-${Date.now()}`,
            customer: { name: "Test Token Check" },
            items: [{ name: "Test Item", quantity: 1, price: 0, variantName: "" }],
            subtotal: 0,
            total: 0,
            shipping: "KERRY",
            shippingCost: 0,
            payment: "โอนเงินผ่านธนาคาร",
            facebookPsid: "6055545721205010",
            facebookName: "Kittichai Bunsook",
        }),
    });
    const data = await res.json();
    console.log("Response status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
