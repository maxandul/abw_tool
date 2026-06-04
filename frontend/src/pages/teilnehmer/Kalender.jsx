import { useCallback, useEffect, useRef, useState } from "react";
import {
  addDays, format, startOfWeek, parseISO, isSameDay, isWithinInterval,
} from "date-fns";
import { de } from "date-fns/locale";
import {
  getEintraege, createEintrag, updateEintrag, deleteEintrag,
  getEinreichung, getKategorien, einreichen, entsperren, getLuecken,
} from "../../api/teilnehmer";
import { useAuth } from "../../context/AuthContext";
import Spinner from "../../components/Spinner";
import Alert from "../../components/Alert";
import Modal from "../../components/Modal";
import { fmtDate } from "../../utils/format";

const HOUR_START = 7;
const HOUR_END   = 19;
const HOURS      = HOUR_END - HOUR_START;
const SLOT_MIN   = 15;
const SLOTS      = (HOURS * 60) / SLOT_MIN;
const ROW_H      = 14;
const GRID_H     = SLOTS * ROW_H;

function minutesToY(m) { return ((m - HOUR_START * 60) / SLOT_MIN) * ROW_H; }
function yToMinutes(y) {
  const raw = Math.round(y / ROW_H) * SLOT_MIN + HOUR_START * 60;
  return Math.max(HOUR_START * 60, Math.min(HOUR_END * 60, raw));
}
function snapMin(m) { return Math.round(m / SLOT_MIN) * SLOT_MIN; }
function fmtTime(m) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function timeToMin(s) { const [h, m] = s.split(":").map(Number); return h * 60 + m; }
function dateStr(d) { return format(d, "yyyy-MM-dd"); }

const TIME_OPTIONS = Array.from({ length: SLOTS + 1 }, (_, i) => {
  const m = HOUR_START * 60 + i * SLOT_MIN;
  return { value: fmtTime(m), label: fmtTime(m) };
});

// ── Sort kategorien by dimension ─────────────────────────────────────────────
const VERTRAULICHKEIT_ORDER = { OFFEN: 0, INTERN: 1, VERTRAULICH: 2 };
const GRUPPENGROESSE_ORDER  = { ALLEIN: 0, KLEIN: 1, MITTEL: 2, GROSS: 3 };

