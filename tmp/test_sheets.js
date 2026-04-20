const pkg = require('./package.json');
require('dotenv').config();
const { google } = require('googleapis');

async function checkSheets() {
    console.log("Checking Google Sheets config...");
    
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
        console.error("Missing Google credentials in env.");
        return;
    }
    
    try {
        const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
        
        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: privateKey,
            },
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        const sheets = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.GOOGLE_SHEETS_ID || '1lafcY4tTgXCHj1BHxQGrN7FChwMBYCdE7G0oM7Zkk1Y';
        
        console.log(`Connecting to spreadsheet ${spreadsheetId}...`);
        
        const response = await sheets.spreadsheets.get({
            spreadsheetId
        });
        
        console.log("✅ Connection Successful!");
        console.log("Sheet Title:", response.data.properties.title);
        console.log("Tabs:", response.data.sheets.map(s => s.properties.title).join(", "));
        
    } catch (e) {
        console.error("❌ Connection Failed:");
        console.error(e.message);
    }
}

checkSheets();
