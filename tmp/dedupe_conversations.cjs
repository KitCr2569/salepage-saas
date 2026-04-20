const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log("Starting deduplication...");
    const contacts = await prisma.contact.findMany();

    let mergedCount = 0;
    
    for (const contact of contacts) {
        const conversations = await prisma.conversation.findMany({
            where: { contactId: contact.id },
            orderBy: { createdAt: 'desc' }
        });

        // If there is more than 1 conversation for the same contact
        if (conversations.length > 1) {
            console.log(`Contact ${contact.displayName} has ${conversations.length} conversations.`);
            
            // Keep the newest conversation (or the one with the most recent lastMessageAt)
            // Actually, sorting by lastMessageAt is better
            conversations.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
            
            const keeper = conversations[0];
            const duplicateIds = conversations.slice(1).map(c => c.id);
            
            console.log(`Keeping conversation ${keeper.id}, merging ${duplicateIds.length} others.`);

            // Move all messages to keeper
            await prisma.message.updateMany({
                where: { conversationId: { in: duplicateIds } },
                data: { conversationId: keeper.id }
            });

            // Move notes to keeper 
            await prisma.note.updateMany({
                where: { conversationId: { in: duplicateIds } },
                data: { conversationId: keeper.id }
            });

            // Update unread count and lastMessagePreview of the keeper
            const allMessages = await prisma.message.findMany({
                where: { conversationId: keeper.id },
                orderBy: { createdAt: 'desc' }
            });
            
            if (allMessages.length > 0) {
                 await prisma.conversation.update({
                      where: { id: keeper.id },
                      data: {
                          lastMessagePreview: allMessages[0].content?.substring(0, 100),
                          lastMessageAt: allMessages[0].createdAt
                      }
                 });
            }

            // Finally, delete the duplicated empty conversations
            await prisma.conversation.deleteMany({
                where: { id: { in: duplicateIds } }
            });
            
            mergedCount++;
        }
    }
    
    console.log(`Finished. Merged duplicates for ${mergedCount} contacts.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
