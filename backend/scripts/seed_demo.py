"""Demo seed: creates a realistic Erhebung with participants and entries.

Run from the project root:
    python backend/scripts/seed_demo.py

Creates:
  - Erhebung "Demo Standort Zürich"  (2026-05-19 to 2026-05-30)
  - 5 participants (anna@demo.ch … elias@demo.ch), PIN: 0000
  - Realistic day entries using the standard Tätigkeiten
  - 3 of 5 participants have submitted their entries
"""

import os
import sys
from datetime import date, datetime, time, timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from run import app
from extensions import db
from models import User, Gruppe, GruppenMitglied, Kategorie, Einreichung, Eintrag
from models.einreichung import EinreichungStatus
from models.kategorie import Taetigkeitsgruppe
from models.user import Rolle
from services import auth_service

# (email, vorname, nachname, funktion, oe, beschäftigungsgrad %)
TEILNEHMER = [
    ("anna@demo.ch",   "Anna",   "Meier",   "Projektleiterin",    "Abteilung Planung", 100.0),
    ("ben@demo.ch",    "Ben",    "Keller",  "Fachspezialist",     "Abteilung Planung", 100.0),
    ("clara@demo.ch",  "Clara",  "Brunner", "Teamleiterin",       "Abteilung IT",      80.0),
    ("daniel@demo.ch", "Daniel", "Frei",    "Sachbearbeiter",     "Abteilung IT",      100.0),
    ("elias@demo.ch",  "Elias",  "Widmer",  "Praktikant",         "Abteilung Planung", 60.0),
]

EINGEREICHT_IDX = {0, 1, 2}

VON = date(2026, 5, 19)
BIS = date(2026, 5, 30)

K = Taetigkeitsgruppe
STILL_STOER = "Stille Einzelarbeit, Störung erlaubt"
STILL_RUHIG = "Stille Einzelarbeit, ungestört"
CALL_ZHOER = "Call, Zuhörer erlaubt"
CALL_GEPL = "Call, keine Zuhörer, geplant"
Z23_STOER_GEPL = "Störung erlaubt, geplant (2/3)"
Z23_STOER_UNG = "Störung erlaubt, ungeplant (2/3)"
Z23_RUHIG_GEPL = "Ungestört, geplant (2/3)"
G4_STOER_GEPL = "Störung erlaubt, geplant (4+)"
G4_STOER_UNG = "Störung erlaubt, ungeplant (4+)"
G4_RUHIG_GEPL = "Ungestört, geplant (4+)"


def arbeitstage(von: date, bis: date) -> list[date]:
    days = []
    d = von
    while d <= bis:
        if d.weekday() < 5:
            days.append(d)
        d += timedelta(days=1)
    return days


def load_kategorien() -> dict[tuple[str, str], Kategorie]:
    """Map (taetigkeitsgruppe, name) → Kategorie (names repeat across groups)."""
    return {
        (k.taetigkeitsgruppe.value, k.name): k
        for k in Kategorie.query.filter_by(aktiv=True).all()
    }


def make_tagesplan(wochentag: int, variation: int) -> list[tuple[time, time, Taetigkeitsgruppe, str]]:
    """Return (zeit_von, zeit_bis, gruppe, tätigkeit_name) for one day."""
    plans = [
        # Mo / Fr
        [
            (time(8, 0), time(9, 0), K.EINZELARBEIT, STILL_STOER),
            (time(9, 0), time(10, 0), K.GRUPPE_4PLUS, G4_STOER_GEPL),
            (time(10, 0), time(12, 0), K.EINZELARBEIT, STILL_RUHIG),
            (time(12, 0), time(13, 0), K.EXTERN, "Teilzeit"),
            (time(13, 0), time(14, 30), K.EINZELARBEIT, CALL_ZHOER),
            (time(14, 30), time(16, 0), K.ZU_ZWEIT_DREIT, Z23_STOER_GEPL),
            (time(16, 0), time(17, 0), K.ZU_ZWEIT_DREIT, Z23_STOER_UNG),
        ],
        # Di
        [
            (time(8, 0), time(8, 30), K.EINZELARBEIT, STILL_STOER),
            (time(8, 30), time(10, 30), K.EINZELARBEIT, STILL_RUHIG),
            (time(10, 30), time(12, 0), K.ZU_ZWEIT_DREIT, Z23_RUHIG_GEPL),
            (time(12, 0), time(13, 0), K.EXTERN, "Mobil / anderer Standort"),
            (time(13, 0), time(14, 30), K.GRUPPE_4PLUS, G4_STOER_GEPL),
            (time(14, 30), time(15, 30), K.ZU_ZWEIT_DREIT, Z23_STOER_GEPL),
            (time(15, 30), time(17, 0), K.EINZELARBEIT, CALL_GEPL),
        ],
        # Mi
        [
            (time(8, 0), time(9, 0), K.EINZELARBEIT, STILL_STOER),
            (time(9, 0), time(10, 30), K.GRUPPE_4PLUS, G4_STOER_UNG),
            (time(10, 30), time(12, 0), K.GRUPPE_4PLUS, G4_STOER_GEPL),
            (time(12, 0), time(13, 0), K.EXTERN, "Teilzeit"),
            (time(13, 0), time(15, 0), K.EINZELARBEIT, STILL_RUHIG),
            (time(15, 0), time(16, 0), K.ZU_ZWEIT_DREIT, Z23_STOER_UNG),
            (time(16, 0), time(17, 0), K.EINZELARBEIT, STILL_STOER),
        ],
        # Do
        [
            (time(8, 0), time(9, 0), K.ZU_ZWEIT_DREIT, Z23_STOER_UNG),
            (time(9, 0), time(11, 0), K.EINZELARBEIT, STILL_RUHIG),
            (time(11, 0), time(12, 0), K.ZU_ZWEIT_DREIT, Z23_RUHIG_GEPL),
            (time(12, 0), time(13, 0), K.EXTERN, "Teilzeit"),
            (time(13, 0), time(14, 0), K.EINZELARBEIT, CALL_ZHOER),
            (time(14, 0), time(16, 30), K.GRUPPE_4PLUS, G4_RUHIG_GEPL),
            (time(16, 30), time(17, 0), K.EINZELARBEIT, STILL_STOER),
        ],
        # Fr
        [
            (time(8, 0), time(9, 30), K.EINZELARBEIT, STILL_RUHIG),
            (time(9, 30), time(11, 0), K.ZU_ZWEIT_DREIT, Z23_STOER_GEPL),
            (time(11, 0), time(12, 0), K.EINZELARBEIT, STILL_STOER),
            (time(12, 0), time(13, 0), K.EXTERN, "Teilzeit"),
            (time(13, 0), time(14, 30), K.GRUPPE_4PLUS, G4_STOER_GEPL),
            (time(14, 30), time(16, 0), K.EINZELARBEIT, STILL_RUHIG),
            (time(16, 0), time(17, 0), K.EXTERN, "Homeoffice"),
        ],
    ]

    if variation % 7 == 3:
        return [
            (time(8, 0), time(12, 0), K.EXTERN, "Homeoffice"),
            (time(13, 0), time(17, 0), K.EXTERN, "Homeoffice"),
        ]

    base = list(plans[wochentag % len(plans)])

    if variation % 5 == 0 and len(base) > 3:
        base[2] = (base[2][0], base[2][1], K.EINZELARBEIT, STILL_STOER)

    return base


