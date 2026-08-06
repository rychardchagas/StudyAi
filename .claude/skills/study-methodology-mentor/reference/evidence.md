# Evidence base — learning science

This is the citation-level backing for `SKILL.md`. Load it when the user wants the "why" in
depth, when a claim needs defending, or when a popular-but-weak technique needs to be talked down
without just asserting "trust me." Keep the tone in the main skill practical; keep the epistemic
honesty here — where the evidence is mixed or contested, say so instead of overclaiming.

## The core ranking: Dunlosky et al. (2013)

**Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham, D. T. (2013). Improving
Students' Learning With Effective Learning Techniques: Promising Directions From Cognitive and
Educational Psychology. *Psychological Science in the Public Interest*, 14(1), 4–58.**

This is the single most load-bearing reference for study advice: a systematic review of 10 common
learning techniques, rated by effect size, generalizability across learners/materials/tasks, and
real-classroom feasibility.

| Utility | Technique | Verdict |
|---|---|---|
| **High** | Practice testing (retrieval practice) | Large, robust effects across ages, materials, and delay intervals. Works even without feedback; works better with it. |
| **High** | Distributed practice (spacing) | Large, robust effects; one of the most replicated findings in all of cognitive psychology. |
| **Moderate** | Elaborative interrogation | Asking "why is this true?" for a fact — works well for factual material with some existing background knowledge, less studied for complex material. |
| **Moderate** | Self-explanation | Explaining your own reasoning/steps while learning — strong for problem-solving domains, less evidence for other material types. |
| **Moderate** | Interleaved practice | Strong evidence in math and category-learning tasks specifically; generalizability to other domains still being established (was "insufficient evidence" in 2013, since strengthened — see Rohrer below). |
| **Low** | Summarization | Helps only if the student is already good at identifying important content — most students aren't, and untrained summarization shows weak effects. |
| **Low** | Highlighting/underlining | Essentially no benefit over just reading; can *hurt* by drawing attention to isolated facts at the expense of connecting ideas. |
| **Low** | Keyword mnemonic | Effects fade quickly, doesn't generalize past specific paired-associate tasks (e.g. vocabulary). |
| **Low** | Imagery for text | Weak/inconsistent effects outside of concrete, image-friendly material. |
| **Low** | Rereading | The most popular strategy among students in self-report surveys — and one of the least effective. Produces fluency (it *feels* like it's working) without durable retention. |

The practical takeaway the skill should lead with: **the two techniques with the strongest
evidence (retrieval practice, spacing) are not what most students spontaneously choose.** Students
default to rereading and highlighting because those feel productive in the moment — this is the
fluency illusion, not a knowledge gap about what to do.

## Retrieval practice (the testing effect)

- **Roediger, H. L., & Karpicke, J. D. (2006). Test-Enhanced Learning: Taking Memory Tests
  Improves Long-Term Retention. *Psychological Science*, 17(3), 249–255.** Repeated testing beat
  repeated studying on a 1-week delayed test, even though during the initial learning phase the
  restudy group *felt* more confident and predicted they'd do better. The metacognitive judgment
  was wrong in exactly the direction that keeps students rereading.
- **Karpicke, J. D., & Roediger, H. L. (2008). The Critical Importance of Retrieval for Learning.
  *Science*, 319(5865), 966–968.** Repeated *retrieval* (not repeated study) drives long-term
  retention; once an item can be recalled, continued studying adds little, but continued retrieval
  (spaced) keeps paying off. This is the theoretical basis for FSRS-style systems dropping items
  from the queue once they're "learned" and re-testing instead of re-showing.
- Practical implication for flashcards: a card the learner recognizes-but-doesn't-recall (i.e.
  they see the answer and think "oh right, I knew that") is a false positive — it should be
  graded as a miss, not a hit. Recognition ≠ recall.

## Spacing effect

