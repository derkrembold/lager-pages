// Reine Logik-Tests fuer die AND/OR-Suche (lager-pages#4, Schritt 1) - kein Browser noetig, testet
// model/suche.js direkt (ES-Modul, per dynamic import). Deckt dieselben Faelle ab wie das CLI-
// Original (model.py parse_search_query()/search_items()), damit das Verhalten wirklich identisch
// ist. Aufruf: node tests/visuell/test_suche.js

let alleBestanden = true;

function pruefe(name, fn) {
  try {
    fn();
    console.log(`${name}: PASS`);
  } catch (err) {
    console.log(`${name}: FAIL - ${err.message}`);
    alleBestanden = false;
  }
}

function gleich(tatsaechlich, erwartet, meldung) {
  const t = JSON.stringify(tatsaechlich);
  const e = JSON.stringify(erwartet);
  if (t !== e) throw new Error(`${meldung}: erwartet ${e}, bekommen ${t}`);
}

(async () => {
  const { parseSuchanfrage, sucheItems } = await import('../../model/suche.js');

  pruefe('parseSuchanfrage: ein Wort ohne Operator -> eine Gruppe mit einem Wort', () => {
    gleich(parseSuchanfrage('Schraube'), [['Schraube']], 'Gruppen');
  });

  pruefe('parseSuchanfrage: "AND" wirkt wie ein Leerzeichen (bleibt in derselben Gruppe)', () => {
    gleich(parseSuchanfrage('Schraube AND M3'), [['Schraube', 'M3']], 'Gruppen');
  });

  pruefe('parseSuchanfrage: "OR" trennt in mehrere Gruppen', () => {
    gleich(parseSuchanfrage('Schraube OR Mutter'), [['Schraube'], ['Mutter']], 'Gruppen');
  });

  pruefe('parseSuchanfrage: "or"/"AND" case-insensitive erkannt', () => {
    gleich(parseSuchanfrage('a or b and c'), [['a'], ['b', 'c']], 'Gruppen');
  });

  const ITEMS = [
    { id: 1, name: 'Schraube M3' },
    { id: 2, name: 'Schraube M4' },
    { id: 3, name: 'Mutter M3' },
    { id: 4, name: 'Unterlegscheibe' }
  ];

  pruefe('sucheItems: einfache Substring-Suche, case-insensitive', () => {
    const treffer = sucheItems(ITEMS, 'schraube').map((i) => i.id);
    gleich(treffer, [1, 2], 'Treffer');
  });

  pruefe('sucheItems: AND (alle Woerter muessen vorkommen)', () => {
    const treffer = sucheItems(ITEMS, 'Schraube M3').map((i) => i.id);
    gleich(treffer, [1], 'Treffer');
  });

  pruefe('sucheItems: OR (irgendeine Gruppe muss komplett passen)', () => {
    const treffer = sucheItems(ITEMS, 'Schraube M4 OR Mutter M3').map((i) => i.id);
    gleich(treffer, [2, 3], 'Treffer');
  });

  pruefe('sucheItems: keine Treffer -> leeres Array', () => {
    const treffer = sucheItems(ITEMS, 'Zzzznichtvorhanden');
    gleich(treffer, [], 'Treffer');
  });

  process.exit(alleBestanden ? 0 : 1);
})();
