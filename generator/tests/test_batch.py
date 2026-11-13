import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class BatchCliTests(unittest.TestCase):
    def test_empty_batch_is_only_successful_when_explicitly_allowed(self):
        inventory = (ROOT / 'frontend/src/puzzles.json').read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / 'batch.json'
            command = [sys.executable, str(ROOT / 'generator/batch.py'),
                       '--attempts', '0', '--output', str(output)]
            for flags, expected_code in [([], 1), (['--allow-empty'], 0)]:
                with self.subTest(flags=flags):
                    result = subprocess.run(command + flags, capture_output=True, text=True)
                    self.assertEqual(result.returncode, expected_code, result.stderr)
                    self.assertEqual(json.loads(output.read_text()), [])
                    self.assertIn('existing inventory is unchanged', result.stdout + result.stderr)
            self.assertEqual((ROOT / 'frontend/src/puzzles.json').read_bytes(), inventory)
