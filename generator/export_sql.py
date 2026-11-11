"""Create idempotent SQL from reviewed vocabulary and independently valid puzzles."""
import argparse
import hashlib
import json
from pathlib import Path
from engine.core import validate
ROOT=Path(__file__).resolve().parents[1]


def quoted(value):
    return "'" + str(value).replace("'", "''") + "'"


def export_sql(puzzles, records):
    approved={r['id']:r for r in records if r.get('review')=='approved'}
    statements=[]
    sources={}
    for r in approved.values():
        sid=hashlib.sha256((r['source']+r['revision']+r['license']).encode()).hexdigest()[:20]
        sources[r['id']]=sid
        statements.append(f"INSERT OR IGNORE INTO sources(id,url,license,revision,attribution) VALUES({','.join(map(quoted,[sid,r['source'],r['license'],r['revision'],'Little Crossword original clues' if r['kind']=='edited' else 'Open Crossword Bank by Tamino Martinius']))});")
        statements.append(f"INSERT OR IGNORE INTO words(answer,frequency_tier) VALUES({quoted(r['answer'])},{int(r['frequencyTier'])});")
        statements.append(f"INSERT OR IGNORE INTO clues(id,answer,text,difficulty,kind,source_id,review) VALUES({','.join(map(quoted,[r['id'],r['answer'],r['clue']]))},{int(r['difficulty'])},{','.join(map(quoted,[r['kind'],sid,'approved']))});")
    for p in puzzles:
        validate(p)
        if p.get('review')!='approved':
            raise ValueError('Cannot export unapproved puzzles')
        for e in p['entries']:
            record=approved.get(e['clueId'])
            if not record or record['answer']!=e['answer'] or record['clue']!=e['clue']:
                raise ValueError('Puzzle must use exactly the approved answer and clue text')
        layout=[''.join('#' if c=='#' else '.' for c in row) for row in p['solution']]
        tid=hashlib.sha256('\n'.join(layout).encode()).hexdigest()[:20]
        statements.append(f"INSERT OR IGNORE INTO templates(id,size,layout_json) VALUES({quoted(tid)},{p['size']},{quoted(json.dumps(layout))});")
        statements.append(f"INSERT OR IGNORE INTO puzzles(id,size,difficulty,seed,template_id,body_json,published) VALUES({quoted(p['id'])},{p['size']},{quoted(p['difficulty'])},{int(p['seed'])},{quoted(tid)},{quoted(json.dumps(p,ensure_ascii=False))},1);")
        for e in p['entries']:
            statements.append(f"INSERT OR IGNORE INTO puzzle_clues(puzzle_id,clue_id,number,direction) VALUES({quoted(p['id'])},{quoted(e['clueId'])},{e['number']},{quoted(e['direction'])});")
    return list(dict.fromkeys(statements))


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--puzzles',type=Path,default=ROOT/'frontend/src/puzzles.json')
    parser.add_argument('--output',type=Path,default=ROOT/'worker/seed.sql')
    args=parser.parse_args()
    records=json.loads((ROOT/'generator/datasets/approved.json').read_text())
    args.output.write_text('\n'.join(export_sql(json.loads(args.puzzles.read_text()),records))+'\n')
    print(f'Wrote reviewed seed SQL to {args.output}')
