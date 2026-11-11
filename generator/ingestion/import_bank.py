"""Import the pinned Open Crossword Bank checkout without executing upstream code."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import unicodedata

REVISION = 'b82d6a3899db8437366b618d3c217e9eb942de99'
SOURCE = 'https://github.com/tamino-martinius/node-open-crossword-bank'
ROOT = Path(__file__).resolve().parents[2]


def normalize(word):
    return ''.join(c for c in unicodedata.normalize('NFKD', word).upper() if not unicodedata.combining(c)).replace(' ', '').replace('-', '').replace("'", '')


def ingest(checkout):
    accepted, quarantine, seen = [], [], set()
    for path in sorted((checkout / 'src/data/en/enriched').rglob('*.ts')):
        for line in path.read_text().splitlines():
            if not line.strip().startswith('{'):
                continue
            record = json.loads(line.strip().rstrip(','))
            answer = normalize(record['word'])
            for clue in record.get('clues', []):
                text = clue['text'].strip()
                reason = None
                if not re.fullmatch('[A-Z]{3,15}', answer):
                    reason = 'answer-format'
                elif not 3 <= len(text) <= 220:
                    reason = 'clue-length'
                elif re.search(r'\b' + re.escape(answer) + r'\b', unicodedata.normalize('NFKD', text).upper()):
                    reason = 'answer-in-clue'
                elif any(t in text.lower() for t in ['slur', 'vulgar', 'offensive', 'sexual', 'derogatory']):
                    reason = 'editorial-review'
                if reason:
                    quarantine.append({'answer': answer, 'clue': text, 'reason': reason})
                    continue
                key = (answer, text.casefold())
                if key in seen:
                    continue
                seen.add(key)
                accepted.append({'id': hashlib.sha256((answer + '\0' + text).encode()).hexdigest()[:20], 'answer': answer, 'clue': text, 'difficulty': clue['difficulty'], 'kind': clue['type'], 'frequencyTier': record['freqTier'], 'source': SOURCE, 'revision': REVISION, 'license': 'CC0-1.0', 'review': 'candidate'})
    return accepted, quarantine


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('checkout', type=Path)
    args = parser.parse_args()
    records, rejected = ingest(args.checkout)
    out = ROOT / 'generator/datasets'
    out.mkdir(exist_ok=True)
    (out / 'candidates.json').write_text(json.dumps(records, ensure_ascii=False, separators=(',', ':')) + '\n')
    (out / 'quarantine.json').write_text(json.dumps(rejected, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(records)} candidate clues, {len(rejected)} quarantined. Candidates require editorial review before publication.')
