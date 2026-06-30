const COLUMN_ALIASES = {
  email: ["email", "e-mail", "mail", "e_mail"],
  vorname: ["vorname", "first name", "firstname", "given name"],
  nachname: ["nachname", "name", "last name", "lastname", "family name", "nachname"],
  funktion: ["funktion", "function", "stellenbezeichnung", "job title", "title", "position"],
  organisationseinheit: [
    "organisationseinheit",
    "organisation",
    "org",
    "oe",
    "orgunit",
    "org unit",
    "abteilung",
    "department",
    "kostenstelle",
  ],
  beschaeftigungsgrad: [
    "beschaeftigungsgrad",
    "beschäftigungsgrad",
    "anstellungsgrad",
    "pensum",
    "fte",
    "grad",
    "prozent",
    "%",
  ],
};

function normaliseHeader(value) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[%]/g, "")
    .replace(/\s+/g, " ");
}

function mapHeader(header) {
  const h = normaliseHeader(header);
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((a) => h === a || h.replace(/\s/g, "") === a.replace(/\s/g, ""))) {
      return field;
    }
  }
  return null;
}

function detectDelimiter(line) {
  const semi = (line.match(/;/g) || []).length;
  const comma = (line.match(/,/g) || []).length;
  return semi >= comma ? ";" : ",";
}

function parseLine(line, delimiter) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

export const CSV_TEMPLATE =
  "email;vorname;nachname;funktion;organisationseinheit;beschaeftigungsgrad\r\n" +
  "max.muster@beispiel.ch;Max;Muster;Sachbearbeiter;VVD/HR;80\r\n";

export function downloadCsv(filename, content) {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function parseTeilnehmerCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: ["Die Datei ist leer."] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter);
  const fieldIndexes = headers.map(mapHeader);

  if (!fieldIndexes.includes("email")) {
    return {
      rows: [],
      errors: [
        "Spalte «email» nicht gefunden. Erwartete Kopfzeile: email;vorname;nachname;funktion;organisationseinheit;beschaeftigungsgrad",
      ],
    };
  }

  const rows = [];
  const errors = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], delimiter);
    const row = {};
    fieldIndexes.forEach((field, idx) => {
      if (field && cells[idx] !== undefined && cells[idx] !== "") {
        row[field] = cells[idx];
      }
    });
    if (!row.email) {
      errors.push(`Zeile ${i + 1}: E-Mail fehlt.`);
      continue;
    }
    rows.push(row);
  }

  return { rows, errors };
}
