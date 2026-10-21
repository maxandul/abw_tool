"""Five fixed, versioned activity types. Never modify historical categories."""
from extensions import db
from models import AbwesenheitGrund, Arbeitsform, Kategorie


def seed_default_data():
    _ensure_v2_catalog()
    db.session.commit()


def _ensure_v2_catalog():
    """Never reinterpret old entries; new surveys use a new fixed catalogue."""
    defaults = [
        ("Allein arbeiten", Arbeitsform.EINZELARBEIT, None, "#15803d", "Aufgaben ohne gleichzeitigen Austausch bearbeiten, z. B. lesen, schreiben oder E-Mails bearbeiten."),
        ("Online-Meeting / Telefonat", Arbeitsform.ONLINE, None, "#7c3aed", "Du nimmst selbst online oder telefonisch teil. Für gemeinsame Besprechungen mit anderen Personen im selben Raum wähle Besprechung / Zusammenarbeit vor Ort."),
        ("Besprechung / Zusammenarbeit vor Ort", Arbeitsform.MEETING, None, "#0369a1", "Gemeinsamer Austausch oder gemeinsame Arbeit im selben Raum, gegebenenfalls mit zusätzlich online zugeschalteten Personen."),
        ("Arbeitsfreie Zeit wegen Teilzeit", Arbeitsform.ABWESENHEIT, AbwesenheitGrund.TEILZEIT, "#64748b", "Regulär freie Zeit aufgrund deines Teilzeitpensums."),
        ("Andere Abwesenheit", Arbeitsform.ABWESENHEIT, AbwesenheitGrund.SONSTIGES, "#475569", "Zum Beispiel Ferien, Krankheit oder Feiertag."),
    ]
    for i, (name, form, reason, color, description) in enumerate(defaults):
        existing = Kategorie.query.filter_by(schema_version=2, arbeitsform=form, abwesenheit_grund=reason).first()
        if existing:
            existing.beschreibung = description
        else:
            db.session.add(Kategorie(schema_version=2, name=name, arbeitsform=form,
                abwesenheit_grund=reason, farbe=color, beschreibung=description, sort_order=i))
