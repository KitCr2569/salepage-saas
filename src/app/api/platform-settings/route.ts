import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "tenant-secret-key");
const ADMIN_EMAILS = ["admin@hdg.com"];

async function checkAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
    return payload.type === "tenant" && ADMIN_EMAILS.includes(payload.email as string);
  } catch { return false; }
}

// GET — read all platform settings (public)
export async function GET() {
  const rows = await prisma.platformSetting.findMany();
  const data: Record<string, string> = {};
  rows.forEach(r => { data[r.key] = r.value; });
  return NextResponse.json({ success: true, data });
}

// PUT — save settings (admin only)
export async function PUT(req: NextRequest) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const { settings } = await req.json();
  // settings = [{ key, value }, ...]
  for (const s of settings) {
    await prisma.platformSetting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: { key: s.key, value: s.value },
    });
  }
  return NextResponse.json({ success: true });
}
