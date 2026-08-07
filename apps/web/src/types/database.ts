export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type ModuleStatus = "pend" | "prog" | "done";
export type Priority = "Alta" | "Média" | "Baixa";
export type FlashcardState = "new" | "learning" | "review" | "relearning";

export interface Profile {
  id: string;
  name: string | null;
  bio: string | null;
  context: string | null;
  avatar_url: string | null;
  preferences: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FixedSlot {
  dayOfWeek: number; // 0=Mon ... 6=Sun
  slotIndex: number; // index into SLOT_LABELS
}

export interface DisciplineGroup {
  id: string;
  name: string;
  color: string;
  order_index: number;
  created_at: string;
}

export interface Discipline {
  id: string;
  name: string;
  type: string;
  color: string;
  horas_semana: number;
  prioridade: Priority;
  exam_date: string | null;
  progress: number;
  fixed_schedule: FixedSlot[];
  group_id: string | null;
  created_at: string;
  updated_at: string;
  // relations
  modules?: Module[];
}

export interface Module {
  id: string;
  discipline_id: string;
  name: string;
  status: ModuleStatus;
  estimated_hours: number;
  order_index: number;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_due_date: string | null;
  fsrs_reps: number;
  fsrs_lapses: number;
  fsrs_state: FlashcardState;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  discipline_id: string;
  module_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  methodology: string | null;
  completed: boolean;
  recall_score: number | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Flashcard {
  id: string;
  module_id: string;
  front: string;
  back: string;
  stability: number;
  difficulty: number;
  due_date: string;
  reps: number;
  lapses: number;
  state: FlashcardState;
  created_at: string;
}

export interface CalendarEvent {
  disciplineId: string;
  disciplineName: string;
  disciplineColor: string;
  moduleId?: string;
  moduleName: string;
  dayOfWeek: number; // 0=Mon ... 6=Sun
  slotIndex: number; // index into time slots array
  methodology: string;
  durationMinutes: number;
  done?: boolean;
}
