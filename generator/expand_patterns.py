"""Expand each mode to several structurally distinct, reproducible board patterns."""
import argparse
import hashlib
import json
from pathlib import Path
from engine.core import NoFill,solve,validate
from engine.templates import candidates,canonical_key,layout_of
ROOT=Path(__file__).resolve().parents[1]


def puzzle_id(p):
    return hashlib.sha256(('\n'.join(p['solution'])+p['difficulty']).encode()).hexdigest()[:20]


def expand(puzzles, records, target=3, seed=20261112):
    approved=[r for r in records if r['review']=='approved']
    known={p['id'] for p in puzzles}
    result=list(puzzles)
    for size in (7,11,15):
        originals=[p for p in result if p['size']==size]
        good={canonical_key(layout_of(p)):layout_of(p) for p in originals}
        for layout,current in candidates(size,list(good.values()),seed+size*10000):
            if len(good)>=target: break
            try:
                p=solve(layout,approved,current,max_seconds=.7,max_nodes=30000)
                good[canonical_key(layout)]=layout
                print(f'{size}x{size}: found pattern {len(good)}/{target}, seed {current}',flush=True)
            except NoFill: continue
        if len(good)<target: raise RuntimeError(f'Only {len(good)} fillable patterns for {size}')
        for difficulty in ('easy','medium','hard'):
            existing={canonical_key(layout_of(p)) for p in result if p['size']==size and p['difficulty']==difficulty}
            by_answer={}
            for record in approved: by_answer.setdefault(record['answer'],[]).append(record)
            bank=[]
            for choices in by_answer.values():
                bank.extend([r for r in choices if difficulty in r['modes']] or choices)
            for index,(pattern,layout) in enumerate(good.items()):
                if pattern in existing: continue
                for attempt in range(8):
                    try:
                        p=solve(layout,bank,seed+size*1000+index*10+attempt,max_seconds=1,max_nodes=50000)
                        p.update(difficulty=difficulty,review='approved')
                        p['id']=puzzle_id(p)
                        validate(p)
                        if p['id'] not in known:
                            result.append(p);known.add(p['id'])
                        existing.add(pattern)
                        break
                    except NoFill: continue
                else: raise RuntimeError(f'Could not fill a reviewed {size} {difficulty} pattern')
            print(f'{size}x{size} {difficulty}: {len(existing)} different patterns',flush=True)
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--target',type=int,default=3)
    parser.add_argument('--seed',type=int,default=20261112)
    parser.add_argument('--output',type=Path,default=ROOT/'frontend/src/puzzles.json')
    args=parser.parse_args()
    puzzles=json.loads((ROOT/'frontend/src/puzzles.json').read_text())
    records=json.loads((ROOT/'generator/datasets/approved.json').read_text())
    expanded=expand(puzzles,records,args.target,args.seed)
    args.output.write_text(json.dumps(expanded,ensure_ascii=False,indent=2)+'\n')
    print(f'{len(expanded)} reviewed puzzles saved at {args.output}')
