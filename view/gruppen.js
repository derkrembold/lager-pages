// Ebene 1 (Gruppen) - noch ohne Navigation/Styling, siehe lager-pages#1 (Grundgeruest). Die
// eigentliche Navigation zu Ebene 2 kommt erst mit lager-pages#2.
export function zeigeGruppen(gruppen, container) {
  container.innerHTML = "";
  for (const gruppe of gruppen) {
    const eintrag = document.createElement("li");
    eintrag.textContent = gruppe.name;
    container.appendChild(eintrag);
  }
}
