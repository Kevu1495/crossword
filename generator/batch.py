"""Replenish all modes using only the reviewed bank; never relax grid rules."""
import argparse
import hashlib
import json
from pathlib import Path
import time
from engine.core import NoFill, solve, validate
from export_sql import export_sql
ROOT=Path(__file__).resolve().parents[1]


def batch(seed, count=1, seconds=2, attempts=12):
    records=json.loads((ROOT/'generator/datasets/approved.json').read_text())
    initial=json.loads((ROOT/'frontend/src/puzzles.json').read_text())
    templates={size:[] for size in (7,11,15)}
    for p in initial:
        layout=[''.join('#' if c=='#' else '.' for c in row) for row in p['solution']]
        if layout not in templates[p['size']]: templates[p['size']].append(layout)
    known={p['id'] for p in initial}
    used_answers={e['answer'] for p in initial for e in p['entries']}
    puzzles=[]
    for size in (7,11,15):
        for difficulty in ('easy','medium','hard'):
            # Keep vocabulary broad enough for crossings; prefer reviewed clues
            # used in the requested mode whenever that answer has a choice.
            by_answer={}
            for r in records:
                if r['review']=='approved': by_answer.setdefault(r['answer'],[]).append(r)
            bank=[]
            for choices in by_answer.values():
                preferred=[r for r in choices if difficulty in r['modes']]
                bank.extend(preferred or choices)
            added=0
            for attempt in range(attempts):
                attempt_seed=seed+size*1000+attempt
                layout=templates[size][attempt%len(templates[size])]
                try:
                    p=solve(layout,bank,attempt_seed,max_seconds=seconds,excluded_answers=used_answers)
                    p.update(difficulty=difficulty,review='approved')
                    p['id']=hashlib.sha256(('\n'.join(p['solution'])+difficulty).encode()).hexdigest()[:20]
                    if p['id'] in known: continue
                    validate(p)
                    known.add(p['id'])
                    used_answers.update(e['answer'] for e in p['entries'])
                    puzzles.append(p);added+=1
                    if added>=count: break
                except NoFill:
                    continue
            print(f'{size}x{size} {difficulty}: {added} new puzzles',flush=True)
    return puzzles,records


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--seed',type=int,default=int(time.time()))
    parser.add_argument('--count',type=int,default=1)
    parser.add_argument('--seconds',type=float,default=2)
    parser.add_argument('--attempts',type=int,default=12)
    parser.add_argument('--output',type=Path,default=ROOT/'generator/datasets/batch.json')
    args=parser.parse_args()
    puzzles,records=batch(args.seed,args.count,args.seconds,args.attempts)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(puzzles,ensure_ascii=False,indent=2)+'\n')
    initial=json.loads((ROOT/'frontend/src/puzzles.json').read_text(encoding='utf-8'))
    args.output.with_suffix('.sql').write_text('\n'.join(export_sql(puzzles,records,initial))+'\n',encoding='utf-8')
    if not puzzles: raise SystemExit('No new puzzles found; existing inventory is unchanged')
