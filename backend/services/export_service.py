"""Generate a fully self-contained, interactive, anonymous HTML export.

The export embeds the anonymised raw data of the selected groups and recomputes
Lastprofil, Bedarf nach Tätigkeit, Anteilsübersicht and Stichprobe entirely in
the browser. The recipient can change the Teilnehmer-Filter (Funktion, OE,
Beschäftigungsgrad) and the Lastprofil-Tätigkeiten without any server – mirroring
the live Auswertung page.

Anonymity: no names or e-mail addresses are embedded; participants are referenced
by an opaque index. Only submitted ("eingereicht") participants' entries are
included.
"""

import html as html_lib
import json
from datetime import date


def _json_for_script(value) -> str:
    """Serialise to JSON safe for embedding inside an inline <script> block.

    Escapes the characters that could otherwise terminate the script element or
    inject markup (``<``, ``>``, ``&``) and the JS line separators U+2028/U+2029.
    """
    raw = json.dumps(value, ensure_ascii=False, default=str)
    return (
        raw.replace("<", "\\u003c")
        .replace(">", "\\u003e")
        .replace("&", "\\u0026")
        .replace("\u2028", "\\u2028")
        .replace("\u2029", "\\u2029")
    )


_EXPORT_TEMPLATE = """\
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auswertung Tätigkeitserhebung – __TITEL__</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #1e293b; }
    header { background: #1e3a5f; color: #fff; padding: 1.5rem 2rem; }
    header h1 { margin: 0 0 .25rem; font-size: 1.5rem; }
    header p { margin: 0; font-size: .8rem; opacity: .85; }
    main { max-width: 1100px; margin: 1.5rem auto; padding: 0 1.5rem; }
    section { background: #fff; border-radius: .75rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: 1.5rem; margin-bottom: 1.5rem; }
    h2 { margin-top: 0; font-size: 1.125rem; color: #1e3a5f; border-bottom: 1px solid #e2e8f0; padding-bottom: .5rem; margin-bottom: 1rem; }
    h3 { font-size: .95rem; color: #334155; margin: 0 0 .75rem; }
    .muted { color: #64748b; font-size: .8rem; }
    .filter-block { margin-bottom: 1rem; }
    .filter-block:last-child { margin-bottom: 0; }
    .filter-block > p { font-size: .75rem; color: #64748b; margin: 0 0 .4rem; }
    .chips { display: flex; flex-wrap: wrap; gap: .4rem; }
    .chip { padding: .15rem .6rem; border-radius: 9999px; font-size: .75rem; border: 1px solid #cbd5e1; background: #fff; color: #475569; cursor: pointer; }
    .chip.active { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
    .chip-group-label { font-size: .7rem; color: #94a3b8; margin: .5rem 0 .25rem; }
    .clearbtn { font-size: .72rem; color: #94a3b8; text-decoration: underline; background: none; border: none; cursor: pointer; }
    .kacheln { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: .75rem; }
    .kachel { background: #f8fafc; border-radius: .5rem; padding: .75rem 1rem; }
    .kachel .wert { font-size: 1.25rem; font-weight: 600; color: #1e293b; line-height: 1.2; }
    .kachel .label { font-size: .75rem; color: #64748b; margin-top: .25rem; }
    table { width: 100%; border-collapse: collapse; font-size: .875rem; }
    th { background: #f1f5f9; text-align: left; padding: .5rem .75rem; font-weight: 600; font-size: .75rem; text-transform: uppercase; color: #64748b; }
    td { padding: .5rem .75rem; border-bottom: 1px solid #f1f5f9; }
    tr:last-child td { border-bottom: none; }
    .right { text-align: right; }
    .toggle-btns { display: flex; gap: .5rem; margin-bottom: 1rem; }
    .toggle-btn { padding: .375rem .75rem; border: 1px solid #cbd5e1; border-radius: .375rem; background: #fff; cursor: pointer; font-size: .8rem; }
    .toggle-btn.active { background: #1e3a5f; color: #fff; border-color: #1e3a5f; }
    .legend { display: flex; align-items: center; gap: .5rem; margin-bottom: .5rem; }
    .legend-bar { flex: 1; height: .5rem; border-radius: 9999px; background: linear-gradient(to right, #f1f5f9, rgba(30,58,95,.15), rgba(30,58,95,.55), rgba(30,58,95,1)); }
    .legend span { font-size: .7rem; color: #94a3b8; }
    .heatmap-grid { overflow-x: auto; }
    .heatmap-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: .6rem; }
    .heatmap-table th { background: transparent; text-align: center; padding: 0 0 .25rem; color: #475569; }
    .heatmap-table td { text-align: center; height: 1.1rem; border: none; padding: 0; }
    .heatmap-table td.t-axis { width: 3rem; color: #94a3b8; text-align: right; padding-right: .375rem; font-size: .55rem; }
    .bar-row { display: flex; align-items: center; gap: .75rem; font-size: .8rem; width: 100%; margin-bottom: .5rem; }
    .bar-label { width: 14rem; flex-shrink: 0; word-break: break-word; line-height: 1.35; }
    .bar-track { flex: 1; min-width: 0; background: #f1f5f9; border-radius: 9999px; height: 14px; overflow: hidden; }
    .bar-fill { height: 100%; border-radius: 9999px; }
    .bar-value { font-size: .75rem; color: #64748b; white-space: nowrap; width: 6.5rem; text-align: right; flex-shrink: 0; }
    .anteile-label { font-size: .75rem; color: #64748b; margin-bottom: .375rem; }
    .stacked-bar { display: flex; width: 100%; height: 1.5rem; border-radius: .375rem; overflow: hidden; background: #f1f5f9; }
    .stacked-seg { height: 100%; }
    .legend { display: flex; flex-wrap: wrap; gap: .25rem 1rem; margin-top: .5rem; }
    .legend-item { display: inline-flex; align-items: center; gap: .375rem; font-size: .75rem; color: #475569; }
    .legend-swatch { width: .6rem; height: .6rem; border-radius: .15rem; flex-shrink: 0; }
    .note { font-size: .8rem; color: #64748b; margin-top: .75rem; }
    details { margin-top: 1rem; border: 1px solid #fde68a; background: #fffbeb; border-radius: .5rem; padding: .5rem .75rem; }
    summary { cursor: pointer; font-size: .85rem; color: #92400e; }
    .empty { color: #94a3b8; font-size: .85rem; padding: 1rem 0; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>Tätigkeitserhebung – Auswertung</h1>
    <p>Exportiert am __EXPORT_DATUM__ · Erhebung(en): __GRUPPEN_NAMEN__ · Zeitraum: __ZEITRAUM_VON__ – __ZEITRAUM_BIS__</p>
    <p>Anonymer, interaktiver Export · nur eingereichte Teilnehmer · Filter im Dokument anpassbar</p>
  </header>
  <main>
    <section id="filter">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.5rem">
        <h2 style="border:none;margin:0;padding:0">Teilnehmer-Filter</h2>
        <button class="clearbtn" onclick="clearTnFilter()">Alle Filter zurücksetzen</button>
      </div>
      <p class="muted" style="margin:.25rem 0 1rem">Wirkt auf Stichprobe, Lastprofil, Bedarf und Anteile.</p>
      <div id="filter-funktion" class="filter-block"></div>
      <div id="filter-oe" class="filter-block"></div>
      <div id="filter-grad" class="filter-block"></div>
    </section>

    <section id="stichprobe">
      <h2>Stichprobe</h2>
      <div id="sample-container"></div>
    </section>

    <section id="lastprofil">
      <h2>Lastprofil – Wochenansicht</h2>
      <div class="toggle-btns">
        <button id="tb-mittelwert" class="toggle-btn active" onclick="setAnzeige('mittelwert')">Mittelwert</button>
        <button id="tb-maximum" class="toggle-btn" onclick="setAnzeige('maximum')">Maximum</button>
      </div>
      <div class="filter-block">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <p style="margin:0">Tätigkeiten für das Lastprofil wählen (mind. 1):</p>
          <button class="clearbtn" onclick="clearKat()">Alle abwählen</button>
        </div>
        <div id="filter-kat"></div>
      </div>
      <div class="legend">
        <span>0</span>
        <div class="legend-bar"></div>
        <span id="legend-max"></span>
      </div>
      <div class="heatmap-grid" id="heatmap-container"></div>
    </section>

    <section id="raumbedarf">
      <h2>Bedarf nach Tätigkeit</h2>
      <div id="raumbedarf-container"></div>
    </section>

    <section id="anteile">
      <h2>Anteilsübersicht</h2>
      <div id="anteile-container"></div>
    </section>
  </main>

  <script>
    const D = __DATEN_JSON__;
    const INIT = __INITIAL_FILTER_JSON__;

    const TAG_START = D.tag_start_minuten;
    const TAG_END = D.tag_end_minuten;
    const SLOT = D.slot_minuten;
    const SLOTS = Math.floor((TAG_END - TAG_START) / SLOT);
    const TAGE = ['Mo','Di','Mi','Do','Fr'];
    // EINZELARBEIT is shared between the current (Arbeitsform) and the
    // legacy (Tätigkeitsgruppe) structure – the others are structure-specific
    // and never mixed within one dataset in practice.
    const TG_ORDER = ['EINZELARBEIT','MEETING','ABWESENHEIT','ZU_ZWEIT_DREIT','GRUPPE_4PLUS','EXTERN'];
    const TG_LABELS = {
      EINZELARBEIT: 'Einzelarbeit',
      MEETING: 'Besprechung/Meeting',
      ABWESENHEIT: 'Abwesenheit',
      ZU_ZWEIT_DREIT: 'Zu zweit/zu dritt (physisch)',
      GRUPPE_4PLUS: 'In Gruppen (4+, physisch)',
      EXTERN: 'Extern',
    };

    const katById = {};
    D.kategorien.forEach(k => { katById[k.id] = k; });

    const state = {
      funktionen: new Set(INIT.funktionen || []),
      oe: new Set(INIT.organisationseinheiten || []),
      grade: new Set((INIT.beschaeftigungsgrade || []).map(Number)),
      kategorie_ids: new Set((INIT.kategorie_ids || []).map(Number)),
      anzeige: 'mittelwert',
    };

    const r1 = v => Math.round(v * 10) / 10;
    const r2 = v => Math.round(v * 100) / 100;
    const r3 = v => Math.round(v * 1000) / 1000;
    const fmtGrad = g => (g % 1 === 0 ? g : g.toFixed(1)) + '%';
    // Escape any text/colour value before it is placed into innerHTML so that
    // category names, function/OE labels etc. can never inject markup.
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
      {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]
    ));

    // ── Filter helpers ────────────────────────────────────────────────────────
    function matchTn(t) {
      if (state.funktionen.size && !state.funktionen.has(t.funktion)) return false;
      if (state.oe.size && !state.oe.has(t.oe)) return false;
      if (state.grade.size && !state.grade.has(t.grad)) return false;
      return true;
    }
    function tnFilterActive() {
      return state.funktionen.size > 0 || state.oe.size > 0 || state.grade.size > 0;
    }
    function sampleTnIdx() {
      const s = new Set();
      D.teilnehmer.forEach(t => { if (matchTn(t)) s.add(t.i); });
      return s;
    }

    // ── Computations (mirror of the Python service) ─────────────────────────────
    function computeLastprofil(tnSet) {
      const katIds = [...state.kategorie_ids];
      if (!katIds.length) return { slots: [] };
      const katSet = new Set(katIds);
      const all = D.eintraege.filter(e => tnSet.has(e.t));
      const katE = all.filter(e => katSet.has(e.k));
      const allUsers = new Set(all.map(e => e.t));
      const tnWochen = {};
      for (const e of all) (tnWochen[e.t] = tnWochen[e.t] || new Set()).add(e.kw);

      const tsk = {};
      const slotTn = {};
      for (const e of katE) {
        for (let slot = e.von; slot < e.bis; slot += SLOT) {
          if (slot >= TAG_START && slot < TAG_END) {
            const off = slot - TAG_START;
            const key = e.wd + '_' + off;
            const a = (tsk[e.t] = tsk[e.t] || {});
            const b = (a[key] = a[key] || {});
            (b[e.k] = b[e.k] || new Set()).add(e.kw);
            (slotTn[key] = slotTn[key] || new Set()).add(e.t);
          }
        }
      }
      const slots = [];
      for (const key in slotTn) {
        const parts = key.split('_');
        const wt = Number(parts[0]); const off = Number(parts[1]);
        const maximum = slotTn[key].size;
        let total = 0;
        for (const uid of allUsers) {
          const wochen = tnWochen[uid];
          if (!wochen || !wochen.size) continue;
          const n = wochen.size;
          const katMap = (tsk[uid] || {})[key] || {};
          for (const kid of katIds) {
            const st = katMap[kid];
            total += (st ? st.size : 0) / n;
          }
        }
        slots.push({ wochentag: wt, slot_start_minuten: off, mittelwert: r3(total), maximum });
      }
      return { slots };
    }

    function computeRaumbedarf(tnSet) {
      const anwesendKat = new Set(D.kategorien.filter(k => k.anwesend).map(k => k.id));
      const ents = D.eintraege.filter(e => tnSet.has(e.t) && anwesendKat.has(e.k));
      const kst = {};
      for (const e of ents) {
        for (let slot = e.von; slot < e.bis; slot += SLOT) {
          if (slot >= TAG_START && slot < TAG_END) {
            const key = e.wd + '_' + (slot - TAG_START);
            const a = (kst[e.k] = kst[e.k] || {});
            (a[key] = a[key] || new Set()).add(e.t);
          }
        }
      }
      const ast = {};
      for (const k in kst) for (const key in kst[k]) {
        (ast[key] = ast[key] || new Set());
        kst[k][key].forEach(u => ast[key].add(u));
      }
      const anwesendCats = D.kategorien
        .filter(k => k.anwesend)
        .sort((a, b) => a.sort_order - b.sort_order);
      const taetigkeiten = [];
      for (const k of anwesendCats) {
        const slotMap = kst[k.id];
        if (!slotMap) continue;
        const counts = Object.values(slotMap).map(s => s.size);
        if (!counts.length) continue;
        const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
        const peak = Math.max(...counts);
        taetigkeiten.push({
          id: k.id, name: k.name, farbe: k.farbe,
          avg_nutzung: r2(avg), peak_nutzung: peak,
          einheiten_avg: avg > 0 ? Math.ceil(avg) : 0, einheiten_peak: peak,
        });
      }
      const anwCounts = Object.values(ast).map(s => s.size);
      const anwesend_total = {
        avg_nutzung: anwCounts.length ? r2(anwCounts.reduce((a, b) => a + b, 0) / anwCounts.length) : 0,
        peak_nutzung: anwCounts.length ? Math.max(...anwCounts) : 0,
      };
      return { taetigkeiten, anwesend_total };
    }

    function computeAnteile(tnSet) {
      const ents = D.eintraege.filter(e => tnSet.has(e.t));
      const tgMin = {}; const tgMinArbeit = {};
      const katMin = {}; const katMinArbeit = {};
      let gesamt = 0; let arbeitszeit = 0;
      for (const e of ents) {
        const k = katById[e.k];
        if (!k) continue;
        const d = e.bis - e.von;
        tgMin[k.taetigkeitsgruppe] = (tgMin[k.taetigkeitsgruppe] || 0) + d;
        katMin[e.k] = (katMin[e.k] || 0) + d;
        gesamt += d;
        if (k.anwesend) {
          tgMinArbeit[k.taetigkeitsgruppe] = (tgMinArbeit[k.taetigkeitsgruppe] || 0) + d;
          katMinArbeit[e.k] = (katMinArbeit[e.k] || 0) + d;
          arbeitszeit += d;
        }
      }
      const build = (minMap, nenner, order, nameOf, idOf, farbeOf) => {
        const out = [];
        for (const key of order) {
          const m = minMap[key] || 0;
          if (!m) continue;
          out.push({ gruppe: key, id: idOf(key), name: nameOf(key), farbe: farbeOf ? farbeOf(key) : undefined,
            stunden: r1(m / 60), anteil_prozent: nenner ? r1(m / nenner * 100) : 0 });
        }
        return out;
      };
      const katOrder = D.kategorien.map(k => k.id);
      const katName = id => (katById[id] || {}).name;
      const katFarbe = id => (katById[id] || {}).farbe;
      return {
        taetigkeitsgruppe_anteile: build(tgMin, gesamt, TG_ORDER, tg => TG_LABELS[tg], tg => tg),
        taetigkeitsgruppe_anteile_arbeitszeit: build(tgMinArbeit, arbeitszeit, TG_ORDER, tg => TG_LABELS[tg], tg => tg),
        kategorie_anteile: build(katMin, gesamt, katOrder, katName, id => id, katFarbe),
        kategorie_anteile_arbeitszeit: build(katMinArbeit, arbeitszeit, katOrder, katName, id => id, katFarbe),
        gesamt_stunden: r1(gesamt / 60),
        arbeitszeit_stunden: r1(arbeitszeit / 60),
      };
    }

    function computeSample() {
      const sample = D.teilnehmer.filter(matchTn);
      const eingereicht = sample.filter(m => m.eingereicht);
      const erfasstByT = {};
      for (const e of D.eintraege) erfasstByT[e.t] = (erfasstByT[e.t] || 0) + (e.bis - e.von);
      const tagessoll = D.soll_stunden_pro_tag * 60;
      const schwelle = D.schwelle_prozent / 100;
      let fte = 0, erf = 0, erfCap = 0, erw = 0;
      const unter = [];
      // Expected hours are uniform (working days × 8.4h): part-time staff record
      // their non-working time as "Teilzeit". FTE sum stays as info only.
      const soll = D.arbeitstage * tagessoll;
      for (const m of eingereicht) {
        const grad = (m.grad || 100) / 100;
        fte += grad;
        const ist = erfasstByT[m.i] || 0;
        erw += soll; erf += ist;
        // Cap each participant at their own expected hours so over-recording
        // cannot mask others' gaps in the aggregate completeness.
        erfCap += Math.min(ist, soll);
        if (soll > 0) {
          const q = ist / soll;
          if (q < schwelle) unter.push({ grad: m.grad, vollstaendigkeit_prozent: r1(q * 100) });
        }
      }
      unter.sort((a, b) => a.vollstaendigkeit_prozent - b.vollstaendigkeit_prozent);
      return {
        teilnehmer_im_sample: sample.length,
        eingereicht: eingereicht.length,
        nicht_eingereicht: sample.length - eingereicht.length,
        fte_summe: r2(fte),
        arbeitstage: D.arbeitstage,
        anzahl_gruppen: D.anzahl_gruppen,
        erfasste_stunden: r1(erf / 60),
        erwartete_stunden: r1(erw / 60),
        vollstaendigkeit_prozent: erw ? r1(erfCap / erw * 100) : 0,
        schwelle_prozent: D.schwelle_prozent,
        teilnehmer_unter_schwelle: unter,
        filter_aktiv: tnFilterActive(),
      };
    }

    // ── Filter UI ───────────────────────────────────────────────────────────────
    function distinct(getter, numeric) {
      const vals = [];
      const seen = new Set();
      for (const t of D.teilnehmer) {
        const v = getter(t);
        if (v === '' || v === null || v === undefined) continue;
        if (!seen.has(v)) { seen.add(v); vals.push(v); }
      }
      if (numeric) vals.sort((a, b) => a - b);
      else vals.sort((a, b) => String(a).toLowerCase().localeCompare(String(b).toLowerCase()));
      return vals;
    }

    function renderChipBlock(elId, label, values, set, fmt) {
      const el = document.getElementById(elId);
      if (!values.length) { el.innerHTML = ''; return; }
      const chips = values.map(v => {
        const active = set.has(v) ? ' active' : '';
        const lbl = fmt ? esc(fmt(v)) : esc(v);
        // Escape the double quotes that JSON.stringify adds for strings so they
        // don't terminate the double-quoted onclick attribute.
        const arg = JSON.stringify(v).replace(/"/g, '&quot;');
        return `<button class="chip${active}" onclick="toggleFilter('${elId}', ${arg})">${lbl}</button>`;
      }).join('');
      el.innerHTML = `<p>${esc(label)}</p><div class="chips">${chips}</div>`;
    }

    function toggleFilter(elId, value) {
      const map = { 'filter-funktion': state.funktionen, 'filter-oe': state.oe, 'filter-grad': state.grade };
      const set = map[elId];
      if (set.has(value)) set.delete(value); else set.add(value);
      renderFilters(); renderAll();
    }
    function clearTnFilter() {
      state.funktionen.clear(); state.oe.clear(); state.grade.clear();
      renderFilters(); renderAll();
    }
    function clearKat() { state.kategorie_ids.clear(); renderKatFilter(); renderLastprofil(); }
    function toggleKat(id) {
      if (state.kategorie_ids.has(id)) state.kategorie_ids.delete(id); else state.kategorie_ids.add(id);
      renderKatFilter(); renderLastprofil();
    }
    function setAnzeige(val) {
      state.anzeige = val;
      document.getElementById('tb-mittelwert').classList.toggle('active', val === 'mittelwert');
      document.getElementById('tb-maximum').classList.toggle('active', val === 'maximum');
      renderLastprofil();
    }

    function renderFilters() {
      renderChipBlock('filter-funktion', 'Funktion', distinct(t => t.funktion, false), state.funktionen);
      renderChipBlock('filter-oe', 'Organisationseinheit', distinct(t => t.oe, false), state.oe);
      renderChipBlock('filter-grad', 'Beschäftigungsgrad', distinct(t => t.grad, true), state.grade, fmtGrad);
    }

    function renderKatFilter() {
      const el = document.getElementById('filter-kat');
      const groups = {};
      D.kategorien.forEach(k => { (groups[k.taetigkeitsgruppe] = groups[k.taetigkeitsgruppe] || []).push(k); });
      let html = '';
      for (const tg of TG_ORDER) {
        const items = (groups[tg] || []).sort((a, b) => a.sort_order - b.sort_order);
        if (!items.length) continue;
        const chips = items.map(k => {
          const active = state.kategorie_ids.has(k.id) ? ' active' : '';
          return `<button class="chip${active}" onclick="toggleKat(${k.id})">${esc(k.name)}</button>`;
        }).join('');
        html += `<div class="chip-group-label">${esc(TG_LABELS[tg])}</div><div class="chips">${chips}</div>`;
      }
      el.innerHTML = html;
    }

    // ── Renderers ────────────────────────────────────────────────────────────────
    function renderSample() {
      const s = computeSample();
      const v = s.vollstaendigkeit_prozent || 0;
      const vColor = v >= 85 ? '#16a34a' : v >= 60 ? '#d97706' : '#dc2626';
      const unter = s.teilnehmer_unter_schwelle || [];
      const badge = s.filter_aktiv
        ? '<span style="font-size:.72rem;color:#1e3a5f;background:#e0e7ef;border-radius:9999px;padding:.1rem .6rem">Sample eingeschränkt durch Filter</span>'
        : '';
      let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:.5rem">${badge}</div>`;
      html += `<div class="kacheln">
        <div class="kachel"><div class="wert">${s.eingereicht} / ${s.teilnehmer_im_sample}</div><div class="label">Eingereicht${s.nicht_eingereicht > 0 ? ' (' + s.nicht_eingereicht + ' offen)' : ''}</div></div>
        <div class="kachel"><div class="wert">${s.fte_summe}</div><div class="label">FTE (eingereicht)</div></div>
        <div class="kachel"><div class="wert">${s.erfasste_stunden}h</div><div class="label">Erfasste Zeit (von ${s.erwartete_stunden}h)</div></div>
        <div class="kachel"><div class="wert">${s.arbeitstage}</div><div class="label">Arbeitstage · ${s.anzahl_gruppen} Erhebung(en)</div></div>
      </div>`;
      html += `<div style="margin-top:1rem">
        <div style="display:flex;justify-content:space-between;font-size:.875rem">
          <span style="color:#475569">Vollständigkeit der Eingereichten (erfasst / erwartet)</span>
          <span style="font-weight:600;color:${vColor}">${v}%</span>
        </div>
        <div class="bar-track" style="margin-top:.35rem;height:10px"><div class="bar-fill" style="width:${Math.min(100, v)}%;background:${vColor}"></div></div>
        <p class="note">Nur eingereichte Teilnehmer fliessen in die Auswertung ein (Soll: Arbeitstage × ${D.soll_stunden_pro_tag}h pro Person). Übererfassung wird je Teilnehmer auf 100% begrenzt, damit Lücken sichtbar bleiben.</p>
      </div>`;
      if (unter.length) {
        const rows = unter.map(t => `<tr>
          <td>${t.grad != null ? fmtGrad(t.grad) : '–'}</td>
          <td class="right" style="color:#b45309;font-weight:500">${t.vollstaendigkeit_prozent}%</td>
        </tr>`).join('');
        html += `<details><summary>${unter.length} eingereichte Teilnehmer unter ${s.schwelle_prozent}% Vollständigkeit</summary>
          <table style="margin-top:.5rem">
            <thead><tr><th>Beschäftigungsgrad</th><th class="right">Vollständigkeit</th></tr></thead>
            <tbody>${rows}</tbody>
          </table></details>`;
      }
      document.getElementById('sample-container').innerHTML = html;
    }

    function renderLastprofil() {
      const tnSet = sampleTnIdx();
      const data = computeLastprofil(tnSet);
      const cont = document.getElementById('heatmap-container');
      if (!state.kategorie_ids.size) {
        document.getElementById('legend-max').textContent = '';
        cont.innerHTML = '<div class="empty">Wähle mindestens eine Tätigkeit, um das Lastprofil anzuzeigen.</div>';
        return;
      }
      const anzeige = state.anzeige;
      const map = {};
      data.slots.forEach(s => { map[s.wochentag + '_' + s.slot_start_minuten] = s; });
      const vals = data.slots.map(s => anzeige === 'maximum' ? s.maximum : s.mittelwert);
      const globalMax = Math.max(0.001, ...vals);
      const fmtVal = v => anzeige === 'maximum' ? String(Math.round(v)) : v.toFixed(2);
      document.getElementById('legend-max').textContent =
        anzeige === 'maximum' ? Math.round(globalMax) + ' Pers.' : globalMax.toFixed(2);

      let hdr = '<tr><th class="t-axis">Zeit</th>' + TAGE.map(d => `<th>${d}</th>`).join('') + '</tr>';
      let rows = '';
      for (let si = 0; si < SLOTS; si++) {
        const slotMin = si * SLOT;
        const totalMin = TAG_START + slotMin;
        const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
        const mm = String(totalMin % 60).padStart(2, '0');
        const label = (totalMin % 60 === 0) ? `${hh}:${mm}` : '';
        rows += `<tr><td class="t-axis">${label}</td>`;
        for (let wt = 0; wt < 5; wt++) {
          const s = map[wt + '_' + slotMin];
          const val = s ? (anzeige === 'maximum' ? s.maximum : s.mittelwert) : 0;
          const intensity = val / globalMax;
          const bg = val > 0 ? `rgba(30,58,95,${Math.max(0.07, intensity).toFixed(2)})` : '#f8fafc';
          const fg = intensity > 0.45 ? '#fff' : '#475569';
          const tip = s ? `${TAGE[wt]} ${hh}:${mm} · Ø ${s.mittelwert.toFixed(2)} · Max ${s.maximum}` : '';
          rows += `<td style="background:${bg};color:${fg}" title="${tip}">${val > 0 ? fmtVal(val) : ''}</td>`;
        }
        rows += '</tr>';
      }
      cont.innerHTML = `<table class="heatmap-table"><thead>${hdr}</thead><tbody>${rows}</tbody></table>`;
    }

    function renderRaumbedarf() {
      const tnSet = sampleTnIdx();
      const d = computeRaumbedarf(tnSet);
      if (!d.taetigkeiten.length) {
        document.getElementById('raumbedarf-container').innerHTML = '<div class="empty">Keine Daten für die aktuelle Auswahl.</div>';
        return;
      }
      const rows = d.taetigkeiten.map(r => `<tr>
        <td style="color:${esc(r.farbe || '#1e293b')};font-weight:500">${esc(r.name)}</td>
        <td class="right">${r.avg_nutzung}</td>
        <td class="right">${r.peak_nutzung}</td>
        <td class="right"><strong>${r.einheiten_avg}</strong></td>
        <td class="right"><strong>${r.einheiten_peak}</strong></td>
      </tr>`).join('');
      const total = `<tr style="background:#f1f5f9;font-weight:600">
        <td>Anwesend total</td>
        <td class="right">${d.anwesend_total.avg_nutzung}</td>
        <td class="right">${d.anwesend_total.peak_nutzung}</td>
        <td colspan="2"></td>
      </tr>`;
      document.getElementById('raumbedarf-container').innerHTML = `
        <table>
          <thead><tr>
            <th>Tätigkeit</th><th class="right">Ø Nutzung</th><th class="right">Peak</th>
            <th class="right">Einheiten (Ø)</th><th class="right">Einheiten (Peak)</th>
          </tr></thead>
          <tbody>${rows}${total}</tbody>
        </table>
        <p class="note">Empfohlene Einheiten basieren auf Ø- bzw. Peak-Nutzung (aufgerundet). Externe Tätigkeiten sind nicht enthalten.</p>`;
    }

    // Fixed palette for Tätigkeitsgruppe/Arbeitsform segments, which (unlike
    // einzelne Tätigkeiten) have no admin-assigned colour of their own.
    const GRUPPE_PALETTE = ['#1e3a5f', '#3b82f6', '#94a3b8', '#f59e0b', '#8b5cf6', '#0ea5e9'];

    function stackedBar(items, fallbackPalette) {
      if (!items.length) return '<p class="note">Keine Daten.</p>';
      const colorOf = (r, i) => esc(r.farbe || (fallbackPalette ? fallbackPalette[i % fallbackPalette.length] : '#64748b'));
      const segs = items.map((r, i) => `<div class="stacked-seg" style="width:${r.anteil_prozent}%;background:${colorOf(r, i)}" title="${esc(r.name)}: ${r.stunden}h (${r.anteil_prozent}%)"></div>`).join('');
      const legend = items.map((r, i) => `<span class="legend-item"><span class="legend-swatch" style="background:${colorOf(r, i)}"></span>${esc(r.name)} · ${r.stunden}h (${r.anteil_prozent}%)</span>`).join('');
      return `<div class="stacked-bar">${segs}</div><div class="legend">${legend}</div>`;
    }

    function anteileBlock(title, all, arbeit, gesamtStunden, arbeitszeitStunden, fallbackPalette) {
      return `<div>
        <h3>${title}</h3>
        <p class="anteile-label">Anteil an der gesamten Zeit (${gesamtStunden}h)</p>
        ${stackedBar(all, fallbackPalette)}
        <p class="anteile-label" style="margin-top:.75rem">Anteil an der Arbeitszeit, ohne Abwesenheit (${arbeitszeitStunden}h)</p>
        ${stackedBar(arbeit, fallbackPalette)}
      </div>`;
    }

    function renderAnteile() {
      const tnSet = sampleTnIdx();
      const d = computeAnteile(tnSet);
      const tg = (d.taetigkeitsgruppe_anteile || []).filter(r => r.stunden > 0);
      const tgArbeit = (d.taetigkeitsgruppe_anteile_arbeitszeit || []).filter(r => r.stunden > 0);
      const kat = (d.kategorie_anteile || []).filter(r => r.stunden > 0);
      const katArbeit = (d.kategorie_anteile_arbeitszeit || []).filter(r => r.stunden > 0);
      if (!tg.length && !kat.length) {
        document.getElementById('anteile-container').innerHTML = '<div class="empty">Keine Daten für die aktuelle Auswahl.</div>';
        return;
      }
      let html = anteileBlock('Nach Tätigkeitsgruppe', tg, tgArbeit, d.gesamt_stunden, d.arbeitszeit_stunden, GRUPPE_PALETTE);
      if (kat.length) html += `<div style="margin-top:1.5rem">${anteileBlock('Nach Tätigkeit', kat, katArbeit, d.gesamt_stunden, d.arbeitszeit_stunden)}</div>`;
      document.getElementById('anteile-container').innerHTML = html;
    }

    function renderAll() {
      renderSample();
      renderLastprofil();
      renderRaumbedarf();
      renderAnteile();
    }

    renderFilters();
    renderKatFilter();
    renderAll();
  </script>
</body>
</html>
"""


