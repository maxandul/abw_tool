import { ARBEITSFORM_FARBEN } from "../utils/taetigkeiten";

/** Preset swatches + native color picker (no hex typing required). */
export default function Farbauswahl({ arbeitsform, value, onChange }) {
  const palette = ARBEITSFORM_FARBEN[arbeitsform] ?? ARBEITSFORM_FARBEN.EINZELARBEIT;
  const current = value || palette[0];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {palette.map(hex => (
          <button
            key={hex}
            type="button"
            title={hex}
            onClick={() => onChange(hex)}
            className={`w-8 h-8 rounded-md border-2 transition-transform hover:scale-105 ${
              current.toLowerCase() === hex.toLowerCase()
                ? "border-brand-600 ring-2 ring-brand-200"
                : "border-slate-200"
            }`}
            style={{ background: hex }}
          />
        ))}
        <label
          className="w-8 h-8 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer text-xs text-slate-400 hover:border-slate-400"
          title="Eigene Farbe wählen"
        >
          +
          <input
            type="color"
            value={current}
            onChange={e => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
      </div>
      <p className="text-xs text-slate-400">
        Vorschlag aus der Gruppen-Palette wählen oder mit «+» eine eigene Farbe festlegen.
      </p>
    </div>
  );
}
