const fs = require('fs');
let c = fs.readFileSync('src/app/api/shop/chatbot/route.ts', 'utf8');

c = c.replace(/const token = process\.env\.META_PAGE_ACCESS_TOKEN \|\| process\.env\.PAGE_ACCESS_TOKEN;[\s\S]*?catch \(err: any\) \{/m, `const { pageAccessToken } = await getFacebookPageConfig();
        const token = pageAccessToken;
        let fbConnection = { connected: false, pageName: null, error: "No token found" };
        
        if (token) {
            try {
                const fbRes = await fetch(\`https://graph.facebook.com/v19.0/me?access_token=\${token}\`);
                if (fbRes.ok) {
                    const fbData = await fbRes.json();
                    fbConnection = { connected: true, pageName: fbData.name, error: "" };
                } else {
                    const errorData = await fbRes.json();
                    fbConnection = { connected: false, pageName: null, error: errorData?.error?.message || "Invalid Token" };
                }
            } catch (err: any) {`);

fs.writeFileSync('src/app/api/shop/chatbot/route.ts', c);
