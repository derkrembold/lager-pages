import { ladeExport } from "../model/lager.js";
import { zeigeGruppen } from "../view/gruppen.js";

const daten = await ladeExport();
zeigeGruppen(daten.groups, document.getElementById("gruppen"));
