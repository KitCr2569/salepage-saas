import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthFromRequest, createToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        
        if (!auth) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { shopId } = body;

        if (!shopId) {
            return NextResponse.json({ success: false, error: 'Missing shopId' }, { status: 400 });
        }

        // Only Tenants (or admins with tenantId) can switch to other shops owned by them
        const tenantId = (auth as any).tenantId;

        if (!tenantId) {
            return NextResponse.json({ success: false, error: 'Only shop owners can switch shops' }, { status: 403 });
        }

        // Verify the shop belongs to the tenant
        const shop = await prisma.shop.findUnique({
            where: { id: shopId }
        });

        if (!shop || shop.tenantId !== tenantId) {
            return NextResponse.json({ success: false, error: 'Shop not found or access denied' }, { status: 404 });
        }

        // Generate a new token with the updated shopId
        const newToken = await createToken({
            sub: auth.sub,
            email: auth.email,
            name: auth.name,
            role: auth.role,
            tenantId: tenantId,
            shopId: shop.id,
        });

        const response = NextResponse.json({ success: true, message: 'Shop switched successfully' });

        // Overwrite the cookie
        response.cookies.set('auth-token', newToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        return response;
    } catch (error: any) {
        console.error('[switch-shop] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
