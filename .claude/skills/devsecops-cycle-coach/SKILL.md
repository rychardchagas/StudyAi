---
name: devsecops-cycle-coach
description: Use when the user wants to learn or build DevSecOps practices for StudyAI — CI/CD pipelines, dependency/secret scanning, SAST/DAST, security gates, branch protection, or how to manage a full DevSecOps lifecycle from a repo that currently has none of it. This is separate from backend-senior-mentor (which reviews code correctness) — this skill teaches the *process* of shipping code securely, stage by stage, so the user can run the cycle themselves next time, not just receive a finished pipeline.
---

# DevSecOps Cycle Coach

Goal: teach the user to **manage** a DevSecOps cycle, not hand them a finished `.github/workflows`
folder and walk away. Every stage below should end with the user understanding *why* the gate
exists and what it would have caught, before you write the config for it. Where relevant, check
findings from [[backend-senior-mentor]] first — several of that skill's findings (unvalidated
input, swallowed errors) are exactly the class of bug a SAST/test gate is meant to catch
automatically, which is a good concrete hook for teaching *why* the gate matters.

## Where this repo actually is right now

Ground every recommendation in the real state, not a generic checklist:

- Git repo (`studyai/`) with real commit history, no `.github/` directory at all — **zero CI**.
- `pnpm` + Turborepo monorepo (`turbo.json`, `pnpm-workspace.yaml`) — `pnpm lint`, `pnpm build`,
  `pnpm type-check` already exist as scripts and already work locally; they're just never run
  automatically.
- No test runner configured anywhere — a CI gate can't run tests that don't exist yet, so "add
  CI" and "add tests" are two separate, sequenced conversations, not one PR.
- Secrets: `ANTHROPIC_API_KEY` lives in `apps/web/.env.local`, correctly gitignored
  (`.env`, `.env.local`, `.env*.local` are all in `.gitignore`). Good baseline hygiene already in
  place — say so explicitly, don't just hunt for problems. What's missing is a *safety net* for
  the day someone pastes a key into a commit anyway (secret scanning), not a fix to what exists.
- No Dockerfile, no deployment config visible — deployment target is presumably still manual/local.
- `.claude/` is gitignored at the project root, so anything under it (these skills included)
  is local-only and won't show up in `git status`/PR diffs — worth knowing so it doesn't cause
  confusion later.

## The cycle, and how to teach each stage

The DevSecOps loop is Plan → Code → Build → Test → Release → Deploy → Operate → Monitor, with
security integrated at every stage ("shift left") rather than bolted on at the end. Don't dump
all eight stages on the user at once — introduce a stage when it's next in the maturity ladder
below, and connect it back to this diagram so they see where they are.

## Maturity ladder — build it in this order, not all at once

Each stage should be a distinct session/PR. Before moving to the next stage, confirm the user can
explain what the current stage's gate catches and why it's ordered where it is.

### Stage 0 — Baseline hygiene (mostly already done here)
- `.gitignore` covers secrets/build artifacts — ✅ already true, verify it stays true as new env
  vars get added.
- Confirm no secret has ever been committed: `git log -p -- apps/web/.env.local` should be empty;
  if the user is unsure, a full-history secret scan (Stage 2 tooling, run once manually) is the
  way to check, not `git log` by itself.

### Stage 1 — Continuous Integration (lint, type-check, build on every push)
The lowest-cost, highest-value first step, because the scripts already exist. Teach: CI's job at
this stage isn't security yet, it's a *consistency gate* — every PR gets the same checks the
author may have skipped locally.
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm type-check
      - run: pnpm build
```
`--frozen-lockfile` matters here: it fails the build if `pnpm-lock.yaml` is out of sync with
`package.json`, which is itself a supply-chain guard (nobody can silently widen a dependency
range without the lockfile update being visible in the diff).

### Stage 2 — Shift-left security scanning (no tests required yet)
This is where "DevSecOps" starts meaning something beyond "DevOps." Three scanners, each catching
a different class of problem — teach the distinction, don't bundle them as one blob:
- **Dependency scanning** (Dependabot or `pnpm audit` in CI): catches known-vulnerable versions
  of things like `next`, `@anthropic-ai/sdk`. Ties directly to OWASP A03 (Software Supply Chain
  Failures) — see the `owasp-security` skill for the full standard.
- **Secret scanning** (GitHub's built-in secret scanning, or `gitleaks` in CI): catches an
  `ANTHROPIC_API_KEY` accidentally committed despite `.gitignore` — e.g. pasted into a test file
  or a `.env` committed before the ignore rule existed on an old branch.
- **SAST** (CodeQL, or `eslint-plugin-security` as a lighter first step): catches the *pattern*
  behind findings like the mass-assignment issue in [[backend-senior-mentor]] — a SAST rule for
  "dynamic property access flowing into a template string" is exactly the kind of thing a human
  reviewer misses on a Friday and a scanner doesn't.
```yaml
  # add as a job in ci.yml, or a separate workflow
  - uses: github/codeql-action/init@v3
    with: { languages: javascript-typescript }
  - uses: github/codeql-action/analyze@v3
```
Enable Dependabot via `.github/dependabot.yml` (weekly, npm ecosystem, `apps/web` + root).

### Stage 3 — Test gates
Only introduce once there's at least a minimal test suite (coordinate with
[[backend-senior-mentor]] — the mass-assignment fix there is a natural first test: "PATCH with an
unexpected key should not touch that column"). Add `vitest`, wire `pnpm test` into CI, and make
it a required check before merge (branch protection rule on `main`). Teach: a test gate only has
value once branch protection actually blocks merge on failure — an optional CI check that's green
50% of the time trains people to ignore it.

### Stage 4 — Release & deploy automation
Once there's a real deploy target (Vercel is the natural fit for this Next.js app), automate
deploy-on-merge-to-main, and if a Dockerfile/IaC ever gets added, scan it (`hadolint` for
Dockerfiles, `checkov`/`tfsec` for any IaC) before it ships. Not urgent for this project's current
"local single-user app" shape — flag as future work rather than building it prematurely.

### Stage 5 — Operate & monitor
Once deployed anywhere beyond localhost: structured logging (the `console.error` gap noted in
[[backend-senior-mentor]] needs fixing before this stage is worth much), error tracking (Sentry or
similar), and for the LLM-calling routes specifically, cost/usage monitoring on the Anthropic API
key — tie back to the OWASP LLM10 (Unbounded Consumption) mitigation already partially in place
via `MAX_TOOL_ITERATIONS`.

## How to run a coaching session (not just a build session)

1. Ask where the user thinks they are on the ladder before telling them — often they've done more
   (Stage 0) or less than they assume.
2. Introduce exactly one stage. Explain what class of failure it catches, using a concrete example
   from this repo where possible (real findings above beat hypothetical ones).
3. Have the user predict what the gate will do before you add it (e.g. "what do you think happens
   if `pnpm lint` fails on an open PR right now?").
4. Build it together, run it, watch it actually catch or pass something real.
5. Only then move to the next stage. Resist bundling stages 1+2+3 into one PR even though it's
   faster — the point is the user can explain and reproduce each gate independently afterward.
