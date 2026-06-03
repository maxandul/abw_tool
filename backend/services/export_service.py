"""Generate a fully self-contained HTML export of the analysis.

The exported file embeds all data as JSON and uses minimal vanilla JS for
client-side filtering – no server or internet connection needed.
"""

import json
from datetime import date


_EXPORT_TEMPLATE = """\
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Auswertung Tätigkeitserhebung – {titel}</title>
  <style>
    *, *::before, *::after {{ box-sizing: border-box; }}
    body {{ font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #f8fafc; color: #1e293b; }}
    header {{ background: #1e3a5f; color: #fff; padding: 1.5rem 2rem; }}
    header h1 {{ margin: 0 0 .25rem; font-size: 1.5rem; }}
    header p {{ margin: 0; font-size: .875rem; opacity: .8; }}
    main {{ max-width: 1200px; margin: 2rem auto; padding: 0 1.5rem; }}
    section {{ background: #fff; border-radius: .75rem; box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: 1.5rem; margin-bottom: 1.5rem; }}
    h2 {{ margin-top: 0; font-size: 1.125rem; color: #1e3a5f; border-bottom: 1px solid #e2e8f0; padding-bottom: .5rem; margin-bottom: 1rem; }}
    .filter-row {{ display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; margin-bottom: 1rem; }}
    .filter-group label {{ display: block; font-size: .75rem; font-weight: 600; text-transform: uppercase; color: #64748b; margin-bottom: .25rem; }}
    select, input[type=date] {{ border: 1px solid #cbd5e1; border-radius: .375rem; padding: .375rem .625rem; font-size: .875rem; }}
    .kacheln {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; }}
    .kachel {{ background: #f1f5f9; border-radius: .5rem; padding: 1rem; text-align: center; }}
    .kachel .wert {{ font-size: 2rem; font-weight: 700; color: #1e3a5f; }}
    .kachel .label {{ font-size: .75rem; color: #64748b; margin-top: .25rem; }}
    table {{ width: 100%; border-collapse: collapse; font-size: .875rem; }}
    th {{ background: #f1f5f9; text-align: left; padding: .5rem .75rem; font-weight: 600; font-size: .75rem; text-transform: uppercase; color: #64748b; }}
    td {{ padding: .5rem .75rem; border-bottom: 1px solid #f1f5f9; }}
    tr:last-child td {{ border-bottom: none; }}
    .heatmap-grid {{ overflow-x: auto; }}
    .heatmap-table {{ border-collapse: collapse; font-size: .7rem; }}
    .heatmap-table th {{ padding: .25rem .375rem; background: #f1f5f9; }}
    .heatmap-table td {{ width: 28px; height: 16px; text-align: center; cursor: default; }}
    .heatmap-table td span {{ display: none; }}
    .heatmap-table td:hover span {{ display: block; position: absolute; background: #1e293b; color: #fff; padding: .375rem .625rem; border-radius: .375rem; font-size: .7rem; z-index: 10; white-space: nowrap; transform: translateY(-110%); }}
    .heatmap-table td {{ position: relative; }}
    .bar-chart {{ display: flex; flex-direction: column; gap: .5rem; }}
    .bar-row {{ display: flex; align-items: center; gap: .5rem; font-size: .8rem; }}
    .bar-label {{ width: 200px; text-align: right; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }}
    .bar-track {{ flex: 1; background: #f1f5f9; border-radius: 9999px; height: 18px; overflow: hidden; }}
    .bar-fill {{ height: 100%; border-radius: 9999px; }}
    .bar-value {{ width: 60px; font-size: .75rem; color: #64748b; }}
    .toggle-btns {{ display: flex; gap: .5rem; margin-bottom: 1rem; }}
    .toggle-btn {{ padding: .375rem .75rem; border: 1px solid #cbd5e1; border-radius: .375rem; background: #fff; cursor: pointer; font-size: .8rem; }}
    .toggle-btn.active {{ background: #1e3a5f; color: #fff; border-color: #1e3a5f; }}
    .note {{ font-size: .8rem; color: #64748b; margin-top: .75rem; }}
  </style>
</head>
<body>
  <header>
    <h1>Tätigkeitserhebung – Auswertung</h1>
    <p>Exportiert am {export_datum} | Gruppe(n): {gruppen_namen} | Zeitraum: {zeitraum_von} – {zeitraum_bis}</p>
  </header>
  <main>
    <!-- Filters -->
    <section id="filter">
      <h2>Filter</h2>
      <div class="filter-row">
        <div class="filter-group">
          <label>Raumtyp</label>
          <select id="sel-raumtyp" onchange="renderAll()">
            <option value="">Alle Raumtypen</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Wochentag</label>
          <select id="sel-wochentag" onchange="renderAll()">
            <option value="">Alle Wochentage</option>
            <option value="0">Montag</option>
            <option value="1">Dienstag</option>
            <option value="2">Mittwoch</option>
            <option value="3">Donnerstag</option>
            <option value="4">Freitag</option>
          </select>
        </div>
        <div class="filter-group">
          <label>Lastprofil zeigt</label>
          <div class="toggle-btns">
            <button class="toggle-btn active" onclick="setAnzeige('mittelwert', this)">Mittelwert</button>
            <button class="toggle-btn" onclick="setAnzeige('maximum', this)">Maximum</button>
            <button class="toggle-btn" onclick="setAnzeige('minimum', this)">Minimum</button>
          </div>
        </div>
      </div>
    </section>
    <!-- KPI -->
    <section id="kennzahlen">
      <h2>Kennzahlen</h2>
      <div class="kacheln" id="kacheln-container"></div>
    </section>
    <!-- Heatmap -->
    <section id="lastprofil">
      <h2>Lastprofil – Wochenansicht</h2>
      <div class="heatmap-grid" id="heatmap-container"></div>
    </section>
    <!-- Room demand -->
    <section id="raumbedarf">
      <h2>Raumbedarf</h2>
      <div id="raumbedarf-container"></div>
    </section>
    <!-- Shares -->
    <section id="anteile">
      <h2>Anteilsübersicht</h2>
      <div id="anteile-container"></div>
    </section>
  </main>

  <script>
    const D = {daten_json};
    let anzeige = 'mittelwert';

    function setAnzeige(val, btn) {{
      anzeige = val;
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHeatmap();
    }}

    function getFilter() {{
      const rt = document.getElementById('sel-raumtyp').value;
      const wt = document.getElementById('sel-wochentag').value;
      return {{ raumtyp_id: rt ? parseInt(rt) : null, wochentag: wt !== '' ? parseInt(wt) : null }};
    }}

    function renderAll() {{ renderKacheln(); renderHeatmap(); renderRaumbedarf(); renderAnteile(); }}

    function renderKacheln() {{
      const k = D.kennzahlen;
      const html = `
        <div class="kachel"><div class="wert">${{k.anwesenheitsquote}}%</div><div class="label">Anwesenheitsquote</div></div>
        <div class="kachel"><div class="wert">${{k.stille_arbeit}}%</div><div class="label">Stille Arbeit</div></div>
        <div class="kachel"><div class="wert">${{k.kommunikative_arbeit}}%</div><div class="label">Kommunikative Arbeit</div></div>
        <div class="kachel"><div class="wert">${{k.avg_anwesende}}</div><div class="label">Ø Anwesende</div></div>`;
      document.getElementById('kacheln-container').innerHTML = html;
    }}

    function renderHeatmap() {{
      const f = getFilter();
      const TAGE = ['Mo','Di','Mi','Do','Fr'];
      const SLOTS = {anzahl_slots};
      const START_MIN = {tag_start_min};

      // slots[wochentag][slot_offset][raumtyp_id] = {{mittelwert, maximum, minimum}}
      const slotMap = {{}};
      for (const s of D.lastprofil.slots) {{
        if (f.raumtyp_id !== null && s.raumtyp_id !== f.raumtyp_id) continue;
        if (f.wochentag !== null && s.wochentag !== f.wochentag) continue;
        const key = `${{s.wochentag}}_${{s.slot_start_minuten}}`;
        if (!slotMap[key]) slotMap[key] = {{ mittelwert: 0, maximum: 0, minimum: Infinity, count: 0 }};
        slotMap[key].mittelwert += s.mittelwert;
        slotMap[key].maximum = Math.max(slotMap[key].maximum, s.maximum);
        slotMap[key].minimum = Math.min(slotMap[key].minimum, s.minimum);
        slotMap[key].count++;
      }}

      const maxVal = Math.max(1, ...Object.values(slotMap).map(v => v[anzeige === 'minimum' ? 'minimum' : anzeige === 'maximum' ? 'maximum' : 'mittelwert'] || 0));
      const days = f.wochentag !== null ? [f.wochentag] : [0,1,2,3,4];

      let hdr = '<tr><th>Zeit</th>' + days.map(d => `<th>${{TAGE[d]}}</th>`).join('') + '</tr>';
      let rows = '';
      for (let si = 0; si < SLOTS; si++) {{
        const slotMin = START_MIN + si * 15;
        const hh = String(Math.floor(slotMin / 60)).padStart(2,'0');
        const mm = String(slotMin % 60).padStart(2,'0');
        const timeStr = `${{hh}}:${{mm}}`;
        rows += `<tr><td style="white-space:nowrap;font-size:.7rem;padding:.25rem .375rem">${{timeStr}}</td>`;
        for (const wt of days) {{
          const key = `${{wt}}_${{si * 15}}`;
          const val = slotMap[key];
          if (!val) {{ rows += '<td></td>'; continue; }}
          const v = anzeige === 'maximum' ? val.maximum : anzeige === 'minimum' ? (val.minimum === Infinity ? 0 : val.minimum) : val.mittelwert;
          const intensity = Math.min(1, v / maxVal);
          const bg = `rgba(30,58,95,${{intensity.toFixed(2)}})`;
          const fg = intensity > 0.5 ? '#fff' : '#1e293b';
          rows += `<td style="background:${{bg}};color:${{fg}}" title="${{anzeige}}: ${{v.toFixed ? v.toFixed(1) : v}}">${{v.toFixed ? v.toFixed(1) : v}}</td>`;
        }}
        rows += '</tr>';
      }}
      document.getElementById('heatmap-container').innerHTML =
        `<table class="heatmap-table"><thead>${{hdr}}</thead><tbody>${{rows}}</tbody></table>`;
    }}

    function renderRaumbedarf() {{
      const d = D.raumbedarf;
      let rows = d.raumtypen.map(r => `<tr>
        <td>${{r.name}}</td>
        <td>${{r.avg_nutzung}}</td>
        <td>${{r.peak_nutzung}}</td>
        <td>${{d.sharing_ratio}}</td>
        <td><strong>${{r.einheiten_avg}}</strong></td>
        <td><strong>${{r.einheiten_peak}}</strong></td>
      </tr>`).join('');
      rows += `<tr style="background:#f1f5f9;font-weight:600">
        <td>Anwesend total</td>
        <td>${{d.anwesend_total.avg_nutzung}}</td>
        <td>${{d.anwesend_total.peak_nutzung}}</td>
        <td colspan="3"></td>
      </tr>`;
      document.getElementById('raumbedarf-container').innerHTML = `
        <table>
          <thead><tr>
            <th>Raumtyp</th><th>Ø Nutzung</th><th>Peak</th>
            <th>Sharing-Ratio</th><th>Einheiten (Ø)</th><th>Einheiten (Peak)</th>
          </tr></thead>
          <tbody>${{rows}}</tbody>
        </table>
        <p class="note">Die empfohlene Anzahl Einheiten basiert auf der eingestellten Sharing-Ratio (${{d.sharing_ratio}}). Ø-Werte sind kosteneffizienter, Peak-Werte decken Spitzenlastzeiten ab.</p>`;
    }}

    function renderAnteile() {{
      const d = D.anteile;
      const maxH = Math.max(1, ...d.raumtyp_anteile.map(r => r.stunden));
      const bars = d.raumtyp_anteile.map(r => `
        <div class="bar-row">
          <div class="bar-label" title="${{r.name}}">${{r.name}}</div>
          <div class="bar-track"><div class="bar-fill" style="width:${{(r.stunden/maxH*100).toFixed(1)}}%;background:#2980B9"></div></div>
          <div class="bar-value">${{r.stunden}}h (${{r.anteil_prozent}}%)</div>
        </div>`).join('');
      document.getElementById('anteile-container').innerHTML = `
        <p style="font-size:.875rem;color:#64748b">Gesamt: ${{d.gesamt_stunden}} Stunden</p>
        <div class="bar-chart">${{bars}}</div>`;
    }}

    // Populate room type filter.
    (function() {{
      const sel = document.getElementById('sel-raumtyp');
      for (const rt of D.lastprofil.raumtypen) {{
        const o = document.createElement('option');
        o.value = rt.id;
        o.textContent = rt.name;
        sel.appendChild(o);
      }}
    }})();

    renderAll();
  </script>
</body>
</html>
"""


def generiere_export_html(
    lastprofil: dict,
    raumbedarf: dict,
    anteile: dict,
    kennzahlen: dict,
    gruppen_namen: list[str],
    datum_von: date,
    datum_bis: date,
) -> str:
    """Render the fully self-contained HTML export string."""
    from constants import ANZAHL_SLOTS, TAG_START_MINUTEN

    daten = {
        "lastprofil": lastprofil,
        "raumbedarf": raumbedarf,
        "anteile": anteile,
        "kennzahlen": kennzahlen,
    }

    return _EXPORT_TEMPLATE.format(
        titel=" + ".join(gruppen_namen),
        export_datum=date.today().strftime("%d.%m.%Y"),
        gruppen_namen=", ".join(gruppen_namen),
        zeitraum_von=datum_von.strftime("%d.%m.%Y"),
        zeitraum_bis=datum_bis.strftime("%d.%m.%Y"),
        daten_json=json.dumps(daten, ensure_ascii=False, default=str),
        anzahl_slots=ANZAHL_SLOTS,
        tag_start_min=TAG_START_MINUTEN,
    )
