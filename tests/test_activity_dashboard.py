"""Meaningful fixtures run the exact calculation used live and in offline reports."""
import json
import subprocess
from pathlib import Path

import pytest
from test_spatial_planning import app  # shared isolated SQLite fixture

ROOT = Path(__file__).resolve().parents[1]
JS = ROOT / 'backend/services/activity_dashboard.js'


def calc(entries, people=None, state=None, extra=None):
    if people is None:
        people = [dict(i=i,u=i,g=1,start='2026-10-05',end='2026-10-05',eingereicht=True,
                       funktion='A' if i==0 else 'B',oe='HR',grad=100) for i in sorted({e['t'] for e in entries})]
    data=dict(teilnehmer=people,eintraege=entries,gruppen_namen=['Test'],zeitraum_von='2026-10-05',zeitraum_bis='2026-10-05',snapshot_date='2026-10-20',snapshot_minute=1200)
    data.update(extra or {})
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
    assert result['valid']==2 and result['excluded']==0
    assert result['activities'][0]['afternoon']==1
    assert result['coverage']==75 and result['unknownMinutes']==240
    assert result['coverageCells'][1]['coverage']==50


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
    assert r['options']['hybrid']==['na']  # explicitly distinguish non-applicable values


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
    draft=User(email='draft-private@example.org',pin_hash='test')
    db.session.add(draft);db.session.flush()
    db.session.add(GruppenMitglied(user_id=draft.id,gruppe_id=g.id))
    db.session.add(Eintrag(user_id=draft.id,gruppe_id=g.id,kategorie_id=cat.id,datum=g.zeitraum_von,zeit_von=time(8),zeit_bis=time(12),online_dabei=False))
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
    assert len(payload['eintraege'])==2 and payload['includes_drafts'] is True
    assert payload['default_mode']=='all' and payload['snapshot_date'] and payload['snapshot_at']
    assert res.headers['Cache-Control']=='no-store'
    from services.auswertung_service import export_rohdaten
    assert len(export_rohdaten([g.id],g.zeitraum_von,g.zeitraum_bis)['eintraege'])==1
    assert c.get(url+',2').status_code==400
    assert 'private@example.org' not in json.dumps(payload) and 'PrivateName' not in json.dumps(payload)
    assert c.get(url+'&datum_von=2027-01-01&datum_bis=2026-01-01').status_code==400


def people(n, submitted=True, **changes):
    return [dict(i=i,u=i,g=1,start='2026-10-05',end='2026-10-05',eingereicht=submitted,
                 funktion='A' if i==0 else 'B',oe='HR',grad=100,**changes) for i in range(n)]


def test_empty_registered_people_stay_unknown_and_observed_mix_is_not_scaled():
    es=[entry(i) for i in range(6)]+[{**entry(i),'form':'MEETING','gg':'ZWEI_BIS_VIER','tk':'STANDORTINTERN'} for i in (6,7)]
    ps=people(10)
    r=calc(es,ps)
    assert r['people']==10 and r['notStarted']==2 and r['coverage']==80
    assert r['unknownMinutes']==960 and r['lowCoverage']==2
    rows={x['name']:x for x in r['activities']}
    assert rows['Allein arbeiten']['average']==6 and rows['Allein arbeiten']['share']==75
    assert rows['Zusammenarbeit vor Ort']['average']==2 and rows['Zusammenarbeit vor Ort']['share']==25
    # Activity/location filters cannot make the coverage appear complete.
    filtered=calc(es,ps,{'filters':{'form':['MEETING']},'location':'HOMEOFFICE'})
    assert filtered['coverage']==80 and filtered['selectedMinutes']==0


def test_drafts_are_opt_in_and_meetings_use_the_chosen_submission_cohort():
    ps=people(4); ps[0]['eingereicht']=False
    es=[{**entry(i),'form':'MEETING','room':'BESPRECHUNG','gg':'ZWEI_BIS_VIER','tk':'STANDORTINTERN','hybrid':False} for i in range(4)]
    strict=calc(es,ps,{'mode':'submitted'})
    interim=calc(es,ps,{'mode':'all'})
    assert strict['people']==3 and strict['activities'][0]['average']==3
    assert interim['people']==4 and interim['drafts']==1 and interim['activities'][0]['average']==4
    assert strict['meetings']['mean']==1 and interim['meetings']['mean']==1
    assert calc(es,ps,{'mode':'all'},extra={'includes_drafts':False})['mode']=='submitted'


