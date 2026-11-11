"""Generate candidate puzzle batches; publication requires editorial approval."""
import argparse
import hashlib
import json
from pathlib import Path
from engine.core import NoFill, solve, template

ROOT = Path(__file__).resolve().parents[1]


def generate(records, size, difficulty, seed, attempts=15, seconds=3):
    # Difficulty is provisional until playtested; use clue difficulty, not source name.
    bands = {'easy': (1,2), 'medium': (2,3), 'hard': (3,5)}
    low, high = bands[difficulty]
    pool = [r for r in records if low <= r['difficulty'] <= high]
    for attempt in range(attempts):
        current_seed = seed * 100 + attempt
        layout = template(size, current_seed)
        try:
            puzzle = solve(layout, pool, current_seed, max_seconds=seconds)
            puzzle['difficulty'] = difficulty
            puzzle['id'] = hashlib.sha256(('\n'.join(puzzle['solution']) + difficulty).encode()).hexdigest()[:20]
            puzzle['review'] = 'candidate'
            return puzzle
        except NoFill:
            continue
    raise NoFill(f'No valid {size}x{size} {difficulty} puzzle within {attempts} attempts')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--size', type=int, choices=[7,11,15], default=7)
    p.add_argument('--difficulty', choices=['easy','medium','hard'], default='easy')
    p.add_argument('--seed', type=int, default=42)
    p.add_argument('--count', type=int, default=1)
    p.add_argument('--seconds', type=float, default=3)
    p.add_argument('--output', type=Path, default=ROOT / 'generator/datasets/generated.json')
    args = p.parse_args()
    data = json.loads((ROOT / 'generator/datasets/candidates.json').read_text())
    puzzles, seen = [], set()
    for i in range(args.count):
        puzzle = generate(data, args.size, args.difficulty, args.seed+i, seconds=args.seconds)
        if puzzle['id'] not in seen:
            puzzles.append(puzzle)
            seen.add(puzzle['id'])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(puzzles, indent=2) + '\n')
    print(f'Generated {len(puzzles)} validated candidate puzzles at {args.output}')
