const PAGE_TOKEN = "EAAUJClIo8Q8BRPZBarkoh4ac6jSfwmWRxUxO5hCdMBkPIN5TtBuLkCyM4ult1a3tk7I18CwazKvrzuOQdYQSpSsqEbbntby8gANmCkWGQD1bUsuBlR75G7ouSCuxFGNmTtViWSkBxoABjOMZBZArR8aB0ux4CVTZAa6IlcZBOtfWnFTSvkB8FbAM5W0ZB6FIvrsAZChoeHtVf2OoNWiuoZCnDwLZAc8UoJ0HzO6m4sgZDZD";
const psid = "6055545721205010";

async function main() {
  // Step 1: Verify token
  console.log("1. Verifying token...");
  const pageInfo = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${PAGE_TOKEN}`).then(r => r.json());
  console.log("   Page:", pageInfo.name, "(ID:", pageInfo.id + ")");

  if (pageInfo.error) {
    console.log("   ERROR:", pageInfo.error.message);
    return;
  }

  // Step 2: Test send message
  console.log("2. Sending test message...");
  const sendResult = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_type: "RESPONSE",
      recipient: { id: psid },
      message: { text: "✅ ทดสอบ Token ใหม่สำเร็จ! ระบบส่งข้อความอัตโนมัติพร้อมใช้งานแล้วครับ" }
    }),
  }).then(r => r.json());
  console.log("   Result:", JSON.stringify(sendResult, null, 2));

  // Step 3: Check token expiry
  console.log("3. Checking token expiry...");
  const debugInfo = await fetch(`https://graph.facebook.com/v19.0/debug_token?input_token=${PAGE_TOKEN}&access_token=${PAGE_TOKEN}`).then(r => r.json());
  if (debugInfo.data) {
    const exp = debugInfo.data.expires_at;
    console.log("   Expires:", exp === 0 ? "NEVER (permanent!)" : new Date(exp * 1000).toISOString());
  }
}

main().catch(console.error);
