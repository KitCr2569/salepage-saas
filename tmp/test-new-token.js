const fs = require("fs");

const NEW_TOKEN = "EAAUJClIo8Q8BRDw4Aq6ZB1BarzRFRGkJsO6oKHYfpMJblZBtjVAU3dRowyv7Um6MJpmo2ZANMLLZCHp9lTIRzQAPGdPmqI1bq1QQN7Fg0ZBXHJrHxuZB6nxvRiKQifa3ZA4P5MpwbyQgrc7YREXkQAVGVXPYzzCVNZCg5ppIhR927h0Ho234mubCKGEGM93m6AZDZD";
const psid = "6055545721205010";

console.log("Testing new token...");

fetch(`https://graph.facebook.com/v19.0/me?access_token=${NEW_TOKEN}`)
  .then(r => r.json())
  .then(page => {
    console.log("Page info:", page);
    if (page.error) {
      console.log("Token INVALID!");
      return;
    }
    console.log("Token VALID! Sending test message...");
    return fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${NEW_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_type: "RESPONSE",
        recipient: { id: psid },
        message: { text: "✅ ทดสอบ Token ใหม่สำเร็จ! ระบบส่งข้อความอัตโนมัติพร้อมใช้งานแล้วครับ" }
      }),
    }).then(r => r.json());
  })
  .then(res => {
    if (res) console.log("Send result:", JSON.stringify(res, null, 2));
  })
  .catch(err => console.error("Error:", err));
