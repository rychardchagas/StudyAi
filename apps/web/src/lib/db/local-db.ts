import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import fs from "fs";
import path from "path";
import type { Discipline, DisciplineGroup, Flashcard, Module, Profile, StudySession } from "@/types";

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

// node:sqlite rows are created with a null prototype (Object.create(null)), which
// React Server Components refuse to serialize to Client Components ("Only plain
// objects... Classes or null prototypes are not supported"). Spreading into a
// fresh {} gives back a normal Object.prototype-backed object.
function toPlain<T>(row: unknown): T {
  return (row ? { ...(row as Record<string, unknown>) } : row) as T;
}
function toPlainArray<T>(rows: unknown[]): T[] {
  return rows.map((row) => ({ ...(row as Record<string, unknown>) })) as T[];
}

function getDb(): DatabaseSync {
  if (global.__studyaiDb) return global.__studyaiDb;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA journal_mode = WAL");
  // Off by default in SQLite even though the schema declares ON DELETE CASCADE everywhere —
  // without this, deleteDiscipline() leaves orphaned modules/sessions/flashcards behind.
  db.exec("PRAGMA foreign_keys = ON");
  db.exec(fs.readFileSync(SCHEMA_PATH, "utf-8"));
  db.prepare(`INSERT OR IGNORE INTO profile (id) VALUES ('local')`).run();

  // Migration: databases created before fixed_schedule/group_id existed need the column added —
  // CREATE TABLE IF NOT EXISTS above only helps brand-new databases.
  const disciplineColumns = toPlainArray<{ name: string }>(db.prepare(`PRAGMA table_info(disciplines)`).all());
  if (!disciplineColumns.some((c) => c.name === "fixed_schedule")) {
    db.exec(`ALTER TABLE disciplines ADD COLUMN fixed_schedule TEXT DEFAULT '[]'`);
  }
  if (!disciplineColumns.some((c) => c.name === "group_id")) {
    db.exec(`ALTER TABLE disciplines ADD COLUMN group_id TEXT`);
  }
  // Must run after the migration above, not from local-schema.sql's own CREATE INDEX — that
  // file re-execs on every boot, and on a pre-existing DB the group_id column above wouldn't
  // exist yet at the point schema.sql runs, so an index on it there would fail to create.
  db.exec(`CREATE INDEX IF NOT EXISTS idx_disciplines_group ON disciplines(group_id)`);

  // Migration: databases created before fsrs_lapses/fsrs_state existed on modules — needed to
  // round-trip a full FSRSCard (see scheduleCard() in lib/utils/fsrs.ts) through sessions/complete.
  const moduleColumns = toPlainArray<{ name: string }>(db.prepare(`PRAGMA table_info(modules)`).all());
  if (!moduleColumns.some((c) => c.name === "fsrs_lapses")) {
    db.exec(`ALTER TABLE modules ADD COLUMN fsrs_lapses INTEGER DEFAULT 0`);
  }
  if (!moduleColumns.some((c) => c.name === "fsrs_state")) {
    db.exec(`ALTER TABLE modules ADD COLUMN fsrs_state TEXT DEFAULT 'new'`);
  }

  global.__studyaiDb = db;
  return db;
}

const now = () => new Date().toISOString();
const newId = () => crypto.randomUUID();

// --- Profile ---

