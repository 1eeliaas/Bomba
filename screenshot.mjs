import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url    = process.argv[2] || 'http://localhost:3000';
const label  = process.argv[3] || '';
const outDir = path.join(__dirname, 'temporary screenshots');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Auto-increment filename
let n = 1;
while (fs.existsSync(path.join(outDir, `screenshot-${n}${label ? '-' + label : ''}.png`))) n++;
const filename = `screenshot-${n}${label ? '-' + label : ''}.png`;
const outPath  = path.join(outDir, filename);

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: undefined, // uses bundled Chromium
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
await new Promise(r => setTimeout(r, 800)); // let animations settle
await page.screenshot({ path: outPath, fullPage: true });

await browser.close();

console.log(`Screenshot saved: temporary screenshots/${filename}`);
