// Browser-Test fuer den Sprung zum Fundort (lager-pages#4, Schritt 2): Treffer in der
// Find-Ergebnisliste antippen navigiert zu Ebene 3, das gefundene Fach wird dort rot
// hervorgehoben (gleiches Prinzip wie FindItemScreen.select_result/
// CompartmentsScreen.highlight_compartment_id im TUI) - Ebene 2 wird dabei "echt" mit aufgebaut
// (kein reiner Anzeige-Shortcut), damit "Back" von Ebene 3 zu einer gefuellten Ebene 2 fuehrt.
// Aufruf: node tests/visuell/test_find_jump.js

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
  await page.waitForSelector('.find-result');
}

(async () => {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  const daten = JSON.parse(fs.readFileSync(path.join(PROJEKT_ROOT, 'mobile-export.json'), 'utf-8'));
  const treffer = daten.items.find((i) => i.name === 'Hutschienenhalter');
  if (!treffer) throw new Error('Testdaten enthalten kein Item "Hutschienenhalter"');

  try {
    const page = await browser.newPage({ viewport: { width: 375, height: 700 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');
    await page.click('.find-button');
    await page.waitForSelector('#find:not(.hidden)');
    await suche(page, 'Hutschienenhalter');
    await page.click('.find-result');
    await page.waitForSelector('#ebene3:not(.hidden)');

    await pruefe('Sprung zum Fundort zeigt Ebene 3 mit dem richtigen Regal-Titel', async () => {
      const titel = await page.textContent('#ebene3-titel');
      if (titel !== treffer.storage_name) throw new Error(`erwarte Titel "${treffer.storage_name}", bekommen "${titel}"`);
    });

    await pruefe('Genau das gefundene Fach ist rot hervorgehoben', async () => {
      const hervorgehoben = await page.$$eval('.faecher-zelle.search-highlight', (els) =>
        els.map((el) => el.dataset.compartmentId)
      );
      if (hervorgehoben.length !== 1) throw new Error(`erwarte genau 1 hervorgehobene Zelle, gefunden: ${hervorgehoben.length}`);
      if (Number(hervorgehoben[0]) !== treffer.compartment_id) {
        throw new Error(`erwarte Compartment ${treffer.compartment_id}, hervorgehoben ist ${hervorgehoben[0]}`);
      }
    });

    await pruefe('"Back" von Ebene 3 fuehrt zu einer echten, gefuellten Ebene 2 (nicht leer)', async () => {
      await page.click('#ebene3 [data-back]');
      await page.waitForSelector('#ebene2:not(.hidden)');
      const titel = await page.textContent('#ebene2-titel');
      if (titel !== treffer.group_name) throw new Error(`erwarte Titel "${treffer.group_name}", bekommen "${titel}"`);
      const anzahlStorages = await page.$$eval('.storage-tile', (els) => els.length);
      if (anzahlStorages < 1) throw new Error('erwarte mindestens eine Storage-Kachel auf der angesprungenen Ebene 2');
    });

    await pruefe('"Back" von Ebene 2 fuehrt weiter zu Ebene 1', async () => {
      await page.click('#back');
      await page.waitForSelector('#ebene1:not(.hidden)');
    });

    // Zweiter Sprung zu einem ANDEREN Fach - die alte Hervorhebung darf nicht erhalten bleiben.
    await page.click('.find-button');
    await page.waitForSelector('#find:not(.hidden)');
    await suche(page, 'LCD Module');
    await page.click('.find-result');
    await page.waitForSelector('#ebene3:not(.hidden)');

    await pruefe('Ein zweiter Sprung hinterlaesst keine Hervorhebung vom vorherigen Fach', async () => {
      const hervorgehoben = await page.$$eval('.faecher-zelle.search-highlight', (els) => els.length);
      if (hervorgehoben !== 1) throw new Error(`erwarte genau 1 hervorgehobene Zelle nach dem zweiten Sprung, gefunden: ${hervorgehoben}`);
    });
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(alleBestanden ? 0 : 1);
})();
