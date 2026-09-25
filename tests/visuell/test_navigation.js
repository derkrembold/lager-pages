// Navigations-Test (lager-pages#2): Antippen einer Gruppen-Kachel wechselt zu Ebene 2 (Regale
// dieser Group), "Zurueck" wechselt wieder zurueck. Nutzt bewusst die Gruppe "Gang" - die hat in
// storage_layout.json eine echte Luecke (null-Eintrag), deckt also auch das Luecken-Rendering ab,
// nicht nur den einfachen Fall. Aufruf: node tests/visuell/test_navigation.js

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
  const daten = JSON.parse(fs.readFileSync(path.join(PROJEKT_ROOT, 'mobile-export.json'), 'utf-8'));
  const gang = daten.groups.find((g) => g.name === 'Gang');
  if (!gang) throw new Error('Testdaten enthalten keine Gruppe "Gang" - Test setzt die echte Gruppe mit einer Luecke in storage_layout.json voraus');

  try {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');

    await pruefe('Ebene 2 ist zu Beginn versteckt', async () => {
      const versteckt = await page.$eval('#ebene2', (el) => el.classList.contains('hidden'));
      if (!versteckt) throw new Error('#ebene2 sollte beim Start "hidden" sein');
    });

    await page.click(`.group-tile[data-group-id="${gang.id}"]`);
    await page.waitForSelector('#ebene2:not(.hidden)');

    await pruefe('Antippen der Gruppen-Kachel zeigt Ebene 2 mit dem richtigen Titel', async () => {
      const titel = await page.textContent('#ebene2-titel');
      if (titel !== gang.name) throw new Error(`erwarte Titel "${gang.name}", bekommen "${titel}"`);
      const ebene1Versteckt = await page.$eval('#ebene1', (el) => el.classList.contains('hidden'));
      if (!ebene1Versteckt) throw new Error('#ebene1 sollte jetzt "hidden" sein');
    });

    await pruefe('Regal-Kacheln entsprechen den echten Storages (Luecke bleibt ohne eigene Kachel)', async () => {
      const erwarteteNamen = gang.storages.filter((s) => s !== null).map((s) => s.name);
      const tatsaechlicheNamen = await page.$$eval('.storage-tile', (els) => els.map((el) => el.textContent));
      if (JSON.stringify(tatsaechlicheNamen) !== JSON.stringify(erwarteteNamen)) {
        throw new Error(`erwarte ${JSON.stringify(erwarteteNamen)}, bekommen ${JSON.stringify(tatsaechlicheNamen)}`);
      }
      const anzahlLuecken = await page.$$eval('.storage-gap', (els) => els.length);
      const erwarteteLuecken = gang.storages.filter((s) => s === null).length;
      if (anzahlLuecken !== erwarteteLuecken) {
        throw new Error(`erwarte ${erwarteteLuecken} Luecken-Platzhalter, bekommen ${anzahlLuecken}`);
      }
    });

    await page.click('#zurueck');
    await page.waitForSelector('#ebene1:not(.hidden)');

    await pruefe('"Zurueck" wechselt wieder zu Ebene 1', async () => {
      const ebene2Versteckt = await page.$eval('#ebene2', (el) => el.classList.contains('hidden'));
      if (!ebene2Versteckt) throw new Error('#ebene2 sollte nach "Zurueck" wieder "hidden" sein');
    });
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(alleBestanden ? 0 : 1);
})();
