# StudyAI — Arquitetura

## Stack

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| Frontend Web | Next.js 15 + React 18 | Interface principal |
| Frontend Mobile | React Native (futuro) | App mobile |
| Backend | Next.js API Routes | API REST + Server Actions |
| LLM | Claude Sonnet 4.6 | Orchestrator + Agents |
| Database | SQLite local (better-sqlite3) | Dados persistentes, single-user, sem servidor |
| Auth | Nenhuma — app local, usuário único | Sem login/gate |

## Agentes

```
User Input
    ↓
Orchestrator (Claude Sonnet 4.6)
    ├── Curriculum Agent   → Parseia ementas, organiza módulos
    ├── Pedagogy Agent     → FSRS + interleaving + metodologia
    ├── Scheduler Agent    → Distribui sessões nos slots disponíveis
    ├── Progress Agent     → Aderência, streaks, insights
    ├── Notification Agent → Lembretes e relatórios locais (in-app)
    └── QA Agent           → Valida calendário antes de entregar
```

Todos os agentes vivem em `apps/web/src/lib/agents/`. Curriculum e Orchestrator chamam a API da Anthropic; Pedagogy, Scheduler, Progress, Notification e QA são lógica determinística local (sem custo de API).

## Fluxo de geração de calendário

1. Usuário clica "Replanejar" → `/api/calendar/generate`
2. Curriculum Agent verifica módulos e status FSRS
3. Pedagogy Agent define metodologia por módulo
4. Scheduler Agent distribui sessões nos slots disponíveis
5. QA Agent valida (sem conflitos, carga balanceada) e retorna `issues` se houver
6. Calendário renderizado no cliente

## Schema SQLite

Ver: `apps/web/src/lib/db/local-schema.sql`. O banco vive em `apps/web/data/studyai.db`, criado automaticamente na primeira execução — não requer conta nem configuração externa.

## Protótipo de referência

O protótipo funcional completo está em: `apps/web/src/app/prototype/`
Todas as telas, interações e lógica de negócio estão implementadas lá.
O processo de migração é: extrair cada tela do protótipo → criar Client Component correspondente.
