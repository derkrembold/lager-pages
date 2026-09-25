// Grundgeruest-Test (lager-pages#1, aktualisiert fuer #2s Kachel-Darstellung): startet einen
// lokalen Server fuer das Repo, laedt index.html per Playwright/Chromium und prueft, dass alle
// Gruppennamen aus mobile-export.json als Ebene-1-Kacheln im DOM auftauchen. Aufruf:
// node tests/visuell/test_grundgeruest.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const PROJEKT_ROOT = path.resolve(__dirname, '..', '..');
const MIME_TYPEN = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css'
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
    await page.waitForSelector('.group-tile');

    const erwartet = JSON.parse(fs.readFileSync(path.join(PROJEKT_ROOT, 'mobile-export.json'), 'utf-8'))
      .groups.map((g) => g.name);
    const tatsaechlich = await page.$$eval('.group-tile-label', (els) => els.map((el) => el.textContent));

    const fehlend = erwartet.filter((name) => !tatsaechlich.includes(name));
    if (fehlend.length > 0) {
      bestanden = false;
      console.log(`FAIL - fehlende Gruppen-Kacheln im DOM: ${fehlend.join(', ')}`);
    } else {
      console.log('PASS - alle Gruppennamen aus mobile-export.json erscheinen als Ebene-1-Kacheln');
    }
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(bestanden ? 0 : 1);
})();
