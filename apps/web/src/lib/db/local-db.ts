import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "fs";
import path from "path";
import type { Discipline, Flashcard, Module, Profile, StudySession } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "studyai.db");
const SCHEMA_PATH = path.join(process.cwd(), "src", "lib", "db", "local-schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __studyaiDb: DatabaseSync | undefined;
}

// node:sqlite requires named-parameter keys to include their SQL sigil (e.g. "@id"),
// unlike most SQLite wrappers — this adapts plain {id: ...} params to that shape.
function bind(params: Record<string, unknown>): Record<string, SQLInputValue> {
  const bound: Record<string, SQLInputValue> = {};
  for (const [key, value] of Object.entries(params)) bound[`@${key}`] = (value ?? null) as SQLInputValue;
  return bound;
}

function getDb(): DatabaseSync {
  if (global.__studyaiDb) return global.__studyaiDb;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));
  db.prepare(`INSERT OR IGNORE INTO profile (id) VALUES ('local')`).run();

  global.__studyaiDb = db;
  return db;
}

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

// --- Profile ---

export function getProfile(): Profile {
  const row = getDb().prepare(`SELECT * FROM profile WHERE id = 'local'`).get() as Record<string, unknown>;
  return { ...row, preferences: JSON.parse((row.preferences as string) ?? "{}") } as Profile;
}

export function updateProfile(updates: Partial<Profile>): Profile {
  const db = getDb();
  const fields = Object.keys(updates).filter((k) => k !== "id");
  if (fields.length) {
    const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
    const params: Record<string, unknown> = { ...updates, updated_at: now() };
    if ("preferences" in updates) params.preferences = JSON.stringify(updates.preferences ?? {});
    db.prepare(`UPDATE profile SET ${assignments}, updated_at = @updated_at WHERE id = 'local'`).run(bind(params));
  }
  return getProfile();
}

// --- Disciplines ---

export function listDisciplines(): Discipline[] {
  const db = getDb();
  const disciplines = db.prepare(`SELECT * FROM disciplines ORDER BY created_at ASC`).all() as unknown as Discipline[];
  const modulesStmt = db.prepare(`SELECT * FROM modules WHERE discipline_id = ? ORDER BY order_index ASC`);
  return disciplines.map((d) => ({ ...d, modules: modulesStmt.all(d.id) as unknown as Module[] }));
}

export function createDiscipline(input: Partial<Discipline>): Discipline {
  const db = getDb();
  const id = newId();
  db.prepare(
    `INSERT INTO disciplines (id, name, type, color, horas_semana, prioridade, exam_date, progress)
     VALUES (@id, @name, @type, @color, @horas_semana, @prioridade, @exam_date, @progress)`
  ).run(
    bind({
      id,
      name: input.name ?? "",
      type: input.type ?? "Graduação",
      color: input.color ?? "#3B82F6",
      horas_semana: input.horas_semana ?? 4,
      prioridade: input.prioridade ?? "Média",
      exam_date: input.exam_date ?? null,
      progress: input.progress ?? 0,
    })
  );
  return db.prepare(`SELECT * FROM disciplines WHERE id = ?`).get(id) as unknown as Discipline;
}

export function updateDiscipline(id: string, updates: Partial<Discipline>): Discipline {
  const db = getDb();
  const fields = Object.keys(updates).filter((k) => !["id", "modules"].includes(k));
  if (fields.length) {
    const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
    db.prepare(`UPDATE disciplines SET ${assignments}, updated_at = @updated_at WHERE id = @id`).run(
      bind({ ...updates, id, updated_at: now() })
    );
  }
  return db.prepare(`SELECT * FROM disciplines WHERE id = ?`).get(id) as unknown as Discipline;
}

export function deleteDiscipline(id: string): void {
  getDb().prepare(`DELETE FROM disciplines WHERE id = ?`).run(id);
}

// --- Modules ---

