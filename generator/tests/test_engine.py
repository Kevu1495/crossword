import copy
import json
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from engine.core import NoFill, slots_for, solve, template, validate
from ingestion.import_bank import normalize
from engine.templates import canonical_key, layout_of
ROOT=Path(__file__).resolve().parents[2]

class EngineTests(unittest.TestCase):
    def test_templates_have_connected_checked_cells_and_symmetry(self):
        for size in (7,11,15):
            for seed in range(15):
                grid=template(size,seed)
                self.assertTrue(slots_for(grid))
                self.assertEqual(grid,[row[::-1] for row in grid[::-1]])

    def test_bad_structures_rejected(self):
        for layout in [['#######']*7,['.......']*6+['..#####'],['...#...']*7]:
            with self.assertRaises(ValueError): slots_for(layout)

    def test_normalization(self):
        self.assertEqual(normalize('café au-lait'), 'CAFEAULAIT')
        self.assertEqual(normalize("isn't"),'ISNT')

    def test_reviewed_puzzles_validate_and_cover_all_modes(self):
        puzzles=json.loads((ROOT/'frontend/src/puzzles.json').read_text(encoding='utf-8'))
        self.assertEqual({(p['size'],p['difficulty']) for p in puzzles},{(s,d) for s in (7,11,15) for d in ('easy','medium','hard')})
        self.assertEqual(len({p['id'] for p in puzzles}),len(puzzles))
        for p in puzzles:
            validate(p)
            self.assertEqual(p['review'],'approved')

    def test_every_mode_has_at_least_three_distinct_patterns(self):
        puzzles=json.loads((ROOT/'frontend/src/puzzles.json').read_text(encoding='utf-8'))
        for size in (7,11,15):
            for difficulty in ('easy','medium','hard'):
                patterns={canonical_key(layout_of(p)) for p in puzzles if p['size']==size and p['difficulty']==difficulty}
                self.assertGreaterEqual(len(patterns),3,(size,difficulty))

    def test_solution_and_metadata_corruption_rejected(self):
        p=json.loads((ROOT/'frontend/src/puzzles.json').read_text(encoding='utf-8'))[0]
        for mutation in ('answer','duplicate','number','size'):
            bad=copy.deepcopy(p)
            if mutation=='answer': bad['entries'][0]['answer']='WRONG'
            elif mutation=='duplicate': bad['entries'][1]=bad['entries'][0]
            elif mutation=='number': bad['entries'][0]['number']=999
            else: bad['size']=15
            with self.assertRaises(ValueError): validate(bad)

    def test_solver_is_reproducible_and_uses_real_clues(self):
        p=json.loads((ROOT/'frontend/src/puzzles.json').read_text(encoding='utf-8'))[0]
        layout=[''.join('#' if c=='#' else '.' for c in row) for row in p['solution']]
        records=[dict(e,id=e['clueId']) for e in p['entries']]
        a,b=solve(layout,records,88),solve(layout,records,88)
        self.assertEqual(a,b)
        validate(a)

    def test_solver_excludes_answers_used_in_the_existing_collection(self):
        p=json.loads((ROOT/'frontend/src/puzzles.json').read_text(encoding='utf-8'))[0]
        layout=[''.join('#' if c=='#' else '.' for c in row) for row in p['solution']]
        records=[dict(e,id=e['clueId']) for e in p['entries']]
        excluded={e['answer'] for e in p['entries']}
        with self.assertRaises(NoFill):
            solve(layout,records,88,excluded_answers=excluded)

    def test_unfillable_grid_fails_and_search_is_bounded(self):
        with self.assertRaises(NoFill): solve(['.......']*7,[],max_seconds=.1)
        with self.assertRaises(NoFill): solve(['.......']*7,[],max_nodes=0)

if __name__=='__main__': unittest.main()
