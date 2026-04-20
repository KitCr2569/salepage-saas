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
    [`            if (!contact) {
                let finalDisplayName = msg.contactDisplayName || msg.platformContactId;
                let finalAvatarUrl: string | null = null;

                if (token && channelType === 'MESSENGER') {
                    try {
                        const r = await fetch(\`https://graph.facebook.com/v19.0/\${msg.platformContactId}?fields=name,first_name,last_name,profile_pic&access_token=\${token}\`);
                        if (r.ok) {
                            const profile = await r.json();
                            const fetchedName = profile.name || \`\${profile.first_name || ''} \${profile.last_name || ''}\`.trim();
                            if (fetchedName) finalDisplayName = fetchedName;
                            if (profile.profile_pic) finalAvatarUrl = profile.profile_pic;
                        }
                    } catch (err) {
                        logger.warn('Webhook:Meta', 'Profile fetch failed in webhook: ' + err);
                    }
                }

                // สร้าง contact พร้อมข้อมูล Facebook profile
                contact = await prisma.contact.create({
                    data: {
                        channelId: channel.id,
                        platformContactId: msg.platformContactId,
                        displayName: finalDisplayName,
                        avatarUrl: finalAvatarUrl,
                    },
                });
            }`, `            // ถ้าไม่มี contact โฟลว์จะสร้างใหม่, แต่ถ้ามี contact แล้วแต่ชื่อมีปัญหา(เป็นตัวเลข ID) ให้ลองดึงใหม่
            let isBrokenName = contact && contact.displayName === contact.platformContactId;
            
            if (!contact || isBrokenName) {
                let finalDisplayName = msg.contactDisplayName || msg.platformContactId;
                let finalAvatarUrl: string | null = contact ? contact.avatarUrl : null;

                if (token && channelType === 'MESSENGER') {
                    try {
                        const r = await fetch(\`https://graph.facebook.com/v19.0/\${msg.platformContactId}?fields=name,first_name,last_name,profile_pic&access_token=\${token}\`);
                        if (r.ok) {
                            const profile = await r.json();
                            const fetchedName = profile.name || \`\${profile.first_name || ''} \${profile.last_name || ''}\`.trim();
                            if (fetchedName) finalDisplayName = fetchedName;
                            if (profile.profile_pic) finalAvatarUrl = profile.profile_pic;
                        }
                    } catch (err) {
                        logger.warn('Webhook:Meta', 'Profile fetch failed in webhook: ' + err);
                    }
                }

                if (!contact) {
                    // สร้าง contact พร้อมข้อมูล Facebook profile
                    contact = await prisma.contact.create({
                        data: {
                            channelId: channel.id,
                            platformContactId: msg.platformContactId,
                            displayName: finalDisplayName,
                            avatarUrl: finalAvatarUrl,
                        },
                    });
                } else if (isBrokenName && finalDisplayName !== msg.platformContactId) {
                    // อัพเดทชื่อที่มันพัง (ซ่อมแซม auto-healing)
                    contact = await prisma.contact.update({
                        where: { id: contact.id },
                        data: {
                            displayName: finalDisplayName,
                            avatarUrl: finalAvatarUrl,
                        }
                    });
                }
            }`]
]);
