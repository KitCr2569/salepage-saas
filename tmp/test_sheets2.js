const fs = require('fs');
const { google } = require('googleapis');

async function testSheets() {
    const envLines = fs.readFileSync('.env', 'utf-8').split('\n');
    const params = {};
    for (const line of envLines) {
        if (line.includes('=')) {
            const parts = line.split('=');
            params[parts[0]] = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
        }
    }

    try {
        const pk = params.GOOGLE_PRIVATE_KEY.split('\\n').join('\n');
        
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: params.GOOGLE_CLIENT_EMAIL,
                private_key: pk
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        const sheets = google.sheets({ version: 'v4', auth });
        const res = await sheets.spreadsheets.get({ spreadsheetId: params.GOOGLE_SHEETS_ID });
        console.log('✅ Sheet Title:', res.data.properties.title);
        console.log('Sheets found:', res.data.sheets.map(s => s.properties.title).join(', '));
    } catch (e) {
        console.error('❌ Error:', e.message);
    }
}
testSheets();
