"""Seed default room types and activity categories.

The seed runs on first start and only inserts data when the respective
tables are empty, so it never overwrites existing data.
"""

from extensions import db
from models import Kategorie, Raumtyp

# (sort_order, name, beschreibung)
RAUMTYPEN = [
    (1, "Stiller Arbeitsplatz", "Einzelarbeitsplatz für konzentriertes, ungestörtes Arbeiten"),
    (2, "Telefonbox", "Abgeschlossene Einzelkabine für Telefonate und Videocalls"),
    (3, "Kleiner Meetingraum", "Raum für 2–4 Personen, vertrauliche oder interne Gespräche"),
    (4, "Grosser Meetingraum", "Raum für 5+ Personen, Sitzungen und Teaminformationen"),
    (5, "Creative Space", "Offener Kollaborationsbereich für Workshops und Konzeptarbeit"),
    (6, "Empfang / Besucherzone", "Bereich für externe Besucher und Gruppenempfänge"),
    (7, "Pausenraum", "Aufenthaltsbereich für Pausen und informelle Begegnung"),
    (8, "Kein Raum nötig", "Tätigkeit findet ausserhalb des Büros statt oder ist Abwesenheit"),
]

# (sort_order, name, farbe, raumtyp_name, beschreibung)
KATEGORIEN = [
    (1, "Ungestörte Admin", "#2E86AB", "Stiller Arbeitsplatz",
     "Konzentrierte Einzelarbeit die Ruhe erfordert: Führungsarbeit, Protokoll schreiben, Scanning, komplexe Sachbearbeitung"),
    (2, "Admin", "#5BA4CF", "Stiller Arbeitsplatz",
     "Einfachere administrative Einzelarbeit: Ämtli, Ablage, E-Mails beantworten, Routineaufgaben"),
    (3, "Vertraulicher Call", "#E84855", "Telefonbox",
     "Telefonat oder Videocall mit vertraulichem Inhalt: Reklamationsgespräch, sensibles Thema, Beratung"),
    (4, "Interner Call", "#F4845F", "Telefonbox",
     "Internes Telefonat oder Videocall: Teams Meeting, Abstimmung mit Kolleginnen und Kollegen"),
    (5, "Call", "#F9A26C", "Telefonbox",
     "Allgemeines Telefonat: Beratungsgespräch, Auskunft, Anmeldung"),
    (6, "Vertrauliches 2er/3er Gespräch", "#9B2335", "Kleiner Meetingraum",
     "Vertrauliches Gespräch zu zweit oder zu dritt: Mitarbeitendengespräch, Bifa, Konfliktgespräch"),
    (7, "Internes 2er/3er Gespräch", "#C0392B", "Kleiner Meetingraum",
     "Internes Arbeitsgespräch zu zweit oder zu dritt: Fallbesprechung, kurze Abstimmung, Projektarbeit"),
    (8, "2er/3er Gespräch", "#E74C3C", "Kleiner Meetingraum",
     "Offenes Gespräch zu zweit oder zu dritt mit internen oder externen Personen: BG-Gespräch, Anmeldegespräch"),
    (9, "Vertrauliches Gruppengespräch", "#1B4F72", "Grosser Meetingraum",
     "Vertrauliches Gespräch in der Gruppe: Führungsaustausch, sensible Teamthemen"),
    (10, "Meeting / Austausch", "#2980B9", "Grosser Meetingraum",
     "Reguläre Sitzung oder Teaminformation: Teamsitzung, Abteilungsmeeting, Informationsveranstaltung"),
    (11, "Workshop / Kollaboration", "#8E44AD", "Creative Space",
     "Kollaborative Gruppenarbeit: Konzeptentwicklung, Workshopdurchführung, Whiteboard-Session"),
    (12, "Gruppenbesuch", "#27AE60", "Empfang / Besucherzone",
     "Empfang externer Gruppen: KB-Tag, Open House, Führungen, Infoveranstaltungen für Externe"),
    (13, "Extern / Home Office", "#7F8C8D", "Kein Raum nötig",
     "Tätigkeit ausserhalb des Büros: Kundenbesuche, Aussendienst, Home Office, Mobile Working. Zählt als nicht anwesend und fliesst in die Sharing-Ratio-Berechnung ein."),
    (14, "Mittagessen intern", "#F39C12", "Pausenraum",
     "Mittagspause im Gebäude: Kantine, Aufenthaltsraum, informeller Austausch beim Essen"),
    (15, "Mittagessen extern", "#E67E22", "Kein Raum nötig",
     "Mittagspause ausserhalb des Gebäudes"),
    (16, "Abwesend – Teilzeit", "#BDC3C7", "Kein Raum nötig",
     "Nicht gearbeitet aufgrund Teilzeitpensum. Wird vom System vorgeschlagen wenn Vor- oder Nachmittag weniger als 2h erfasst wurden."),
    (17, "Abwesend – andere Gründe", "#95A5A6", "Kein Raum nötig",
     "Abwesenheit aus anderen Gründen: Krankheit, Ferien, Militär, Feiertag, Weiterbildung ausser Haus"),
]


def seed_default_data() -> None:
    """Seed Raumtypen and Kategorien when the tables are empty."""
    if Raumtyp.query.count() == 0:
        for sort_order, name, beschreibung in RAUMTYPEN:
            db.session.add(
                Raumtyp(name=name, beschreibung=beschreibung, sort_order=sort_order)
            )
        db.session.flush()

    if Kategorie.query.count() == 0:
        raumtyp_by_name = {r.name: r for r in Raumtyp.query.all()}
        for sort_order, name, farbe, raumtyp_name, beschreibung in KATEGORIEN:
            raumtyp = raumtyp_by_name.get(raumtyp_name)
            k = Kategorie(
                name=name,
                farbe=farbe,
                beschreibung=beschreibung,
                sort_order=sort_order,
            )
            if raumtyp:
                k.raumtypen.append(raumtyp)
            db.session.add(k)

    db.session.commit()
