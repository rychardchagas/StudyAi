-- StudyAI Local Database Schema (SQLite)
-- Single-user, local-only — no auth, no RLS, no cloud extensions.

CREATE TABLE IF NOT EXISTS profile (
  id TEXT PRIMARY KEY DEFAULT 'local',
  name TEXT,
  bio TEXT,
  context TEXT, -- for AI personalization
  avatar_url TEXT,
  preferences TEXT DEFAULT '{}', -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS disciplines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'Graduação',
  color TEXT DEFAULT '#3B82F6',
  horas_semana INTEGER DEFAULT 4,
  prioridade TEXT DEFAULT 'Média' CHECK (prioridade IN ('Alta', 'Média', 'Baixa')),
  exam_date TEXT,
  progress INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  discipline_id TEXT NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pend' CHECK (status IN ('pend', 'prog', 'done')),
  estimated_hours INTEGER DEFAULT 4,
  order_index INTEGER DEFAULT 0,
  fsrs_stability REAL DEFAULT 0,
  fsrs_difficulty REAL DEFAULT 0,
  fsrs_due_date TEXT,
  fsrs_reps INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id TEXT PRIMARY KEY,
  discipline_id TEXT NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  module_id TEXT REFERENCES modules(id),
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 45,
  methodology TEXT,
  completed INTEGER DEFAULT 0,
  recall_score INTEGER CHECK (recall_score BETWEEN 1 AND 5),
  notes TEXT,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS flashcards (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  due_date TEXT DEFAULT (datetime('now')),
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  state TEXT DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON study_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_sessions_discipline ON study_sessions(discipline_id);
CREATE INDEX IF NOT EXISTS idx_modules_discipline ON modules(discipline_id, order_index);
CREATE INDEX IF NOT EXISTS idx_flashcards_due ON flashcards(due_date);
