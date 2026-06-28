import { chromium } from 'playwright';
const base = process.env.BASE || 'http://localhost:3117';
const out = 'public/screenshots';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1240, height: 840 }, deviceScaleFactor: 1 });
async function shot(path, file, wait=3000){
  await page.goto(base+path, { waitUntil: 'networkidle' }).catch(()=>{});
  await page.waitForTimeout(wait);
  await page.screenshot({ path: out+'/'+file });
  console.log('captured', file);
}
await shot('/scan', 'scanner.png');
await shot('/short/COIN', 'detail.png');
await browser.close();
