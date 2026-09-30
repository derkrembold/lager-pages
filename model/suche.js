// AND/OR-Suchlogik 1:1 uebernommen aus lager-cli (model.py parse_search_query()/search_items()):
// "OR" trennt Gruppen, innerhalb einer Gruppe muessen alle Woerter im Item-Namen vorkommen (case-
// insensitive Substring-Suche). "AND" wirkt rein optisch wie ein Leerzeichen.
export function parseSuchanfrage(query) {
  const gruppen = query.split(/\s+OR\s+/i);
  return gruppen.map((gruppe) =>
    gruppe.split(/\s+/).filter((wort) => wort.length > 0 && wort.toUpperCase() !== "AND")
  );
}

export function sucheItems(items, query) {
  const gruppen = parseSuchanfrage(query).filter((gruppe) => gruppe.length > 0);
  if (gruppen.length === 0) return [];
  return items.filter((item) => {
    const nameLower = item.name.toLowerCase();
    return gruppen.some((gruppe) => gruppe.every((wort) => nameLower.includes(wort.toLowerCase())));
  });
}
