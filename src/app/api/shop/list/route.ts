import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const auth = await getAuthFromRequest(request);

        if (!auth) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // If the user has a tenantId (Shop Owner / ADMIN)
        if ((auth as any).tenantId) {
            const shops = await prisma.shop.findMany({
                where: { tenantId: (auth as any).tenantId },
                orderBy: { createdAt: 'asc' },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                }
            });

            return NextResponse.json({ success: true, shops });
        }

        // If the user only has a specific shopId (Staff / AGENT)
        if ((auth as any).shopId) {
            const shop = await prisma.shop.findUnique({
                where: { id: (auth as any).shopId },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    logo: true,
                }
            });

            return NextResponse.json({ success: true, shops: shop ? [shop] : [] });
        }

        return NextResponse.json({ success: true, shops: [] });

    } catch (error: any) {
        console.error('[shop/list] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
