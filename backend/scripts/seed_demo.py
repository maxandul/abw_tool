"""Demo seed: creates a realistic Erhebung with participants and entries.

Run from the project root:
    python backend/scripts/seed_demo.py

Creates:
  - Erhebung "Demo Standort Zürich"  (2026-05-19 to 2026-05-30)
  - 5 participants (anna@demo.ch ... elias@demo.ch), PIN: demo1234
  - Realistic day entries for each participant over the 2 weeks
  - 3 of 5 participants have submitted their entries
"""

import sys
import os
from datetime import date, time, timedelta
import random

# Allow importing the Flask app from the parent directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from run import app
from extensions import db
from models import (
    User, Gruppe, GruppenMitglied, Kategorie,
    Einreichung, Eintrag,
)
from models.einreichung import EinreichungStatus
from models.user import Rolle
from services import auth_service

DEMO_PIN = "demo1234"

TEILNEHMER = [
    ("anna@demo.ch",   "Anna"),
    ("ben@demo.ch",    "Ben"),
    ("clara@demo.ch",  "Clara"),
    ("daniel@demo.ch", "Daniel"),
    ("elias@demo.ch",  "Elias"),
]

# Submitted: first 3; last 2 still in progress
EINGEREICHT_IDX = {0, 1, 2}

VON = date(2026, 5, 19)
BIS = date(2026, 5, 30)


def arbeitstage(von: date, bis: date):
    """Return list of working days (Mon–Fri) in the range."""
    days = []
    d = von
    while d <= bis:
        if d.weekday() < 5:
            days.append(d)
        d += timedelta(days=1)
    return days


def make_tagesplan(kategorien_by_name: dict, wochentag: int, variation: int):
    """Return a list of (zeit_von, zeit_bis, kategorie_name) for one day."""
    # Base timetable for a typical office day
    plans = [
        # Monday / Friday – slightly different
        [
            (time(8,  0), time(9,  0), "Admin"),
            (time(9,  0), time(10, 0), "Meeting / Austausch"),
            (time(10, 0), time(12, 0), "Ungestörte Admin"),
            (time(12, 0), time(13, 0), "Mittagessen intern"),
            (time(13, 0), time(14, 30), "Admin"),
            (time(14, 30), time(16, 0), "Interner Call"),
            (time(16, 0), time(17, 0), "Internes 2er/3er Gespräch"),
        ],
        # Tuesday
        [
            (time(8, 0), time(8, 30),  "Admin"),
            (time(8, 30), time(10, 30), "Ungestörte Admin"),
            (time(10, 30), time(12, 0), "Vertrauliches 2er/3er Gespräch"),
            (time(12, 0), time(13, 0),  "Mittagessen extern"),
            (time(13, 0), time(14, 30), "Meeting / Austausch"),
            (time(14, 30), time(15, 30), "Interner Call"),
            (time(15, 30), time(17, 0),  "Admin"),
        ],
        # Wednesday
        [
            (time(8, 0),  time(9, 0),   "Admin"),
            (time(9, 0),  time(10, 30), "Workshop / Kollaboration"),
            (time(10, 30), time(12, 0), "Meeting / Austausch"),
            (time(12, 0), time(13, 0),  "Mittagessen intern"),
            (time(13, 0), time(15, 0),  "Ungestörte Admin"),
            (time(15, 0), time(16, 0),  "Call"),
            (time(16, 0), time(17, 0),  "Admin"),
        ],
        # Thursday
        [
            (time(8, 0),  time(9, 0),   "Internes 2er/3er Gespräch"),
            (time(9, 0),  time(11, 0),  "Ungestörte Admin"),
            (time(11, 0), time(12, 0),  "Vertraulicher Call"),
            (time(12, 0), time(13, 0),  "Mittagessen intern"),
            (time(13, 0), time(14, 0),  "Admin"),
            (time(14, 0), time(16, 30), "Meeting / Austausch"),
            (time(16, 30), time(17, 0), "Admin"),
        ],
        # Friday
        [
            (time(8, 0),  time(9, 30),  "Ungestörte Admin"),
            (time(9, 30), time(11, 0),  "Interner Call"),
            (time(11, 0), time(12, 0),  "Admin"),
            (time(12, 0), time(13, 0),  "Mittagessen intern"),
            (time(13, 0), time(14, 30), "Meeting / Austausch"),
            (time(14, 30), time(16, 0), "Ungestörte Admin"),
            (time(16, 0), time(17, 0),  "Extern / Home Office"),
        ],
    ]

    # Occasional home office day
    if variation % 7 == 3:
        return [
            (time(8, 0), time(12, 0), "Extern / Home Office"),
            (time(13, 0), time(17, 0), "Extern / Home Office"),
        ]

    base = plans[wochentag % len(plans)]

    # Slight variation: sometimes swap a block
    if variation % 5 == 0 and len(base) > 3:
        base = list(base)
        base[2] = (base[2][0], base[2][1], "Admin")

    return base