def seed_demo() -> None:
    with app.app_context():
        if Gruppe.query.filter_by(name="Demo Standort Zürich").first():
            print("Demo-Erhebung existiert bereits. Abbruch.")
            return

        kategorien = load_kategorien()
        if len(kategorien) < 17:
            print(
                f"FEHLER: Nur {len(kategorien)} Tätigkeiten gefunden. "
                "Zuerst Server starten oder `flask seed` ausführen."
            )
            return

        print("Erstelle Demo-Erhebung...")

        gruppe = Gruppe(
            name="Demo Standort Zürich",
            zeitraum_von=VON,
            zeitraum_bis=BIS,
        )
        db.session.add(gruppe)
        db.session.flush()

        pin_hash = auth_service.hash_pin(auth_service.teilnehmer_temp_pin())
        users = []

        for email, vorname, nachname, funktion, oe, pensum in TEILNEHMER:
            user = User.query.filter_by(email=email).first()
            if not user:
                user = User(email=email, pin_hash=pin_hash, rolle=Rolle.TEILNEHMER, aktiv=True)
                db.session.add(user)
                db.session.flush()
            users.append(user)
            db.session.add(
                GruppenMitglied(
                    user_id=user.id,
                    gruppe_id=gruppe.id,
                    vorname=vorname,
                    nachname=nachname,
                    funktion=funktion,
                    organisationseinheit=oe,
                    beschaeftigungsgrad=pensum,
                )
            )

        db.session.flush()

        tage = arbeitstage(VON, BIS)
        eintrag_count = 0
        skipped = 0

        for idx, user in enumerate(users):
            ei = Einreichung(
                user_id=user.id,
                gruppe_id=gruppe.id,
                status=EinreichungStatus.OFFEN,
            )
            db.session.add(ei)

            for tag_nr, tag in enumerate(tage):
                plan = make_tagesplan(tag.weekday(), idx * 13 + tag_nr)
                for von, bis, gruppe_enum, kat_name in plan:
                    kat = kategorien.get((gruppe_enum.value, kat_name))
                    if not kat:
                        skipped += 1
                        continue
                    db.session.add(
                        Eintrag(
                            user_id=user.id,
                            gruppe_id=gruppe.id,
                            kategorie_id=kat.id,
                            datum=tag,
                            zeit_von=von,
                            zeit_bis=bis,
                        )
                    )
                    eintrag_count += 1

            if idx in EINGEREICHT_IDX:
                ei.status = EinreichungStatus.EINGEREICHT
                ei.eingereicht_am = datetime.now()

        db.session.commit()

        demo_pin = auth_service.teilnehmer_temp_pin()
        print("\nDemo-Daten erstellt:")
        print(f"  Erhebung : {gruppe.name}  ({VON} – {BIS})")
        print(f"  Einträge : {eintrag_count}" + (f"  ({skipped} übersprungen)" if skipped else ""))
        print(f"  Teilnehmer ({len(users)}):")
        for i, (email, vorname, *_rest) in enumerate(TEILNEHMER):
            status = "Eingereicht" if i in EINGEREICHT_IDX else "Offen"
            print(f"    {vorname:8s}  {email:22s}  PIN: {demo_pin}  Status: {status}")
        print(f"  Arbeitstage: {len(tage)}")


if __name__ == "__main__":
    seed_demo()
