const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8765;
const ROOT = __dirname;

// Simple static file server
const server = http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);
  const mime = {
    '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
    '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon'
  };
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, async () => {
  console.log(`Server: http://localhost:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  // Inject demo data before loading
  await page.addInitScript(() => {
    const demoData = {
      reminder: { frequency: 'weekly', weekday: '3', time: '08:00', drug: 'tirzepatide', drugName: 'Mounjaro', dose: 5 },
      injections: [
        { date: '2026-06-14', drug: 'tirzepatide', drugName: 'Mounjaro', dose: 5, site: 'abdomen-ll', siteName: '腹部左下', note: '' },
        { date: '2026-06-07', drug: 'tirzepatide', drugName: 'Mounjaro', dose: 5, site: 'abdomen-ur', siteName: '腹部右上', note: '' },
        { date: '2026-05-31', drug: 'tirzepatide', drugName: 'Mounjaro', dose: 2.5, site: 'thigh-left', siteName: '左大腿', note: '起始剂量' }
      ],
      weights: [
        { date: '2026-05-31', weight: 88.5 },
        { date: '2026-06-05', weight: 86.2 },
        { date: '2026-06-10', weight: 84.0 },
        { date: '2026-06-17', weight: 82.3 }
      ],
      sideEffects: [],
      height: 170,
      waists: [
        { date: '2026-05-31', waist: 98 },
        { date: '2026-06-10', waist: 94 },
        { date: '2026-06-17', waist: 91 }
      ],
      healthIndicators: [
        { date: '2026-06-01', tc: 5.8, tg: 2.1, hdl: 1.1, ldl: 3.5, fattyLiver: 'moderate' },
        { date: '2026-06-15', tc: 4.9, tg: 1.6, hdl: 1.3, ldl: 2.8, fattyLiver: 'mild' }
      ]
    };
    localStorage.setItem('glp1_a…data', JSON.stringify(demoData));
  });

  await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle' });

  // Click Health tab
  await page.click('[data-tab="health"]');
  await page.waitForTimeout(500);

  // Take screenshots of each sub-tab
  // 1. Weight sub-tab (default)
  await page.screenshot({ path: 'screenshot-health-weight.png', fullPage: true });
  console.log('✅ screenshot-health-weight.png');

  // 2. Waist sub-tab
  await page.click('.sub-nav-btn[data-sub="waist"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshot-health-waist.png', fullPage: true });
  console.log('✅ screenshot-health-waist.png');

  // 3. Indicators sub-tab
  await page.click('.sub-nav-btn[data-sub="indicators"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'screenshot-health-indicators.png', fullPage: true });
  console.log('✅ screenshot-health-indicators.png');

  await browser.close();
  server.close();
  console.log('Done!');
});
