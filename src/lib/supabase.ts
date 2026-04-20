// ═══════════════════════════════════════════════════════════════
// Supabase Client — สำหรับ Realtime subscriptions
// ใช้ anon key ฝั่ง client เท่านั้น (safe)
// ═══════════════════════════════════════════════════════════════

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://risjtwvjmgiwynjygcvx.supabase.co').trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc2p0d3ZqbWdpd3luanlnY3Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1OTIyNzQsImV4cCI6MjA4NzE2ODI3NH0.fNGghQ_IUaPbR8qQoTG16K-9UGWAPwXiToJ_QtbBhdc').trim();

// Singleton client สำหรับ browser (Realtime)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
        params: {
            eventsPerSecond: 10,
        },
    },
});

// Server-side client (ใช้ service_role key)
export function createServerSupabaseClient() {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
    });
}

// ─── Server-side Broadcast via Supabase REST API ─────────────
// ใช้ REST endpoint แทน JS client — ไม่ต้อง WebSocket handshake เร็วกว่ามาก
export async function broadcastMessage(
    channel: string,
    event: string,
    payload: Record<string, unknown>
): Promise<void> {
    const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpc2p0d3ZqbWdpd3luanlnY3Z4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU5MjI3NCwiZXhwIjoyMDg3MTY4Mjc0fQ.m8blblksk3oHqIMP7L_2XckB-NVi5C7TQyDTaonCaEw').trim();
    if (!supabaseUrl || !serviceRoleKey) return;

    try {
        await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
            },
            body: JSON.stringify({
                messages: [{ topic: channel, event, payload }],
            }),
        });
    } catch {
        // silent fail — realtime ไม่ควรทำให้ webhook fail
    }
}

