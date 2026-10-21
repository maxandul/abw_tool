// Only current, available activities can be reused. Identical named entries
// appear once; different settings under the same name remain selectable.
export function namedEntryTemplates(entries, categories) {
  const available = new Map(categories.filter(k => k.schema_version === 2).map(k => [k.id, k]));
  const unique = new Map();
  for (const entry of entries) {
    const name = entry.eigener_name?.trim();
    if (!name || !available.has(entry.kategorie_id)) continue;
    const template = {
      eigener_name: name,
      kategorie_id: entry.kategorie_id,
      arbeitsort: entry.arbeitsort || '',
      gruppengroesse: entry.gruppengroesse || '',
      teilnehmerkreis: entry.teilnehmerkreis || '',
      raumnutzung: entry.raumnutzung || '',
      online_dabei: !!entry.online_dabei,
    };
    const key = JSON.stringify(template);
    if (!unique.has(key)) unique.set(key, { ...template, key, kategorie: available.get(entry.kategorie_id) });
  }
  return [...unique.values()].sort((a, b) => a.eigener_name.localeCompare(b.eigener_name, 'de-CH'));
}

export function applyNamedEntry(form, template) {
  // Intentionally retain the selected slot and never copy the source entry ID.
  return {
    ...form,
    eigener_name: template.eigener_name,
    kategorie_id: template.kategorie_id,
    arbeitsort: template.arbeitsort,
    gruppengroesse: template.gruppengroesse,
    teilnehmerkreis: template.teilnehmerkreis,
    raumnutzung: template.raumnutzung,
    online_dabei: template.online_dabei,
    rueckzugsbedarf: '',
    rueckzug_gruende: [],
    raeumlichkeit: '',
  };
}
