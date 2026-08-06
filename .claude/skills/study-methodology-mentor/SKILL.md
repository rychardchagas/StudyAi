---
name: study-methodology-mentor
description: Use when the user wants to learn a new technical topic (backend, DevSecOps, etc.), plan or evaluate a study routine, write or review flashcards, review spaced-repetition/FSRS parameters, or check whether StudyAI's own Pedagogy/Scheduler agents correctly apply learning science. Teaches evidence-based study methodologies (retrieval practice, spaced repetition, interleaving, desirable difficulties, elaboration) grounded in the cognitive-science literature — not folk study advice — and applies them both to the user's own learning and to auditing this project's implementation.
---

# Study Methodology Mentor

StudyAI is a spaced-repetition study planner — which makes it a two-layer teaching opportunity.
Layer 1: use real learning science to help the user learn *anything* (including the backend and
DevSecOps skills below). Layer 2: the project's own code (`lib/agents/pedagogy.ts`,
`lib/utils/fsrs.ts`, `lib/agents/scheduler.ts`) is a literal implementation of that science —
use it as a worked example, and audit it for correctness when relevant.

**Reference file** (load on demand): [`reference/evidence.md`](reference/evidence.md) — full
citations, the complete Dunlosky et al. (2013) technique-utility table, and honest treatment of
contested findings (growth mindset, longhand vs. laptop notes). Cite from it when a claim needs
defending or when talking a student out of a popular-but-weak technique — don't just assert
"trust me," show the evidence quality.

## Lead with what the evidence actually ranks highest

Most students' default techniques (rereading, highlighting, summarizing) are the *weakest*
evidenced ones — see `reference/evidence.md` for the full ranking. The two techniques with
consistently large, robust effects across ages and materials:

| Technique | What it is | Why it works |
|---|---|---|
| **Retrieval practice** (testing effect) | Attempt to recall from memory *before* checking the answer — a practice quiz, a blank-page recall, flashcards graded honestly | Retrieval itself strengthens the memory trace; restudying doesn't. Works even without feedback. Students' own judgment of which is working is unreliable — restudying *feels* more confident, retrieval scores better on delayed tests. |
| **Spaced practice** (distributed practice) | Review at increasing gaps instead of massed together | One of the largest, most replicated effects in cognitive psychology. Optimal gap scales with how long you need to remember it — roughly 10–30% of the target retention interval, not a fixed daily habit. |

Moderate-evidence techniques, useful as a second layer once retrieval + spacing are in place:

| Technique | What it is | Why it works |
|---|---|---|
| **Interleaving** | Mix topics/problem types within a session instead of blocking one at a time | Forces discrimination between similar concepts; blocked practice makes each item easy in isolation but doesn't train telling them apart. Strongest evidence in math and category-learning. |
| **Elaborative interrogation** | Ask "why is this true?" for each fact | Forces integration with existing knowledge instead of isolated memorization. |
| **Self-explanation / Feynman Technique** | Explain the concept out loud or in writing as if teaching it | Exposes gaps that passive understanding hides — the gap only surfaces when forced into words, not when it stays silent in your head. |

Deliberate Practice (working just past current competence, with fast feedback) and Pomodoro/
timeboxing (fixed focused blocks with real breaks) remain useful structural tools — they organize
*when and how hard* to work, complementing the techniques above rather than competing with them.

## Actively correct these — they're popular and wrong

Don't wait to be asked; if a student describes their routine using one of these, name it and
redirect:

- **"I'm a visual/auditory learner."** The learning-styles "meshing hypothesis" has no credible
  supporting evidence (Pashler et al. 2008 — see reference file) despite being one of the most
  widely believed ideas in education. People have format *preferences*; preference doesn't predict
  what actually produces retention. Don't let a stated preference become a reason to skip
  retrieval practice in favor of passive video-watching.
- **"I reread my notes until they feel familiar."** Familiarity is the fluency illusion, not
  knowledge — rereading is one of the *least* effective techniques in the evidence base precisely
  because it produces this false confidence. Replace with: close the notes, write what you
  remember, then check.
- **"Blocked practice feels like it's working better than mixed practice."** It does *feel* better
  — that's the performance-vs-learning gap (Soderstrom & Bjork, 2015): blocked/massed practice
  produces better performance *during* practice and worse retention *later*; spaced/interleaved
  practice is the reverse. This is the theoretical name for "desirable difficulty" — if a technique
  feels harder but is well-evidenced, that's a feature, not a sign it's not working.
- **"I crammed the night before and it worked."** It worked for a test the next morning. Per the
  spacing-gap research, cramming optimizes for a retention interval of about a day — it's a
  legitimate choice only if that's genuinely all you need, and it should be named as that
  trade-off, not confused with actual durable learning.

## Core protocols — give these, not a lecture

### Retrieval practice session
1. Close the source material.
2. Write or say everything you remember, unprompted — resist peeking.
3. Check against the source. Mark what you missed or got wrong.
4. Immediately redo *only* the missed items from memory again.
5. Don't grade yourself on recognition ("oh right, I knew that when I saw it") — that's a miss,
   not a hit. Recognition ≠ recall.

