// Ebene 1 (Gruppen) - Kachel-Darstellung wie im lager-cli-TUI (GroupTile, siehe tui.py):
// "stacked"-Gruppen als schmale, hohe Kachel ("narrow"), sonst als breite Kachel ("wide"), mit
// einer Mini-Vorschau der Regal-Anordnung darin (gefuellte Rechtecke = Regal, leer = Luecke).
// Navigation zu Ebene 2 kommt erst mit lager-pages#2 dazu (onSelect-Callback).
export function zeigeGruppen(gruppen, container, onSelect) {
  container.innerHTML = "";
  for (const gruppe of gruppen) {
    const istGestapelt = gruppe.arrangement === "stacked";

    const kachel = document.createElement("div");
    kachel.className = `group-tile ${istGestapelt ? "narrow" : "wide"}`;
    kachel.dataset.groupId = gruppe.id;

    const label = document.createElement("div");
    label.className = "group-tile-label";
    label.textContent = gruppe.name;
    kachel.appendChild(label);

    const vorschau = document.createElement("div");
    vorschau.className = `storage-preview ${istGestapelt ? "vertical" : "horizontal"}`;
    for (const storage of gruppe.storages) {
      const zelle = document.createElement("div");
      zelle.className = storage ? "preview-cell filled" : "preview-cell";
      vorschau.appendChild(zelle);
    }
    kachel.appendChild(vorschau);

    kachel.addEventListener("click", () => onSelect(gruppe));
    container.appendChild(kachel);
  }
}
