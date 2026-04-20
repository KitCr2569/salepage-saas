// ═══════════════════════════════════════════════════════════════
// POST /api/sheets/sync — Sync orders to Google Sheets
// GET  /api/sheets/sync — Check sync status / test connection
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncOrdersToSheet, isSheetsConfigured, type SheetOrderData } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow longer execution for bulk sync

// GET — Check if Google Sheets is configured and test connection
export async function GET() {
  try {
    const configured = isSheetsConfigured();
    
    if (!configured) {
      return NextResponse.json({
        success: false,
        configured: false,
        hasBaseGoogleKeys: !!(process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY),
        hasAlternativeKeys: !!(process.env.HDG_SHEET_MAIL && process.env.HDG_SHEET_DATA),
        message: 'Google Sheets ยังไม่ได้ตั้งค่า กรุณาเพิ่ม HDG_SHEET_MAIL และ HDG_SHEET_DATA ใน environment variables',
      });
    }

    // Count orders that could be synced
    const orderCount = await prisma.ecommerceOrder.count({
      where: {
        status: { not: 'cancelled' },
      },
    });

    return NextResponse.json({
      success: true,
      configured: true,
      orderCount,
      message: `Google Sheets พร้อมใช้งาน มีออเดอร์ ${orderCount} รายการที่สามารถ sync ได้`,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}

// POST — Sync orders to Google Sheets
// Body: { month?: string, year?: number, status?: string, forceAll?: boolean }
export async function POST(request: Request) {
  try {
    if (!isSheetsConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Google Sheets ยังไม่ได้ตั้งค่า',
      }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const { month, year, status, forceAll } = body as {
      month?: number;     // 1-12
      year?: number;      // e.g., 2026
      status?: string;    // filter by order status
      forceAll?: boolean; // sync ALL orders regardless of date
    };

    // Build filter
    const where: any = {
      status: { not: 'cancelled' },
    };

    if (status) {
      where.status = status;
    }

    // Filter by month/year if specified
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    } else if (!forceAll) {
      // Default: only sync current month
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Exclude dummy/test orders
    where.NOT = [
      { note: { contains: 'tempcart_' } },
    ];

    // Fetch orders from database
    const dbOrders = await prisma.ecommerceOrder.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Filter out additional invalid orders
    const validOrders = dbOrders.filter((o: any) => {
      if (o.note && o.note.includes('ย้ายไปคุยผ่าน Messenger')) return false;
      const cust = typeof o.customerData === 'string'
        ? JSON.parse(o.customerData)
        : o.customerData;
      if (cust && cust.name === 'จาก Messenger') return false;
      return true;
    });

    if (validOrders.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        message: 'ไม่พบออเดอร์ที่ต้อง sync',
      });
    }

    // Convert to SheetOrderData format
    const sheetOrders: SheetOrderData[] = validOrders.map((dbOrder: any) => {
      const customerData = typeof dbOrder.customerData === 'string'
        ? JSON.parse(dbOrder.customerData)
        : dbOrder.customerData || {};
      const itemsData = typeof dbOrder.itemsData === 'string'
        ? JSON.parse(dbOrder.itemsData)
        : dbOrder.itemsData || [];

      return {
        orderNumber: dbOrder.orderNumber,
        orderDate: new Date(dbOrder.createdAt),
        customerName: customerData.name || dbOrder.facebookName || 'ลูกค้า',
        items: itemsData.map((item: any) => ({
          name: item.name || 'สินค้า',
          variant: item.variantName || item.variant || '',
          quantity: item.quantity || 1,
          price: item.price || 0,
        })),
        shippingCost: Number(dbOrder.shippingCost) || 0,
        total: Number(dbOrder.total) || 0,
      };
    });

    // Sync to Google Sheets
    const result = await syncOrdersToSheet(sheetOrders);

    return NextResponse.json({
      success: result.success,
      synced: result.synced,
      skipped: result.skipped,
      totalRows: sheetOrders.reduce((acc, o) => acc + o.items.length + (o.shippingCost > 0 ? 1 : 0), 0),
      errors: result.errors,
      message: result.success
        ? `✅ Sync สำเร็จ ${result.synced} ออเดอร์ไปยัง Google Sheets${result.skipped > 0 ? ` (ข้าม ${result.skipped} ออเดอร์ที่มีแล้ว)` : ''}`
        : `⚠️ Sync บางส่วนไม่สำเร็จ: ${result.errors.join(', ')}`,
    });
  } catch (error: any) {
    console.error('📊 Sheets sync API error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}
