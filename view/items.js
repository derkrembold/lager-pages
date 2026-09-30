// Ebene 4 (Item-Details) - wie ItemBox/ItemDetailScreen im lager-cli-TUI: gestapelte Boxen, eine
// pro Item (oder eine leere Box, falls das Fach nichts enthaelt) - Name, Stock/Reorder-Level,
// optional Comment/Provider. Rein lesend, nichts anklickbar (kein Edit/Remove auf Ebene 4 in
// lager-pages, siehe Issue #3).
export function zeigeItems(fach, container) {
  container.innerHTML = "";
  container.className = "item-boxes";
  const items = fach.items;
  if (items.length === 0) {
    const box = document.createElement("div");
    box.className = "item-box";
    box.textContent = "(empty)";
    container.appendChild(box);
    return;
  }
  for (const item of items) {
    const box = document.createElement("div");
    box.className = "item-box";
    box.dataset.itemId = item.id;

    const zeilen = [item.name, `Stock: ${item.stock} (Reorder level: ${item.reorder_level})`];
    if (item.comment) zeilen.push(`Comment: ${item.comment}`);
    if (item.provider) zeilen.push(`Provider: ${item.provider}`);

    for (const text of zeilen) {
      const zeile = document.createElement("div");
      zeile.textContent = text;
      box.appendChild(zeile);
    }
    container.appendChild(box);
  }
}
