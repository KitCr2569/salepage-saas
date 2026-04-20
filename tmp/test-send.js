const fs = require("fs");

// Read .env.local manually
const envContent = fs.readFileSync(".env.local", "utf8");
const lines = envContent.split("\n");
let token = "";
for (const line of lines) {
  if (line.startsWith("META_PAGE_ACCESS_TOKEN=")) {
    token = line.split("=").slice(1).join("=").trim().replace(/"/g, "");
    break;
  }
}

console.log("Token found:", token ? "YES (" + token.substring(0, 15) + "...)" : "NO");

const psid = "6055545721205010";
const msg = "ทดสอบระบบส่งข้อความอัตโนมัติจาก HDG Wrap";

fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messaging_type: "RESPONSE",
    recipient: { id: psid },
    message: { text: msg }
  }),
})
.then(r => r.json())
.then(res => {
  console.log("Result:", JSON.stringify(res, null, 2));
})
.catch(err => console.error("Error:", err));
