import { ladeExport } from "../model/lager.js";
import { zeigeGruppen } from "../view/gruppen.js";
import { zeigeRegale } from "../view/regale.js";
import { zeigeFaecher } from "../view/faecher.js";
import { zeigeItems } from "../view/items.js";

const daten = await ladeExport();

const EBENEN = ["ebene1", "ebene2", "ebene3", "ebene4"];

function zeigeEbene(name) {
  for (const ebene of EBENEN) {
    document.getElementById(ebene).classList.toggle("hidden", ebene !== name);
  }
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

zeigeGruppen(daten.groups, document.getElementById("gruppen-grid"), oeffneGruppe);

// Ein Back-Button je Ebene (siehe index.html, `data-back` traegt das Ziel) - gemeinsame
// Delegation statt vier einzelner Listener.
document.addEventListener("click", (event) => {
  const backButton = event.target.closest("[data-back]");
  if (backButton) {
    zeigeEbene(backButton.dataset.back);
  }
});
