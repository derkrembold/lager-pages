// Regressionstest fuer Issue #7: eine side-by-side-Gruppe mit vielen/langen Storage-Namen (z. B.
// die echte Gruppe "Raeder") darf ihre letzte(n) Kachel(n) nie ueber den Viewport hinausragen
// lassen - stattdessen soll der Ueberschuss in eine neue Zeile umbrechen (siehe .regale-row
// flex-wrap in style.css). Nutzt bewusst SYNTHETISCHE Testdaten mit besonders vielen/langen
// Storage-Namen statt der echten mobile-export.json, gleiches Prinzip wie test_overflow.js aus
// #5. Aufruf: node tests/visuell/test_overflow_ebene2.js

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

// Extremfall: 6 Storages mit langen Namen in einer side-by-side-Gruppe - passt in keinem Fall in
// eine einzige Zeile auf einem 320px-Viewport.
const PATHOLOGISCHE_GRUPPE = {
  id: 1,
  name: "Viele lange Storages",
  arrangement: "side-by-side",
  storages: [
    { id: 1, name: "Kondensatoren Sortiment A" },
    { id: 2, name: "Sicherungen Feinsicherung" },
    { id: 3, name: "Unsortiertes Kleinmaterial" },
    { id: 4, name: "Widerstaende Praezision" },
    { id: 5, name: "Spulen und Drosseln" },
    { id: 6, name: "Steckverbinder Diverse" }
  ]
};

// Regressionstest gegen die echten Gruppen "Schrank 3" (3 Storages, kurze Namen) und "Raeder" (4
// Storages, laengere Namen) - konkret der vom User gemeldete Fall (2026-09-28): der urspruengliche
// min-width-Wert (120px) war zu grosszuegig und brach auch "Schrank 3" unnoetig um, obwohl das
// vorher (vor #7) problemlos in eine Zeile passte. Die Regel ist "wenn moeglich eine Zeile, nur
// bei echtem Platzmangel umbrechen" - "Schrank 3" MUSS also immer einzeilig bleiben, "Raeder" darf
// (je nach Breite) umbrechen, darf aber NIE ueberlaufen.
async function pruefeEchteGruppen(port, browser) {
  for (const vw of [320, 375, 414]) {
    const page = await browser.newPage({ viewport: { width: vw, height: 600 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');

    await pruefe(`"Schrank 3" bleibt bei ${vw}px Breite einzeilig`, async () => {
      await page.click('.group-tile:has-text("Schrank 3")');
      await page.waitForSelector('#ebene2:not(.hidden)');
      const zeilenAnzahl = await page.evaluate(() =>
        new Set([...document.querySelectorAll('.storage-tile')].map((t) => Math.round(t.getBoundingClientRect().top))).size
      );
      if (zeilenAnzahl !== 1) {
        throw new Error(`erwarte 1 Zeile fuer "Schrank 3" (3 kurze Namen passen), gefunden: ${zeilenAnzahl}`);
      }
      await page.click('#back');
      await page.waitForSelector('#ebene1:not(.hidden)');
    });

    await pruefe(`"Raeder" ragt bei ${vw}px Breite nie ueber den Viewport hinaus`, async () => {
      await page.click('.group-tile:has-text("Raeder")');
      await page.waitForSelector('#ebene2:not(.hidden)');
      const ueberstand = await page.evaluate(() => {
        const viewportBreite = window.innerWidth;
        return [...document.querySelectorAll('.storage-tile')]
          .map((t) => t.getBoundingClientRect().right)
          .filter((rechts) => rechts > viewportBreite + 0.5);
      });
      if (ueberstand.length > 0) {
        throw new Error(`"Raeder"-Kacheln ragen bei ${vw}px raus: ${JSON.stringify(ueberstand)}`);
      }
      await page.click('#back');
      await page.waitForSelector('#ebene1:not(.hidden)');
    });

    await page.close();
  }
}

(async () => {
  const server = await starteServer();
  const port = server.address().port;
  const browser = await chromium.launch();
  try {
    await pruefeEchteGruppen(port, browser);

    const page = await browser.newPage({ viewport: { width: 320, height: 800 } });
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('.group-tile');
    // Irgendeine echte Gruppe antippen, um nach Ebene 2 zu wechseln - der Inhalt wird gleich
    // durch die pathologischen Testdaten ersetzt.
    await page.click('.group-tile');
    await page.waitForSelector('#ebene2:not(.hidden)');

    await page.evaluate(async (gruppe) => {
      const mod = await import('/view/regale.js');
      mod.zeigeRegale(gruppe, document.getElementById('regale'));
    }, PATHOLOGISCHE_GRUPPE);
    await page.waitForSelector('.storage-tile');

    await pruefe('Keine Storage-Kachel ragt ueber den Viewport hinaus, selbst bei 6 langen Namen in einer side-by-side-Gruppe', async () => {
      const ueberstand = await page.evaluate(() => {
        const viewportBreite = window.innerWidth;
        return [...document.querySelectorAll('.storage-tile')]
          .map((t) => ({ text: t.textContent, rechts: t.getBoundingClientRect().right }))
          .filter((t) => t.rechts > viewportBreite + 0.5);
      });
      if (ueberstand.length > 0) {
        throw new Error(`Storage-Kacheln ragen ueber den Viewport hinaus: ${JSON.stringify(ueberstand)}`);
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

    await pruefe('Ueberschuessige Kacheln brechen tatsaechlich in eine neue Zeile um (nicht nur schmaler gequetscht)', async () => {
      const zeilenAnzahl = await page.evaluate(() => {
        const tops = [...document.querySelectorAll('.storage-tile')].map((t) => Math.round(t.getBoundingClientRect().top));
        return new Set(tops).size;
      });
      if (zeilenAnzahl < 2) {
        throw new Error(`erwarte mindestens 2 Zeilen bei 6 Kacheln auf 320px Breite, gefunden: ${zeilenAnzahl}`);
      }
    });
  } finally {
    await browser.close();
    server.close();
  }
  process.exit(alleBestanden ? 0 : 1);
})();