export function listModules(disciplineId?: string): Module[] {
  const db = getDb();
  if (disciplineId) {
    return db
      .prepare(`SELECT * FROM modules WHERE discipline_id = ? ORDER BY order_index ASC`)
      .all(disciplineId) as unknown as Module[];
  }
  return db.prepare(`SELECT * FROM modules ORDER BY order_index ASC`).all() as unknown as Module[];
}

export function updateModule(id: string, updates: Partial<Module>): Module {
  const db = getDb();
  const fields = Object.keys(updates).filter((k) => k !== "id");
  if (fields.length) {
    const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
    db.prepare(`UPDATE modules SET ${assignments}, updated_at = @updated_at WHERE id = @id`).run(
      bind({ ...updates, id, updated_at: now() })
    );
  }
  return db.prepare(`SELECT * FROM modules WHERE id = ?`).get(id) as unknown as Module;
}

// --- Study sessions ---

export function listSessions(): StudySession[] {
  return getDb().prepare(`SELECT * FROM study_sessions ORDER BY scheduled_at ASC`).all() as unknown as StudySession[];
}

export function createSession(input: Partial<StudySession>): StudySession {
  const db = getDb();
  const id = newId();
  db.prepare(
    `INSERT INTO study_sessions (id, discipline_id, module_id, scheduled_at, duration_minutes, methodology)
     VALUES (@id, @discipline_id, @module_id, @scheduled_at, @duration_minutes, @methodology)`
  ).run(
    bind({
      id,
      discipline_id: input.discipline_id,
      module_id: input.module_id ?? null,
      scheduled_at: input.scheduled_at,
      duration_minutes: input.duration_minutes ?? 45,
      methodology: input.methodology ?? null,
    })
  );
  return db.prepare(`SELECT * FROM study_sessions WHERE id = ?`).get(id) as unknown as StudySession;
}

export function completeSession(id: string, updates: { recallScore?: number; notes?: string }): StudySession {
  const db = getDb();
  db.prepare(
    `UPDATE study_sessions SET completed = 1, recall_score = @recall_score, notes = @notes, completed_at = @completed_at WHERE id = @id`
  ).run(
    bind({
      id,
      recall_score: updates.recallScore ?? null,
      notes: updates.notes ?? null,
      completed_at: now(),
    })
  );
  return db.prepare(`SELECT * FROM study_sessions WHERE id = ?`).get(id) as unknown as StudySession;
}

// --- Flashcards ---

export function listFlashcards(moduleId?: string): Flashcard[] {
  const db = getDb();
  if (moduleId) {
    return db.prepare(`SELECT * FROM flashcards WHERE module_id = ? ORDER BY due_date ASC`).all(moduleId) as unknown as Flashcard[];
  }
  return db.prepare(`SELECT * FROM flashcards ORDER BY due_date ASC`).all() as unknown as Flashcard[];
}

export function upsertFlashcard(input: Partial<Flashcard> & { module_id: string; front: string; back: string }): Flashcard {
  const db = getDb();
  if (input.id) {
    const fields = Object.keys(input).filter((k) => k !== "id");
    const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
    db.prepare(`UPDATE flashcards SET ${assignments} WHERE id = @id`).run(bind(input as Record<string, unknown>));
    return db.prepare(`SELECT * FROM flashcards WHERE id = ?`).get(input.id) as unknown as Flashcard;
  }
  const id = newId();
  db.prepare(
    `INSERT INTO flashcards (id, module_id, front, back, stability, difficulty, due_date, reps, lapses, state)
     VALUES (@id, @module_id, @front, @back, @stability, @difficulty, @due_date, @reps, @lapses, @state)`
  ).run(
    bind({
      id,
      module_id: input.module_id,
      front: input.front,
      back: input.back,
      stability: input.stability ?? 0,
      difficulty: input.difficulty ?? 0,
      due_date: input.due_date ?? now(),
      reps: input.reps ?? 0,
      lapses: input.lapses ?? 0,
      state: input.state ?? "new",
    })
  );
  return db.prepare(`SELECT * FROM flashcards WHERE id = ?`).get(id) as unknown as Flashcard;
}