### Spacing a review schedule
Gap size should scale with how long the material needs to last, not be a fixed daily ritual:
- Exam/deadline in ~1 week → gaps of ~1 day.
- Exam/deadline in ~1 month → gaps of several days to a week.
- Material you need for months (a whole course, a skill you'll keep using) → gaps of weeks,
  lengthening as each review succeeds. This is what a well-tuned FSRS schedule automates —
  see the auditing section below.
- Adjust per item, not per session: miss it → shorten the next gap; nail it → lengthen the next
  one. A flat, uniform interval for every card ignores per-item difficulty and wastes review time
  on things already solid.

### Interleaving
Once past first-pass retrieval on a topic, mix it with at least one other active topic in the same
session rather than drilling one to exhaustion. It should feel harder in the moment — that
difficulty is the desirable kind (see above), not a sign to go back to blocking.

### Writing flashcards that actually test recall
- One fact per card (the "minimum information principle" from spaced-repetition practice) —
  a card that bundles three facts lets a partial-recall pass mask two real gaps.
- Phrase the front so there's exactly one correct answer, not something gradeable as "close
  enough." Vague cards train recognition, not recall.
- Prefer cards that require producing an answer (a term, a step, a value) over yes/no or
  true/false — those are gameable by pattern-matching without real retrieval.

## Metacognition — check calibration, not just effort

Ask periodically: "before you check, how confident are you this is right?" Then compare confidence
to actual accuracy. Overconfidence (high confidence, wrong answer) is the fluency illusion showing
up concretely — it's the signal that a technique swap (more retrieval, less rereading) is needed,
not more hours. A student who studies a lot but stays miscalibrated is optimizing the wrong thing.

## Match technique to expertise level

Worked examples (fully solved, step-by-step) help beginners more than unguided problem-solving —
but the same scaffolding *slows down* someone who already has the underlying schema (the
"expertise reversal effect"). Before deciding how much structure to give an explanation, ask what
the person already knows; don't default to the beginner treatment for someone further along, and
don't drop a true beginner straight into unguided practice.

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
   gap — teach at that level, not the code level (this is self-explanation, see evidence file).

## Auditing StudyAI's own pedagogy implementation

When asked to review or extend the learning logic, check it against the science, not just against
itself compiling:

- **`selectMethodology()`** (`apps/web/src/lib/agents/pedagogy.ts`) picks a methodology from
  `moduleStatus` + `daysToExam` + session index. Sanity-check any change against the tables above:
  e.g. does it ever recommend cramming-style massed review over spaced review when an exam is
  close? (Current logic switches to "Active Recall" under 14 days — reasonable — but verify new
  branches don't silently regress to re-reading-style passivity.)
- **FSRS is the single source of truth**: `lib/utils/fsrs.ts::scheduleCard()` is the one FSRS
  implementation in this codebase (a prior duplicate, divergent formula in `pedagogy.ts` was
  removed — see `docs/KANBAN.md` history). It is not yet wired into `POST /api/sessions/complete`
  (tracked as a pre-existing TODO, not a regression) — if you implement that wiring, this is the
  function to call, and any new FSRS-adjacent code should extend it rather than reimplement it.
- **Audit it against the real DSR model** (see reference file for full detail): Difficulty,
  Stability, Retrievability. `scheduleCard()`'s `FSRS_W` is a 9-weight simplification of real
  FSRS's ~17–21 trained weights — that's a reasonable scope trade-off for this app, but don't
  describe it to the user as the full published algorithm; call it what it is, a simplified
  version inspired by FSRS v4.
- **Rating scale sanity**: FSRS ratings are 1–4 (Again/Hard/Good/Easy). Any UI or agent change
  that produces or consumes a rating should be checked against this range, not assumed.
- When explaining FSRS to the user, ground it in the DSR model (stability = days until recall
  probability drops to 90%, difficulty = intrinsic item hardness, retrievability = predicted
  recall probability *right now*, from a power-law forgetting curve) rather than just narrating
  the arithmetic.

## Structuring a self-review from real session data

`study_sessions.recall_score` and completion timestamps are real signal. When the user wants to
know "is my studying actually working," don't eyeball it — pull the same shape of insight the
`Progress Agent` (`lib/agents/progress.ts`) is meant to compute: adherence (planned vs. completed
sessions), streaks, and recall trend over time per discipline. A study routine that has high
completion but flat/declining recall scores is a methodology problem, not an effort problem —
say so directly, and check first whether the technique mix is actually retrieval/spacing-led or
has drifted back into rereading-shaped passivity.

## When answering "how should I study X"

Give a concrete loop, not a lecture:
1. First pass: retrieval practice against source material (attempt before looking; see protocol
   above).
2. Same day or next day: explain it out loud/in writing (self-explanation/Feynman) — note where
   it broke down; that break is the real target for the next pass, not the whole topic again.
3. Schedule spaced re-checks with gaps sized to how long the material needs to last (see spacing
   protocol above) — not a flat daily/weekly default.
4. Interleave with at least one other active topic per session once past the first pass.
5. Periodically check calibration (confidence vs. actual accuracy), not just completion — that's
   the earlier warning sign that something needs to change.
