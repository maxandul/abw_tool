"""Meaningful fixtures run the exact calculation used live and in offline reports."""
import json
import subprocess
from pathlib import Path

import pytest
from test_spatial_planning import app  # shared isolated SQLite fixture

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / 'backend/services/activity_dashboard.js'


def calc(entries, people=None, state=None):
    if people is None:
        people = [dict(i=i,u=i,g=1,start='2026-10-05',end='2026-10-05',eingereicht=True,
                       funktion='A' if i==0 else 'B',oe='HR',grad=100) for i in sorted({e['t'] for e in entries})]
    data=dict(teilnehmer=people,eintraege=entries,gruppen_namen=['Test'],zeitraum_von='2026-10-05',zeitraum_bis='2026-10-05')
    script="import fs from 'node:fs'; const m=await import('data:text/javascript;base64,'+fs.readFileSync(process.argv[1]).toString('base64'));console.log(JSON.stringify(m.calculateDashboard("+json.dumps(data)+','+json.dumps(state or {})+")));"
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',script,str(JS)],text=True))


def entry(i, **changes):
    return dict(t=i,u=i,g=1,d='2026-10-05',von=480,bis=1020,v2=True,form='EINZELARBEIT',
                ao='UEBLICHER_ARBEITSPLATZ',onsite=True,room='ARBEITSPLATZ',gg='ALLEIN',tk=None,hybrid=None,**changes)


def test_time_weighted_people_shares_and_missing_tuesday():
    es=[{**entry(0),'bis':600}, {**entry(0),'von':600,'form':'ONLINE'},entry(1)]
    result=calc(es)
    assert result['valid']==2
    rows={r['name']:r for r in result['activities']}
    assert rows['Allein arbeiten']['morning']==1.5
    assert rows['Online-Meeting / Telefonat']['morning']==.5
    assert rows['Online-Meeting / Telefonat']['share']==37.5
    assert rows['Allein arbeiten']['cells'][2]['mean'] is None
    assert rows['Allein arbeiten']['cells'][0]['heads']==2


def test_documented_absence_is_zero_missing_halfday_is_not():
    result=calc([entry(0),{**entry(1),'form':'ABWESENHEIT','ao':None,'onsite':False,'absence':'TEILZEIT'}])
    assert result['valid']==2 and result['activities'][0]['average']==1
    assert result['absences'][0]['minutes']==480
    result=calc([entry(0),{**entry(1),'bis':720}])
    assert result['valid']==1 and result['excluded']==1
    assert result['activities'][0]['afternoon'] is None


def test_profiles_filter_cohort_but_activity_filter_preserves_denominator():
    es=[entry(0),{**entry(1),'form':'ONLINE'}]
    r=calc(es,state={'filters':{'funktion':['A']}})
    assert r['people']==1 and r['activities'][0]['average']==1
    r=calc(es,state={'filters':{'form':['ONLINE']}})
    assert r['activities'][0]['share']==50
    assert r['activities'][0]['average']==1
    r=calc(es,state={'filters':{'form':['MEETING']}})
    assert r['activities']==[] and r['selectedMinutes']==0 and r['valid']==2


def test_four_internal_reporters_are_roughly_one_meeting_before_subgroup_filter():
    es=[{**entry(i),'form':'MEETING','room':'BESPRECHUNG','gg':'ZWEI_BIS_VIER','tk':'STANDORTINTERN','hybrid':False} for i in range(4)]
    assert calc(es)['meetings']['mean']==1
    assert calc(es,state={'filters':{'funktion':['A']}})['meetings']['mean']==.25
    # Different actual locations/hybrid states are not pooled as the same meeting.
    es[0]['hybrid']=True
    assert calc(es)['meetings']['mean']==2


def test_meeting_peak_never_unions_different_mondays():
    people=[dict(i=i,u=i,g=1,start='2026-10-05',end='2026-10-12',eingereicht=True) for i in range(2)]
    es=[]
    for day,working in [('2026-10-05',0),('2026-10-12',1)]:
        for i in range(2):
            es.append({**entry(i),'d':day,'form':'EINZELARBEIT' if i==working else 'ABWESENHEIT','ao':'UEBLICHER_ARBEITSPLATZ' if i==working else None})
    r=calc(es,people)
    assert r['activities'][0]['cells'][0]['max']==1
    assert r['activities'][0]['cells'][0]['mean']==1
    assert r['valid']==4 and r['excluded']==8


def test_legacy_and_non_applicable_fields_are_not_invented():
    es=[entry(0),{**entry(1),'v2':False}]
    r=calc(es,state={'split':'hybrid','location':''})
    assert r['legacyEntries']==1 and r['excludedPeople']==1
    assert r['rows'][0]['name']=='Nicht anwendbar'
    assert r['options']['hybrid']==[]


def test_invalid_windows_are_rejected():
    with pytest.raises(subprocess.CalledProcessError):
        calc([entry(0)],state={'windows':[[720,480],[780,1020]]})


def test_dashboard_endpoint_is_admin_only_and_exports_current_fields(app):
    from datetime import date,time
    from extensions import db
    from models import User,Gruppe,GruppenMitglied,Eintrag,Einreichung,EinreichungStatus,Kategorie,Arbeitsform
    from services.seed_service import seed_default_data
    from services.auth_service import SESSION_USER_ID,SESSION_ROLLE
    seed_default_data()
    u=User(email='private@example.org',pin_hash='test')
    g=Gruppe(name='Test',zeitraum_von=date(2026,10,5),zeitraum_bis=date(2026,10,5))
    db.session.add_all([u,g]);db.session.flush()
    db.session.add_all([GruppenMitglied(user_id=u.id,gruppe_id=g.id,vorname='PrivateName'),Einreichung(user_id=u.id,gruppe_id=g.id,status=EinreichungStatus.EINGEREICHT)])
    cat=Kategorie.query.filter_by(arbeitsform=Arbeitsform.MEETING,schema_version=2).one()
    db.session.add(Eintrag(user_id=u.id,gruppe_id=g.id,kategorie_id=cat.id,datum=g.zeitraum_von,zeit_von=time(8),zeit_bis=time(12),online_dabei=True))
    db.session.commit()
    c=app.test_client();url=f'/api/auswertung/dashboard?gruppe_ids={g.id}'
    assert c.get(url).status_code==401
    with c.session_transaction() as s:
        s[SESSION_USER_ID]=u.id;s[SESSION_ROLLE]='TEILNEHMER'
    assert c.get(url).status_code==403
    with c.session_transaction() as s:s[SESSION_ROLLE]='ADMIN'
    res=c.get(url);assert res.status_code==200
    payload=res.json['data'];assert payload['eintraege'][0]['hybrid'] is True
    assert payload['eintraege'][0]['form']=='MEETING'
    assert 'private@example.org' not in json.dumps(payload) and 'PrivateName' not in json.dumps(payload)
    assert c.get(url+'&datum_von=2027-01-01&datum_bis=2026-01-01').status_code==400