def test_whole_missing_halfday_has_no_numeric_occupancy_but_zero_coverage():
    r=calc([{**entry(0),'bis':720}],people(2))
    assert r['valid']==1 and r['expected']==2 and r['excluded']==1
    assert r['coverage']==25 and r['unknownMinutes']==720
    assert r['activities'][0]['cells'][1]['mean'] is None
    assert r['coverageCells'][1]['coverage']==0
    empty=calc([],people(2,submitted=False),{'mode':'all'})
    assert empty['people']==2 and empty['coverage']==0 and empty['rows']==[]
    assert empty['expected']==2 and empty['unknownMinutes']==960


def test_future_and_ongoing_are_not_missing_and_snapshot_is_frozen():
    ps=people(1); ps[0]['end']='2026-10-06'
    es=[entry(0),{**entry(0),'d':'2026-10-06'}]
    clock={'snapshot_date':'2026-10-05','snapshot_minute':660}
    r=calc(es,ps,extra=clock)
    assert r['expected']==0 and r['valid']==0 and r['coverage'] is None
    assert r['unknownMinutes']==0 and r['future']==3 and r['ongoing']==1
    live=calc(es,ps,{'includeOngoing':True},extra=clock)
    assert live['expected']==1 and live['valid']==1 and live['coverage']==75
    assert live['selectedMinutes']==180 and live['activities'][0]['average']==.75
    # Only the saved snapshot clock, never the later date of opening a report.
    assert calc(es,ps,extra=clock)==r
    noon=calc(es,ps,extra={'snapshot_date':'2026-10-05','snapshot_minute':720})
    assert noon['coverage']==100 and noon['valid']==1 and noon['ongoing']==0


def test_peak_exposes_coverage_of_its_actual_day_not_the_average():
    ps=people(2); [p.update(end='2026-10-12') for p in ps]
    es=[entry(0),{**entry(0),'d':'2026-10-12'}, {**entry(1),'d':'2026-10-12','bis':600}]
    r=calc(es,ps)
    cell=r['activities'][0]['cells'][0]
    assert cell['max']==1.5 and cell['date']=='2026-10-12'
    assert cell['peakCoverage']==75 and cell['coverage'] < cell['peakCoverage']


def test_submitted_offline_dataset_strips_drafts_without_mutating_live_data():
    payload={'teilnehmer':people(2),'eintraege':[entry(0),entry(1)],'includes_drafts':True}
    payload['teilnehmer'][1]['eingereicht']=False
    script="import fs from 'node:fs';const m=await import('data:text/javascript;base64,'+fs.readFileSync(process.argv[1]).toString('base64'));const input="+json.dumps(payload)+";console.log(JSON.stringify({report:m.reportDataset(input,{mode:'submitted'}),original:input}));"
    r=json.loads(subprocess.check_output(['node','--input-type=module','-e',script,str(JS)],text=True))
    assert r['original']==payload and len(r['report']['teilnehmer'])==1
    assert len(r['report']['eintraege'])==1 and r['report']['includes_drafts'] is False


def test_profile_breakdowns_and_pensum_ranges_preserve_person_minutes():
    ps=people(3)
    for p,oe,grad in zip(ps,['HR','HR','IT'],[60,80,100]):
        p.update(oe=oe,grad=grad)
    es=[entry(i) for i in range(3)]
    r=calc(es,ps,{'split':'oe','second':'gradBand'})
    assert {row['name']: row['average'] for row in r['rows']} == {
        'HR · Bis 60 %':1, 'HR · Über 60 bis 80 %':1, 'IT · Über 80 %':1}
    assert sum(row['share'] for row in r['rows'])==pytest.approx(100)
    r=calc(es,ps,{'filters':{'gradBand':['Über 60 bis 80 %']},'split':'grad'})
    assert r['people']==1 and r['rows'][0]['name']=='80 %'
    assert r['rows'][0]['average']==1  # no additional FTE weighting


def test_share_base_selection_changes_only_percentages():
    es=[entry(0),{**entry(1),'form':'ONLINE'}]
    base={'filters':{'form':['ONLINE']}}
    a=calc(es,state=base)
    b=calc(es,state={**base,'shareBase':'selection'})
    assert a['activities'][0]['share']==50
    assert b['activities'][0]['share']==100
    assert a['activities'][0]['average']==b['activities'][0]['average']==1
    assert a['coverage']==b['coverage']==100
    assert a['selectedMinutes']==b['selectedMinutes']==480


def test_minimum_completeness_excludes_observations_but_preserves_quality():
    es=[entry(0),{**entry(1),'bis':720}]
    a=calc(es)
    b=calc(es,state={'minCoverage':'85'})
    assert a['valid']==2 and b['valid']==1
    assert b['qualityExcluded']==1 and b['expected']==2
    assert a['coverage']==b['coverage']==75
    assert b['activities'][0]['morning']==2
    assert b['activities'][0]['afternoon'] is None
    assert b['timeline'][1]['n'] is None
    assert b['weeks'][0]['days']==1
    assert b['weeks'][0]['n']==2


