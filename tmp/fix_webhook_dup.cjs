const fs = require('fs');

function replaceFile(path, replacements) {
    if (!fs.existsSync(path)) return;
    let text = fs.readFileSync(path, 'utf8');
    for (const [search, replace] of replacements) {
        text = text.replace(search, replace);
    }
    fs.writeFileSync(path, text);
    console.log('Fixed', path);
}

replaceFile('src/app/api/webhooks/meta/route.ts', [
    [`            // Find or create conversation
            let conversation = await prisma.conversation.findFirst({
                where: {
                    channelId: channel.id,
                    contactId: contact.id,
                    status: { in: ['OPEN', 'ASSIGNED'] },
                },
            });

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        channelId: channel.id,
                        contactId: contact.id,
                        status: 'OPEN',
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: 1,
                    },
                });
            } else {
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: { increment: 1 },
                    },
                });
            }`, `            // Find or create conversation
            let conversation = await prisma.conversation.findFirst({
                where: {
                    channelId: channel.id,
                    contactId: contact.id,
                },
                orderBy: { lastMessageAt: 'desc' }
            });

            if (!conversation) {
                // ⚡ กันเหนียว: ลองหาอีกรอบ อาจถูกจังหวะ race condition สร้างไปแล้ว
                const retry = await prisma.conversation.findFirst({
                    where: { channelId: channel.id, contactId: contact.id },
                    orderBy: { lastMessageAt: 'desc' }
                });
                if (retry) {
                    conversation = retry;
                }
            }

            if (!conversation) {
                conversation = await prisma.conversation.create({
                    data: {
                        channelId: channel.id,
                        contactId: contact.id,
                        status: 'OPEN',
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: 1,
                    },
                });
            } else {
                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        status: conversation.status === 'ARCHIVED' || conversation.status === 'RESOLVED' ? 'OPEN' : conversation.status,
                        lastMessageAt: msg.timestamp,
                        lastMessagePreview: msg.content?.substring(0, 100) || '[รูปภาพ]',
                        unreadCount: { increment: 1 },
                    },
                });
            }`],
            
            // Fix for Echo handling
            [`                    // หา conversation
                    let conversation = await prisma.conversation.findFirst({
                        where: {
                            channelId: channel.id,
                            contactId: contact.id,
                            status: { in: ['OPEN', 'ASSIGNED'] },
                        },
                    });

                    if (!conversation) {
                        // สร้าง conversation ใหม่ถ้ายังไม่มี
                        conversation = await prisma.conversation.create({
                            data: {
                                channelId: channel.id,
                                contactId: contact.id,
                                status: 'OPEN',
                                lastMessageAt: echo.timestamp,
                                lastMessagePreview: echo.content?.substring(0, 100) || '[รูปภาพ]',
                                unreadCount: 0,
                            },
                        });
                    } else {
                        await prisma.conversation.update({
                            where: { id: conversation.id },
                            data: {
                                lastMessageAt: echo.timestamp,
                                lastMessagePreview: echo.content?.substring(0, 100) || '[รูปภาพ]',
                            },
                        });
                    }`, `                    // หา conversation
                    let conversation = await prisma.conversation.findFirst({
                        where: {
                            channelId: channel.id,
                            contactId: contact.id,
                        },
                        orderBy: { lastMessageAt: 'desc' }
                    });

                    if (!conversation) {
                        // สร้าง conversation ใหม่ถ้ายังไม่มี
                        conversation = await prisma.conversation.create({
                            data: {
                                channelId: channel.id,
                                contactId: contact.id,
                                status: 'OPEN',
                                lastMessageAt: echo.timestamp,
                                lastMessagePreview: echo.content?.substring(0, 100) || '[รูปภาพ]',
                                unreadCount: 0,
                            },
                        });
                    } else {
                        await prisma.conversation.update({
                            where: { id: conversation.id },
                            data: {
                                lastMessageAt: echo.timestamp,
                                lastMessagePreview: echo.content?.substring(0, 100) || '[รูปภาพ]',
                            },
                        });
                    }`]
]);
