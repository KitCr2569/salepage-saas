import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import crypto from "crypto";

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "tenant-secret-key");
const PLATFORM_ADMIN_EMAILS = ["admin@hdg.com"];

async function checkAdmin(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return false;
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWT_SECRET);
    return payload.type === "tenant" && PLATFORM_ADMIN_EMAILS.includes(payload.email as string);
  } catch { return false; }
}

function generateCode() {
  return "INV-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

// GET — list invite codes
export async function GET(req: NextRequest) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const codes = await prisma.inviteCode.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  const total = await prisma.inviteCode.count();
  const used = await prisma.inviteCode.count({ where: { isUsed: true } });
  return NextResponse.json({ success: true, data: { codes, total, used } });
}

// POST — create invite codes OR validate a code (public)
export async function POST(req: NextRequest) {
  const body = await req.json();

  // Public: validate code
  if (body.action === "validate") {
    const code = await prisma.inviteCode.findUnique({ where: { code: body.code } });
    if (!code) return NextResponse.json({ success: false, error: "รหัสเชิญไม่ถูกต้อง" }, { status: 404 });
    if (code.isUsed) return NextResponse.json({ success: false, error: "รหัสเชิญนี้ถูกใช้ไปแล้ว" }, { status: 400 });
    return NextResponse.json({ success: true, data: { planSlug: code.planSlug, label: code.label } });
  }

  // Admin: create codes
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }

  const { planSlug, quantity = 1, label } = body;
  const created = [];
  for (let i = 0; i < Math.min(quantity, 50); i++) {
    const code = await prisma.inviteCode.create({
      data: { code: generateCode(), planSlug: planSlug || "starter", label: label || null },
    });
    created.push(code);
  }

  return NextResponse.json({ success: true, data: created });
}

// DELETE — delete unused invite code
export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin(req))) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, error: "Missing id" }, { status: 400 });

  const code = await prisma.inviteCode.findUnique({ where: { id } });
  if (!code) return NextResponse.json({ success: false, error: "ไม่พบรหัส" }, { status: 404 });
  if (code.isUsed) return NextResponse.json({ success: false, error: "ไม่สามารถลบรหัสที่ใช้แล้ว" }, { status: 400 });

  await prisma.inviteCode.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
