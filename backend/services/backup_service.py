"""Consistent SQLite backups and read-only snapshot preparation."""

from __future__ import annotations

import json
import hashlib
import os
import shutil
import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Callable


BACKUP_PREFIX = "taetigkeitserhebung_"


@dataclass(frozen=True)
class SnapshotInfo:
    """Metadata for the local snapshot used by read-only mode."""

    local_path: Path
    source_path: Path
    source_modified: datetime


def _sqlite_uri(path: Path, *, read_only: bool = False) -> str:
    mode = "?mode=ro" if read_only else ""
    return f"file:{path.resolve().as_posix()}{mode}"


def validate_sqlite_database(path: Path) -> None:
    """Raise if *path* is missing, unreadable, or fails SQLite integrity_check."""
    if not path.is_file():
        raise FileNotFoundError(f"Datenbank nicht gefunden: {path}")
    connection = sqlite3.connect(_sqlite_uri(path, read_only=True), uri=True)
    try:
        result = connection.execute("PRAGMA integrity_check").fetchone()
        if not result or result[0].lower() != "ok":
            raise RuntimeError(f"SQLite-Integritätsprüfung fehlgeschlagen: {result}")
    finally:
        connection.close()


def create_consistent_backup(
    source_path: Path,
    target_directory: Path,
    *,
    keep: int = 30,
    now: datetime | None = None,
) -> Path:
    """Create, verify, and atomically publish a consistent SQLite snapshot."""
    source_path = source_path.resolve()
    validate_sqlite_database(source_path)
    target_directory.mkdir(parents=True, exist_ok=True)

    timestamp = (now or datetime.now()).strftime("%Y-%m-%d_%H%M%S")
    final_path = target_directory / f"{BACKUP_PREFIX}{timestamp}.db"
    network_partial = target_directory / f".{final_path.name}.{os.getpid()}.partial"
    local_partial = source_path.parent / f".{final_path.name}.{os.getpid()}.partial.db"

    source = sqlite3.connect(_sqlite_uri(source_path, read_only=True), uri=True)
    destination = sqlite3.connect(local_partial)
    try:
        source.backup(destination)
    finally:
        destination.close()
        source.close()

    try:
        validate_sqlite_database(local_partial)
        shutil.copy2(local_partial, network_partial)
        if _sha256(local_partial) != _sha256(network_partial):
            raise RuntimeError("Backup-Kopie im Netzwerkordner stimmt nicht mit dem Snapshot überein.")
        os.replace(network_partial, final_path)
    except Exception:
        network_partial.unlink(missing_ok=True)
        raise
    finally:
        local_partial.unlink(missing_ok=True)

    _write_status(target_directory, final_path)
    _remove_old_backups(target_directory, keep=max(1, keep))
    return final_path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _write_status(target_directory: Path, backup_path: Path) -> None:
    status = {
        "latest_backup": backup_path.name,
        "created_at": datetime.now().astimezone().isoformat(timespec="seconds"),
    }
    partial = target_directory / f".backup_status.{os.getpid()}.partial"
    partial.write_text(json.dumps(status, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(partial, target_directory / "backup_status.json")


def _remove_old_backups(target_directory: Path, *, keep: int) -> None:
    backups = sorted(
        target_directory.glob(f"{BACKUP_PREFIX}*.db"),
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )
    for old_backup in backups[keep:]:
        old_backup.unlink(missing_ok=True)


def find_latest_backup(source: Path) -> Path:
    """Return the newest backup DB from a file or directory."""
    if source.is_file():
        validate_sqlite_database(source)
        return source
    if not source.is_dir():
        raise FileNotFoundError(f"Backup-Quelle nicht erreichbar: {source}")

    candidates = [
        path
        for path in source.glob("*.db")
        if path.is_file() and ".partial" not in path.name
    ]
    if not candidates:
        raise FileNotFoundError(f"Keine Datenbank-Backups gefunden in: {source}")
    return max(candidates, key=lambda path: path.stat().st_mtime)


def prepare_readonly_snapshot(source: Path, local_directory: Path) -> SnapshotInfo:
    """Copy the newest network backup locally and verify it before activation."""
    latest = find_latest_backup(source)
    modified = datetime.fromtimestamp(latest.stat().st_mtime).astimezone()
    local_directory.mkdir(parents=True, exist_ok=True)
    final_path = local_directory / "readonly_snapshot.db"
    partial_path = local_directory / f".readonly_snapshot.{os.getpid()}.partial"

    try:
        shutil.copy2(latest, partial_path)
        validate_sqlite_database(partial_path)
        os.replace(partial_path, final_path)
    except Exception:
        partial_path.unlink(missing_ok=True)
        raise

    return SnapshotInfo(final_path, latest, modified)


class BackupScheduler:
    """Run backups immediately and then at a fixed interval in a daemon thread."""

    def __init__(
        self,
        source_path: Path,
        target_directory: Path,
        interval_minutes: int,
        *,
        keep: int = 30,
        logger: Callable[[str], None] = print,
    ) -> None:
        self.source_path = source_path
        self.target_directory = target_directory
        self.interval_seconds = max(1, interval_minutes) * 60
        self.keep = keep
        self.logger = logger
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._thread = threading.Thread(
            target=self._run,
            name="sqlite-backup",
            daemon=True,
        )
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()

    def _run(self) -> None:
        while not self._stop.is_set():
            try:
                backup = create_consistent_backup(
                    self.source_path,
                    self.target_directory,
                    keep=self.keep,
                )
                self.logger(f"Backup erstellt: {backup}")
            except Exception as exc:  # noqa: BLE001 - scheduler must stay alive
                self.logger(f"Backup fehlgeschlagen; nächster Versuch folgt: {exc}")
            if self._stop.wait(self.interval_seconds):
                break
