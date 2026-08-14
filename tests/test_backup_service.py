import sqlite3
import tempfile
import unittest
import os
from datetime import datetime
from pathlib import Path

from backend.services.backup_service import (
    create_consistent_backup,
    find_latest_backup,
    prepare_readonly_snapshot,
    validate_sqlite_database,
)


class BackupServiceTest(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.source = self.root / "source.db"
        with sqlite3.connect(self.source) as connection:
            connection.execute("CREATE TABLE items (id INTEGER PRIMARY KEY, name TEXT)")
            connection.execute("INSERT INTO items (name) VALUES ('Test')")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_backup_and_readonly_snapshot_are_valid(self):
        target = self.root / "network"
        backup = create_consistent_backup(
            self.source,
            target,
            now=datetime(2026, 8, 14, 8, 30, 0),
        )
        self.assertEqual(backup.name, "taetigkeitserhebung_2026-08-14_083000.db")
        validate_sqlite_database(backup)

        snapshot = prepare_readonly_snapshot(target, self.root / "local")
        self.assertEqual(snapshot.source_path, backup)
        with sqlite3.connect(f"file:{snapshot.local_path.as_posix()}?mode=ro", uri=True) as connection:
            self.assertEqual(connection.execute("SELECT name FROM items").fetchone()[0], "Test")
            with self.assertRaises(sqlite3.OperationalError):
                connection.execute("INSERT INTO items (name) VALUES ('Nicht erlaubt')")

    def test_latest_backup_is_selected(self):
        target = self.root / "network"
        first = create_consistent_backup(
            self.source, target, now=datetime(2026, 8, 14, 8, 0, 0)
        )
        second = create_consistent_backup(
            self.source, target, now=datetime(2026, 8, 14, 9, 0, 0)
        )
        os.utime(first, (1_700_000_000, 1_700_000_000))
        os.utime(second, (1_800_000_000, 1_800_000_000))
        # Selection follows modification time, which is what a copied network
        # snapshot reliably exposes.
        self.assertEqual(find_latest_backup(target), second)


if __name__ == "__main__":
    unittest.main()
