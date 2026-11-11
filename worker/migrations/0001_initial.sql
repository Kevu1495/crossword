PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  license TEXT NOT NULL,
  revision TEXT NOT NULL,
  attribution TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS words (
  answer TEXT PRIMARY KEY CHECK(length(answer) BETWEEN 3 AND 15 AND answer NOT GLOB '*[^A-Z]*'),
  length INTEGER GENERATED ALWAYS AS (length(answer)) STORED,
  frequency_tier INTEGER NOT NULL CHECK(frequency_tier BETWEEN 1 AND 5)
);
CREATE INDEX IF NOT EXISTS words_length_frequency ON words(length, frequency_tier);
CREATE TABLE IF NOT EXISTS clues (
  id TEXT PRIMARY KEY,
  answer TEXT NOT NULL REFERENCES words(answer),
  text TEXT NOT NULL,
  difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5),
  kind TEXT NOT NULL,
  source_id TEXT NOT NULL REFERENCES sources(id),
  review TEXT NOT NULL DEFAULT 'candidate' CHECK(review IN ('candidate','approved','rejected')),
  UNIQUE(answer, text)
);
CREATE INDEX IF NOT EXISTS clues_answer_difficulty ON clues(answer, difficulty, review);
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY,
  size INTEGER NOT NULL CHECK(size IN (7,11,15)),
  layout_json TEXT NOT NULL CHECK(json_valid(layout_json))
);
CREATE TABLE IF NOT EXISTS puzzles (
  id TEXT PRIMARY KEY,
  size INTEGER NOT NULL CHECK(size IN (7,11,15)),
  difficulty TEXT NOT NULL CHECK(difficulty IN ('easy','medium','hard')),
  seed INTEGER NOT NULL,
  template_id TEXT NOT NULL REFERENCES templates(id),
  body_json TEXT NOT NULL CHECK(json_valid(body_json)),
  published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS puzzles_mode_available ON puzzles(size, difficulty, published, id);
CREATE TABLE IF NOT EXISTS puzzle_clues (
  puzzle_id TEXT NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  clue_id TEXT NOT NULL REFERENCES clues(id),
  number INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK(direction IN ('across','down')),
  PRIMARY KEY(puzzle_id,number,direction)
);
