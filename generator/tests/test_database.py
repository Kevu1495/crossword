import copy
import json
from pathlib import Path
import sqlite3
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from export_sql import export_sql
ROOT=Path(__file__).resolve().parents[2]

class DatabaseTests(unittest.TestCase):
    def setUp(self):
        self.puzzles=json.loads((ROOT/'frontend/src/puzzles.json').read_text())
        self.records=json.loads((ROOT/'generator/datasets/approved.json').read_text())
        self.db=sqlite3.connect(':memory:')
        self.db.executescript((ROOT/'worker/migrations/0001_initial.sql').read_text())

    def tearDown(self): self.db.close()

    def test_export_is_idempotent_and_keeps_provenance(self):
        sql='\n'.join(export_sql(self.puzzles,self.records))
        self.assertEqual((ROOT/'worker/seed.sql').read_text(),sql+'\n')
        self.db.executescript(sql);self.db.executescript(sql)
        self.assertEqual(self.db.execute('SELECT count(*) FROM puzzles').fetchone()[0],len(self.puzzles))
        self.assertEqual(self.db.execute('PRAGMA foreign_key_check').fetchall(),[])
        self.assertEqual(self.db.execute('SELECT count(DISTINCT size || difficulty) FROM puzzles WHERE published=1').fetchone()[0],9)
        self.assertGreater(self.db.execute('SELECT count(*) FROM sources').fetchone()[0],1)
        excluded=json.dumps([self.puzzles[0]['id']])
        selected=self.db.execute('SELECT id FROM puzzles WHERE size=?1 AND difficulty=?2 AND published=1 AND id>=?3 AND id NOT IN (SELECT value FROM json_each(?4)) ORDER BY id LIMIT 1',{'1':7,'2':'easy','3':'','4':excluded}).fetchone()
        self.assertIsNotNone(selected);self.assertNotEqual(selected[0],self.puzzles[0]['id'])
        plan=self.db.execute('EXPLAIN QUERY PLAN SELECT id FROM puzzles WHERE size=7 AND difficulty="easy" AND published=1 AND id>="" ORDER BY id LIMIT 1').fetchall()
        self.assertTrue(any('puzzles_mode_available' in str(row) for row in plan))

    def test_unreviewed_or_modified_clues_cannot_be_published(self):
        for field in ('review','clue'):
            ps=copy.deepcopy(self.puzzles[:1])
            if field=='review':ps[0]['review']='candidate'
            else:ps[0]['entries'][0]['clue']='Unreviewed alteration'
            with self.assertRaises(ValueError):export_sql(ps,self.records)

if __name__=='__main__':unittest.main()
