// Regressionstest fuer Issue #5: eine Kachel mit vielen Regal-Vorschau-Rechtecken darf den
// gesamten Grid nie ueber den Viewport hinaus verbreitern (CSS-Grid-Default `min-width: auto` auf
// Grid-Items - siehe style.css .group-tile-Kommentar). Nutzt bewusst SYNTHETISCHE Testdaten mit
// besonders vielen Vorschau-Rechtecken statt der echten mobile-export.json: der reale Bug war auf
// echten Handys reproduzierbar, aber je nach Schriftart-Metrik nicht zuverlaessig in jedem
// Test-Browser - ein extremer, konstruierter Fall macht den Test deterministisch statt von
// Font-Rendering-Zufaellen abzuhaengen. Aufruf: node tests/visuell/test_overflow.js

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

// Extremfall: eine "wide"-Gruppe mit 30 Regalen (viele schmale Vorschau-Rechtecke in einer Reihe)
// und eine "narrow"-Gruppe mit einem einzelnen, sehr langen, unteilbaren "Wort" als Name.
const PATHOLOGISCHE_GRUPPEN = [
  {
    id: 1,
    name: "Viele Regale",
    arrangement: "side-by-side",
    storages: Array.from({ length: 30 }, (_, i) => ({ id: i, name: `R${i}`, rows: [] }))
  },
  {
    id: 2,
    name: "Xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    arrangement: "stacked",
    storages: [{ id: 100, name: "A", rows: [] }]
  }
];

(async () => {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');

    await page.evaluate(async (gruppen) => {
      const mod = await import('/view/gruppen.js');
      mod.zeigeGruppen(gruppen, document.getElementById('gruppen-grid'), () => {});
    }, PATHOLOGISCHE_GRUPPEN);
    await page.waitForSelector('.group-tile');

    await pruefe('Keine Kachel ragt ueber den Viewport hinaus, selbst bei extrem vielen Vorschau-Rechtecken/einem sehr langen Namen', async () => {
      const ueberstand = await page.evaluate(() => {
        const viewportBreite = window.innerWidth;
        return [...document.querySelectorAll('.group-tile')]
          .map((t) => ({ label: t.querySelector('.group-tile-label').textContent.slice(0, 20), rechts: t.getBoundingClientRect().right }))
          .filter((t) => t.rechts > viewportBreite + 0.5);
      });
      if (ueberstand.length > 0) {
        throw new Error(`Kacheln ragen ueber den Viewport hinaus: ${JSON.stringify(ueberstand)}`);
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
