const fs = require("fs");
const file = ".env.local";
let content = fs.readFileSync(file, "utf8");
const NEW_TOKEN = "EAADhsxfbE8sBRH1jIAhHmXWTAyhipKPPvKZA1X2UlgQDlzCzu48hdH4dReT3aCUN8sDZARIyfjuUbUwiXZCNr5WnoSgva0aXvSWCgxtT7epEA7PXxXYmZA6z6veZAoqjiOjnckcG8rgOZCIjXMe8bDVOPhwloydYVyYmG0tL61vQ9N4d68Ile6gxZCMl9dp9QZCum6UMyUwZD";
content = content.replace(/META_PAGE_ACCESS_TOKEN=.*/, 'META_PAGE_ACCESS_TOKEN="' + NEW_TOKEN + '"');
content = content.replace(/PAGE_ACCESS_TOKEN=.*/, 'PAGE_ACCESS_TOKEN="' + NEW_TOKEN + '"');
fs.writeFileSync(file, content);
console.log("Updated .env.local with PageClaw token");
