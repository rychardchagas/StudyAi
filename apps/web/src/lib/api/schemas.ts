import { z } from "zod";

// .strict() is the actual fix for mass assignment: any key not listed here makes
// .parse() throw a ZodError (→ 400 via handleApiError) instead of silently reaching
// local-db.ts, where update*() would otherwise turn it into a SQL column reference.

const fixedSlotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  slotIndex: z.number().int().min(0),
});

const topicsSchema = z.array(z.string().max(200)).max(50);

export const evaluationCreateSchema = z
  .object({
    discipline_id: z.string().min(1),
    name: z.string().min(1).max(200),
    date: z.string().min(1),
    weight: z.number().int().min(0).max(100).nullable().optional(),
  })
  .strict();

export const evaluationPatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    date: z.string().min(1).optional(),
    weight: z.number().int().min(0).max(100).nullable().optional(),
  })
  .strict();

export const disciplineCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    horas_semana: z.number().int().min(0).max(168).optional(),
    prioridade: z.enum(["Alta", "Média", "Baixa"]).optional(),
    exam_date: z.string().nullable().optional(),
    progress: z.number().int().min(0).max(100).optional(),
    fixed_schedule: z.array(fixedSlotSchema).optional(),
    group_id: z.string().min(1).nullable().optional(),
    modules: z
      .array(
        z.object({
          name: z.string().min(1).max(200),
          estimated_hours: z.number().int().min(0).max(1000).optional(),
          topics: topicsSchema.optional(),
        })
      )
      .optional(),
  })
  .strict();

export const disciplinePatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    type: z.string().min(1).max(50).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    horas_semana: z.number().int().min(0).max(168).optional(),
    prioridade: z.enum(["Alta", "Média", "Baixa"]).optional(),
    exam_date: z.string().nullable().optional(),
    progress: z.number().int().min(0).max(100).optional(),
    fixed_schedule: z.array(fixedSlotSchema).optional(),
    group_id: z.string().min(1).nullable().optional(),
  })
  .strict();

export const groupCreateSchema = z
  .object({
    name: z.string().min(1).max(100),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  })
  .strict();

export const groupPatchSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
    order_index: z.number().int().min(0).optional(),
  })
  .strict();

export const profilePatchSchema = z
  .object({
    name: z.string().max(200).nullable().optional(),
    bio: z.string().max(2000).nullable().optional(),
    context: z.string().max(4000).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    preferences: z.record(z.unknown()).optional(),
  })
  .strict();

export const moduleCreateSchema = z
  .object({
    discipline_id: z.string().min(1),
    name: z.string().min(1).max(200),
    status: z.enum(["pend", "prog", "done"]).optional(),
    estimated_hours: z.number().int().min(0).max(1000).optional(),
    order_index: z.number().int().min(0).optional(),
    topics: topicsSchema.optional(),
  })
  .strict();

export const modulePatchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    status: z.enum(["pend", "prog", "done"]).optional(),
    estimated_hours: z.number().int().min(0).max(1000).optional(),
    order_index: z.number().int().min(0).optional(),
    topics: topicsSchema.optional(),
    fsrs_stability: z.number().min(0).optional(),
    fsrs_difficulty: z.number().min(0).optional(),
    fsrs_due_date: z.string().nullable().optional(),
    fsrs_reps: z.number().int().min(0).optional(),
    fsrs_lapses: z.number().int().min(0).optional(),
    fsrs_state: z.enum(["new", "learning", "review", "relearning"]).optional(),
  })
  .strict();

export const sessionCreateSchema = z
  .object({
    discipline_id: z.string().min(1),
    module_id: z.string().min(1).nullable().optional(),
    scheduled_at: z.string().min(1),
    duration_minutes: z.number().int().min(1).max(600).optional(),
    methodology: z.string().max(100).nullable().optional(),
  })
  .strict();

export const sessionCompleteSchema = z
  .object({
    // Either an existing session (normal flow: session was created when the timer started), or
    // omit it and pass disciplineId+scheduledAt to create-then-complete in the same request — used
    // by "mark as done" from the calendar, where no session exists yet and the old two-request
    // create-then-complete round trip was pure avoidable latency for a same-machine SQLite write.
    sessionId: z.string().min(1).optional(),
    disciplineId: z.string().min(1).optional(),
    scheduledAt: z.string().min(1).optional(),
    durationMinutes: z.number().int().min(1).max(600).optional(),
    methodology: z.string().max(100).nullable().optional(),
    // 1-4, matching FSRS's Again/Hard/Good/Easy rating (lib/utils/fsrs.ts's Rating type) — not a
    // broader 1-5 "how did it feel" scale. moduleId is what lets sessions/complete look up the
    // module's current FSRSCard and call scheduleCard() with this rating.
    moduleId: z.string().min(1).optional(),
    recallScore: z.number().int().min(1).max(4).optional(),
    notes: z.string().max(5000).optional(),
    // Explicit false = "não terminei, quero retomar depois" — the student didn't do a real
    // recall check, so no FSRS update happens; the module just gets flagged so the scheduler
    // gives it back to them instead of rotating on to something else. Omitted/true = normal
    // completion flow, unchanged.
    finished: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.sessionId || (v.disciplineId && v.scheduledAt), {
    message: "Either sessionId, or disciplineId+scheduledAt to create the session inline, is required",
  });
