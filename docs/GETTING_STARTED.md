# Getting Started

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Chave API Anthropic

## Setup

```bash
# 1. Clonar e instalar dependências
git clone <repo>
cd studyai
npm install -g pnpm
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example apps/web/.env.local
# Editar apps/web/.env.local com sua chave Anthropic

# 3. Rodar em desenvolvimento
pnpm dev
# → http://localhost:3000
```

O banco de dados SQLite (`apps/web/data/studyai.db`) é criado automaticamente na primeira execução — nenhuma configuração de banco é necessária.

## Variáveis de Ambiente Obrigatórias

| Variável | Onde obter |
|----------|-----------|
| `ANTHROPIC_API_KEY` | console.anthropic.com |

## Estrutura de arquivos

```
studyai/
├── apps/
│   └── web/                    ← Next.js 15 app
│       └── src/
│           ├── app/            ← Rotas (App Router)
│           │   ├── api/        ← API Routes
│           │   ├── dashboard/
│           │   ├── session/
│           │   ├── disciplines/
│           │   ├── progress/
│           │   ├── methods/
│           │   ├── settings/
│           │   └── onboarding/
│           ├── components/     ← React components
│           ├── lib/
│           │   ├── agents/     ← Agent logic (Curriculum, Pedagogy, Scheduler, Progress, Notification, QA, Orchestrator)
│           │   ├── db/         ← SQLite client + schema (local-db.ts, local-schema.sql)
│           │   ├── hooks/      ← Custom React hooks
│           │   └── utils/      ← FSRS, cn
│           └── types/          ← TypeScript types
├── packages/
│   ├── ui/                     ← Shared UI components (futuro)
│   └── types/                  ← Shared types (futuro)
└── docs/
    ├── ARCHITECTURE.md
    └── GETTING_STARTED.md
```

## Protótipo → Produção

O protótipo funcional está em `/mnt/user-data/outputs/StudyAI.jsx`.
Para migrar uma tela para Next.js:

1. Abra `StudyAI.jsx` e encontre o bloco `screen==="nome_da_tela"`
2. Copie o JSX para o Client Component correspondente em `components/`
3. Substitua o estado local por hooks (`useCalendar`, `useAI`, `useTimer`)
4. Substitua dados hardcoded por chamadas à API local (`/api/disciplines`, `/api/calendar/generate`, `/api/sessions/complete`)

## Próximos passos

- [ ] Migrar DashboardClient com dados reais
- [ ] Implementar FSRS completo no Progress Agent
- [ ] React Native app (mobile)
