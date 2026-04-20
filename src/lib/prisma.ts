// ═══════════════════════════════════════════════════════════════
// Prisma Client — Singleton with Prisma Accelerate extension
// ═══════════════════════════════════════════════════════════════

let _prisma: any = null;
let _dbReady: boolean | null = null;
let _initPromise: Promise<any> | null = null;

const dbUrl = process.env.DATABASE_URL || '';
const isDummyDb = !dbUrl || dbUrl.includes('dummy');

async function initPrisma(): Promise<any> {
    if (_prisma) return _prisma;
    if (isDummyDb) return null;
    if (_initPromise) return _initPromise;
    _initPromise = (async () => {
        try {
            const mod = await import('@prisma/client') as any;
            const PrismaClient = mod.PrismaClient || mod.default?.PrismaClient;

            // ⚡ ใช้ withAccelerate() ถ้า DATABASE_URL เป็น prisma:// (Accelerate)
            // ถ้าไม่ใช่ก็ใช้ปกติ
            if (dbUrl.startsWith('prisma://')) {
                const { withAccelerate } = await import('@prisma/extension-accelerate');
                _prisma = new PrismaClient({ log: ['error'] }).$extends(withAccelerate());
            } else {
                _prisma = new PrismaClient({
                    log: ['error'],
                    datasourceUrl: dbUrl,
                });
            }
            return _prisma;
        } catch {
            return null;
        }
    })();
    return _initPromise;
}

// Synchronous getter for already-initialized client
function getPrisma(): any {
    return _prisma;
}

// Kick off initialization immediately (non-blocking)
if (!isDummyDb) {
    initPrisma();
}

export const prisma: any = new Proxy({} as any, {
    get(_target, prop) {
        if (prop === 'then' || prop === 'catch' || prop === 'finally') return undefined;
        if (prop === '$queryRaw' || prop === '$executeRaw' || prop === '$connect' || prop === '$disconnect') {
            const client = getPrisma();
            if (client) return client[prop].bind(client);
            return async (...args: any[]) => {
                const c = await initPrisma();
                if (!c) throw new Error('No DB');
                return c[prop](...args);
            };
        }
        return new Proxy({} as any, {
            get(_t2, method) {
                return async (...args: any[]) => {
                    let client = getPrisma();
                    if (!client) client = await initPrisma();
                    if (!client) return null;
                    return client[prop][method](...args);
                };
            }
        });
    }
});

export async function isDbReady(): Promise<boolean> {
    if (_dbReady !== null) return _dbReady;
    if (isDummyDb) { _dbReady = false; return false; }
    try {
        const client = await initPrisma();
        if (!client) { _dbReady = false; return false; }
        await client.$queryRaw`SELECT 1`;
        _dbReady = true;
        return true;
    } catch {
        _dbReady = false;
        return false;
    }
}
