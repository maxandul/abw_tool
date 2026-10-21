import json
import subprocess
import sys
from datetime import date
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'backend'))
from services.planning import calculate_planning


def entry(user, day, **changes):
    return dict(id=user, group=1, day=day, start=600, end=615, onsite=True,
                room='ARBEITSPLATZ', size='ALLEIN', circle=None, retreat='GEMEINSAM_MOEGLICH',
                reasons=[], v2=True, category=1, **changes)


def profile(result, key):
    return next(p for p in result['profiles'] if p['key'] == key)


def test_maximum_is_same_day_not_union_of_mondays_and_zero_days_count():
    entries = [entry(1, '2026-10-05'), entry(2, '2026-10-12')]
    # both days are fully documented including absence (zero occupancy)
    entries += [{**entry(2, '2026-10-05'), 'onsite':False}, {**entry(1, '2026-10-12'), 'onsite':False}]
    people = [dict(id=u, group=1, start='2026-10-05', end='2026-10-12') for u in (1,2)]
    result = calculate_planning(entries, entries, people)
    p = profile(result, 'desks')
    assert p['maximum_slots'] == [dict(wochentag=0, slot_start_minuten=180, maximum=1)]
    assert next(s['mittelwert'] for s in p['mittelwert_slots'] if s['slot_start_minuten']==180) == 1
    assert result['mean_days'] == 2
    assert result['excluded_days'] == 4
    # A documented day entirely away from desks is a real zero.
    zeros = [{**entry(u,'2026-10-06'),'onsite':False} for u in (1,2)]
    result = calculate_planning(entries+zeros,entries+zeros,people)
    assert next(s['mittelwert'] for s in profile(result,'desks')['mittelwert_slots'] if s['slot_start_minuten']==180)==.667


def test_meeting_estimate_and_retreat_need_are_separate_from_desks():
    entries = [{**entry(u,'2026-10-05'), 'room':'BESPRECHUNG','size':'ZWEI_BIS_VIER',
                'circle':'STANDORTINTERN','retreat':'ERFORDERLICH'} for u in range(6)]
    people=[dict(id=u,group=1,start='2026-10-05',end='2026-10-05') for u in range(6)]
    result=calculate_planning(entries,entries,people)
    assert profile(result,'meeting_ZWEI_BIS_VIER')['maximum_slots'][0]['maximum']==2
    assert profile(result,'need_ZWEI_BIS_VIER')['maximum_slots'][0]['maximum']==2
    assert profile(result,'desks')['maximum_slots']==[]


def test_export_and_server_planning_agree():
    entries=[entry(1,'2026-10-05'),{**entry(2,'2026-10-05'),'room':'BESPRECHUNG','size':'DREIZEHN_PLUS','circle':'STANDORTUEBERGREIFEND_EXTERN'},
             {**entry(1,'2026-10-06'),'onsite':False}, {**entry(2,'2026-10-06'),'retreat':'ERFORDERLICH','reasons':['KONZENTRATION','VERTRAULICHKEIT']}]
    people=[dict(id=u,group=1,start='2026-10-05',end='2026-10-07') for u in (1,2)]
    js=(ROOT/'backend/services/planning_export.js').read_text()
    script=js+'\nconsole.log(JSON.stringify(calculatePlanning(...'+json.dumps([entries,entries,people])+')));'
    actual=json.loads(subprocess.check_output(['node','-e',script],text=True))
    assert actual==calculate_planning(entries,entries,people)


@pytest.fixture
def app():
    from app import create_app
    from extensions import db
    class Config:
        TESTING=True
        SECRET_KEY='test'
        SQLALCHEMY_DATABASE_URI='sqlite://'
        SQLALCHEMY_TRACK_MODIFICATIONS=False
    app=create_app(Config)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


