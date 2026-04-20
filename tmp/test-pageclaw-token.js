const PAGECLAW_TOKEN = "EAADhsxfbE8sBRH1jIAhHmXWTAyhipKPPvKZA1X2UlgQDlzCzu48hdH4dReT3aCUN8sDZARIyfjuUbUwiXZCNr5WnoSgva0aXvSWCgxtT7epEA7PXxXYmZA6z6veZAoqjiOjnckcG8rgOZCIjXMe8bDVOPhwloydYVyYmG0tL61vQ9N4d68Ile6gxZCMl9dp9QZCum6UMyUwZD";

async function main() {
  console.log("1. Checking token info...");
  const info = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${PAGECLAW_TOKEN}`).then(r => r.json());
  console.log("   Page/User:", info.name, "(ID:", info.id + ")");

  if (info.error) {
    console.log("   ERROR:", info.error.message);
    return;
  }

  console.log("2. Checking expiry...");
  const debug = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${PAGECLAW_TOKEN}&access_token=${PAGECLAW_TOKEN}`).then(r => r.json());
  if (debug.data) {
    const exp = debug.data.expires_at;
    console.log("   Expires:", exp === 0 ? "NEVER (permanent!)" : new Date(exp * 1000).toISOString());
    console.log("   App ID:", debug.data.app_id);
    console.log("   Type:", debug.data.type);
    console.log("   Scopes:", debug.data.scopes);
  }

  console.log("3. Testing send message...");
  const sendRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGECLAW_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: "6055545721205010" },
      message: { text: "ทดสอบ Token จาก PageClaw" }
    }),
  }).then(r => r.json());
  console.log("   Send:", sendRes.error ? "FAILED - " + sendRes.error.message : "SUCCESS!");
}

main().catch(console.error);