def test_incompatible_filter_keeps_selected_value_and_shows_zero_matches():
    es=[entry(0),{**entry(1),'ao':'HOMEOFFICE','onsite':False,'room':None}]
    r=calc(es,state={'location':'HOMEOFFICE','filters':{'room':['ARBEITSPLATZ']}})
    assert r['selectedMinutes']==0 and r['people']==2
    assert 'ARBEITSPLATZ' in r['options']['room']
    assert r['optionCounts']['room']['ARBEITSPLATZ']==0
    assert r['optionCounts']['room']['na']==1


def test_cross_table_and_timeline_preserve_documented_zeros():
    es=[{**entry(0),'bis':720}, {**entry(0),'von':780,'form':'ABWESENHEIT','absence':'TEILZEIT','ao':None}]
    r=calc(es)
    assert len(r['cross'])==1 and r['cross'][0]['minutes']==240
    assert [o['n'] for o in r['timeline']]==[1,0]
    assert r['weeks'][0]['n']==.5
    assert r['matchedPeople']==1


def test_all_profile_options_count_other_profile_filters():
    ps=people(2)
    ps[0].update(oe='HR',funktion='Leitung')
    ps[1].update(oe='IT',funktion='Fach')
    r=calc([entry(0),entry(1)],ps,{'filters':{'oe':['HR']}})
    assert r['optionCounts']['funktion']=={'Fach':0,'Leitung':1}
    assert r['optionCounts']['oe']=={'HR':1,'IT':1}


def test_missing_time_in_one_oe_is_not_zero_because_another_oe_documented_it():
    ps=people(2)
    ps[0]['oe']='HR'
    ps[1]['oe']='IT'
    r=calc([{**entry(0),'bis':720},entry(1)],ps,{'split':'oe'})
    rows={row['name']:row for row in r['rows']}
    assert rows['HR']['average']==1
    assert rows['HR']['afternoon'] is None
    assert rows['HR']['coverage']==50
    assert rows['HR']['cells'][1]['mean'] is None
    assert rows['IT']['coverage']==100
    # A fully missing OE remains visible with unknown occupancy, not zero.
    r=calc([entry(1)],ps,{'split':'oe'})
    rows={row['name']:row for row in r['rows']}
    assert rows['HR']['average'] is None and rows['HR']['coverage']==0


def test_total_peak_is_computed_from_actual_halfdays_not_sum_of_row_peaks():
    ps=[{**people(1)[0],'end':'2026-10-06'}]
    es=[entry(0),{**entry(0),'d':'2026-10-06','form':'ONLINE'}]
    r=calc(es,ps)
    assert sum(row['peak']['n'] for row in r['activities'])==2
    assert r['totals']['peak']['n']==1
    assert r['totals']['average']==1


def test_drilldown_respects_subgroup_dates_unknowns_and_minimum_coverage():
    people = [
        dict(i=0, u=0, g=1, start="2026-10-05", end="2026-10-12", eingereicht=True, oe="HR"),
        dict(i=1, u=1, g=1, start="2026-10-12", end="2026-10-12", eingereicht=True, oe="IT"),
    ]
    entries = [entry(0), {**entry(1), "d": "2026-10-12", "bis": 720}]
    result = calc(entries, people, {"split": "oe", "minCoverage": "85"})
    rows = {row["name"]: row for row in result["rows"]}
    hr = [o for o in rows["HR"]["timeline"] if o["wd"] == 0 and o["h"] == 0]
    assert [(o["n"], o["coverage"]) for o in hr] == [(1, 100), (None, 0)]
    it = rows["IT"]
    assert it["cells"][0]["expectedDays"] == 1
    assert [(o["n"], o["coverage"]) for o in it["timeline"]] == [(None, 100), (None, 0)]


def test_stack_basis_for_two_profile_dimensions_includes_nonreporters():
    people = [
        dict(i=i, u=i, g=1, start="2026-10-05", end="2026-10-05",
             eingereicht=True, oe="IT" if i < 3 else "HR", funktion=str(i))
        for i in range(4)
    ]
    result = calc([entry(0), entry(3)], people, {"split": "oe", "second": "funktion"})
    groups = {row["name"]: row for row in result["groupBases"]}
    assert groups["IT"]["people"] == 3
    assert groups["IT"]["coverage"] == pytest.approx(100 / 3)
    assert groups["HR"]["coverage"] == 100
