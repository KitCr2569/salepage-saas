import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

const projectId = 'prj_xVXv89xv1kPhf4LaI6i55AxSlPB5';
const teamId = 'team_302zOOqGD1vAOy4eehuKPmVb';

// Locate Vercel token
const p1 = path.join(os.homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json');
let token = null;

if (fs.existsSync(p1)) token = JSON.parse(fs.readFileSync(p1)).token;

if (!token) {
    console.error('No Vercel Token found contextually.');
    process.exit(1);
}

// Ensure the variables to deploy
const envsToPatch = [
    { key: "DATABASE_URL", val: "postgresql://neondb_owner:npg_WgHRbT04AuUx@ep-snowy-dawn-aoocf6mc.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require", type: "encrypted" },
    { key: "DIRECT_URL", val: "postgresql://neondb_owner:npg_WgHRbT04AuUx@ep-snowy-dawn-aoocf6mc.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require", type: "encrypted" },
    { key: "FACEBOOK_PAGE_ID", val: "227501880441289", type: "plain" },
    { key: "PAGECLAW_PAGE_ID", val: "227501880441289", type: "plain" },
    { key: "META_PAGE_ACCESS_TOKEN", val: "EAANpFgPxzlYBRXZBfPBz3SRC6yKwwsI6jSuK2JRXDWwL06LcX77Ojq35QLy1gtQhleiGDdkcHQalzHZCQzvRqX32e2w7CddlWqyqcxwJbZAdjPohTZAsVtop5AI4uERHCYErgACwOqcLuvG053reLrDR9bfHTZBekLU0MBlMoHQqGaV6SkIivg2LZBepTl2dGefFS111psWJSbSKlhjHeGwsfjhagUzx9i0AQgejQD8aZCZAZBrJVLY4cvAuz9SzVZBT62DS506auMRYrNcu", type: "encrypted" },
    { key: "PAGE_ACCESS_TOKEN", val: "EAANpFgPxzlYBRXZBfPBz3SRC6yKwwsI6jSuK2JRXDWwL06LcX77Ojq35QLy1gtQhleiGDdkcHQalzHZCQzvRqX32e2w7CddlWqyqcxwJbZAdjPohTZAsVtop5AI4uERHCYErgACwOqcLuvG053reLrDR9bfHTZBekLU0MBlMoHQqGaV6SkIivg2LZBepTl2dGefFS111psWJSbSKlhjHeGwsfjhagUzx9i0AQgejQD8aZCZAZBrJVLY4cvAuz9SzVZBT62DS506auMRYrNcu", type: "encrypted" },
    { key: "PAGECLAW_PAGE_TOKEN", val: "EAANpFgPxzlYBRXZBfPBz3SRC6yKwwsI6jSuK2JRXDWwL06LcX77Ojq35QLy1gtQhleiGDdkcHQalzHZCQzvRqX32e2w7CddlWqyqcxwJbZAdjPohTZAsVtop5AI4uERHCYErgACwOqcLuvG053reLrDR9bfHTZBekLU0MBlMoHQqGaV6SkIivg2LZBepTl2dGefFS111psWJSbSKlhjHeGwsfjhagUzx9i0AQgejQD8aZCZAZBrJVLY4cvAuz9SzVZBT62DS506auMRYrNcu", type: "encrypted" }
];

async function updateVercelEnvs() {
    console.log('Fetching existing environments...');
    
    // FETCH EXISTING
    const existing = await new Promise((resolve, reject) => {
        const reqOpts = {
            hostname: 'api.vercel.com',
            path: `/v9/projects/${projectId}/env?teamId=${teamId}`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        };
        const req = https.request(reqOpts, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode >= 400) return reject(body);
                resolve(JSON.parse(body).envs || []);
            });
        });
        req.end();
    });

    console.log(`Found ${existing.length} variables. Updating...`);

    for (const v of envsToPatch) {
        const currentMatch = existing.find(e => e.key === v.key);
        const payload = JSON.stringify({
            key: v.key,
            value: v.val,
            type: v.type,
            target: ["production", "preview", "development"]
        });

        const patchOpts = {
            hostname: 'api.vercel.com',
            path: currentMatch ? `/v9/projects/${projectId}/env/${currentMatch.id}?teamId=${teamId}` : `/v10/projects/${projectId}/env?teamId=${teamId}`,
            method: currentMatch ? 'PATCH' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload)
            }
        };

        await new Promise((resolve, reject) => {
            const req = https.request(patchOpts, res => {
                let body = '';
                res.on('data', c => body += c);
                res.on('end', () => {
                    if (res.statusCode >= 400) return reject(`Failed to save ${v.key}: ${body}`);
                    console.log(`Saved ${v.key}`);
                    resolve();
                });
            });
            req.write(payload);
            req.end();
        });
    }

    console.log("TRIGGERING DEPLOYMENT...");
    
    // TRIGGER DEPLOYMENT
    const deployPayload = JSON.stringify({
        name: "salepage-saas",
        target: "production"
    });
    
    const deployOpts = {
        hostname: 'api.vercel.com',
        path: `/v13/deployments?teamId=${teamId}`,
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(deployPayload)
        }
    };
    
    await new Promise((resolve, reject) => {
        const req = https.request(deployOpts, res => {
            let body = '';
            res.on('data', c => body += c);
            res.on('end', () => {
                if (res.statusCode >= 400) return reject(`Failed to deploy: ${body}`);
                console.log(`Deployment Triggered! `);
                resolve();
            });
        });
        req.write(deployPayload);
        req.end();
    });
    
    console.log("---- ALL DONE ----");
}

updateVercelEnvs().catch(console.error);
