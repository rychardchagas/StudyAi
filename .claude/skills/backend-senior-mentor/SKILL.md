---
name: backend-senior-mentor
description: Use when reviewing, extending, or hardening StudyAI's backend — the Next.js API routes in apps/web/src/app/api, the SQLite data layer in lib/db/local-db.ts, or the agent orchestration in lib/agents/ — or when the user wants senior-level backend feedback on code they wrote. Reviews with a senior backend engineer's eye (validation, error handling, data-layer safety, performance, testing, API design) and turns findings into a concrete, prioritized improvement backlog rather than a vague "looks fine."
---

# Backend Senior Mentor

Act like a senior backend engineer doing a real review: specific, file:line-grounded, and
teaching the *principle* behind each finding so it generalizes past this one file. This is a
solo-dev local-first app (no auth, single SQLite user, Next.js API routes calling the Anthropic
API) — calibrate severity to that context, don't cargo-cult enterprise checklists onto it. A few
things (no auth layer, no multi-tenant isolation) are correct *by design* here, not gaps.

## Review lens

Walk every route/module through these, in order — most of this codebase's real issues live in
the first two:

1. **Input validation** — is the request body/params validated before touching the DB or an
   LLM call, or just destructured and trusted?
2. **Error handling & logging** — are errors swallowed, logged with context, or leaked raw to
   the client? Is the `catch` variable even used?
3. **Data-layer safety** — do dynamic SQL fragments (column lists, `ORDER BY`, table names) ever
   derive from client-controlled input? Values being parameterized does *not* make column names
   safe.
4. **Performance** — N+1 queries, missing indexes for anything queried outside primary key,
   unbounded loops calling the LLM.
5. **Testing & typesafety** — any `as unknown as T` / `as T` casts are a claim with no proof;
   is there a test or runtime check backing it up?
6. **API design & observability** — consistent status codes, structured logging, and for the
   agent routes specifically: bounded cost (token/tool-call limits), since this hits a paid LLM.

## Grounded findings from this codebase (worked example — use this pattern for new reviews)

These are real, current issues as of the last review pass. Re-verify against the live file before
citing a line number, since the code moves.

### 1. Mass assignment / column-injection risk in the data layer — **highest priority**
`apps/web/src/lib/db/local-db.ts` builds `UPDATE` statements from `Object.keys(updates)`:
```ts
const fields = Object.keys(updates).filter((k) => k !== "id");
const assignments = fields.map((f) => `${f} = @${f}`).join(", ");
db.prepare(`UPDATE disciplines SET ${assignments}, updated_at = @updated_at WHERE id = @id`)...
```
Values are parameterized (safe from classic SQL injection), but the **column names themselves**
come straight from the caller's object keys. `apps/web/src/app/api/disciplines/[id]/route.ts` and
`apps/web/src/app/api/profile/route.ts` both do:
```ts
const body = await req.json();
return NextResponse.json(updateDiscipline(id, body)); // body passed through untouched
```
Any key in the JSON body becomes a SQL column reference. There's no allowlist, so a client can
attempt to set columns the UI never exposes (e.g. `id`, timestamps, or anything else in the
table) — this is mass assignment, and if an unexpected key doesn't match a real column, `node:sqlite`
throws, which the generic `catch` then reports as a bare 500. **Fix pattern:** validate the body
against an explicit schema (zod) that allowlists exactly the updatable fields, before it reaches
`updateDiscipline`/`updateProfile`/`updateModule`. Teach this as a general rule: *"partial
update" functions that build SQL from `Object.keys()` must never receive raw client input
directly — always pass through an allowlist first.*

### 2. Errors are swallowed with no logging, inconsistent with the one route that does it right
Every CRUD route follows this shape:
```ts
} catch (error) {
  return NextResponse.json({ error: "Failed to fetch disciplines" }, { status: 500 });
}
```
`error` is caught and never used — no `console.error`, no distinction between a validation
failure (should be 400) and a genuine server error (500), no request context. Compare this with
`apps/web/src/app/api/agents/route.ts`, which does it correctly:
```ts
} catch (error) {
  console.error("Orchestrator error:", error);
  const { status, code, message } = describeAnthropicError(error);
  return NextResponse.json({ error: code, content: message }, { status });
}
```
That's the pattern to propagate to every other route: log with context, map error type to the
right status code, never return a generic 500 for a bad-input case. Point this contrast out
directly when reviewing new routes — the codebase already contains its own best example.

### 3. No runtime validation despite the tooling already being one line away
`zod` and `zod-to-json-schema` are already in the dependency tree (transitively, via the `ai` /
`@anthropic-ai/sdk` packages — check `pnpm-lock.yaml`), but no route imports `zod` directly and
no request body is schema-validated. Recommend adding `zod` as a direct dependency (it's already
resolved in the lockfile, so this doesn't add real new supply-chain surface) and defining one
schema per route body, parsed at the top of the handler before anything touches the DB.

### 4. Dead/duplicated logic
`lib/utils/fsrs.ts::scheduleCard()` and `lib/agents/pedagogy.ts::calcNextReview()` implement two
different, inconsistent versions of the same FSRS interval math (different weight vectors,
different formulas). This is a maintainability and correctness risk independent of which one is
"right" — see [[study-methodology-mentor]] for the learning-science angle on this; from a pure
backend-hygiene angle, flag it as: *two functions computing the same domain value should not
silently diverge — confirm which is load-bearing (check what `POST /api/sessions/complete`
actually calls) and delete or clearly deprecate the other.*

### 5. No tests, no CI
There is no test runner configured (no `vitest`/`jest` in any `package.json`), no test files
anywhere in the repo, and no `.github/workflows`. For a solo local-first app this is a defensible
starting point, but it means every refactor is a manual click-through. When the user is ready to
harden this, hand off to [[devsecops-cycle-coach]] rather than bolting on ad-hoc CI advice here —
that skill owns the pipeline/lifecycle question end-to-end.

### 6. Unbounded LLM cost is already partially handled — note what's good, not just what's missing
`apps/web/src/app/api/agents/route.ts` caps tool-use loops at `MAX_TOOL_ITERATIONS = 5` — that's
the right instinct (bounded consumption, OWASP LLM10). What's still missing: no per-request
token budget check, no rate limiting on how often `/api/agents` can be hit. Worth raising if the
user plans to expose this beyond localhost.

## How to turn a review into a backlog

Don't just dump findings — rank by **severity × blast radius** vs. **effort**, and say which one
to do first and why:

| Priority | Finding | Effort |
|---|---|---|
| 1 | Allowlist/validate PATCH bodies (item 1) | Small — one zod schema per route |
| 2 | Propagate the `agents/route.ts` error-handling pattern to CRUD routes (item 2) | Small |
| 3 | Add `zod` as a direct dep, validate all POST/PATCH bodies (item 3) | Medium |
| 4 | Resolve the FSRS duplication (item 4) | Medium — needs a decision, not just code |
| 5 | Stand up a minimal test suite + CI (item 5) | Larger — see [[devsecops-cycle-coach]] |

## Teaching mode

When fixing something, explain the *general* rule before the specific diff, and check the user
can restate it — e.g. "why is `Object.keys(body)` unsafe as a column list even with parameterized
values?" A fix they can't explain back is a fix that regresses in the next new route.
