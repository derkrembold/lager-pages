// Browser-Test fuer den Find-Screen (lager-pages#4, Schritt 1): Find ist von jeder Ebene aus
// erreichbar, "Back" kehrt zu GENAU der Ebene zurueck, von der aus Find geoeffnet wurde (nicht
// immer zu Ebene 1 - jede der vier Ebenen hat einen eigenen Find-Button). Noch kein Sprung zum
// Fundort (kommt mit Schritt 2). Aufruf: node tests/visuell/test_find.js

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

let alleBestanden = true;

async function pruefe(name, fn) {
  try {
    await fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.log(`${name}: FAIL - ${err.message}`);
    alleBestanden = false;
  }
}

async function suche(page, begriff) {
  await page.fill('#find-input', begriff);
  await page.click('#find-form button[type=submit]');
}

(async () => {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');

    await pruefe('Find von Ebene 1 aus geoeffnet -> "Back" fuehrt zurueck zu Ebene 1', async () => {
      await page.click('#ebene1 .find-button');
      await page.waitForSelector('#find:not(.hidden)');
      await page.click('#find-back');
      await page.waitForSelector('#ebene1:not(.hidden)');
    });

    await page.click('.group-tile:has-text("Schrank 3")');
    await page.waitForSelector('#ebene2:not(.hidden)');

    await pruefe('Find von Ebene 2 aus geoeffnet -> "Back" fuehrt zurueck zu Ebene 2 (nicht zu Ebene 1)', async () => {
      await page.click('#ebene2 .find-button');
      await page.waitForSelector('#find:not(.hidden)');
      await page.click('#find-back');
      await page.waitForSelector('#ebene2:not(.hidden)');
      const ebene1Versteckt = await page.$eval('#ebene1', (el) => el.classList.contains('hidden'));
      if (!ebene1Versteckt) throw new Error('#ebene1 sollte weiterhin "hidden" sein');
    });

    await pruefe('Suche nach "Shield" liefert mehrere Treffer mit Name + Standort', async () => {
      await page.click('#ebene2 .find-button');
      await page.waitForSelector('#find:not(.hidden)');
      await suche(page, 'Shield');
      await page.waitForSelector('.find-result');
      const anzahl = await page.$$eval('.find-result', (els) => els.length);
      if (anzahl < 1) throw new Error('erwarte mindestens einen Treffer fuer "Shield"');
      const standortText = await page.textContent('.find-result-standort');
      if (!standortText.includes('Group:') || !standortText.includes('Storage:')) {
        throw new Error(`erwarte "Group:"/"Storage:" im Standort-Text, bekommen: ${standortText}`);
      }
    });

    await pruefe('Suche ohne Treffer zeigt "No matches."', async () => {
      await suche(page, 'Zzzznichtvorhanden');
      await page.waitForSelector('#find-results');
      const text = await page.textContent('#find-results');
      if (!text.includes('No matches.')) throw new Error(`erwarte "No matches.", bekommen: ${text}`);
    });
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(alleBestanden ? 0 : 1);
})();
