// Download Template Studio HTML + JS and patch for iframe support
const baseUrl = 'https://product-template-studio.vercel.app';

// 1. Fetch HTML
const htmlRes = await fetch(baseUrl + '/');
const html = await htmlRes.text();
console.log('HTML size:', html.length);

// 2. Fetch JS bundle
const jsRes = await fetch(baseUrl + '/assets/index-DwsDLWzI.js');
const js = await jsRes.text();
console.log('JS size:', js.length);

// 3. Fetch CSS (if any)
const cssMatch = html.match(/href="([^"]*\.css[^"]*)"/);
let css = '';
if (cssMatch) {
    const cssRes = await fetch(baseUrl + cssMatch[1]);
    css = await cssRes.text();
    console.log('CSS size:', css.length, 'URL:', cssMatch[1]);
}

// 4. Patch JS: add window.parent support alongside window.opener
const patchedJs = js
    // Patch the apply button click handler
    .replace(
        'if(window.opener){const d=new URLSearchParams(window.location.search);window.opener.postMessage({type:"TEMPLATE_STUDIO_RESULT",index:d.get("index"),imageDataUrl:i},"*"),p("ส่งภาพไปยังร้านค้าเรียบร้อย!","success"),e.applyBtn.innerHTML="ส่งสำเร็จ! กำลังปิด...",setTimeout(()=>{window.close()},1e3)}else p("ไม่สามารถส่งรูปได้ (แท็บแอดมินถูกปิดไปแล้ว)","error")',
        'const d=new URLSearchParams(window.location.search);if(window.opener){window.opener.postMessage({type:"TEMPLATE_STUDIO_RESULT",index:d.get("index"),imageDataUrl:i},"*"),p("ส่งภาพไปยังร้านค้าเรียบร้อย!","success"),e.applyBtn.innerHTML="ส่งสำเร็จ! กำลังปิด...",setTimeout(()=>{window.close()},1e3)}else if(window.parent&&window.parent!==window){window.parent.postMessage({type:"TEMPLATE_STUDIO_RESULT",index:d.get("index"),imageDataUrl:i},"*"),p("ส่งภาพไปยังร้านค้าเรียบร้อย!","success"),e.applyBtn.innerHTML="ส่งสำเร็จ!"}else p("ไม่สามารถส่งรูปได้ (แท็บแอดมินถูกปิดไปแล้ว)","error")'
    )
    // Patch the apply button visibility check
    .replace(
        'window.opener||t.has("target")?e.applyBtn.style.display="flex":e.applyBtn.style.display="none"',
        'window.opener||t.has("target")||(window.parent&&window.parent!==window)?e.applyBtn.style.display="flex":e.applyBtn.style.display="none"'
    );

// Check if patches applied
const applyPatched = patchedJs.includes('window.parent&&window.parent!==window');
console.log('Patch applied:', applyPatched);

// 5. Write files
import { writeFileSync, mkdirSync } from 'fs';
mkdirSync('public/template-studio/assets', { recursive: true });

// Write patched JS
writeFileSync('public/template-studio/assets/index-DwsDLWzI.js', patchedJs);
console.log('Wrote patched JS');

// Write CSS if exists
if (css && cssMatch) {
    const cssPath = cssMatch[1].replace(/^\//, '');
    writeFileSync('public/template-studio/' + cssPath, css);
    console.log('Wrote CSS:', cssPath);
}

// Write HTML with local asset paths
const localHtml = html
    .replace(/src="\/assets\//g, 'src="./assets/')
    .replace(/href="\/assets\//g, 'href="./assets/');
writeFileSync('public/template-studio/index.html', localHtml);
console.log('Wrote HTML');

console.log('\nDone! Template Studio hosted locally at /template-studio/index.html');
