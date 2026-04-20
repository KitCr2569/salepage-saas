import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Plans ────────────────────────────────────
  const plans = await Promise.all([
    prisma.plan.upsert({
      where: { slug: "free" },
      update: {},
      create: {
        name: "ฟรี",
        slug: "free",
        price: 0,
        maxProducts: 10,
        maxShops: 1,
        features: JSON.stringify(["basic_store", "manual_orders"]),
        sortOrder: 0,
      },
    }),
    prisma.plan.upsert({
      where: { slug: "starter" },
      update: {},
      create: {
        name: "เริ่มต้น",
        slug: "starter",
        price: 299,
        maxProducts: 100,
        maxShops: 1,
        features: JSON.stringify([
          "basic_store",
          "manual_orders",
          "analytics",
          "custom_theme",
        ]),
        sortOrder: 1,
      },
    }),
    prisma.plan.upsert({
      where: { slug: "pro" },
      update: {},
      create: {
        name: "โปร",
        slug: "pro",
        price: 699,
        maxProducts: 500,
        maxShops: 3,
        features: JSON.stringify([
          "basic_store",
          "manual_orders",
          "analytics",
          "custom_theme",
          "chatbot",
          "broadcast",
          "facebook_tools",
        ]),
        sortOrder: 2,
      },
    }),
    prisma.plan.upsert({
      where: { slug: "premium" },
      update: {},
      create: {
        name: "พรีเมียม",
        slug: "premium",
        price: 1499,
        maxProducts: 99999,
        maxShops: 10,
        features: JSON.stringify([
          "basic_store",
          "manual_orders",
          "analytics",
          "custom_theme",
          "chatbot",
          "broadcast",
          "facebook_tools",
          "tiktok",
          "priority_support",
          "api_access",
        ]),
        sortOrder: 3,
      },
    }),
  ]);

  console.log(`✅ Created ${plans.length} plans`);

  // ─── Default Tenant (Platform Owner — HDG) ─────
  const passwordHash = await bcrypt.hash("admin123", 10);

  const tenant = await prisma.tenant.upsert({
    where: { email: "admin@hdg.com" },
    update: {},
    create: {
      email: "admin@hdg.com",
      passwordHash,
      name: "HDG Wrap Skin",
      phone: "",
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);

  // ─── Give tenant a premium plan ────────────────
  const premiumPlan = plans[3];
  const now = new Date();
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 10); // 10 years for platform owner

  await prisma.subscription.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      planId: premiumPlan.id,
      status: "ACTIVE",
      startDate: now,
      endDate,
      autoRenew: true,
    },
  });

  console.log(`✅ Assigned premium plan to HDG`);

  // ─── Default Agent ─────────────────────────────
  await prisma.agent.upsert({
    where: { email: "admin@hdg.com" },
    update: {},
    create: {
      email: "admin@hdg.com",
      passwordHash,
      name: "Admin HDG",
      role: "ADMIN",
    },
  });

  console.log(`✅ Created admin agent`);

  // ─── Default Shop (HDG) ────────────────────────
  const shop = await prisma.shop.upsert({
    where: { pageId: "114336388182180" },
    update: { tenantId: tenant.id, slug: "hdgwrapskin" },
    create: {
      tenantId: tenant.id,
      pageId: "114336388182180",
      slug: "hdgwrapskin",
      name: "HDG Wrap Skin",
      description:
        "สติ๊กเกอร์กันรอย ฟิล์มกันรอย กล้อง เลนส์ มือถือ คุณภาพสูงจาก 3M",
      logo: "https://graph.facebook.com/114336388182180/picture?width=500&height=500",
      themeColor: "#e91e63",
      currency: "THB",
      currencySymbol: "฿",
    },
  });

  console.log(`✅ Created shop: ${shop.name} (slug: ${shop.slug})`);

  // ─── Categories ────────────────────────────────
  const cats = [
    { name: "ทั้งหมด", nameEn: "All" },
    { name: "ลดราคา", nameEn: "Sale" },
    { name: "CAMERA SONY", nameEn: "Camera Sony" },
    { name: "LENS SONY", nameEn: "Lens Sony" },
    { name: "CAMERA CANON", nameEn: "Camera Canon" },
    { name: "LENS CANON", nameEn: "Lens Canon" },
    { name: "CAMERA NIKON", nameEn: "Camera Nikon" },
    { name: "LENS NIKON", nameEn: "Lens Nikon" },
  ];

  for (let i = 0; i < cats.length; i++) {
    await prisma.shopCategory.create({
      data: { shopId: shop.id, ...cats[i], sortOrder: i },
    });
  }

  console.log(`✅ Created ${cats.length} categories`);

  console.log("\n🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