- **Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed Practice
  in Verbal Recall Tasks: A Review and Quantitative Synthesis. *Psychological Bulletin*, 132(3),
  354–380.** Meta-analysis of 254 studies; spacing effect is one of the largest and most reliable
  effects in the learning literature, though effect size varies with retention interval and gap.
- **Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing Effects in
  Learning: A Temporal Ridgeline of Optimal Retention. *Psychological Science*, 19(11),
  1095–1102.** Key finding: the *optimal* gap between reviews scales with how long you need to
  remember the material — roughly **10–30% of the desired retention interval**. Remembering
  something for a final exam 6 months away calls for gaps of weeks, not days; cramming the day
  before with 1-hour gaps is close to useless for that time horizon even though it feels
  effective the next morning. This is the parameter FSRS is trying to fit per-user/per-card.

## Interleaving

- **Rohrer, D., & Taylor, K. (2007). The Shuffling of Mathematics Problems Improves Learning.
  *Instructional Science*, 35(6), 481–498.**
- **Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). Interleaved Practice Improves Mathematics
  Test Scores. *Journal of Educational Psychology*, 107(3), 900–908.** Randomized classroom
  experiment, not just a lab study — interleaved homework outperformed blocked homework on a
  later unannounced test, with a large effect size.
- **Kornell, N., & Bjork, R. A. (2008). Learning Concepts and Categories: Is Spacing the "Enemy
  of Induction"? *Psychological Science*, 19(6), 585–592.** Interleaving specifically helps when
  the task requires *discriminating* between similar categories (e.g., distinguishing painting
  styles, or — by analogy — distinguishing when to use one design pattern vs. another). Blocked
  practice makes each item easy in isolation but doesn't train the discrimination itself.

## Desirable difficulties — the unifying theory

- **Bjork, R. A., & Bjork, E. L. (2011). Making Things Hard on Yourself, But in a Good Way:
  Creating Desirable Difficulties to Enhance Learning.** The umbrella framework: conditions that
  slow down or degrade *performance* during acquisition (spacing, interleaving, testing, varied
  practice conditions) often *improve* long-term learning and transfer, precisely because they
  prevent the fluency illusion that blocked/massed practice produces.
- **Soderstrom, N. C., & Bjork, R. A. (2015). Learning versus Performance: An Integrative Review.
  *Perspectives on Psychological Science*, 10(2), 176–199.** Explicitly separates *performance*
  (how well you do right now, during practice) from *learning* (durable, transferable change) —
  they can move in opposite directions. This is the single best answer to "but blocked practice
  feels like it's working better."

## Elaboration and generation

- **Slamecka, N. J., & Graf, P. (1978). The Generation Effect: Delineation of a Phenomenon.
  *Journal of Experimental Psychology: Human Learning and Memory*, 4(6), 592–604.**
  Self-generated information is retained better than passively read information, even when the
  content is identical.
- **Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989). Self-Explanations:
  How Students Study and Use Examples in Learning to Solve Problems. *Cognitive Science*, 13(2),
  145–182.** Students who spontaneously explained worked examples to themselves learned more and
  solved more problems correctly — the Feynman Technique's empirical grounding.

## Cognitive load and worked examples

- **Sweller, J. (1988). Cognitive Load During Problem Solving: Effects on Learning. *Cognitive
  Science*, 12(2), 257–285.** Working memory is severely limited; instruction that spends it on
  irrelevant (extraneous) load leaves less for actually learning (germane load).
- **Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). The Expertise Reversal Effect.
  *Educational Psychologist*, 38(1), 23–31.** Worked examples help novices but the same worked
  examples can *slow down* learners who already have the schema — for them, problem-solving
  practice is more valuable. Practical read: don't hand a senior dev the same scaffolded
  explanation you'd give a beginner; ask what they already know first.

## Myths worth actively correcting

