// Regressionstest fuer Ebene 3 (lager-pages#3), gleiches Prinzip wie test_overflow.js/
// test_overflow_ebene2.js aus #5/#7: eine Fach-Kachel mit vielen gestapelten Items oder einem
// sehr langen, unteilbaren Namen darf nie ueber den Viewport hinausragen - stattdessen soll sie
// (wie .storage-tile) nach unten wachsen. Nutzt bewusst SYNTHETISCHE Testdaten. Aufruf:
// node tests/visuell/test_overflow_ebene3.js

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

function fach(id, column, itemNamen) {
  return { id, column, items: itemNamen.map((name, i) => ({ id: id * 100 + i, name })) };
}

// Extremfall: 8 gestapelte Items in einer Zelle + eine Zelle mit einem einzelnen, sehr langen
// unteilbaren Namen (keine ";"-Segmente, kein Leerzeichen).
const PATHOLOGISCHER_STORAGE = {
  id: 1,
  name: "Pathologisches Regal",
  rows: [
    {
      row: 1,
      compartments: [
        fach(1, 1, Array.from({ length: 8 }, (_, i) => `Bauteil Nummer ${i}`)),
        fach(2, 2, ["Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"]),
        fach(3, 3, ["Normales Teil"])
      ]
    }
  ]
};

(async () => {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');
    await page.click('.group-tile');
    await page.waitForSelector('#ebene2:not(.hidden)');
    await page.click('.storage-tile');
    await page.waitForSelector('#ebene3:not(.hidden)');

    await page.evaluate(async (storage) => {
      const mod = await import('/view/faecher.js');
      mod.zeigeFaecher(storage, document.getElementById('faecher'), () => {});
    }, PATHOLOGISCHER_STORAGE);
    await page.waitForSelector('.faecher-zelle');

    await pruefe('Keine Fach-Kachel ragt ueber den Viewport hinaus, selbst bei 8 gestapelten Items oder einem sehr langen Namen', async () => {
      const ueberstand = await page.evaluate(() => {
        const viewportBreite = window.innerWidth;
        return [...document.querySelectorAll('.faecher-zelle')]
          .map((t) => t.getBoundingClientRect().right)
          .filter((rechts) => rechts > viewportBreite + 0.5);
      });
      if (ueberstand.length > 0) {
        throw new Error(`Fach-Kacheln ragen ueber den Viewport hinaus: ${JSON.stringify(ueberstand)}`);
      }
    });

    await pruefe('Seite bekommt keinen horizontalen Scrollbalken', async () => {
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      }));
      if (scrollWidth > clientWidth) {
        throw new Error(`document.documentElement.scrollWidth (${scrollWidth}) > clientWidth (${clientWidth})`);
      }
    });
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(alleBestanden ? 0 : 1);
})();
