import unittest
from datetime import date

from backend.services.export_service import generiere_export_html


class ExportServiceTest(unittest.TestCase):
    def test_export_preserves_view_and_contains_demand_explanation(self):
        data = {
            "gruppen_namen": ["Test"],
            "tag_start_minuten": 420,
            "tag_end_minuten": 1140,
            "slot_minuten": 15,
            "teilnehmer": [],
            "eintraege": [],
            "kategorien": [],
            "arbeitstage": 5,
            "anzahl_gruppen": 1,
            "soll_stunden_pro_tag": 8.4,
            "schwelle_prozent": 85,
        }
        html = generiere_export_html(
            data,
            {
                "funktionen": [],
                "organisationseinheiten": [],
                "beschaeftigungsgrade": [],
                "kategorie_ids": [],
                "anzeige": "maximum",
            },
            date(2026, 8, 10),
            date(2026, 8, 14),
        )

        self.assertIn("INIT.anzeige === 'maximum'", html)
        self.assertIn('"anzeige": "maximum"', html)
        self.assertIn("15-Minuten-Zeitfenster", html)
        self.assertIn("eine Einheit pro Person", html)
        self.assertNotIn("__DATEN_JSON__", html)
        self.assertNotIn("__INITIAL_FILTER_JSON__", html)


if __name__ == "__main__":
    unittest.main()
