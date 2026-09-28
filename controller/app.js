import { ladeExport } from "../model/lager.js";
import { zeigeGruppen } from "../view/gruppen.js";
import { zeigeRegale } from "../view/regale.js";

const daten = await ladeExport();

function zeigeEbene(name) {
  document.getElementById("ebene1").classList.toggle("hidden", name !== "ebene1");
  document.getElementById("ebene2").classList.toggle("hidden", name !== "ebene2");
}

function oeffneGruppe(gruppe) {
  document.getElementById("ebene2-titel").textContent = gruppe.name;
  zeigeRegale(gruppe, document.getElementById("regale"));
  zeigeEbene("ebene2");
}

zeigeGruppen(daten.groups, document.getElementById("gruppen-grid"), oeffneGruppe);
document.getElementById("back").addEventListener("click", () => zeigeEbene("ebene1"));