def test_capture_catalog_and_backend_validation(app):
    from extensions import db
    from services.seed_service import seed_default_data
    from services.eintrag_service import create_eintrag,update_eintrag
    from services.kategorie_service import list_kategorien
    from services.auswertung_service import berechne_raumbedarf,berechne_lastprofil,export_rohdaten
    from models import Kategorie,Arbeitsform,Gruppe,User,GruppenMitglied,Einreichung,EinreichungStatus
    from app.utils import ValidationError
    seed_default_data();seed_default_data()
    assert len(list_kategorien(nur_neu=True))==5
    u=User(email='test@example.org',pin_hash='test')
    g=Gruppe(name='Teststandort',zeitraum_von=date(2026,10,5),zeitraum_bis=date(2026,10,12))
    db.session.add_all([u,g]);db.session.flush()
    db.session.add(GruppenMitglied(user_id=u.id,gruppe_id=g.id))
    db.session.commit()
    online=Kategorie.query.filter_by(schema_version=2,arbeitsform=Arbeitsform.ONLINE).one()
    data=dict(datum='2026-10-05',zeit_von='10:00',zeit_bis='11:00',kategorie_id=online.id,
              arbeitsort='UEBLICHER_ARBEITSPLATZ',gruppengroesse='ALLEIN',raumnutzung='ARBEITSPLATZ',
              rueckzugsbedarf='ERFORDERLICH',rueckzug_gruende=['VERTRAULICHKEIT'])
    e=create_eintrag(u.id,g.id,data)
    assert e.online_dabei is True
    assert e.to_dict()['rueckzug_gruende']==[]
    assert e.rueckzugsbedarf is None
    # Online participation needs no room group or hypothetical room demand.
    e=update_eintrag(u.id,e.id,{k:v for k,v in data.items() if k not in ('gruppengroesse','rueckzugsbedarf','rueckzug_gruende')})
    assert e.gruppengroesse.value == 'ALLEIN'
    meeting=Kategorie.query.filter_by(schema_version=2,arbeitsform=Arbeitsform.MEETING).one()
    meeting_data={**data,'kategorie_id':meeting.id,'gruppengroesse':'ZWEI_BIS_VIER',
                  'teilnehmerkreis':'STANDORTINTERN','online_dabei':True}
    e=update_eintrag(u.id,e.id,meeting_data)
    assert e.online_dabei is True
    e=update_eintrag(u.id,e.id,{**meeting_data,'online_dabei':False})
    assert e.online_dabei is False
    with pytest.raises(ValidationError):
        update_eintrag(u.id,e.id,{**meeting_data,'online_dabei':'false'})
    db.session.rollback()
    e=update_eintrag(u.id,e.id,{**data,'arbeitsort':'HOMEOFFICE'})
    assert e.raumnutzung is None and e.rueckzug_gruende==[]
    submission=Einreichung.query.one();submission.status=EinreichungStatus.EINGEREICHT;db.session.commit()
    result=berechne_raumbedarf([g.id],g.zeitraum_von,g.zeitraum_bis)
    assert profile(result['planning'],'desks')['maximum_slots']==[]
    assert berechne_lastprofil([g.id],g.zeitraum_von,g.zeitraum_bis,kategorie_ids=[online.id])['maximum_slots'][0]['maximum']==1
    raw=export_rohdaten([g.id],g.zeitraum_von,g.zeitraum_bis)
    assert raw['eintraege'][0]['onsite'] is False
    assert 'test@example.org' not in json.dumps(raw)
    from services.auth_service import SESSION_USER_ID, SESSION_ROLLE
    client=app.test_client()
    with client.session_transaction() as session:
        session[SESSION_USER_ID]=u.id
        session[SESSION_ROLLE]='ADMIN'
    response=client.get(f'/api/auswertung/raumbedarf?gruppe_ids={g.id}')
    assert response.status_code==200 and response.json['data']['planning']['profiles']
    response=client.get(f'/api/auswertung/export?gruppe_ids={g.id}')
    assert response.status_code==200
    html=response.get_data(as_text=True)
    assert '__PLANNING_JS__' not in html
    script=html.split('<script>',1)[1].split('</script>',1)[0]
    checked=subprocess.run(['node','--check'],input=script,text=True,capture_output=True)
    assert checked.returncode==0, checked.stderr



def test_upgrade_preserves_historical_category_and_values(tmp_path):
    from app import create_app
    from extensions import db
    from flask_migrate import upgrade
    from sqlalchemy import text
    from models import Kategorie
    from services.seed_service import seed_default_data
    class Config:
        TESTING=True
        SECRET_KEY='migration-test'
        SQLALCHEMY_DATABASE_URI='sqlite:///'+str(tmp_path/'migration.db')
        SQLALCHEMY_TRACK_MODIFICATIONS=False
    app=create_app(Config)
    with app.app_context():
        upgrade(directory=str(ROOT/'migrations'),revision='f6a7b8c9d0e1')
        db.session.execute(text("INSERT INTO kategorie (id,name,aktiv,sort_order,arbeitsform,arbeitsort) VALUES (1,'Historische Einzelarbeit',1,1,'EINZELARBEIT','HOMEOFFICE')"))
        db.session.commit()
        upgrade(directory=str(ROOT/'migrations'))
        seed_default_data()
        old=db.session.get(Kategorie,1)
        assert old.schema_version==1
        assert old.name=='Historische Einzelarbeit'
        assert old.arbeitsort.value=='HOMEOFFICE'
        assert Kategorie.query.filter_by(schema_version=2).count()==5
