// Ebene 2 (Regale einer Group) - Kachel-Darstellung wie im lager-cli-TUI (StorageTile, siehe
// tui.py): bei "stacked" untereinander (volle Breite je Regal), bei "side-by-side" nebeneinander
// (gleich breit). `null`-Eintraege in gruppe.storages sind bewusste Luecken (siehe
// storage_layout.json) und werden als leerer Platzhalter ohne Rahmen dargestellt. Antippen einer
// Regal-Kachel navigiert erst ab lager-pages#3 weiter (Ebene 3).
export function zeigeRegale(gruppe, container) {
  container.innerHTML = "";
  container.className = gruppe.arrangement === "stacked" ? "regale-stack" : "regale-row";
  for (const storage of gruppe.storages) {
    if (storage === null) {
      const luecke = document.createElement("div");
      luecke.className = "storage-gap";
      container.appendChild(luecke);
      continue;
    }
    const kachel = document.createElement("div");
    kachel.className = "storage-tile";
    kachel.dataset.storageId = storage.id;
    const label = document.createElement("span");
    label.className = "storage-tile-label";
    label.textContent = storage.name;
    kachel.appendChild(label);
    container.appendChild(kachel);
  }
}
