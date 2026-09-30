// Navigations-Test (lager-pages#3): Regal-Kachel antippen -> Ebene 3 (Faecher-Raster), Fach
// antippen -> Ebene 4 (Item-Details), "Back" jeweils eine Ebene zurueck. Nutzt die echten Gruppen
// "Schrank 3" (Fach mit genau einem Item, "Schrank 3 links") und "Gang" (enthaelt ein echtes
// leeres Fach, Compartment 848 in "Gang Links") - deckt beide Faelle mit echten Daten ab statt
// nur synthetisch. Aufruf: node tests/visuell/test_ebene3_4.js

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

(async () => {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');

    await page.click('.group-tile:has-text("Schrank 3")');
    await page.waitForSelector('#ebene2:not(.hidden)');
    await page.click('.storage-tile:has-text("Schrank 3 links")');
    await page.waitForSelector('#ebene3:not(.hidden)');

    await pruefe('Ebene 3 zeigt den Regal-Namen als Titel und Fach-Kacheln', async () => {
      const titel = await page.textContent('#ebene3-titel');
      if (titel !== 'Schrank 3 links') throw new Error(`erwarte Titel "Schrank 3 links", bekommen "${titel}"`);
      const anzahl = await page.$$eval('.faecher-zelle', (els) => els.length);
      if (anzahl < 1) throw new Error('erwarte mindestens eine Fach-Kachel');
    });

    await pruefe('Reihen sind absteigend sortiert (hoechste Reihe oben)', async () => {
      const reihenTops = await page.$$eval('.faecher-row', (rows) =>
        rows.map((r) => r.getBoundingClientRect().top)
      );
      for (let i = 1; i < reihenTops.length; i++) {
        if (reihenTops[i] <= reihenTops[i - 1]) {
          throw new Error(`Reihen nicht von oben nach unten sortiert: ${JSON.stringify(reihenTops)}`);
        }
      }
    });

    await page.click('.faecher-zelle:has-text("Hutschienenhalter")');
    await page.waitForSelector('#ebene4:not(.hidden)');

    await pruefe('Antippen einer Fach-Kachel mit Item zeigt Ebene 4 mit den Item-Details', async () => {
      const text = await page.textContent('#items');
      if (!text.includes('Hutschienenhalter')) throw new Error(`erwarte "Hutschienenhalter" in Ebene 4, bekommen: ${text}`);
      if (!text.includes('Stock:')) throw new Error(`erwarte "Stock:" in Ebene 4, bekommen: ${text}`);
    });

    await page.click('#ebene4 [data-back]');
    await page.waitForSelector('#ebene3:not(.hidden)');

    await pruefe('"Back" von Ebene 4 fuehrt zurueck zu Ebene 3 (nicht ganz nach Ebene 1)', async () => {
      const ebene2Versteckt = await page.$eval('#ebene2', (el) => el.classList.contains('hidden'));
      if (!ebene2Versteckt) throw new Error('#ebene2 sollte weiterhin "hidden" sein - Back geht nur eine Ebene zurueck');
    });

    await page.click('#ebene3 [data-back]');
    await page.waitForSelector('#ebene2:not(.hidden)');
    await page.click('#back');
    await page.waitForSelector('#ebene1:not(.hidden)');

    // Zweiter Fall: echtes leeres Fach (Compartment 848, "Gang Links") - muss "-" zeigen und
    // trotzdem navigierbar sein (wie im TUI seit dem 2026-08-24-Bugfix).
    await page.click('.group-tile:has-text("Gang")');
    await page.waitForSelector('#ebene2:not(.hidden)');
    await page.click('.storage-tile:has-text("Gang Links")');
    await page.waitForSelector('#ebene3:not(.hidden)');

    await pruefe('Leeres Fach zeigt "-" statt nichts', async () => {
      const leereZelle = await page.$('[data-compartment-id="848"]');
      if (!leereZelle) throw new Error('erwarte Compartment 848 im DOM');
      const text = (await leereZelle.textContent()).trim();
      if (text !== '-') throw new Error(`erwarte "-" fuer ein leeres Fach, bekommen "${text}"`);
    });

    await page.click('[data-compartment-id="848"]');
    await page.waitForSelector('#ebene4:not(.hidden)');

    await pruefe('Antippen eines leeren Fachs navigiert trotzdem zu Ebene 4 mit "(empty)"', async () => {
      const text = await page.textContent('#items');
      if (!text.includes('(empty)')) throw new Error(`erwarte "(empty)" in Ebene 4, bekommen: ${text}`);
    });
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(alleBestanden ? 0 : 1);
})();
