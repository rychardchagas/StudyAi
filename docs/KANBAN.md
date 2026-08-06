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

- [ ] **Allowlist/validar bodies do PATCH (mass assignment)** — prioridade 1
  Arquivos: `apps/web/src/lib/db/local-db.ts` (`updateDiscipline`, `updateProfile`, `updateModule`),
  `apps/web/src/app/api/disciplines/[id]/route.ts`, `apps/web/src/app/api/profile/route.ts`.
  Hoje o body do request é repassado direto para funções que montam `SET campo = @campo` a partir
  de `Object.keys()` — qualquer chave do JSON vira coluna SQL. Adicionar schema explícito
  (allowlist) antes de chamar essas funções.

- [ ] **Propagar o padrão de error handling de `agents/route.ts` pras rotas CRUD** — prioridade 2
  Arquivos: todas as rotas em `apps/web/src/app/api/**/route.ts` exceto `agents/route.ts` (que já
  faz certo). Trocar `catch (error) { ... }` genérico sem log por `console.error` com contexto +
  status code correto (400 vs 500).

- [ ] **Adicionar `zod` como dependência direta + validar bodies de POST/PATCH** — prioridade 3
  `zod` já está resolvido no `pnpm-lock.yaml` (transitivo via `ai`/`@anthropic-ai/sdk`). Promover
  a dependência direta em `apps/web/package.json` e criar um schema por rota.

- [ ] **Resolver duplicidade do cálculo FSRS** — prioridade 4
  `apps/web/src/lib/utils/fsrs.ts::scheduleCard()` vs.
  `apps/web/src/lib/agents/pedagogy.ts::calcNextReview()` — pesos e fórmulas diferentes para o
  mesmo cálculo. Decidir qual é a fonte da verdade (checar o que `POST /api/sessions/complete`
  realmente usa) e remover/depreciar a outra.

- [ ] **Suite de testes mínima** — prioridade 5
  Nenhum test runner configurado. Adicionar `vitest`, começar pelo caso de mass assignment acima
  ("PATCH com chave inesperada não deve alterar aquela coluna"). Pré-requisito pro gate de CI da
  seção DevSecOps abaixo.

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

_(nenhum card em andamento no momento)_

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
