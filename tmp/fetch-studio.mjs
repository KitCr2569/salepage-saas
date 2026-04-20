const res = await fetch('https://product-template-studio.vercel.app/assets/index-DwsDLWzI.js');
const js = await res.text();
console.log('Total JS size:', js.length, 'chars');

// Find all postMessage occurrences
let idx = 0;
let count = 0;
while ((idx = js.indexOf('postMessage', idx)) !== -1) {
    count++;
    const start = Math.max(0, idx - 300);
    const end = Math.min(js.length, idx + 300);
    console.log(`\n=== postMessage #${count} at index ${idx} ===`);
    console.log(js.substring(start, end));
    console.log('---');
    idx += 11;
}
console.log(`\nTotal postMessage occurrences: ${count}`);

// Find error messages
for (const term of ['ไม่สามารถส่งรูป', 'Cannot send', 'แท็กแสดงผล', 'กรอง', 'TEMPLATE_STUDIO_RESULT', 'opener', 'parent.post']) {
    const i = js.indexOf(term);
    if (i >= 0) {
        console.log(`\n=== "${term}" found at ${i} ===`);
        console.log(js.substring(Math.max(0, i - 200), Math.min(js.length, i + 400)));
    }
}