def generiere_export_html(
    rohdaten: dict,
    initial_filter: dict,
    datum_von: date,
    datum_bis: date,
) -> str:
    """Render the self-contained, interactive, anonymous HTML export string."""
    gruppen_namen = rohdaten.get("gruppen_namen", [])

    ersetzungen = {
        # Group names are admin-entered free text → HTML-escape before placing
        # them into the document header.
        "__TITEL__": html_lib.escape(" + ".join(gruppen_namen)),
        "__EXPORT_DATUM__": date.today().strftime("%d.%m.%Y"),
        "__GRUPPEN_NAMEN__": html_lib.escape(", ".join(gruppen_namen)),
        "__ZEITRAUM_VON__": datum_von.strftime("%d.%m.%Y"),
        "__ZEITRAUM_BIS__": datum_bis.strftime("%d.%m.%Y"),
        "__DATEN_JSON__": _json_for_script(rohdaten),
        "__INITIAL_FILTER_JSON__": _json_for_script(initial_filter),
    }

    html = _EXPORT_TEMPLATE
    # Replace data/filter JSON last so header tokens can't collide with payload.
    for token in (
        "__TITEL__",
        "__EXPORT_DATUM__",
        "__GRUPPEN_NAMEN__",
        "__ZEITRAUM_VON__",
        "__ZEITRAUM_BIS__",
        "__INITIAL_FILTER_JSON__",
        "__DATEN_JSON__",
    ):
        html = html.replace(token, ersetzungen[token])
    return html
