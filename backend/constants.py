"""Domain constants for the Tätigkeitserhebung application.

Centralises magic numbers (time raster, working hours, gap thresholds) so they
are defined in exactly one place.
"""

from datetime import time

# Daily time window shown in the calendar/heatmap.
TAG_START = time(7, 0)
TAG_END = time(19, 0)

# Time raster in minutes.
SLOT_MINUTES = 15

# Total number of 15-minute slots between TAG_START and TAG_END.
TAG_START_MINUTEN = TAG_START.hour * 60 + TAG_START.minute
TAG_END_MINUTEN = TAG_END.hour * 60 + TAG_END.minute
ANZAHL_SLOTS = (TAG_END_MINUTEN - TAG_START_MINUTEN) // SLOT_MINUTES

# Morning / afternoon split for the gap check on submission.
MITTAG = time(12, 0)
MITTAG_MINUTEN = MITTAG.hour * 60 + MITTAG.minute

# Minimum hours per half-day below which a "gap" is reported on submission.
MIN_HALBTAG_STUNDEN = 2.0

# Working days: Monday (0) to Friday (4).
ARBEITSTAGE = [0, 1, 2, 3, 4]
WOCHENTAG_NAMEN = {
    0: "Montag",
    1: "Dienstag",
    2: "Mittwoch",
    3: "Donnerstag",
    4: "Freitag",
}

# Room type used for "no room needed" (absence / external work).
RAUMTYP_KEIN_RAUM = "Kein Raum nötig"

# Sharing-ratio presets (Dok. 2).
SHARING_RATIO_PRESETS = [1.0, 1.2, 1.4, 1.6, 2.0]
DEFAULT_SHARING_RATIO = 1.2
