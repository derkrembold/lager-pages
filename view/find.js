// Ergebnisliste fuer Find (lager-pages#4, Schritt 1) - gleiche Formatierung wie `lager search`
// im CLI (cli.py format_location()): "Group: X, Storage: Y, Row: Z, Column: W". Noch keine
// Navigation zum Fundort (kommt mit Schritt 2) - nur Anzeige.
function formatStandort(item) {
  const group = item.group_name !== null ? item.group_name : "-";
  return `Group: ${group}, Storage: ${item.storage_name}, Row: ${item.row}, Column: ${item.column}`;
}

export function zeigeSuchergebnisse(ergebnisse, container) {
  container.innerHTML = "";
  if (ergebnisse.length === 0) {
    const hinweis = document.createElement("div");
    hinweis.textContent = "No matches.";
    container.appendChild(hinweis);
    return;
  }
  for (const item of ergebnisse) {
    const zeile = document.createElement("div");
    zeile.className = "find-result";
    zeile.dataset.itemId = item.id;

    const name = document.createElement("div");
    name.className = "find-result-name";
    name.textContent = item.name;
    zeile.appendChild(name);

    const standort = document.createElement("div");
    standort.className = "find-result-standort";
    standort.textContent = formatStandort(item);
    zeile.appendChild(standort);

    container.appendChild(zeile);
  }
}
