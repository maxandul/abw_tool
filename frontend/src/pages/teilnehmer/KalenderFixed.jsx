import { useCallback, useEffect, useRef, useState } from "react";
import { format, startOfWeek, addDays, addWeeks, parseISO, isBefore, isAfter, isSameDay, isWithinInterval } from "date-fns";
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

const VERTRAULICHKEIT_ORDER = { OFFEN: 0, INTERN: 1, VERTRAULICH: 2 };
const GRUPPENGROESSE_ORDER  = { ALLEIN: 0, KLEIN: 1, MITTEL: 2, GROSS: 3 };
const VLABELS = { OFFEN: "Offen", INTERN: "Intern", VERTRAULICH: "Vertraulich", "–": "Nicht klassifiziert" };

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

  const groups = {};
  sorted.forEach(k => {
    const v = k.vertraulichkeit ?? "–";
    if (!groups[v]) groups[v] = [];
    groups[v].push(k);
  });

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
              <button type="button" className="btn-danger text-xs" onClick={() => onDelete(initial.id)}>Löschen</button>
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
function useDragSelect(readonly, onSelect) {
  const drag = useRef(null);
  const [selection, setSelection] = useState(null);

  const getY = (e, gridEl) => {
    const rect = gridEl.getBoundingClientRect();
    return e.clientY - rect.top + gridEl.scrollTop;
  };

  const onMouseDown = (e, day, gridEl) => {
    if (readonly || e.button !== 0) return;
    if (e.target.closest("[data-block]")) return;
    e.preventDefault();
    const y = getY(e, gridEl);
    drag.current = { day, gridEl, startY: y };
    const von = snapMin(yToMinutes(y));
    setSelection({ day, vonMin: von, bisMin: Math.min(von + SLOT_MIN, HOUR_END * 60) });
  };

  const onMouseMove = (e) => {
    if (!drag.current) return;
    const y = getY(e, drag.current.gridEl);
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
    if (sel.bisMin - sel.vonMin >= SLOT_MIN) {
      onSelect({ datum: dateStr(sel.day), zeitVon: fmtTime(sel.vonMin), zeitBis: fmtTime(sel.bisMin) });
    }
  };

  return { selection, onMouseDown, onMouseMove, onMouseUp };
}

