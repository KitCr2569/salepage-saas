const APP_ID = "1417314816291087";
const APP_SECRET = "016cdfb2d91a234c24aa7c02f5a00cd4";
// Short-lived page token from me/accounts
const SHORT_PAGE_TOKEN = "EAAUJClIo8Q8BRPZBarkoh4ac6jSfwmWRxUxO5hCdMBkPIN5TtBuLkCyM4ult1a3tk7I18CwazKvrzuOQdYQSpSsqEbbntby8gANmCkWGQD1bUsuBlR75G7ouSCuxFGNmTtViWSkBxoABjOMZBZArR8aB0ux4CVTZAa6IlcZBOtfWnFTSvkB8FbAM5W0ZB6FIvrsAZChoeHtVf2OoNWiuoZCnDwLZAc8UoJ0HzO6m4sgZDZD";

async function main() {
  // Exchange short-lived PAGE token for long-lived PAGE token
  console.log("Exchanging page token for long-lived version...");
  const res = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${APP_ID}&client_secret=${APP_SECRET}&fb_exchange_token=${SHORT_PAGE_TOKEN}`
  ).then(r => r.json());

  if (res.error) {
    console.log("ERROR:", res.error.message);
    return;
  }

  const PERMANENT_TOKEN = res.access_token;
  console.log("Token obtained!");

  // Check expiry
  console.log("Checking expiry...");
  const debug = await fetch(
    `https://graph.facebook.com/v19.0/debug_token?input_token=${PERMANENT_TOKEN}&access_token=${PERMANENT_TOKEN}`
  ).then(r => r.json());

  if (debug.data) {
    const exp = debug.data.expires_at;
    console.log("Expires:", exp === 0 ? "NEVER (PERMANENT!)" : new Date(exp * 1000).toISOString());
  }

  // Test send
  console.log("Test sending...");
  const sendRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PERMANENT_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: "6055545721205010" },
      message: { text: "✅ Token ถาวรพร้อมใช้งาน!" }
    }),
  }).then(r => r.json());
  console.log("Send:", sendRes.error ? "FAILED - " + sendRes.error.message : "SUCCESS!");

  console.log("\n=== PERMANENT TOKEN ===");
  console.log(PERMANENT_TOKEN);
  console.log("=======================");
}

main().catch(console.error);
