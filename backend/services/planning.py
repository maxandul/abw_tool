"""Transparent approximate spatial planning, based on actual survey dates."""
import math
from collections import defaultdict
from datetime import date, timedelta

SIZES = {"ALLEIN": (1, "1 Person"), "ZWEI_BIS_VIER": (3, "2–4 Personen"),
         "FUENF_BIS_ACHT": (6.5, "5–8 Personen"), "NEUN_BIS_ZWOELF": (10.5, "9–12 Personen"),
         "DREIZEHN_PLUS": (13, "13 oder mehr Personen")}


def calculate_planning(all_entries, entries, participants):
    documented = {(e['group'], e['id'], e['day']) for e in all_entries}
    expected = defaultdict(set)
    for p in participants:
        day, end = date.fromisoformat(p['start']), date.fromisoformat(p['end'])
        while day <= end:
            if day.weekday() < 5:
                expected[day.isoformat()].add((p['group'], p['id']))
            day += timedelta(days=1)
    # Entirely missing person-days are not zero observations. Partial days
    # remain visible through the separate completeness indicator.
    valid_days = {d for d, people in expected.items()
                  if all((g, u, d) in documented for g, u in people)}
    observed_days = {e['day'] for e in all_entries}
    series = defaultdict(lambda: defaultdict(float))
    occupants = defaultdict(set)
    meetings = defaultdict(set)
    labels = {'onsite': 'Anwesenheit am Standort', 'desks': 'Genutzte Büroarbeitsplätze',
              'retreat_use': 'Genutzte Rückzugsräume (Personen)',
              'retreat_need': 'Geschlossener Raum allein benötigt',
              'concentration': 'Rückzug allein: Konzentration',
              'confidential': 'Rückzug allein: Vertraulichkeit',
              'noise': 'Rückzug allein: andere nicht stören'}
    for size, (_, label) in SIZES.items():
        labels['meeting_' + size] = 'Besprechungsräume: ' + label
        labels['need_' + size] = 'Geschlossene Räume benötigt: ' + label
    for e in entries:
        if not e['onsite']:
            continue
        for off in range(max(420, e['start']) - 420, min(1140, e['end']) - 420, 15):
            day = e['day']
            def add(key): occupants[(key, day, off)].add(e['id'])
            add('onsite')
            if not e['v2']:
                continue
            if e['room'] == 'ARBEITSPLATZ': add('desks')
            if e['room'] == 'RUECKZUG': add('retreat_use')
            size = e['size']
            if size not in SIZES:
                continue
            if e['retreat'] == 'ERFORDERLICH' and size == 'ALLEIN':
                add('retreat_need')
                for reason, key in [('KONZENTRATION', 'concentration'), ('VERTRAULICHKEIT', 'confidential'), ('LAERM', 'noise')]:
                    if reason in e['reasons']: add(key)
            # Internal overlapping meetings are pooled within each survey,
            # room size and slot. Mixed groups cannot reveal internal headcount:
            # conservatively count each reporter, and clearly disclose this.
            for prefix, condition in [('meeting_', e['room'] == 'BESPRECHUNG'),
                                      ('need_', e['retreat'] == 'ERFORDERLICH' and size != 'ALLEIN')]:
                if condition:
                    circle = e['circle'] or 'STANDORTINTERN'
                    meetings[(prefix + size, day, off, e['group'], circle)].add(e['id'])
    for (key, day, off), users in occupants.items():
        series[key][(day, off)] = len(users)
    for (key, day, off, group, circle), users in meetings.items():
        size = key.split('_', 1)[1]
        divisor = SIZES[size][0] if circle == 'STANDORTINTERN' else 1
        series[key][(day, off)] += math.ceil(len(users) / divisor)
    profiles = []
    for key, label in labels.items():
        values = series[key]
        maxima = defaultdict(float)
        for (day, off), count in values.items():
            wd = date.fromisoformat(day).weekday()
            maxima[(wd, off)] = max(maxima[(wd, off)], count)
        means = [{'slot_start_minuten': off, 'mittelwert': round(sum(values.get((d, off), 0) for d in valid_days) / len(valid_days), 3)}
                 for off in range(0, 720, 15)] if valid_days else []
        profiles.append({'key': key, 'label': label,
                         'maximum_slots': [{'wochentag': wd, 'slot_start_minuten': off, 'maximum': count}
                                           for (wd, off), count in sorted(maxima.items())],
                         'mittelwert_slots': means})
    return {'profiles': profiles, 'mean_days': len(valid_days), 'observed_days': len(observed_days),
            'excluded_days': len(set(expected) - valid_days),
            'historical_entries': sum(not e['v2'] for e in entries),
            'mixed_meeting_entries': sum(e['onsite'] and e['v2'] and e['circle'] == 'STANDORTUEBERGREIFEND_EXTERN' for e in entries)}