// ── Week grid ─────────────────────────────────────────────────────────────────
function WeekGrid({ weekStart, periodStart, periodEnd, eintraege, readonly, kategorien, onDayMouseDown, onDayMouseMove, onDayMouseUp, selection, hoverSlot, onHoverSlot, onBlockClick }) {
  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));

  const isInPeriod = (d) => !isBefore(d, periodStart) && !isAfter(d, periodEnd);

  const kwLabel = `KW ${format(weekStart, "w")} · ${format(days[0], "d. MMM", { locale: de })} – ${format(days[4], "d. MMM yyyy", { locale: de })}`;

  const gridRef = useRef(null);

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
              hover:opacity-100 opacity-90 hover:ring-2 hover:ring-white"
            style={{ top, height: Math.max(h, ROW_H), background: kat?.farbe ?? "#3B82F6" }}
            onMouseDown={ev => ev.stopPropagation()}
            onClick={ev => { ev.stopPropagation(); onBlockClick(e); }}>
            <div className="px-1 text-white leading-tight overflow-hidden" style={{ fontSize: "0.6rem", lineHeight: "1.1" }}>
              <span className="font-semibold">{kat?.name ?? "?"}</span><br />
              <span className="opacity-80">{e.zeit_von}–{e.zeit_bis}</span>
            </div>
          </div>
        );
      });
  };

  return (
    <div className="card overflow-hidden p-0 select-none"
      onMouseMove={(e) => { onDayMouseMove(e); }}
      onMouseUp={onMouseUp}
      onMouseLeave={() => { onMouseUp(); }}>
      {/* KW header */}
      <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">{kwLabel}</div>
      {/* Day headers */}
      <div className="grid border-b border-slate-200"
        style={{ gridTemplateColumns: "3rem repeat(5, 1fr)" }}>
        <div className="border-r border-slate-200" />
        {days.map(d => {
          const inPeriod = isInPeriod(d);
          return (
            <div key={d} className={`px-2 py-2 text-center text-xs font-semibold border-r border-slate-100 last:border-0
              ${isSameDay(d, new Date()) ? "text-brand-600" : inPeriod ? "text-slate-600" : "text-slate-300"}`}>
              {format(d, "EEEE", { locale: de })}<br />
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm
                ${isSameDay(d, new Date()) ? "bg-brand-600 text-white" : inPeriod ? "text-slate-500" : "text-slate-300"}`}>
                {format(d, "d")}
              </span>
            </div>
          );
        })}
      </div>
      {/* Body */}
      <div className="overflow-y-auto" style={{ maxHeight: "400px" }} ref={gridRef}>
        <div className="grid" style={{ gridTemplateColumns: "3rem repeat(5, 1fr)", height: GRID_H }}>
          {/* Time axis */}
          <div className="border-r border-slate-200 relative select-none">
            {Array.from({ length: HOURS }, (_, i) => (
              <div key={i} className="absolute w-full text-right pr-1.5 text-slate-300"
                style={{ top: i * (SLOTS / HOURS) * ROW_H, fontSize: "0.55rem" }}>
                {String(HOUR_START + i).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {/* Day columns */}
          {days.map(d => {
            const ds = dateStr(d);
            const inPeriod = isInPeriod(d);
            const sel = selection?.day === ds ? selection : null;
            const selTop = sel ? minutesToY(sel.vonMin) : 0;
            const selH   = sel ? minutesToY(sel.bisMin) - selTop : 0;
            const selDur = sel ? sel.bisMin - sel.vonMin : 0;
            return (
              <div key={d}
                className={`border-r border-slate-100 last:border-0 relative ${inPeriod && !readonly ? "cursor-crosshair" : "cursor-default"}`}
                style={{ height: GRID_H, background: !inPeriod ? "#f8fafc" : undefined }}
                onMouseDown={(e) => inPeriod && onDayMouseDown(e, d, gridRef.current)}>
                {/* Hour / quarter lines */}
                {Array.from({ length: HOURS }, (_, i) => (
                  <div key={i} className="absolute w-full border-t border-slate-100" style={{ top: i * (SLOTS / HOURS) * ROW_H }} />
                ))}
                {Array.from({ length: SLOTS }, (_, i) => i % 4 !== 0 && (
                  <div key={i} className="absolute w-full border-t border-slate-50" style={{ top: i * ROW_H }} />
                ))}
                {/* Grayed-out overlay for days outside period */}
                {!inPeriod && (
                  <div className="absolute inset-0 bg-slate-100/60 pointer-events-none" />
                )}
                {/* Hover highlight */}
                {inPeriod && !readonly && hoverSlot?.day === ds && !selection && (
                  <div className="absolute inset-x-0 pointer-events-none"
                    style={{ top: minutesToY(hoverSlot.min), height: ROW_H, background: "rgba(99,102,241,0.08)" }} />
                )}
                {/* Drag selection */}
                {sel && (
                  <div className="absolute left-0.5 right-0.5 rounded pointer-events-none z-20 flex items-center justify-center"
                    style={{ top: selTop, height: Math.max(selH, ROW_H), background: "rgba(99,102,241,0.22)", border: "1.5px dashed #6366f1" }}>
                    {selDur >= SLOT_MIN && (
                      <span className="text-indigo-700 font-semibold bg-white/80 px-1 rounded text-xs">
                        {fmtTime(sel.vonMin)}–{fmtTime(sel.bisMin)} ({selDur}min)
                      </span>
                    )}
                  </div>
                )}
                {/* Entries */}
                {dayBlocks(d)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  function onMouseUp() { onDayMouseUp(); }
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function KalenderFixed({ gruppeId, zeitraumVon, zeitraumBis, abgeschlossen, gruppeName }) {
  const { gruppeId: ctxGruppeId } = useAuth();
  const gId = gruppeId ?? ctxGruppeId;

  const periodStart = zeitraumVon ? parseISO(zeitraumVon) : new Date();
  const periodEnd   = zeitraumBis ? parseISO(zeitraumBis) : new Date();

  // Build all weeks in the period
  const weeks = (() => {
    const ws = [];
    let w = startOfWeek(periodStart, { weekStartsOn: 1 });
    while (!isAfter(w, periodEnd)) { ws.push(w); w = addWeeks(w, 1); }
    return ws;
  })();

  const [eintraege, setEintraege]   = useState([]);
  const [kategorien, setKategorien] = useState([]);
  const [einreichung, setEinreichung] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null);
  const [actionStep, setActionStep] = useState(null);
  const [luecken, setLuecken] = useState([]);
  const [msg, setMsg] = useState("");
  const [hoverSlot, setHoverSlot] = useState(null);

  const load = useCallback(async () => {
    if (!gId) return;
    setLoading(true);
    const [eRes, kRes, eiRes] = await Promise.all([
      getEintraege(gId, zeitraumVon, zeitraumBis),
      kategorien.length ? Promise.resolve({ data: kategorien }) : getKategorien(),
      getEinreichung(gId),
    ]);
    setLoading(false);
    if (eRes.error) { setError(eRes.error); return; }
    setEintraege(eRes.data ?? []);
    if (kRes.data) setKategorien(kRes.data);
    if (eiRes.data) setEinreichung(eiRes.data);
  }, [gId, zeitraumVon, zeitraumBis]);

  useEffect(() => { load(); }, [load]);

  const readonly = abgeschlossen || einreichung?.status === "EINGEREICHT" || einreichung?.status === "ABGESCHLOSSEN";
  const canSelfUnlock = !abgeschlossen && einreichung?.status === "EINGEREICHT";
  const kannEinreichen = !abgeschlossen && (einreichung?.status === "OFFEN" || einreichung?.status === "IN_BEARBEITUNG");

  const handleEntsperre = async () => {
    const { error: e } = await entsperren(gId);
    if (e) { setError(e); return; }
    load();
  };

  const handleEinreichenStart = async () => {
    const { data: lData } = await getLuecken(gId);
    if (lData && lData.length > 0) { setLuecken(lData); setActionStep("luecken"); }
    else setActionStep("bestaetigen");
  };

  const handleEinreichen = async () => {
    const { error: e } = await einreichen(gId);
    setActionStep(null);
    if (e) { setError(e); return; }
    setMsg("Einträge erfolgreich eingereicht."); load();
  };

  const { selection, onMouseDown, onMouseMove, onMouseUp } = useDragSelect(
    readonly,
    ({ datum, zeitVon, zeitBis }) => setModal({ datum, zeitVon, zeitBis }),
  );

  const handleSave = async (form) => {
    const body = {
      gruppe_id: gId,
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

  if (loading) return <div className="flex justify-center mt-12"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-4">
      {/* Status banners */}
      {abgeschlossen && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-sm text-amber-800">
          Diese Erhebung ist abgeschlossen. Einträge können nicht mehr bearbeitet werden.
        </div>
      )}
      {!abgeschlossen && readonly && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 flex items-center justify-between text-sm">
          <span className="text-amber-800">
            {einreichung?.status === "ABGESCHLOSSEN" ? "Einträge wurden abgeschlossen." : "Einträge wurden eingereicht."}
          </span>
          {canSelfUnlock && (
            <button className="btn-secondary text-xs" onClick={handleEntsperre}>Änderung vornehmen</button>
          )}
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      {msg && <Alert type="success">{msg}</Alert>}

      {/* Header with actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{gruppeName}</h2>
          <p className="text-xs text-slate-500">{fmtDate(zeitraumVon)} – {fmtDate(zeitraumBis)}</p>
        </div>
        <div className="flex gap-2">
          {loading && <Spinner size="sm" />}
          {kannEinreichen && (
            <button className="btn-primary text-sm" onClick={handleEinreichenStart}>Einreichen</button>
          )}
          {canSelfUnlock && (
            <button className="btn-secondary text-sm" onClick={handleEntsperre}>Änderung vornehmen</button>
          )}
        </div>
      </div>

      {/* Stacked week grids */}
      <div className="space-y-6"
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}>
        {weeks.map(ws => (
          <WeekGrid
            key={dateStr(ws)}
            weekStart={ws}
            periodStart={periodStart}
            periodEnd={periodEnd}
            eintraege={eintraege}
            readonly={readonly}
            kategorien={kategorien}
            selection={selection}
            hoverSlot={hoverSlot}
            onHoverSlot={setHoverSlot}
            onDayMouseDown={onMouseDown}
            onDayMouseMove={(e) => {
              onMouseMove(e);
            }}
            onDayMouseUp={onMouseUp}
            onBlockClick={(eintrag) => setModal({ eintrag })}
          />
        ))}
      </div>

      {/* Entry modal */}
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
              <th className="table-th">Tag</th><th className="table-th">Datum</th><th className="table-th">Lücke</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {luecken.map((l, i) => (
                <tr key={i}><td className="table-td">{l.tag}</td><td className="table-td">{fmtDate(l.datum)}</td><td className="table-td">{l.luecke}</td></tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-3 justify-end">
            <button className="btn-secondary" onClick={() => setActionStep(null)}>Zurück</button>
            <button className="btn-primary" onClick={() => setActionStep("bestaetigen")}>Trotzdem einreichen</button>
          </div>
        </Modal>
      )}
      {actionStep === "bestaetigen" && (
        <Modal title="Einträge einreichen" onClose={() => setActionStep(null)}>
          <p className="text-sm text-slate-600 mb-6">
            Möchtest du deine Einträge definitiv einreichen?
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
