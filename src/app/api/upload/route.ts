// ═══════════════════════════════════════════════════════════════
// POST /api/upload — Upload image and return public URL
// Stores to /public/uploads or returns base64 URL for Vercel
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getAuthFromRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const auth = await getAuthFromRequest(request);
        if (!auth) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const formData = await request.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json(
                { success: false, error: 'ไม่พบไฟล์' },
                { status: 400 }
            );
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            return NextResponse.json(
                { success: false, error: 'รองรับเฉพาะไฟล์ภาพ (.jpg, .png, .gif, .webp)' },
                { status: 400 }
            );
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return NextResponse.json(
                { success: false, error: 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Generate unique filename
        const ext = file.name.split('.').pop() || 'jpg';
        const filename = `broadcast_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

        // For Vercel (serverless), use /tmp directory
        const uploadDir = path.join('/tmp', 'uploads');
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);

        // Convert to base64 data URL for use in Facebook API
        const base64 = buffer.toString('base64');
        const dataUrl = `data:${file.type};base64,${base64}`;

        // For Facebook Messenger, we need a publicly accessible URL
        // Option 1: Store in public dir (works in dev, not Vercel serverless)
        // Option 2: Use base64 inline (works for preview)
        // Option 3: Upload to external service

        // Return both for flexibility
        return NextResponse.json({
            success: true,
            data: {
                filename,
                size: file.size,
                type: file.type,
                previewUrl: dataUrl, // For local preview
                // For Facebook, the image needs to be hosted publicly
                // We'll use the data URL for preview and handle hosting separately
            },
        });
    } catch (error) {
        console.error('[Upload]', error);
        return NextResponse.json(
            { success: false, error: `เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown'}` },
            { status: 500 }
        );
    }
}
