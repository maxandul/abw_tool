// Mirrors planning.py. Kept separate so parity can be tested without a DOM.
function calculatePlanning(all, entries, participants) {
  const sizes={ALLEIN:[1,'1 Person'],ZWEI_BIS_VIER:[3,'2–4 Personen'],FUENF_BIS_ACHT:[6.5,'5–8 Personen'],NEUN_BIS_ZWOELF:[10.5,'9–12 Personen'],DREIZEHN_PLUS:[13,'13 oder mehr Personen']};
  const labels={onsite:'Anwesenheit am Standort',desks:'Genutzte Büroarbeitsplätze',retreat_use:'Genutzte Rückzugsräume (Personen)',retreat_need:'Geschlossener Raum allein benötigt',concentration:'Rückzug allein: Konzentration',confidential:'Rückzug allein: Vertraulichkeit',noise:'Rückzug allein: andere nicht stören'};
  for(const [k,v] of Object.entries(sizes)){labels['meeting_'+k]='Besprechungsräume: '+v[1];labels['need_'+k]='Geschlossene Räume benötigt: '+v[1];}
  const wd=d=>(new Date(d+'T00:00:00Z').getUTCDay()+6)%7;
  const doc=new Set(all.map(e=>`${e.group}|${e.id}|${e.day}`));
  const expected={};
  for(const p of participants){for(let d=new Date(p.start+'T00:00:00Z');d<=new Date(p.end+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+1)){
    const day=d.toISOString().slice(0,10);if(wd(day)<5)(expected[day]??=[]).push([p.group,p.id]);
  }}
  const valid=Object.keys(expected).filter(d=>expected[d].every(([g,u])=>doc.has(`${g}|${u}|${d}`)));
  const occupants={},meetings={},series={};
  const add=(map,key,id)=>{(map[key]??=new Set()).add(id);};
  for(const e of entries){if(!e.onsite)continue;for(let off=Math.max(420,e.start)-420;off<Math.min(1140,e.end)-420;off+=15){
    const addOcc=key=>add(occupants,`${key}|${e.day}|${off}`,e.id);
    addOcc('onsite');if(!e.v2)continue;
    if(e.room==='ARBEITSPLATZ')addOcc('desks');if(e.room==='RUECKZUG')addOcc('retreat_use');
    if(!sizes[e.size])continue;
    if(e.retreat==='ERFORDERLICH'&&e.size==='ALLEIN'){
      addOcc('retreat_need');for(const [reason,key] of [['KONZENTRATION','concentration'],['VERTRAULICHKEIT','confidential'],['LAERM','noise']])if(e.reasons.includes(reason))addOcc(key);
    }
    for(const [prefix,condition] of [['meeting_',e.room==='BESPRECHUNG'],['need_',e.retreat==='ERFORDERLICH'&&e.size!=='ALLEIN']])if(condition)add(meetings,`${prefix+e.size}|${e.day}|${off}|${e.group}|${e.circle||'STANDORTINTERN'}`,e.id);
  }}
  for(const [key,set] of Object.entries(occupants))series[key]=set.size;
  for(const [key,set] of Object.entries(meetings)){
    const [metric,day,off,g,circle]=key.split('|');const size=metric.slice(metric.indexOf('_')+1);
    const divisor=circle==='STANDORTINTERN'?sizes[size][0]:1;
    const k=`${metric}|${day}|${off}`;series[k]=(series[k]||0)+Math.ceil(set.size/divisor);
  }
  const profiles=Object.entries(labels).map(([key,label])=>{
    const maxima={};for(const [k,n] of Object.entries(series)){const [metric,day,off]=k.split('|');if(metric===key){const mk=`${wd(day)}|${off}`;maxima[mk]=Math.max(maxima[mk]||0,n);}}
    return {key,label,maximum_slots:Object.entries(maxima).map(([k,maximum])=>{const [wochentag,slot_start_minuten]=k.split('|').map(Number);return {wochentag,slot_start_minuten,maximum};}).sort((a,b)=>a.wochentag-b.wochentag||a.slot_start_minuten-b.slot_start_minuten),
    mittelwert_slots:valid.length?Array.from({length:48},(_,i)=>({slot_start_minuten:i*15,mittelwert:Math.round(valid.reduce((sum,d)=>sum+(series[`${key}|${d}|${i*15}`]||0),0)/valid.length*1000)/1000})):[]};
  });
  return {profiles,mean_days:valid.length,observed_days:new Set(all.map(e=>e.day)).size,excluded_days:Object.keys(expected).length-valid.length,historical_entries:entries.filter(e=>!e.v2).length,mixed_meeting_entries:entries.filter(e=>e.onsite&&e.v2&&e.circle==='STANDORTUEBERGREIFEND_EXTERN').length};
}
