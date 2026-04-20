// ═══════════════════════════════════════════════════════════════
// GET /api/agents — List agents (for assigning)
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-helpers';
import { prisma } from '@/lib/prisma';

const MOCK_AGENTS = [
    { id: 'mock-admin-001', name: 'Admin User', email: 'admin@unified-chat.com', role: 'ADMIN', avatarUrl: null, isOnline: true },
    { id: 'mock-agent-001', name: 'สมชาย ใจดี', email: 'agent1@unified-chat.com', role: 'AGENT', avatarUrl: null, isOnline: true },
    { id: 'mock-agent-002', name: 'สมหญิง รักงาน', email: 'agent2@unified-chat.com', role: 'AGENT', avatarUrl: null, isOnline: false },
];

export async function GET(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) {
            return errorResponse('ไม่ได้เข้าสู่ระบบ', 401);
        }

        try {
            const agents = await prisma.agent.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    avatarUrl: true,
                    isOnline: true,
                },
                orderBy: { name: 'asc' },
            });
            return successResponse(agents);
        } catch {
            return successResponse(MOCK_AGENTS);
        }
    } catch (error) {
        return handleApiError(error);
    }
}
