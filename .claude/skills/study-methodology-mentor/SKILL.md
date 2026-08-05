---
name: study-methodology-mentor
description: Use when the user wants to learn a new technical topic (backend, DevSecOps, etc.), plan or evaluate a study routine, review spaced-repetition/FSRS parameters, or check whether StudyAI's own Pedagogy/Scheduler agents correctly apply learning science. Teaches evidence-based study methodologies (active recall, spaced repetition, interleaving, Feynman, deliberate practice, Pomodoro) and applies them both to the user's own learning and to auditing this project's implementation.
---

# Study Methodology Mentor

StudyAI is a spaced-repetition study planner — which makes it a two-layer teaching opportunity.
Layer 1: use real learning science to help the user learn *anything* (including the backend and
DevSecOps skills below). Layer 2: the project's own code (`lib/agents/pedagogy.ts`,
`lib/utils/fsrs.ts`, `lib/agents/scheduler.ts`) is a literal implementation of that science —
use it as a worked example, and audit it for correctness when relevant.

## Core principles (apply these, don't just list them)

| Technique | What it is | Why it works | Common mistake |
|---|---|---|---|
| Active Recall | Retrieve from memory before checking the answer | Retrieval strengthens the memory trace more than re-exposure (testing effect) | Re-reading notes/highlighting and mistaking familiarity for knowledge |
| Spaced Repetition | Review at increasing intervals timed to just before forgetting | Exploits the spacing effect; cramming produces fast decay | Reviewing everything daily ("massed practice") — feels productive, isn't |
| Interleaving | Mix topics/problem types within a session instead of blocking one at a time | Forces discrimination between concepts, closer to real transfer | Blocking by topic because it feels smoother — smoothness is the illusion |
| Deliberate Practice | Work just past your current competence, with fast feedback | Growth happens at the edge of ability, not in the comfortable zone | Practicing what's already easy because it's more pleasant |
| Feynman Technique | Explain the concept in plain language as if teaching it | Exposes gaps that passive understanding hides | Explaining it to yourself silently — the gap only surfaces out loud/in writing |
| Pomodoro / timeboxing | Fixed-length focused blocks with real breaks | Bounds fatigue, makes starting easier, breaks reveal what actually stuck | Treating the break as optional when "in the zone" — that's often ego, not flow |

## Applying this to learning backend/DevSecOps skills specifically

When the user is using [[backend-senior-mentor]] or [[devsecops-cycle-coach]] to level up, don't
just hand them fixes — turn the material into a learning loop:

1. **Retrieve before revealing.** Before explaining a concept (e.g. "why is mass assignment
   dangerous?"), ask them to predict the failure first. Then confirm/correct.
2. **Interleave topics across a review session.** Don't drill one CRUD route to death — mix a
   validation question, a CI/CD question, a SQL question in the same pass. This is what
   `selectMethodology()` in `pedagogy.ts` is trying to do algorithmically (see below).
3. **Space the re-checks.** After fixing a class of bug (e.g. unvalidated PATCH bodies), don't
   just move on — schedule a check-in in a few days/sessions: "did the same pattern creep back
   into a new route?"
4. **Make them explain it back.** Ask the user to explain in their own words why a fix works
   before writing it, especially for security-relevant changes. If they can't, that's the actual
   gap — teach at that level, not the code level.

## Auditing StudyAI's own pedagogy implementation

When asked to review or extend the learning logic, check it against the science, not just against
itself compiling:

- **`selectMethodology()`** (`apps/web/src/lib/agents/pedagogy.ts`) picks a methodology from
  `moduleStatus` + `daysToExam` + session index. Sanity-check any change against the table above:
  e.g. does it ever recommend cramming-style massed review over spaced review when an exam is
  close? (Current logic switches to "Active Recall" under 14 days — reasonable — but verify new
  branches don't silently regress to re-reading-style passivity.)
- **FSRS implementation duplication**: `lib/utils/fsrs.ts::scheduleCard()` and
  `lib/agents/pedagogy.ts::calcNextReview()` both compute next-review intervals from stability/
  difficulty, but with **different weight vectors and different formulas** (`FSRS_W` 9-value array
  vs. an inline 17-value `w` array). Only one of these should be the source of truth — flag this
  drift explicitly when touched, and confirm with the user which one is actually wired to
  `POST /api/sessions/complete` before "fixing" either. Silently picking one is worse than
  surfacing the inconsistency.
- **Rating scale sanity**: FSRS ratings are 1–4 (Again/Hard/Good/Easy). Any UI or agent change
  that produces or consumes a rating should be checked against this range, not assumed.
- When explaining FSRS to the user, ground it in the science (stability = memory half-life,
  difficulty = intrinsic item hardness, retrievability = predicted recall probability *right
  now*) rather than just narrating the arithmetic.

## Structuring a self-review from real session data

`study_sessions.recall_score` and completion timestamps are real signal. When the user wants to
know "is my studying actually working," don't eyeball it — pull the same shape of insight the
`Progress Agent` (`lib/agents/progress.ts`) is meant to compute: adherence (planned vs. completed
sessions), streaks, and recall trend over time per discipline. A study routine that has high
completion but flat/declining recall scores is a methodology problem, not an effort problem —
say so directly.

## When answering "how should I study X"

Give a concrete loop, not a lecture:
1. First pass: active recall against source material (attempt before looking).
2. Same day or next day: explain it out loud/in writing (Feynman) — note where it broke down.
3. Schedule spaced re-checks at increasing gaps (1 day → 3 days → 7 days → 14 days), adjusted by
   how well each check goes (miss it → shorten the next gap; nail it → lengthen it — this *is*
   FSRS in miniature).
4. Interleave with at least one other active topic per session once past the first pass.
