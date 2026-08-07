# Getting Started

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- [Ollama](https://ollama.com) rodando localmente (padrão, grátis) — ou qualquer provedor
  compatível com a API da OpenAI

## Setup

```bash
# 1. Baixar um modelo com suporte a tool-calling (uma vez só)
ollama pull qwen2.5:7b

# 2. Clonar e instalar dependências
git clone <repo>
cd studyai
npm install -g pnpm
pnpm install

# 3. Configurar variáveis de ambiente (opcional — os defaults já apontam pro Ollama local)
cp .env.example apps/web/.env.local

# 4. Rodar em desenvolvimento
pnpm dev
# → http://localhost:3000
```

O banco de dados SQLite (`apps/web/data/studyai.db`) é criado automaticamente na primeira execução — nenhuma configuração de banco é necessária.

## Variáveis de Ambiente (opcionais — têm default apontando pro Ollama local)

| Variável | Default | Pra que serve |
|----------|---------|----------------|
| `LLM_BASE_URL` | `http://localhost:11434/v1` | Endpoint compatível com a API da OpenAI (Ollama, Groq, OpenRouter, LM Studio...) |
| `LLM_API_KEY` | `ollama` | Ollama ignora o valor; provedores em nuvem exigem uma chave real |
| `LLM_MODEL` | `qwen2.5:7b` | Nome do modelo a usar |

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
