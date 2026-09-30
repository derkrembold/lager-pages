import { ladeExport } from "../model/lager.js";
import { sucheItems } from "../model/suche.js";
import { zeigeGruppen } from "../view/gruppen.js";
import { zeigeRegale } from "../view/regale.js";
import { zeigeFaecher } from "../view/faecher.js";
import { zeigeItems } from "../view/items.js";
import { zeigeSuchergebnisse } from "../view/find.js";

const daten = await ladeExport();

const EBENEN = ["ebene1", "ebene2", "ebene3", "ebene4", "find"];

// Ebene, von der aus Find geoeffnet wurde (jede der vier Ebenen hat einen eigenen Find-Button,
// siehe index.html) - "Back" in Find kehrt dorthin zurueck, nicht immer zu Ebene 1.
let ebeneVorFind = "ebene1";

function zeigeEbene(name) {
  for (const ebene of EBENEN) {
    document.getElementById(ebene).classList.toggle("hidden", ebene !== name);
  }
}

function aktuelleEbene() {
  return EBENEN.find((ebene) => !document.getElementById(ebene).classList.contains("hidden"));
}

function oeffneGruppe(gruppe) {
  document.getElementById("ebene2-titel").textContent = gruppe.name;
  zeigeRegale(gruppe, document.getElementById("regale"), oeffneStorage);
  zeigeEbene("ebene2");
}

function oeffneStorage(storage) {
  document.getElementById("ebene3-titel").textContent = storage.name;
  zeigeFaecher(storage, document.getElementById("faecher"), oeffneFach);
  zeigeEbene("ebene3");
}

function oeffneFach(fach) {
  document.getElementById("ebene4-titel").textContent = `Compartment ${fach.id}`;
  zeigeItems(fach, document.getElementById("items"));
  zeigeEbene("ebene4");
}

function oeffneFind() {
  ebeneVorFind = aktuelleEbene();
  zeigeEbene("find");
  document.getElementById("find-input").focus();
}

zeigeGruppen(daten.groups, document.getElementById("gruppen-grid"), oeffneGruppe);

// Ein Back-Button je Ebene (siehe index.html, `data-back` traegt das Ziel) - gemeinsame
// Delegation statt vier einzelner Listener.
document.addEventListener("click", (event) => {
  const backButton = event.target.closest("[data-back]");
  if (backButton) {
    zeigeEbene(backButton.dataset.back);
  }
});

for (const button of document.querySelectorAll(".find-button")) {
  button.addEventListener("click", oeffneFind);
}

document.getElementById("find-back").addEventListener("click", () => zeigeEbene(ebeneVorFind));

document.getElementById("find-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = document.getElementById("find-input").value.trim();
  const ergebnisse = query ? sucheItems(daten.items, query) : [];
  zeigeSuchergebnisse(ergebnisse, document.getElementById("find-results"));
});