export function getProfile(): Profile {
  const row = toPlain<Record<string, unknown>>(getDb().prepare(`SELECT * FROM profile WHERE id = 'local'`).get());
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

// --- Discipline groups ("Faculdade", "Projeto pessoal", ...) ---

export function listGroups(): DisciplineGroup[] {
  return toPlainArray<DisciplineGroup>(
    getDb().prepare(`SELECT * FROM discipline_groups ORDER BY order_index ASC, created_at ASC`).all()
  );
}

export function createGroup(input: { name: string; color?: string }): DisciplineGroup {
  const db = getDb();
  const id = newId();
  const maxOrder = toPlain<{ m: number | null }>(
    db.prepare(`SELECT MAX(order_index) as m FROM discipline_groups`).get()
  ).m;
  db.prepare(
    `INSERT INTO discipline_groups (id, name, color, order_index) VALUES (@id, @name, @color, @order_index)`
  ).run(bind({ id, name: input.name, color: input.color ?? "#71717A", order_index: (maxOrder ?? -1) + 1 }));
  return toPlain<DisciplineGroup>(db.prepare(`SELECT * FROM discipline_groups WHERE id = ?`).get(id));
}

export function updateGroup(id: string, updates: Partial<DisciplineGroup>): DisciplineGroup {
  const db = getDb();
  const fields = Object.keys(updates).filter((k) => k !== "id");
  if (fields.length) {
    const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
    db.prepare(`UPDATE discipline_groups SET ${assignments} WHERE id = @id`).run(bind({ ...updates, id }));
  }
  return toPlain<DisciplineGroup>(db.prepare(`SELECT * FROM discipline_groups WHERE id = ?`).get(id));
}

// Ungroups its disciplines instead of deleting them — a folder disappearing should never take
// the user's study material down with it.
export function deleteGroup(id: string): void {
  const db = getDb();
  db.prepare(`UPDATE disciplines SET group_id = NULL WHERE group_id = @id`).run(bind({ id }));
  db.prepare(`DELETE FROM discipline_groups WHERE id = ?`).run(id);
}

// --- Disciplines ---

function parseDiscipline(row: Record<string, unknown>): Discipline {
  return { ...row, fixed_schedule: JSON.parse((row.fixed_schedule as string) ?? "[]") } as unknown as Discipline;
}

export function listDisciplines(): Discipline[] {
  const db = getDb();
  const disciplines = toPlainArray<Record<string, unknown>>(
    db.prepare(`SELECT * FROM disciplines ORDER BY created_at ASC`).all()
  ).map(parseDiscipline);
  const modulesStmt = db.prepare(`SELECT * FROM modules WHERE discipline_id = ? ORDER BY order_index ASC`);
  return disciplines.map((d) => ({ ...d, modules: toPlainArray<Module>(modulesStmt.all(d.id)) }));
}

// Every discipline used to default to the same hardcoded "#3B82F6" unless a caller explicitly
// passed a color — none did, so every discipline in the calendar/sidebar rendered identically
// blue. Cycles through a fixed palette (same L/C as the `primary`/`secondary` theme tokens, just
// spread across hues) keyed off how many disciplines already exist, so each new one gets a
// visually distinct color automatically.
// Hex (not oklch()) on purpose — disciplinePatchSchema/disciplineCreateSchema validate `color`
// against /^#[0-9A-Fa-f]{6}$/, matching the existing hex defaults already in local-schema.sql.
const DISCIPLINE_COLOR_PALETTE = [
  "#D4A537", // gold
  "#4FB8A8", // teal
  "#E8735A", // coral
  "#6FBF73", // green
  "#A78BD9", // violet
  "#E37FA6", // rose
  "#6B9FE8", // blue
  "#E0A64D", // amber
];

function nextDisciplineColor(): string {
  const db = getDb();
  const { c } = db.prepare(`SELECT COUNT(*) c FROM disciplines`).get() as { c: number };
  return DISCIPLINE_COLOR_PALETTE[c % DISCIPLINE_COLOR_PALETTE.length];
}

export function createDiscipline(input: Partial<Discipline>): Discipline {
  const db = getDb();
  const id = newId();
  db.prepare(
    `INSERT INTO disciplines (id, name, type, color, horas_semana, prioridade, exam_date, progress, fixed_schedule, group_id)
     VALUES (@id, @name, @type, @color, @horas_semana, @prioridade, @exam_date, @progress, @fixed_schedule, @group_id)`
  ).run(
    bind({
      id,
      name: input.name ?? "",
      type: input.type ?? "Graduação",
      color: input.color ?? nextDisciplineColor(),
      horas_semana: input.horas_semana ?? 4,
      prioridade: input.prioridade ?? "Média",
      exam_date: input.exam_date ?? null,
      progress: input.progress ?? 0,
      fixed_schedule: JSON.stringify(input.fixed_schedule ?? []),
      group_id: input.group_id ?? null,
    })
  );
  return parseDiscipline(toPlain(db.prepare(`SELECT * FROM disciplines WHERE id = ?`).get(id)));
}

export function updateDiscipline(id: string, updates: Partial<Discipline>): Discipline {
  const db = getDb();
  const fields = Object.keys(updates).filter((k) => !["id", "modules"].includes(k));
  if (fields.length) {
    const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
    const params: Record<string, unknown> = { ...updates, id, updated_at: now() };
    if ("fixed_schedule" in updates) params.fixed_schedule = JSON.stringify(updates.fixed_schedule ?? []);
    db.prepare(`UPDATE disciplines SET ${assignments}, updated_at = @updated_at WHERE id = @id`).run(bind(params));
  }
  return parseDiscipline(toPlain(db.prepare(`SELECT * FROM disciplines WHERE id = ?`).get(id)));
}

export function deleteDiscipline(id: string): void {
  getDb().prepare(`DELETE FROM disciplines WHERE id = ?`).run(id);
}

// Discipline.progress is a plain stored number, set once at creation (default 0) and never
// auto-derived from module completion anywhere — there's no UI to edit it directly either, so it
// drifts from reality as modules get marked done. This recomputes it from actual module status
// for every discipline that has modules, and returns how many rows actually changed.
export function recalculateAllProgress(): { updated: number; total: number } {
  const disciplines = listDisciplines();
  let updated = 0;
  for (const d of disciplines) {
    const modules = d.modules ?? [];
    if (!modules.length) continue;
    const doneCount = modules.filter((m) => m.status === "done").length;
    const nextProgress = Math.round((doneCount / modules.length) * 100);
    if (nextProgress !== d.progress) {
      updateDiscipline(d.id, { progress: nextProgress });
      updated++;
    }
  }
  return { updated, total: disciplines.length };
}

// Wipes every discipline, module, session, flashcard, and group — a deliberate "start over"
// action, not a soft-delete. Leaves `profile` (name/bio/preferences) untouched, since resetting
// study content isn't the same as resetting who the user is or their notification/schedule prefs.
export function resetAllData(): { disciplines: number; modules: number; sessions: number } {
  const db = getDb();
  const counts = {
    disciplines: (toPlain<{ c: number }>(db.prepare(`SELECT COUNT(*) as c FROM disciplines`).get())).c,
    modules: (toPlain<{ c: number }>(db.prepare(`SELECT COUNT(*) as c FROM modules`).get())).c,
    sessions: (toPlain<{ c: number }>(db.prepare(`SELECT COUNT(*) as c FROM study_sessions`).get())).c,
  };
  db.exec("DELETE FROM flashcards");
  db.exec("DELETE FROM study_sessions");
  db.exec("DELETE FROM modules");
  db.exec("DELETE FROM disciplines");
  db.exec("DELETE FROM discipline_groups");
  return counts;
}

// --- Modules ---

export function listModules(disciplineId?: string): Module[] {
  const db = getDb();
  if (disciplineId) {
    return toPlainArray<Module>(
      db.prepare(`SELECT * FROM modules WHERE discipline_id = ? ORDER BY order_index ASC`).all(disciplineId)
    );
  }
  return toPlainArray<Module>(db.prepare(`SELECT * FROM modules ORDER BY order_index ASC`).all());
}

export function getModule(id: string): Module | undefined {
  const row = getDb().prepare(`SELECT * FROM modules WHERE id = ?`).get(id);
  return row ? toPlain<Module>(row) : undefined;
}

export function createModule(input: Partial<Module> & { discipline_id: string; name: string }): Module {
  const db = getDb();
  const id = newId();
  db.prepare(
    `INSERT INTO modules (id, discipline_id, name, status, estimated_hours, order_index)
     VALUES (@id, @discipline_id, @name, @status, @estimated_hours, @order_index)`
  ).run(
    bind({
      id,
      discipline_id: input.discipline_id,
      name: input.name,
      status: input.status ?? "pend",
      estimated_hours: input.estimated_hours ?? 4,
      order_index: input.order_index ?? 0,
    })
  );
  return toPlain<Module>(db.prepare(`SELECT * FROM modules WHERE id = ?`).get(id));
}

export function deleteModule(id: string): void {
  getDb().prepare(`DELETE FROM modules WHERE id = ?`).run(id);
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
  return toPlain<Module>(db.prepare(`SELECT * FROM modules WHERE id = ?`).get(id));
}

// --- Study sessions ---

export function listSessions(): StudySession[] {
  return toPlainArray<StudySession>(getDb().prepare(`SELECT * FROM study_sessions ORDER BY scheduled_at ASC`).all());
}

export function getSession(id: string): StudySession | undefined {
  const row = getDb().prepare(`SELECT * FROM study_sessions WHERE id = ?`).get(id);
  return row ? toPlain<StudySession>(row) : undefined;
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
  return toPlain<StudySession>(db.prepare(`SELECT * FROM study_sessions WHERE id = ?`).get(id));
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
  return toPlain<StudySession>(db.prepare(`SELECT * FROM study_sessions WHERE id = ?`).get(id));
}

// --- Flashcards ---

export function listFlashcards(moduleId?: string): Flashcard[] {
  const db = getDb();
  if (moduleId) {
    return toPlainArray<Flashcard>(db.prepare(`SELECT * FROM flashcards WHERE module_id = ? ORDER BY due_date ASC`).all(moduleId));
  }
  return toPlainArray<Flashcard>(db.prepare(`SELECT * FROM flashcards ORDER BY due_date ASC`).all());
}

export function upsertFlashcard(input: Partial<Flashcard> & { module_id: string; front: string; back: string }): Flashcard {
  const db = getDb();
  if (input.id) {
    const fields = Object.keys(input).filter((k) => k !== "id");
    const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
    db.prepare(`UPDATE flashcards SET ${assignments} WHERE id = @id`).run(bind(input as Record<string, unknown>));
    return toPlain<Flashcard>(db.prepare(`SELECT * FROM flashcards WHERE id = ?`).get(input.id));
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
  return toPlain<Flashcard>(db.prepare(`SELECT * FROM flashcards WHERE id = ?`).get(id));
}
