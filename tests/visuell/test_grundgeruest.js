// Grundgeruest-Test (lager-pages#1): startet einen lokalen Server fuer das Repo, laedt
// index.html per Playwright/Chromium und prueft, dass alle Gruppennamen aus mobile-export.json
// im DOM auftauchen. Noch keine Navigation/Styling - das kommt erst mit #2/#3. Aufruf:
// node tests/visuell/test_grundgeruest.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const MIME_TYPEN = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

function starteServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPfad = decodeURIComponent(req.url.split('?')[0]);
      const dateiPfad = path.join(PROJEKT_ROOT, urlPfad === '/' ? '/index.html' : urlPfad);
      fs.readFile(dateiPfad, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME_TYPEN[path.extname(dateiPfad)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, () => resolve(server));
  });
}

(async () => {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  let bestanden = true;
  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('#gruppen li');

    const erwartet = JSON.parse(fs.readFileSync(path.join(PROJEKT_ROOT, 'mobile-export.json'), 'utf-8'))
      .groups.map((g) => g.name);
    const tatsaechlich = await page.$$eval('#gruppen li', (els) => els.map((el) => el.textContent));

    const fehlend = erwartet.filter((name) => !tatsaechlich.includes(name));
    if (fehlend.length > 0) {
      bestanden = false;
      console.log(`FAIL - fehlende Gruppen im DOM: ${fehlend.join(', ')}`);
    } else {
      console.log('PASS - alle Gruppennamen aus mobile-export.json erscheinen in #gruppen');
    }
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(bestanden ? 0 : 1);
})();
