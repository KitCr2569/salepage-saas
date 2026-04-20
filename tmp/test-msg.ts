import 'dotenv/config';

async function test() {
  const psid = "6055545721205010"; // From the user's DB output
  const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || process.env.PAGE_ACCESS_TOKEN;
  
  if (!PAGE_ACCESS_TOKEN) {
    console.log("No token in .env");
    return;
  }
  
  console.log("Token starts with:", PAGE_ACCESS_TOKEN.substring(0, 10));

  const msg = "สวัสดีครับ ทดสอบส่งข้อความจากระบบหลังบ้าน";
  
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_type: "RESPONSE",
        recipient: { id: psid },
        message: { text: msg }
      }),
    });
    const result = await res.json();
    console.log("Send Result:", result);
  } catch (err) {
    console.error("Fetch Error:", err);
  }
}

test();
