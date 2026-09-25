// Laedt den von lager-cli (lager export-mobile, siehe lager-cli#27) erzeugten Export - reines
// fetch() gegen die im selben Repo mitversionierte mobile-export.json, kein Server/Backend.
export async function ladeExport() {
  const response = await fetch("mobile-export.json");
  return response.json();
}
