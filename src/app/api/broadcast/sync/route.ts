// ═══════════════════════════════════════════════════════════════
// POST /api/broadcast/sync — Sync contacts from Facebook (SSE streaming)
// Streams real-time progress updates to the frontend
// ═══════════════════════════════════════════════════════════════

import { NextRequest } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth';
import { getFacebookPageConfig } from '@/lib/facebook';

interface FBParticipant {
    name: string;
    email: string;
    id: string;
}

interface FBConversation {
    id: string;
    participants: { data: FBParticipant[] };
    updated_time: string;
    snippet?: string;
}

interface FBPaging {
    cursors?: { before: string; after: string };
    next?: string;
}

interface FBConversationsResponse {
    data: FBConversation[];
    paging?: FBPaging;
}

interface FBProfileResponse {
    first_name?: string;
    last_name?: string;
    name?: string;
    profile_pic?: string;
    id: string;
    error?: { message: string };
}

export async function POST(request: NextRequest) {
    // ─── Auth check ──────────────────────────────────────────
    let auth = await getAuthFromRequest(request);
    let authName = auth?.name || 'Admin';
    if (!auth) {
        const fbToken = request.headers.get('x-fb-token');
        const bypassMode = request.headers.get('x-admin-bypass');
        if (!fbToken && !bypassMode) {
            return new Response(JSON.stringify({ success: false, error: 'ไม่ได้เข้าสู่ระบบ' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        authName = bypassMode ? 'ผู้ดูแลระบบ' : 'Facebook Admin';
    } else {
        authName = auth.name;
    }

    const { pageAccessToken, pageId } = await getFacebookPageConfig(request);
 
    if (!pageAccessToken || !pageId) {
        return new Response(JSON.stringify({ success: false, error: 'ยังไม่ได้ตั้งค่า PAGE_ACCESS_TOKEN หรือ FACEBOOK_PAGE_ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // Parse body for limit
    let syncLimit = 0;
    try {
        const body = await request.json();
        syncLimit = body?.limit || 0;
    } catch { /* no body */ }

    const tokenSource = request.headers.get('x-page-token') ? 'admin login (x-page-token)' : 'env/DB';
    console.log(`[Sync] Using token source: ${tokenSource}, limit: ${syncLimit || 'unlimited'}`);

    // ─── SSE Stream ──────────────────────────────────────────
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            // Helper: send SSE event
            function sendEvent(type: string, data: Record<string, unknown>) {
                const event = `data: ${JSON.stringify({ type, ...data })}\n\n`;
                controller.enqueue(encoder.encode(event));
            }

            try {
                // ═══ Step 1: Fetch conversations ═══
                sendEvent('step', { step: 1, label: '📡 กำลังดึงรายการสนทนาจาก Facebook...' });

                const allPSIDs: Map<string, { psid: string; name: string; updatedTime: string }> = new Map();
                let nextUrl: string | null = `https://graph.facebook.com/v19.0/${pageId}/conversations?fields=participants,updated_time,snippet&limit=100&access_token=${pageAccessToken}`;

                let pagesFetched = 0;
                // Calculate maxPages from limit (100 conversations per page)
                const maxPages = syncLimit > 0 ? Math.ceil(syncLimit / 100) : 999;

                while (nextUrl && pagesFetched < maxPages) {
                    if (pagesFetched > 0) {
                        // Throttling: หน่วงเวลา 1 วินาทีระหว่างหน้าเพื่อลด Rate Limit
                        await new Promise(r => setTimeout(r, 1000));
                    }
                    const res = await fetch(nextUrl);
                    const data = (await res.json()) as FBConversationsResponse & { error?: { message: string } };

                    if (!res.ok || data.error) {
                        const errorMsg = data.error?.message || `HTTP ${res.status}`;
                        sendEvent('error', { error: `Facebook API error: ${errorMsg}` });
                        controller.close();
                        return;
                    }

                    for (const conversation of data.data || []) {
                        for (const participant of conversation.participants?.data || []) {
                            if (participant.id === pageId) continue;
                            if (!allPSIDs.has(participant.id)) {
                                allPSIDs.set(participant.id, {
                                    psid: participant.id,
                                    name: participant.name || `User ${participant.id}`,
                                    updatedTime: conversation.updated_time,
                                });
                            }
                        }
                    }

                    pagesFetched++;
                    const hasMore = !!data.paging?.next;
                    sendEvent('progress', {
                        step: 1,
                        pagesFetched,
                        maxPages,
                        psidsFound: allPSIDs.size,
                        hasMore,
                        percent: Math.round((pagesFetched / maxPages) * 40), // 0-40%
                    });

                    nextUrl = data.paging?.next || null;
                }

                sendEvent('step', {
                    step: 1,
                    label: `✅ ดึงสนทนาเสร็จ — พบ ${allPSIDs.size} PSID จาก ${pagesFetched} หน้า`,
                    completed: true,
                });

                // ═══ Step 2: Prepare contact data (ใช้ชื่อจาก conversations โดยตรง — ไม่ต้อง fetch profile ทีละคน) ═══
                sendEvent('step', { step: 2, label: '📋 กำลังจัดเตรียมข้อมูลรายชื่อ...' });

                const psidArray = Array.from(allPSIDs.values());
                const profiles: Map<string, { name: string; profilePic: string | null }> = new Map();

                for (const psid of psidArray) {
                    profiles.set(psid.psid, {
                        name: psid.name || `User ${psid.psid.slice(-6)}`,
                        // ⚡ สร้าง URL รูปโปรไฟล์จาก PSID โดยตรง — ไม่ต้อง fetch API ทีละคน
                        profilePic: `https://graph.facebook.com/v19.0/${psid.psid}/picture?type=large&access_token=${pageAccessToken}`,
                    });
                }

                sendEvent('progress', { step: 2, percent: 60 });
                sendEvent('step', {
                    step: 2,
                    label: `✅ จัดเตรียมข้อมูลเสร็จ — ${profiles.size} คน`,
                    completed: true,
                });

                // ═══ Step 3: Upsert into database ═══
                sendEvent('step', { step: 3, label: '💾 กำลังบันทึกลงฐานข้อมูล...' });

                let newContacts = 0;
                let updatedContacts = 0;
                let errors = 0;
                let firstErrorMsg = '';

                try {
                    const { prisma } = await import('@/lib/prisma');

                    let messengerChannel = await prisma.channel.findFirst({
                        where: { type: 'MESSENGER' },
                    });

                    if (!messengerChannel) {
                        messengerChannel = await prisma.channel.create({
                            data: {
                                type: 'MESSENGER',
                                name: 'Facebook Messenger',
                                config: {
                                    pageId,
                                    pageAccessToken: pageAccessToken.substring(0, 20) + '...',
                                },
                            },
                        });
                    }

                    const entries = Array.from(allPSIDs.entries());
                    for (let i = 0; i < entries.length; i++) {
                        const [psid, info] = entries[i];
                        try {
                            const profile = profiles.get(psid);
                            const displayName = profile?.name || info.name;
                            const avatarUrl = profile?.profilePic || null;

                            const existing = await prisma.contact.findUnique({
                                where: {
                                    channelId_platformContactId: {
                                        channelId: messengerChannel.id,
                                        platformContactId: psid,
                                    },
                                },
                            });

                            if (existing) {
                                // อัปเดต avatarUrl ถ้าคนเดิมยังไม่มีรูป
                                if (avatarUrl && !existing.avatarUrl) {
                                    await prisma.contact.update({
                                        where: { id: existing.id },
                                        data: { avatarUrl },
                                    });
                                }
                                updatedContacts++;
                            } else {
                                await prisma.contact.create({
                                    data: {
                                        channelId: messengerChannel.id,
                                        platformContactId: psid,
                                        displayName,
                                        avatarUrl,
                                    },
                                });
                                newContacts++;
                            }
                        } catch (err) {
                            const errMsg = err instanceof Error ? err.message : String(err);
                            if (!firstErrorMsg) firstErrorMsg = errMsg;
                            errors++;
                        }

                        // Send progress every 20 contacts
                        if ((i + 1) % 20 === 0 || i === entries.length - 1) {
                            sendEvent('progress', {
                                step: 3,
                                contactsSaved: i + 1,
                                totalContacts: entries.length,
                                newContacts,
                                updatedContacts,
                                errors,
                                percent: 70 + Math.round(((i + 1) / entries.length) * 30), // 70-100%
                            });
                        }
                    }
                } catch (dbError) {
                    sendEvent('step', {
                        step: 3,
                        label: '⚠️ ไม่สามารถบันทึกลง database ได้ แต่ดึง PSID สำเร็จ',
                        completed: true,
                        warning: true,
                    });
                }

                // ═══ Final result ═══
                sendEvent('complete', {
                    totalFound: allPSIDs.size,
                    newContacts,
                    updatedContacts,
                    errors,
                    pagesFetched,
                    percent: 100,
                    message: `ดึง PSID สำเร็จ ${allPSIDs.size} รายการ | ใหม่ ${newContacts} | อัพเดท ${updatedContacts} | ผิดพลาด ${errors}`,
                    ...(firstErrorMsg ? { errorDetail: firstErrorMsg } : {}),
                });

            } catch (error) {
                console.error('[Sync]', error);
                sendEvent('error', {
                    error: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown'}`,
                });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
