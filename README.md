![StudyAI](docs/screenshots/banner.svg)

# StudyAI

**Calendário de estudos inteligente** — cadastre suas matérias e disponibilidade, e um time de
agentes de IA monta seu cronograma semanal aplicando ciência do aprendizado (repetição
espaçada, interleaving, active recall). App local, single-user, sem login, e a IA roda localmente
via Ollama por padrão (grátis e privado — nenhum dado sai da sua máquina).

![CI](https://github.com/rychardchagas/StudyAi/actions/workflows/ci.yml/badge.svg)
![CodeQL](https://github.com/rychardchagas/StudyAi/actions/workflows/codeql.yml/badge.svg)

## Índice

- [O que é](#o-que-é)
- [Funcionalidades](#funcionalidades)
- [Stack](#stack)
- [Começando](#começando)
- [Guia de uso](#guia-de-uso)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Scripts](#scripts)
- [Status do projeto](#status-do-projeto)

## O que é

StudyAI é um app web **local-first**: roda na sua máquina, guarda os dados num SQLite local
(`apps/web/data/studyai.db`, criado automaticamente) e não tem tela de login — é feito para um
usuário só. O núcleo do produto é um conjunto de **agentes de IA** que, a partir das suas
matérias, conteúdo e horários livres, geram e ajustam automaticamente seu calendário de estudos,
aplicando de forma prática:

- **Repetição espaçada (FSRS)** — revisar cada tópico pouco antes de esquecê-lo.
- **Interleaving** — alternar entre matérias na mesma sessão em vez de maratonar uma só.
- **Active recall** — testar a memória ativamente, não só reler o conteúdo.

Todos os agentes vivem em `apps/web/src/lib/agents/`. Só o **Curriculum Agent** e o
**Orchestrator** chamam um LLM (via `lib/agents/llm-client.ts`, compatível com a API da OpenAI —
Ollama local por padrão, ou qualquer provedor compatível: Groq, OpenRouter, LM Studio...);
Pedagogy, Scheduler, Progress, Notification e QA são lógica determinística local, sem depender de
IA. Detalhes completos da arquitetura e do fluxo de geração de calendário:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Funcionalidades

### 📅 Calendário / Dashboard
Grade semanal com as sessões já distribuídas pelos agentes. Clique num evento para ver detalhes,
ou em **⚡ Replanejar** para os agentes recalcularem o cronograma. Cartões de estatística no topo
(sessões da semana, horas planejadas, % de aderência, revisões pendentes) — com tooltip explicando
como cada número é calculado — e um assistente de IA lateral para conversar sobre o próprio plano.
O sino no topo é um centro de notificações real (não decorativo): mostra revisões espaçadas
realmente vencidas e provas nos próximos 7 dias, direto do que o app já sabe — sem infraestrutura
de notificação nova por trás.

![Dashboard](docs/screenshots/dashboard.png)

### 📚 Matérias
Cadastro e gestão das disciplinas: nome (editável clicando em cima), horas semanais, progresso,
módulos com status (pendente/em progresso/concluído) e estimativa de conclusão calculada pelo
FSRS. Organize matérias em **grupos** (ex: "Faculdade", "Projeto pessoal") quando quiser separar
contextos. Cada matéria pode ter **múltiplas provas/avaliações** cadastradas (nome, data, peso
opcional) em vez de uma única data — o app sempre usa a mais próxima pra calcular urgência e
prioridade, com a data antiga (`exam_date`) preservada como fallback pra matérias já existentes.
Alterne entre visão **Lista** (cards completos) e **Kanban** (módulos em 3 colunas — Pendente/Em
curso/Feito — com drag-and-drop tanto pra mudar status quanto pra reordenar dentro da coluna).

![Matérias](docs/screenshots/disciplines.png)

### ⏱️ Sessão de estudo
Execução guiada de uma sessão: timer com modo foco (tela cheia) — ou o **modo Pomodoro**, com
duração de foco/pausa configurável (ver seção Pomodoro abaixo) — checklist de tarefas e exercício
de active recall com perguntas geradas pela IA a partir do conteúdo real do módulo (quando os
tópicos foram cadastrados) e correção em 3 níveis avaliada pelo LLM: **Correto** / **OK**
(entendimento parcial, mas faltou algo) / **Incorreto**. Se você não terminar, pode marcar
**"Não terminei — retomar depois"**: a sessão conta pra streak/aderência mas não gera uma nota de
recall falsa, e o módulo continua priorizado nas próximas sessões até ser concluído de fato. Uma
barra de sessão ativa fica visível em qualquer tela do app enquanto há uma sessão em andamento,
com atalhos pra continuar ou concluir sem precisar reabrir a tela cheia.

![Sessão](docs/screenshots/session.png)

### 🍅 Pomodoro
Timer de foco independente de qualquer matéria — pode ser usado dentro de uma sessão de estudo ou
sozinho, pra qualquer bloco de foco. Durações de foco/pausa curta/pausa longa e o intervalo de
ciclos até a pausa longa são configuráveis (mesmo modelo do pomofocus.io), com auto-início
opcional da próxima fase. Música de fundo embutida — um ambiente lofi gerado localmente via Web
Audio API (sem arquivo de áudio, sem streaming) por padrão, ou uma playlist do Spotify sua se
preferir. Aba própria com histórico (hoje/semana/geral) e streak de dias com pelo menos um ciclo
completo, separado do streak de sessões de estudo.

![Pomodoro](docs/screenshots/pomodoro.png)

### 📈 Progresso
Streak de dias consecutivos, horas estudadas, % de aderência ao plano, mapa de atividade (estilo
GitHub, 12 semanas), sessões por matéria e insights gerados automaticamente pelo Progress Agent
sobre seus padrões de estudo. Um cartão de **nível e XP** no topo (ganho por sessão concluída,
revisão espaçada feita e dia de streak) dá uma camada de progressão de longo prazo por cima das
métricas — puramente local, sem envio de dado nenhum.

![Progresso](docs/screenshots/progress.png)

### 🎓 Metodologias
Vitrine de referência com 8 técnicas de estudo baseadas em evidência — Repetição Espaçada, Active
Recall, Interleaving, Técnica de Feynman, Pomodoro, Prática Deliberada, Mapas Mentais e
Aprendizagem por Problemas — cada uma com eficácia, quando usar, passo a passo e a base científica.

![Metodologias](docs/screenshots/methods.png)

### ⚙️ Configurações
Perfil (nome/bio usados como contexto pela IA), notificações, horários de disponibilidade
(a mesma grade do onboarding, editável a qualquer momento, com opção de reservar 1 **dia de
descanso** fixo por semana) e a aba **IA & Agentes** — troque de provedor (Ollama local, Groq,
OpenRouter, ou qualquer endpoint compatível com a API da OpenAI) direto pela UI, sem editar
`.env.local` nem reiniciar o servidor, com um botão "Testar conexão" que valida a config antes de
salvar. A aba **Aparência** troca a paleta de cores do app inteiro na hora — 4 templates prontos
(Notion, o padrão; Linear; Raycast; e Claude, o único tema claro do app). Zona de risco com
"Apagar tudo" (matérias/módulos/sessões/grupos — não afeta perfil nem preferências) e "Corrigir
progresso" (recalcula o % de conclusão a partir dos módulos reais).

![Configurações](docs/screenshots/settings.png)

### 🤖 Agentes de IA
Painel de status real da conexão com o LLM (endpoint, modelo, latência, teste de conexão e teste
ponta-a-ponta do Orchestrator) e uma lista dos agentes do sistema com o que cada um faz de fato
hoje — inclusive os que já são 100% lógica local determinística (Pedagogy, Scheduler, Progress),
sem depender de IA nenhuma, versus os que realmente chamam um LLM (Orchestrator, Curriculum).

### 🚀 Onboarding
Fluxo de 4 passos no primeiro uso: perfil → matérias → conteúdo/módulos → disponibilidade — com
suporte a subir várias ementas de uma vez (PDF/texto) e deixar a IA inferir nome, carga horária e
módulos de cada uma. Ao final, já dispara a primeira geração de calendário e leva direto pro
dashboard. Reentrar no onboarding (ex: depois de "Apagar tudo") reaproveita perfil e preferências
já salvos em vez de começar em branco.

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) + React 18 + Tailwind CSS |
| Estado | Hooks customizados por domínio (`useCalendar`, `useAI`, `useTimer`, `useDisciplines`, `useDisciplineGroups`, `usePomodoro`/`usePomodoroConfig`, `useThemePreference`, `useLofiAmbience`) — sem Redux/Zustand, estado local ao componente ou derivado direto do servidor |
| Backend | API Routes do próprio Next.js |
| IA | Qualquer LLM compatível com a API da OpenAI (Ollama local por padrão) via `openai` SDK, validação de entrada com `zod` |
| Banco | SQLite local via `node:sqlite` (nativo do Node 22+, zero dependência externa), zero configuração |
| Testes/CI | Vitest, GitHub Actions (lint, type-check, build, test, CodeQL) |

## Começando

Pré-requisitos: **Node.js 20+**, **pnpm 9+** e um provedor de IA compatível com a API da OpenAI —
por padrão, [Ollama](https://ollama.com) rodando localmente (grátis, privado, sem chave):

```bash
# 1. Instalar o Ollama (ollama.com) e baixar um modelo com suporte a tool-calling
ollama pull qwen2.5:7b

# 2. Clonar e instalar dependências
git clone https://github.com/rychardchagas/StudyAi.git
cd StudyAi
pnpm install

cp .env.example apps/web/.env.local
# opcional: edite apps/web/.env.local se quiser trocar de modelo/provedor
# (Groq, OpenRouter, LM Studio...) — os defaults já apontam pro Ollama local

# 3. Ligar o Ollama, rodar o app, e desligar o Ollama quando terminar
pnpm ai:start
pnpm dev
# → http://localhost:3000
# ... Ctrl+C pra parar o app, depois:
pnpm ai:stop
```

O banco SQLite é criado automaticamente na primeira execução, dentro de `apps/web/data/` — não
precisa configurar nada além de ter o Ollama rodando (ou apontar pra outro provedor). Passo a
passo completo: [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md).

Instalando pra alguém que não mexe com terminal/código? Existe uma versão desse mesmo passo —
instalar o Ollama e conectar no StudyAI — sem nenhum comando de desenvolvedor, só cliques e um
único comando pra copiar/colar: [docs/GUIA_INSTALAR_IA_LOCAL.md](docs/GUIA_INSTALAR_IA_LOCAL.md).

### Gestão de memória do Ollama

O instalador do Ollama no Windows liga um app de bandeja no login automaticamente — isso foi
**desativado** neste projeto (o servidor só sobe quando você roda `pnpm ai:start`, e derruba com
`pnpm ai:stop`). Além disso, `OLLAMA_KEEP_ALIVE=5m` e `OLLAMA_MAX_LOADED_MODELS=1` estão
configurados como variáveis de ambiente do usuário: o modelo sai da RAM/VRAM sozinho depois de 5
minutos sem uso, e nunca mais de um modelo fica carregado ao mesmo tempo — mesmo que você esqueça
de rodar `pnpm ai:stop`, o consumo pesado de memória se limita sozinho.

## Guia de uso

1. **Primeiro acesso** → você cai no onboarding (`/onboarding`). Preencha seu perfil, cadastre
   pelo menos uma matéria com horas semanais e (opcional) data de prova, liste os módulos/conteúdo
   dela e marque seus horários livres na semana. Ao concluir, o app já gera seu primeiro
   calendário e te leva para o Dashboard.
2. **Todo dia** → abra o **Calendário**, veja as sessões agendadas para hoje e clique numa delas
   para abrir os detalhes; use **▶ Iniciar sessão** para ir para a tela de **Sessão ativa**.
3. **Durante a sessão** → siga o checklist, use o modo foco (tecla `F`) ou o modo Pomodoro (com
   música de fundo, se quiser) para tela cheia sem distração, responda o exercício de active
   recall e conclua a sessão ao final — isso alimenta o histórico usado pelo Progress Agent e pelo
   FSRS para agendar a próxima revisão. Se não der tempo de terminar, use
   **"↺ Não terminei — retomar depois"** em vez de forçar uma conclusão com nota de recall
   inventada. Prefere um timer solto, sem vincular a uma matéria? Use a aba **Pomodoro**.
4. **Quando o plano mudar** (nova prova marcada, matéria adicionada, horários mudaram) → vá em
   **Matérias** para editar/adicionar (inclusive múltiplas provas por matéria), ou em
   **Configurações → Horários** para atualizar sua disponibilidade ou seu dia de descanso, depois
   clique em **⚡ Replanejar** no topo do Dashboard para os agentes recalcularem o calendário
   inteiro.
5. **De vez em quando** → confira **Progresso** para ver aderência, streak e os insights que os
   agentes geraram a partir do seu histórico real de sessões; use a página **Metodologias** se
   quiser entender *por que* o app está aplicando uma técnica específica num módulo; ou
   **Agentes de IA** se quiser ver o status real da conexão com o LLM e o que cada agente faz de
   fato.
6. **Assistente de IA** → o painel lateral do Dashboard permite perguntar diretamente ao
   Orchestrator coisas como "quanto falta pra prova de X" ou pedir um resumo/quiz rápido — os
   atalhos prontos ("Quanto falta?", "Quiz", "Sobrecarregado") já mandam esses pedidos comuns. Pra
   trocar de provedor/modelo de IA sem editar arquivo nenhum, use **Configurações → IA & Agentes**.

## Estrutura do projeto

```
studyai/
├── apps/
│   └── web/                  ← único app do monorepo hoje (produto real, Next.js)
│       └── src/
│           ├── app/          ← rotas (App Router) + API routes
│           ├── components/   ← componentes React (ui/, shared/, por tela)
│           └── lib/
│               ├── agents/   ← Curriculum, Pedagogy, Scheduler, Progress, Notification, QA, Orchestrator
│               ├── db/       ← cliente SQLite (node:sqlite) + schema
│               ├── hooks/    ← useCalendar, useAI, useTimer, useDisciplines, useDisciplineGroups...
│               └── utils/    ← FSRS, helpers
├── scripts/                   ← utilitários de dev (ex: ollama-ctl.mjs)
└── docs/                      ← ARCHITECTURE.md, GETTING_STARTED.md, ROADMAP.md, USER_GUIDE.md
```

Um app mobile e pacotes compartilhados (`packages/ui`, `packages/types`) fazem parte da visão de
longo prazo do monorepo (`pnpm-workspace.yaml` já reserva `apps/*`/`packages/*`), mas nenhum dos
dois existe ainda — hoje é só `apps/web`.

## Scripts

Rodados na raiz do monorepo via Turborepo:

```bash
pnpm dev          # inicia o app em desenvolvimento
pnpm build        # build de produção
pnpm lint         # ESLint
pnpm type-check   # checagem de tipos (tsc --noEmit)
```

Dentro de `apps/web`, também há `pnpm test` (Vitest).

## Status do projeto

Todas as 7 fases de migração do protótipo original (`apps/web/src/app/prototype/StudyAI.jsx`,
mantido no repo como referência de design) para os componentes reais em produção estão
concluídas. CI ativo (lint, type-check, build, testes, CodeQL) e Dependabot habilitado. Roadmap
detalhado e próximos passos: [docs/ROADMAP.md](docs/ROADMAP.md).

Fora do escopo por enquanto: tela de flashcards dedicada, app mobile e animações de celebração
mais elaboradas.
