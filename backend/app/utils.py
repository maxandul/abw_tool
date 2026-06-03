"""Parsing and validation utilities for request payloads and query params."""

from datetime import date, datetime, time


class ValidationError(Exception):
    """Raised when an input value cannot be parsed or is invalid."""


def parse_date(value, feldname: str = "Datum") -> date:
    """Parse an ISO date string (YYYY-MM-DD) into a date object."""
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    if not value:
        raise ValidationError(f"{feldname} fehlt.")
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except ValueError as exc:
        raise ValidationError(f"{feldname} ist ungültig (erwartet YYYY-MM-DD).") from exc


def parse_time(value, feldname: str = "Zeit") -> time:
    """Parse an HH:MM time string into a time object."""
    if isinstance(value, time):
        return value
    if not value:
        raise ValidationError(f"{feldname} fehlt.")
    try:
        return datetime.strptime(str(value), "%H:%M").time()
    except ValueError as exc:
        raise ValidationError(f"{feldname} ist ungültig (erwartet HH:MM).") from exc


def parse_int_list(value) -> list[int]:
    """Parse a comma-separated string or list into a list of ints."""
    if value is None or value == "":
        return []
    if isinstance(value, (list, tuple)):
        items = value
    else:
        items = str(value).split(",")
    result = []
    for item in items:
        item = str(item).strip()
        if item:
            try:
                result.append(int(item))
            except ValueError as exc:
                raise ValidationError(f"Ungültige ID: {item}") from exc
    return result


def time_to_minutes(t: time) -> int:
    """Convert a time object to minutes since midnight."""
    return t.hour * 60 + t.minute


def minutes_to_time(minutes: int) -> time:
    """Convert minutes since midnight to a time object."""
    return time(minutes // 60, minutes % 60)
