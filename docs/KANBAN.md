# Kanban — Hardening & DevSecOps

Board compartilhado entre terminais/sessões do Claude Code trabalhando neste projeto. Como é um
arquivo versionado (não `TodoWrite`, que só existe dentro de uma sessão), qualquer terminal pode
ler o estado atual e continuar de onde outro parou.

## Como usar (multi-terminal)

1. **Antes de começar** algo, abra este arquivo e confira se o card já não está em "Em Andamento"
   por outro terminal.
2. **Ao pegar um card**: mova para "Em Andamento", adicione `— 🔵 <apelido do terminal/sessão>`
   na frente do título (ex: `— 🔵 terminal-A`) para sinalizar posse.
3. **Ao terminar**: mova para "Concluído", troque o marcador `🔵` por `✅` e referencie o commit/PR.
4. Se um card estiver "Em Andamento" e você não sabe se ainda está sendo trabalhado, confira
   `git log` antes de tomar posse — evita duas sessões pisando no mesmo arquivo.
5. Cada card já tem contexto suficiente (arquivos, o que fazer, por quê) para ser pego por uma
   sessão nova sem precisar reler a conversa original — se faltar contexto, complete o card antes
   de movê-lo, não deixe implícito.

Origem dos cards: achados da skill `backend-senior-mentor` (revisão de backend) e da skill
`devsecops-cycle-coach` (escada de maturidade DevSecOps) — ver `.claude/skills/`.

---

## 📋 Backlog

### Backend Hardening

_(todo o bloco em andamento — ver seção "Em Andamento" abaixo)_

### DevSecOps — escada de maturidade

- [x] **Stage 2a — Dependabot** — ✅ commit `d673992`
  `.github/dependabot.yml` criado (ecossistema npm/pnpm + github-actions, weekly).
- [ ] **Stage 2b — Secret scanning + push protection**
  Nativo do GitHub, só habilitar em Settings → Code security and analysis (repo é público, é
  grátis). Requer permissão de admin do repo — não dá pra fazer via API com o token atual (403).
- [ ] **Stage 2c — SAST (CodeQL)**
  `javascript-typescript` como job de CI ou workflow separado.

- [ ] **Stage 3 — Gate de testes obrigatório**
  Depende da suite mínima acima. Adicionar `pnpm test` ao CI e marcar como *required check* em
  branch protection na `main`.

- [ ] **Stage 4 — Deploy automatizado** (não urgente — app ainda local/single-user)
  Avaliar Vercel quando houver alvo de deploy real.

- [ ] **Stage 5 — Observabilidade** (não urgente)
  Logging estruturado (depende do item de error handling acima) + monitoramento de custo da API
  Anthropic.

---

## 🔵 Em Andamento

- [ ] **Bloco Backend Hardening completo (itens 1-5)** — 🔵 este terminal
  1. Allowlist/validação zod nas rotas PATCH (mass assignment) em `local-db.ts` +
     `disciplines/[id]`, `profile`, `modules/[id]`.
  2. Propagar error handling (log + status correto) pra todas as rotas CRUD.
  3. `zod` como dependência direta de `apps/web`, um schema por rota de POST/PATCH.
  4. Resolver duplicidade do cálculo FSRS (`fsrs.ts` vs `pedagogy.ts::calcNextReview`).
  5. Suite de testes mínima com `vitest`, cobrindo o caso de mass assignment.

---

## ✅ Concluído

- [x] **Setup do repositório GitHub** — `rychardchagas/StudyAi` criado, histórico local publicado
  em `main`, descrição aplicada.
- [x] **Autenticação `gh` com token restrito** — fine-grained PAT escopado só a este repositório
  (`Contents`, `Pull requests`, `Issues`), configurado via `GH_TOKEN` de usuário.
- [x] **Skills de aprendizado criadas** — `study-methodology-mentor`, `backend-senior-mentor`,
  `devsecops-cycle-coach` em `.claude/skills/`.
- [x] **Skill de UI/UX criada** — `ui-ux-design-mentor` em `.claude/skills/`, commit `d673992`.
- [x] **Stage 0 — Baseline hygiene** — confirmado: `.gitignore` cobre segredos, `.env.local` nunca
  foi commitado (checado com `git log --all --full-history`).
- [x] **Stage 1 — CI básico** — `.github/workflows/ci.yml` (lint + type-check + build), commits
  `ed73139`..`cf792ef`. No processo, achados e corrigidos 5 bugs reais pré-existentes: Node <22.13
  incompatível com pnpm 11, `packageManager` faltando no `package.json` raiz (quebrava resolução do
  workspace do Turborepo mesmo local), ESLint sem config (`next lint` travava interativo),
  `RECALL_QS` duplicado no protótipo morto (excluído do lint), conflito de versão pnpm entre
  Action e `package.json` (resolvido deixando só uma fonte de verdade).