function sortKategorien(ks) {
  return [...ks].sort((a, b) => {
    const va = VERTRAULICHKEIT_ORDER[a.vertraulichkeit] ?? 99;
    const vb = VERTRAULICHKEIT_ORDER[b.vertraulichkeit] ?? 99;
    if (va !== vb) return va - vb;
    const ga = GRUPPENGROESSE_ORDER[a.gruppengroesse] ?? 99;
    const gb = GRUPPENGROESSE_ORDER[b.gruppengroesse] ?? 99;
    if (ga !== gb) return ga - gb;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

// ── Entry form modal ──────────────────────────────────────────────────────────
function EintragModal({ initial, kategorien, readonly, onSave, onDelete, onClose }) {
  const sorted = sortKategorien(kategorien);
  const [form, setForm] = useState({
    datum: initial?.datum ?? "",
    zeit_von: initial?.zeit_von ?? "08:00",
    zeit_bis: initial?.zeit_bis ?? "09:00",
    kategorie_id: initial?.kategorie_id ?? (sorted[0]?.id ?? ""),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState(null);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const selKat = sorted.find(k => k.id === Number(form.kategorie_id));

  const submit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    const { error: err } = await onSave(form);
    setLoading(false); if (err) setError(err);
  };

  if (readonly) return (
    <Modal title="Eintrag" onClose={onClose}>
      <div className="space-y-2 text-sm">
        <p><span className="text-slate-500">Datum:</span> {fmtDate(initial?.datum)}</p>
        <p><span className="text-slate-500">Zeit:</span> {initial?.zeit_von} – {initial?.zeit_bis}</p>
        <p><span className="text-slate-500">Kategorie:</span> {initial?.kategorie?.name}</p>
      </div>
    </Modal>
  );

  // Group kategorien by dimension for display
  const groups = {};
  sorted.forEach(k => {
    const v = k.vertraulichkeit ?? "–";
    if (!groups[v]) groups[v] = [];
    groups[v].push(k);
  });

  const VLABELS = { OFFEN: "Offen", INTERN: "Intern", VERTRAULICH: "Vertraulich", "–": "Nicht klassifiziert" };

  return (
    <Modal title={initial?.id ? "Eintrag bearbeiten" : "Neuer Eintrag"} onClose={onClose}>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Von</label>
            <select className="input" value={form.zeit_von} onChange={set("zeit_von")}>
              {TIME_OPTIONS.slice(0, -1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bis</label>
            <select className="input" value={form.zeit_bis} onChange={set("zeit_bis")}>
              {TIME_OPTIONS.slice(1).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Tätigkeitskategorie</label>
          <div className="flex gap-2 items-center">
            <select className="input flex-1" value={form.kategorie_id} onChange={set("kategorie_id")}>
              {Object.entries(groups).map(([v, ks]) => (
                <optgroup key={v} label={VLABELS[v] ?? v}>
                  {ks.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </optgroup>
              ))}
            </select>
            {selKat?.beschreibung && (
              <button type="button" className="btn-ghost text-xs px-2" title="Info"
                onClick={() => setInfo(info ? null : selKat.beschreibung)}>ℹ</button>
            )}
          </div>
          {info && <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded">{info}</p>}
          {selKat && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="inline-block w-3 h-3 rounded-sm" style={{ background: selKat.farbe ?? "#ccc" }} />
              <span className="text-xs text-slate-400">
                {[selKat.vertraulichkeit && VLABELS[selKat.vertraulichkeit],
                  selKat.raumtyp_namen?.join(", ")].filter(Boolean).join(" · ")}
              </span>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-between pt-2">
          <div>
            {initial?.id && (
              <button type="button" className="btn-danger text-xs"
                onClick={() => onDelete(initial.id)}>Eintrag löschen</button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <Spinner size="sm" /> : "Speichern"}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Drag selection hook ────────────────────────────────────────────────────────
function useDragSelect({ gridRef, readonly, onSelect }) {
  const drag = useRef(null); // { day, startY, currentY }
  const [selection, setSelection] = useState(null); // { day, vonMin, bisMin }

  const getY = (e, el) => {
    const rect = el.getBoundingClientRect();
    return e.clientY - rect.top + el.scrollTop;
  };

  const onMouseDown = (e, day) => {
    if (readonly || e.button !== 0) return;
    // Only start drag if not on an existing block
    if (e.target.closest("[data-block]")) return;
    e.preventDefault();
    const y = getY(e, gridRef.current);
    drag.current = { day, startY: y, currentY: y };
    const von = snapMin(yToMinutes(y));
    setSelection({ day, vonMin: von, bisMin: Math.min(von + SLOT_MIN, HOUR_END * 60) });
  };

  const onMouseMove = (e) => {
    if (!drag.current) return;
    const y = getY(e, gridRef.current);
    drag.current.currentY = y;
    const startMin = yToMinutes(drag.current.startY);
    const curMin   = yToMinutes(y);
    const vonMin = snapMin(Math.min(startMin, curMin));
    const bisMin = snapMin(Math.max(startMin, curMin)) + SLOT_MIN;
    setSelection({ day: drag.current.day, vonMin, bisMin: Math.min(bisMin, HOUR_END * 60) });
  };

  const onMouseUp = () => {
    if (!drag.current || !selection) { drag.current = null; return; }
    const sel = selection;
    drag.current = null;
    setSelection(null);
    const duration = sel.bisMin - sel.vonMin;
    if (duration >= SLOT_MIN) {
      onSelect({ datum: dateStr(sel.day), zeitVon: fmtTime(sel.vonMin), zeitBis: fmtTime(sel.bisMin) });
    }
  };

  return { selection, onMouseDown, onMouseMove, onMouseUp };
}

// ── Main calendar ─────────────────────────────────────────────────────────────
/**
 * Props (all optional):
 *   gruppeId     – override AuthContext gruppeId
 *   zeitraumVon  – ISO date string, constrains navigation
 *   zeitraumBis  – ISO date string, constrains navigation
 *   abgeschlossen – boolean, shows locked banner
 */
export default function Kalender({ gruppeId: gruppeIdProp, zeitraumVon, zeitraumBis, abgeschlossen }) {
  const { gruppeId: ctxGruppeId } = useAuth();
  const gruppeId = gruppeIdProp ?? ctxGruppeId;

  // Constrain week to survey period
  const periodStart = zeitraumVon ? parseISO(zeitraumVon) : null;
  const periodEnd   = zeitraumBis ? parseISO(zeitraumBis) : null;

  const initialWeek = periodStart
    ? startOfWeek(periodStart, { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const [weekStart, setWeekStart] = useState(initialWeek);
  const [eintraege, setEintraege]   = useState([]);
  const [kategorien, setKategorien] = useState([]);
  const [einreichung, setEinreichung] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [actionStep, setActionStep] = useState(null); // null | "luecken" | "bestaetigen"
  const [luecken, setLuecken] = useState([]);
  const [msg, setMsg] = useState("");
  const [hoverSlot, setHoverSlot] = useState(null); // { day, min }
  const gridRef = useRef(null);

  // Days to show: Mon-Fri of the week, clamped to survey period
  const allWeekDays = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
  const weekDays = periodStart && periodEnd
    ? allWeekDays.filter(d =>
        isWithinInterval(d, { start: periodStart, end: periodEnd })
      )
    : allWeekDays;
  const weekEnd = allWeekDays[4];

  const canNavBack = !periodStart || addDays(weekStart, -7) >= startOfWeek(periodStart, { weekStartsOn: 1 });
  const canNavFwd  = !periodEnd   || addDays(weekStart,  7) <= startOfWeek(periodEnd,   { weekStartsOn: 1 });

  const load = useCallback(async () => {
    if (!gruppeId) return;
    setLoading(true);
    const [eRes, kRes, eiRes] = await Promise.all([
      getEintraege(gruppeId, dateStr(allWeekDays[0]), dateStr(weekEnd)),
      kategorien.length ? Promise.resolve({ data: kategorien }) : getKategorien(),
      getEinreichung(gruppeId),
    ]);
    setLoading(false);
    if (eRes.error) { setError(eRes.error); return; }
    setEintraege(eRes.data ?? []);
    if (kRes.data) setKategorien(kRes.data);
    if (eiRes.data) setEinreichung(eiRes.data);
  }, [gruppeId, weekStart]);

  useEffect(() => { load(); }, [load]);

  const readonly = abgeschlossen || einreichung?.status === "EINGEREICHT" || einreichung?.status === "ABGESCHLOSSEN";
  const canSelfUnlock = !abgeschlossen && einreichung?.status === "EINGEREICHT";
  const kannEinreichen = !abgeschlossen && (einreichung?.status === "OFFEN" || einreichung?.status === "IN_BEARBEITUNG");

  const handleEntsperre = async () => {
    const { error: e } = await entsperren(gruppeId);
    if (e) { setError(e); return; }
    setMsg(""); load();
  };

  const handleEinreichenStart = async () => {
    const { data: lData } = await getLuecken(gruppeId);
    if (lData && lData.length > 0) { setLuecken(lData); setActionStep("luecken"); }
    else setActionStep("bestaetigen");
  };

  const handleEinreichen = async () => {
    const { error: e } = await einreichen(gruppeId);
    setActionStep(null);
    if (e) { setError(e); return; }
    setMsg("Einträge erfolgreich eingereicht.");
    load();
  };

  const { selection, onMouseDown, onMouseMove, onMouseUp } = useDragSelect({
    gridRef,
    readonly,
    onSelect: ({ datum, zeitVon, zeitBis }) => setModal({ datum, zeitVon, zeitBis }),
  });

  const handleGridClick = (e, day) => {
    // Single click (no drag) opens modal
    if (readonly) return;
  };

  const handleBlockClick = (e, eintrag) => {
    e.stopPropagation();
    setModal({ eintrag });
  };

  const handleGridMouseMove = (e, day) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = e.clientY - rect.top + gridRef.current.scrollTop;
    const min = snapMin(yToMinutes(y));
    setHoverSlot({ day: dateStr(day), min });
  };

  const handleSave = async (form) => {
    const body = {
      gruppe_id: gruppeId,
      datum: modal.datum ?? modal.eintrag?.datum,
      zeit_von: form.zeit_von,
      zeit_bis: form.zeit_bis,
      kategorie_id: Number(form.kategorie_id),
    };
    const { error: err } = modal.eintrag?.id
      ? await updateEintrag(modal.eintrag.id, body)
      : await createEintrag(body);
    if (err) return { error: err };
    setModal(null); load(); return {};
  };

  const handleDelete = async (id) => {
    await deleteEintrag(id); setModal(null); load();
  };

  const dayBlocks = (day) => {
    const ds = dateStr(day);
    return eintraege
      .filter(e => e.datum === ds)
      .map(e => {
        const von = timeToMin(e.zeit_von);
        const bis = timeToMin(e.zeit_bis);
        const top = minutesToY(von);
        const h   = minutesToY(bis) - top;
        const kat = e.kategorie;
        return (
          <div key={e.id}
            data-block="1"
            className="absolute left-0.5 right-0.5 rounded overflow-hidden cursor-pointer select-none z-10
              transition-opacity hover:opacity-100 opacity-90 hover:ring-2 hover:ring-white"
            style={{ top, height: Math.max(h, ROW_H), background: kat?.farbe ?? "#3B82F6" }}
            onMouseDown={(ev) => ev.stopPropagation()}
            onClick={(ev) => handleBlockClick(ev, e)}>
            <div className="px-1 text-white leading-tight overflow-hidden"
              style={{ fontSize: "0.6rem", lineHeight: "1.1" }}>
              <span className="font-semibold">{kat?.name ?? "?"}</span><br />
              <span className="opacity-80">{e.zeit_von}–{e.zeit_bis}</span>
            </div>
          </div>
        );
      });
  };

  if (loading && eintraege.length === 0)
    return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-3">
      {abgeschlossen && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
          Diese Erhebung ist abgeschlossen. Die Einträge können nicht mehr bearbeitet werden.
        </div>
      )}
      {!abgeschlossen && readonly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-amber-800">
            {einreichung?.status === "ABGESCHLOSSEN"
              ? "Deine Einträge wurden abgeschlossen."
              : "Deine Einträge wurden eingereicht."}
          </span>
          <div className="flex gap-2">
            {canSelfUnlock && (
              <button className="btn-secondary text-xs" onClick={handleEntsperre}>Änderung vornehmen</button>
            )}
          </div>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {/* Navigation */}
      <div className="flex items-center gap-3 flex-wrap">
        <button className="btn-ghost text-sm" disabled={!canNavBack}
          onClick={() => setWeekStart(d => addDays(d, -7))}>← Zurück</button>
        <span className="font-semibold text-slate-700 text-sm">
          KW {format(weekStart, "w")} · {format(allWeekDays[0], "d. MMM", { locale: de })} – {format(weekEnd, "d. MMM yyyy", { locale: de })}
        </span>
        <button className="btn-ghost text-sm" disabled={!canNavFwd}
          onClick={() => setWeekStart(d => addDays(d, 7))}>Vor →</button>
        {!periodStart && (
          <button className="btn-secondary text-xs" onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Heute</button>
        )}
        {loading && <Spinner size="sm" />}
        <div className="ml-auto flex gap-2">
          {kannEinreichen && (
            <button className="btn-primary text-sm" onClick={handleEinreichenStart}>Einreichen</button>
          )}
          {canSelfUnlock && (
            <button className="btn-secondary text-sm" onClick={handleEntsperre}>Änderung vornehmen</button>
          )}
        </div>
      </div>

      {/* Grid */}
      {weekDays.length > 0 ? (
        <div className="card overflow-hidden p-0 select-none"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { onMouseUp(); setHoverSlot(null); }}>
          {/* Header */}
          <div className="grid border-b border-slate-200"
            style={{ gridTemplateColumns: `3rem repeat(${weekDays.length}, 1fr)` }}>
            <div className="border-r border-slate-200" />
            {weekDays.map(d => (
              <div key={d} className={`px-2 py-2 text-center text-xs font-semibold border-r border-slate-100 last:border-0
                ${isSameDay(d, new Date()) ? "text-brand-600" : "text-slate-600"}`}>
                {format(d, "EEEE", { locale: de })}<br />
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm
                  ${isSameDay(d, new Date()) ? "bg-brand-600 text-white" : "text-slate-500"}`}>
                  {format(d, "d")}
                </span>
              </div>
            ))}
          </div>
          {/* Body */}
          <div className="overflow-y-auto" style={{ maxHeight: "520px" }} ref={gridRef}>
            <div className="grid" style={{ gridTemplateColumns: `3rem repeat(${weekDays.length}, 1fr)`, height: GRID_H }}>
              {/* Time axis */}
              <div className="border-r border-slate-200 relative select-none">
                {Array.from({ length: HOURS }, (_, i) => (
                  <div key={i} className="absolute w-full text-right pr-1.5 text-slate-300"
                    style={{ top: i * (SLOTS / HOURS) * ROW_H, fontSize: "0.55rem" }}>
                    {String(HOUR_START + i).padStart(2, "0")}:00
                  </div>
                ))}
                {/* Hover time label */}
                {hoverSlot && (
                  <div className="absolute w-full text-right pr-1.5 text-brand-500 font-semibold pointer-events-none z-20"
                    style={{ top: minutesToY(hoverSlot.min) - 1, fontSize: "0.55rem" }}>
                    {fmtTime(hoverSlot.min)}
                  </div>
                )}
              </div>
              {/* Day columns */}
              {weekDays.map(d => {
                const ds = dateStr(d);
                const sel = selection?.day === ds ? selection : null;
                const selTop = sel ? minutesToY(sel.vonMin) : 0;
                const selDur = sel ? sel.bisMin - sel.vonMin : 0;
                return (
                  <div key={d} className="border-r border-slate-100 last:border-0 relative cursor-default"
                    style={{ height: GRID_H }}
                    onMouseDown={(e) => onMouseDown(e, d)}
                    onMouseMove={(e) => handleGridMouseMove(e, d)}
                    onMouseLeave={() => setHoverSlot(null)}>
                    {/* Hour lines */}
                    {Array.from({ length: HOURS }, (_, i) => (
                      <div key={i} className="absolute w-full border-t border-slate-100" style={{ top: i * (SLOTS / HOURS) * ROW_H }} />
                    ))}
                    {Array.from({ length: SLOTS }, (_, i) => i % 4 !== 0 && (
                      <div key={i} className="absolute w-full border-t border-slate-50" style={{ top: i * ROW_H }} />
                    ))}
                    {/* Hover: single slot highlight */}
                    {!readonly && hoverSlot?.day === ds && !selection && (
                      <div className="absolute inset-x-px pointer-events-none rounded-sm"
                        style={{ top: minutesToY(hoverSlot.min) + 1, height: ROW_H - 1, background: "rgba(99,102,241,0.15)" }} />
                    )}
                    {/* Drag selection: individual blocks + label */}
                    {sel && (() => {
                      const blocks = [];
                      for (let m = sel.vonMin; m < sel.bisMin; m += SLOT_MIN) {
                        blocks.push(
                          <div key={m} className="absolute inset-x-px pointer-events-none rounded-sm z-20"
                            style={{ top: minutesToY(m) + 1, height: ROW_H - 1, background: "rgba(99,102,241,0.35)" }} />
                        );
                      }
                      if (selDur >= SLOT_MIN) {
                        blocks.push(
                          <div key="label" className="absolute left-0.5 right-0.5 pointer-events-none z-30 flex justify-center"
                            style={{ top: selTop - 1 }}>
                            <span className="text-indigo-700 font-semibold bg-white/95 border border-indigo-200 px-1.5 py-px rounded shadow-sm"
                              style={{ fontSize: "0.6rem", whiteSpace: "nowrap" }}>
                              {fmtTime(sel.vonMin)}–{fmtTime(sel.bisMin)} · {selDur}min
                            </span>
                          </div>
                        );
                      }
                      return blocks;
                    })()}
                    {/* Entries */}
                    {dayBlocks(d)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center text-slate-500 py-12">
          Keine Arbeitstage in dieser Woche innerhalb des Erhebungszeitraums.
        </div>
      )}

      {modal && (
        <EintragModal
          initial={modal.eintrag ?? {
            datum: modal.datum,
            zeit_von: modal.zeitVon ?? "08:00",
            zeit_bis: modal.zeitBis ?? "09:00",
            kategorie_id: sortKategorien(kategorien)[0]?.id ?? "",
          }}
          kategorien={kategorien}
          readonly={readonly}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
        />
      )}

      {/* Lücken Modal */}
      {actionStep === "luecken" && (
        <Modal title="Mögliche Lücken gefunden" onClose={() => setActionStep(null)} wide>
          <p className="text-sm text-slate-600 mb-4">Folgende mögliche Lücken wurden gefunden:</p>
          <table className="w-full text-sm mb-6">
            <thead><tr className="bg-slate-50">
              <th className="table-th">Tag</th>
              <th className="table-th">Datum</th>
              <th className="table-th">Lücke</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {luecken.map((l, i) => (
                <tr key={i}><td className="table-td">{l.tag}</td><td className="table-td">{fmtDate(l.datum)}</td><td className="table-td">{l.luecke}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setActionStep(null)}>Zurück zur Erfassung</button>
            <button className="btn-primary" onClick={() => setActionStep("bestaetigen")}>Trotzdem einreichen</button>
          </div>
        </Modal>
      )}
      {actionStep === "bestaetigen" && (
        <Modal title="Einträge einreichen" onClose={() => setActionStep(null)}>
          <p className="text-sm text-slate-600 mb-6">
            Möchtest du alle deine Einträge definitiv einreichen? Du kannst sie danach selbst wieder entsperren falls du Korrekturen vornehmen musst.
          </p>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setActionStep(null)}>Abbrechen</button>
            <button className="btn-primary" onClick={handleEinreichen}>Einreichen</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
