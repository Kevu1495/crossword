# Vocabulary and provenance

`approved.json` contains the initial reviewed clue bank. `frontend/src/puzzles.json` contains 17 validated initial puzzles across all nine modes. Original or corrected clues by Little Crossword are dedicated to CC0-1.0; upstream clues retain the Open Crossword Bank CC0 dedication in `LICENSE-CC0.txt`.

Upstream: https://github.com/tamino-martinius/node-open-crossword-bank
Pinned revision: `b82d6a3899db8437366b618d3c217e9eb942de99`.

The full importer accepts a checkout at this revision. It reads only JSON object literals from English enriched TypeScript files, without executing upstream code. It records source, revision, license, frequency tier and original difficulty; deduplicates answer–clue pairs; normalizes accents, punctuation and case; and quarantines malformed or explicitly flagged material. Automated filtering is an initial screen, not a claim that every surviving clue is suitable.

The unreviewed full dataset is deliberately excluded from Git and publication. To import a fresh checkout:

```sh
python3 generator/ingestion/import_bank.py /path/to/node-open-crossword-bank
python3 generator/generate.py --count 3
```

`generate.py` produces candidates for editorial review. `batch.py` uses only the approved bank. New clues must be reviewed for accuracy, answer agreement, sensitive language, arbitrary names, ambiguity, indication of abbreviations and regional spellings. Preserve original provenance when unchanged; attribute rewritten clues to Little Crossword. Keep difficulty provisional until playtested.

The reviewed bank is deliberately modest. Replenishment may not fill a requested batch in every mode; it must leave inventory unchanged rather than relax validity. Expand approved vocabulary and templates to improve variety. No WordNet material is currently included.