def seed_demo():
    with app.app_context():
        # Check if demo already exists
        existing = Gruppe.query.filter_by(name="Demo Standort Zürich").first()
        if existing:
            print("Demo-Erhebung existiert bereits. Abbruch.")
            return

        print("Erstelle Demo-Erhebung...")

        # ── Gruppe ───────────────────────────────────────────────────────────
        gruppe = Gruppe(
            name="Demo Standort Zürich",
            zeitraum_von=VON,
            zeitraum_bis=BIS,
            sharing_ratio=1.2,
        )
        db.session.add(gruppe)
        db.session.flush()

        # ── Kategorien laden ────────────────────────────────────────────────
        kategorien_by_name = {k.name: k for k in Kategorie.query.all()}
        if not kategorien_by_name:
            print("FEHLER: Keine Kategorien gefunden. Zuerst Server starten (seed_default_data).")
            return

        # ── Teilnehmer ───────────────────────────────────────────────────────
        users = []
        pin_hash = auth_service.hash_pin(DEMO_PIN)
        for email, _ in TEILNEHMER:
            u = User.query.filter_by(email=email).first()
            if not u:
                u = User(email=email, pin_hash=pin_hash, rolle=Rolle.TEILNEHMER, aktiv=True)
                db.session.add(u)
                db.session.flush()
            users.append(u)
            db.session.add(GruppenMitglied(user_id=u.id, gruppe_id=gruppe.id))

        db.session.flush()

        # ── Einträge + Einreichung ────────────────────────────────────────────
        tage = arbeitstage(VON, BIS)

        for idx, user in enumerate(users):
            # Create Einreichung
            ei = Einreichung(
                user_id=user.id,
                gruppe_id=gruppe.id,
                status=EinreichungStatus.OFFEN,
            )
            db.session.add(ei)

            for tag_nr, tag in enumerate(tage):
                plan = make_tagesplan(kategorien_by_name, tag.weekday(), idx * 13 + tag_nr)
                for von, bis, kat_name in plan:
                    kat = kategorien_by_name.get(kat_name)
                    if not kat:
                        continue
                    db.session.add(Eintrag(
                        user_id=user.id,
                        gruppe_id=gruppe.id,
                        kategorie_id=kat.id,
                        datum=tag,
                        zeit_von=von,
                        zeit_bis=bis,
                    ))

            # Submit first 3 participants
            if idx in EINGEREICHT_IDX:
                ei.status = EinreichungStatus.EINGEREICHT
                from datetime import datetime
                ei.eingereicht_am = datetime.now()

        db.session.commit()

        print(f"\nDemo-Daten erstellt:")
        print(f"  Erhebung : {gruppe.name}  ({VON} – {BIS})")
        print(f"  Teilnehmer ({len(users)}):")
        for i, (email, name) in enumerate(TEILNEHMER):
            status = "Eingereicht" if i in EINGEREICHT_IDX else "Offen"
            print(f"    {name:8s}  {email:22s}  PIN: {DEMO_PIN}  Status: {status}")
        print(f"  Arbeitstage: {len(tage)}")


if __name__ == "__main__":
    seed_demo()
