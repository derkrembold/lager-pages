// Ebene 3 (Faecher-Raster eines Regals) - wie CompartmentsScreen im lager-cli-TUI: Reihen
// ABSTEIGEND gerendert (hoechste Reihe oben, Reihe 1 unten - physisch wie ein echtes Regal von
// unten hochgezaehlt, siehe tui.py Issue #10), jede Reihe eine eigene Zeile gleich breiter
// Fach-Kacheln. Pro Item nur das erste ";"-Segment (`_short_title()` im TUI), bei mehreren
// Items gestapelt untereinander, leere Zelle zeigt "-". Antippen einer Zelle (auch leerer)
// wechselt zu Ebene 4 - genau wie im TUI seit dem 2026-08-24-Bugfix dort. `highlightCompartmentId`
// (lager-pages#4, Schritt 2): per Find angesprungene Zelle wird rot hervorgehoben, gleiches
// Prinzip wie CompartmentsScreen.highlight_compartment_id im TUI ("heavy red"-Rahmen).
function kurzerTitel(name) {
  return name.split(";")[0].trim();
}

export function zeigeFaecher(storage, container, onSelect, highlightCompartmentId = null) {
  container.innerHTML = "";
  container.className = "faecher-container";
  const reihenAbsteigend = [...storage.rows].sort((a, b) => b.row - a.row);
  for (const reihe of reihenAbsteigend) {
    const zeile = document.createElement("div");
    zeile.className = "faecher-row";
    for (const fach of reihe.compartments) {
      const zelle = document.createElement("div");
      zelle.className = "faecher-zelle";
      if (fach.id === highlightCompartmentId) {
        zelle.classList.add("search-highlight");
      }
      zelle.dataset.compartmentId = fach.id;
      const titel = fach.items.length > 0 ? fach.items.map((item) => kurzerTitel(item.name)) : ["-"];
      for (const zeilentext of titel) {
        const zeileDiv = document.createElement("div");
        zeileDiv.className = "faecher-zelle-label";
        zeileDiv.textContent = zeilentext;
        zelle.appendChild(zeileDiv);
      }
      zelle.addEventListener("click", () => onSelect(fach));
      zeile.appendChild(zelle);
    }
    container.appendChild(zeile);
  }
}