- **Learning styles ("I'm a visual learner"): Pashler, H., McDaniel, M., Rohrer, D., & Bjork, R.
  (2008). Learning Styles: Concepts and Evidence. *Psychological Science in the Public Interest*,
  9(3), 105–119.** Reviewed the literature for evidence of the "meshing hypothesis" — that
  matching instruction format to a student's preferred style improves outcomes — and found
  essentially none that meets a reasonable evidentiary bar (a proper study needs to show style-A
  learners do *better* with style-A instruction AND *worse* with style-B, cross-referenced against
  style-B learners; almost no studies use this design, and the ones that do mostly fail to find
  the effect). People do have preferences; the preferences just don't predict what actually
  produces learning. Don't validate "I learn better by watching videos" as a reason to skip
  retrieval practice — preference and effectiveness are different axes.
- **Multitasking while studying**: task-switching has a well-established cost (see the broader
  cognitive psychology literature on task switching, e.g. Monsell, 2003, *Trends in Cognitive
  Sciences*) — treat "I study better with the TV on" as a comfort claim, not an effectiveness one.

## Contested / mixed findings — represent honestly, don't oversell

- **Longhand vs. laptop note-taking**: Mueller, P. A., & Oppenheimer, D. M. (2014). The Pen Is
  Mightier Than the Keyboard. *Psychological Science*, 25(6), 1159–1168. Found longhand notes
  produced better conceptual understanding, attributed to laptop users transcribing verbatim
  (shallow processing) vs. longhand forcing summarization (generative processing). **However**:
  a larger registered replication — Morehead, K., Dunlosky, J., & Rawson, K. A. (2019). How Much
  Mightier Is the Pen Than the Keyboard for Note-Taking? A Replication and Extension of Mueller
  and Oppenheimer (2014). *Educational Psychology Review*, 31(3), 753–780 — found smaller and
  less consistent effects. Current best summary: the *mechanism* (verbatim transcription = shallow
  processing) is plausible and worth avoiding regardless of medium, but "always use pen and paper"
  is an overclaim from the original single study.
- **Growth mindset**: Dweck's original claims were popularized far beyond what later large-scale
  work supports. **Yeager, D. S., et al. (2019). A National Experiment Reveals Where a Growth
  Mindset Improves Achievement. *Nature*, 573(7774), 364–369** — a large, pre-registered,
  nationally representative study — found a real but modest effect, concentrated among
  lower-achieving students and in schools with a supportive peer climate, not the sweeping
  "believe you can improve and grades go up" story often repeated. Frame it narrowly: how a
  student interprets a setback (as informative vs. as proof of a fixed limit) affects whether they
  keep using effective techniques after a bad result — that's the actionable part, not a general
  motivational cure-all.

## FSRS — what it actually models

FSRS (Free Spaced Repetition Scheduler), created by Jarrett Ye, is the algorithm that replaced
SM-2 as Anki's default scheduler (Anki 23.10+). It models three variables per card — the **DSR
model**:

- **Difficulty (D)**: intrinsic hardness of the item, roughly stable per card.
- **Stability (S)**: how many days it takes for recall probability to drop to 90% — effectively
  the memory's current half-life-like measure.
- **Retrievability (R)**: predicted probability of successful recall *right now*, computed from
  stability and elapsed time via a power-law forgetting curve (not the classic Ebbinghaus
  exponential curve — FSRS's power-law fit matches empirical forgetting data better).

Unlike SM-2's fixed per-user "ease factor," FSRS fits ~17–21 weights via gradient descent against
a user's actual review history, so scheduling adapts to the individual and even to material type.
Versions iterate (FSRS-4.5, FSRS-5, FSRS-6) mainly on the forgetting-curve shape and added
parameters (e.g. modeling same-day reviews, or short-term vs. long-term memory separately) — cite
the version if precision matters, but the DSR framing is stable across versions and is the right
level to explain to a user, and the right level to audit a simplified reimplementation against
(see `SKILL.md`'s auditing section).
