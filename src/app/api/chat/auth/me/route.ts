// ═══════════════════════════════════════════════════════════════
// GET /api/auth/me — Get current authenticated agent
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        try {
            const agent = await prisma.agent.findUnique({
                where: { id: auth.sub },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    avatarUrl: true,
                    isOnline: true,
                },
            });

            if (!agent) {
                return errorResponse('ไม่พบบัญชีผู้ใช้', 404);
            }

            return successResponse(agent);
        } catch {
            // Fallback: return info from JWT token
            return successResponse({
                id: auth.sub,
                email: auth.email,
                name: auth.name,
                role: auth.role,
                avatarUrl: null,
                isOnline: true,
            });
        }
    } catch (error) {
        return handleApiError(error);
    }
}

