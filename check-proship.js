const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Find recent orders with KERRY/FLASH/J&T
  const orders = await prisma.ecommerceOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { orderNumber: true, shipping: true, status: true, createdAt: true }
  });
  console.log("=== Recent Orders ===");
  orders.forEach(o => {
    console.log(`  ${o.orderNumber} | shipping: "${o.shipping}" | status: ${o.status} | ${o.createdAt}`);
  });

  // Find one with KERRY or FLASH
  const testOrder = orders.find(o => o.shipping === 'KERRY' || o.shipping === 'FLASH' || o.shipping === 'J&T Express');
  if (testOrder) {
    console.log("\nWill test with:", testOrder.orderNumber, "shipping:", testOrder.shipping);
    
    const order = await prisma.ecommerceOrder.findUnique({ where: { orderNumber: testOrder.orderNumber } });
    const customerData = typeof order.customerData === 'string' ? JSON.parse(order.customerData) : order.customerData || {};
    const itemsData = typeof order.itemsData === 'string' ? JSON.parse(order.itemsData) : order.itemsData || [];

    const primaryShop = await prisma.shop.findFirst({ orderBy: { createdAt: 'asc' } });
    const config = (primaryShop.shippingConfig || {}).proship || {};
    const pc = primaryShop.paymentConfig || {};
    const methods = pc.shippingMethods || [];
    
    let apiKey = config.apiKey;
    let shopId = config.shopId;
    let shippingMethod = config.shippingMethod || "thaipost";

    const matchedMethod = methods.find(m => m.name === order.shipping || m.id === order.shipping);
    if (matchedMethod) {
      if (matchedMethod.proshipCarrierCode) shippingMethod = matchedMethod.proshipCarrierCode;
      if (matchedMethod.proshipApiKey) apiKey = matchedMethod.proshipApiKey;
      if (matchedMethod.proshipShopId) shopId = matchedMethod.proshipShopId;
    }

    console.log("apiKey:", apiKey ? apiKey.substring(0, 30) + "..." : "MISSING");
    console.log("shopId:", shopId);
    console.log("carrier:", shippingMethod);
    console.log("customerName:", customerData.name);
    console.log("customerPhone:", customerData.phone);
    console.log("customerAddress:", customerData.address);

    // Build payload
    const addressMatch = customerData.address?.match(/(.+)\s(ตำบล|ต\.)(.+)\s(อำเภอ|เขต|อ\.)(.+)\s(จังหวัด|จ\.)(.+)\s(\d{5})/);
    let addressStr = customerData.address || "";
    let province = "", district = "", subDistrict = "", zipcode = "";

    if (addressMatch) {
      addressStr = addressMatch[1].trim();
      subDistrict = addressMatch[3].trim();
      district = addressMatch[5].trim();
      province = addressMatch[7].trim();
      zipcode = addressMatch[8].trim();
      console.log("Address parsed OK:", { addressStr, subDistrict, district, province, zipcode });
    } else {
      console.log("Address NOT parsed, using fallback");
      addressStr = order.shippingAddress || customerData.address || "N/A";
    }

    const payload = {
      user: "ADMIN",
      shippingMethod: shippingMethod,
      weight: itemsData.reduce((sum, item) => sum + 1000 * (item.quantity || 1), 0),
      shopId: shopId,
      customer: {
        name: customerData.name || "Customer",
        address: {
          address: addressStr,
          province: province || "กรุงเทพมหานคร",
          district: district || "พญาไท",
          subDistrict: subDistrict || "สามเสนใน",
          zipcode: parseInt(zipcode) || 10400
        },
        phoneNo: customerData.phone || "0000000000",
        salesChannel: "web"
      },
      productItems: itemsData.map(i => ({
        sku: `${i.name}${i.variantName ? ` (${i.variantName})` : ''}`,
        qty: i.quantity || 1
      })),
      codAmount: 0,
      remarks: order.note || ""
    };

    console.log("\nPayload:", JSON.stringify(payload, null, 2));

    // Call Proship
    console.log("\nCalling Proship API...");
    const res = await fetch("https://api.proship.me/orders/v1/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Response:", JSON.stringify(data, null, 2));
  } else {
    console.log("\nNo KERRY/FLASH/J&T orders found to test");
  }

  await prisma.$disconnect();
}

check().catch(console.error);
