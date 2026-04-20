import { NextRequest, NextResponse } from 'next/server';
import { createToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { accessToken } = await request.json();

        if (!accessToken) {
            return NextResponse.json({ success: false, error: 'Missing accessToken' }, { status: 400 });
        }

        // 1. Fetch User Info from Facebook
        const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.width(200).height(200)&access_token=${accessToken}`);
        const fbUser = await fbRes.json();

        if (fbUser.error) {
            return NextResponse.json({ success: false, error: fbUser.error.message }, { status: 400 });
        }

        // 2. Fetch Pages (Accounts)
        const pagesRes = await fetch(`https://graph.facebook.com/me/accounts?access_token=${accessToken}`);
        const pagesData = await pagesRes.json();
        
        const pages = (pagesData.data || []).map((page: any) => ({
            id: page.id,
            name: page.name,
            picture: `https://graph.facebook.com/${page.id}/picture?width=100&height=100`,
            accessToken: page.access_token,
        }));

        // 3. Upsert Agent in Database
        const email = fbUser.email || `${fbUser.id}@facebook.com`;
        
        let agent = await prisma.agent.findUnique({ where: { email } });
        if (!agent) {
            agent = await prisma.agent.create({
                data: {
                    email,
                    name: fbUser.name,
                    passwordHash: 'fb-login-no-password',
                    role: 'ADMIN',
                    avatarUrl: fbUser.picture?.data?.url || null,
                }
            });
        }

        // 4. Generate JWT
        const jwt = await createToken({
            sub: agent.id,
            email: agent.email,
            name: agent.name,
            role: agent.role,
        });

        // 5. Return response
        return NextResponse.json({
            success: true,
            token: jwt,
            user: {
                id: fbUser.id,
                name: fbUser.name,
                picture: fbUser.picture?.data?.url || null,
                email,
            },
            pages
        });

    } catch (error) {
        console.error('[Facebook Login Route Error]:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
