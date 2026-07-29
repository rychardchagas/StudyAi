# Roadmap — Retirar os placeholders

Objetivo: migrar cada tela de `StudyAI.jsx` (protótipo, estilos inline) para os Client Components reais em Tailwind, ligados ao banco SQLite local e aos agentes já implementados. A tela de login/landing do protótipo (`page==="landing"`) fica de fora — o app não usa mais gate de login.

## Já pronto (não refazer)

- **Design system em Tailwind**: `tailwind.config.ts`, `globals.css` (cores, fontes, animações já portadas do protótipo).
- **Componentes de UI**: `Button`, `InlineEdit`, `Toggle`, `EmptyState`, `Skeletons` (`components/ui/`, `components/shared/`).
- **Hooks**: `useTimer` (já é 1:1 com a lógica do protótipo), `useCalendar`, `useAI`.
- **Dados e agentes**: SQLite local (`lib/db/local-db.ts`), Curriculum/Pedagogy/Scheduler/Progress/Notification/QA agents (`lib/agents/`).
- **Rotas API**: `/api/disciplines` (GET/POST), `/api/sessions/complete`, `/api/calendar/generate`, `/api/agents` (chat).

## Fase 0 — Fundação (bloqueante, fazer primeiro) ✅ concluída

Sem isso, nenhuma tela nova renderiza com as cores certas nem tem navegação.

1. **Corrigir `tailwind.config.ts`**: faltam os tokens `border`, `border2` e `txt` que `Button.tsx`/`InlineEdit.tsx` já usam (`border-border`, `text-txt`) — hoje essas classes não existem no config, então o visual quebra silenciosamente.
2. **Criar o AppShell** (Sidebar + Topbar) — hoje cada rota (`/dashboard`, `/session`, etc.) é solta, sem navegação nenhuma:
   - Mover `app/dashboard`, `app/session`, `app/disciplines`, `app/progress`, `app/methods`, `app/settings` para um route group `app/(app)/...` com um `layout.tsx` compartilhado.
   - Portar `Sidebar` do protótipo (colapsável, com lista de matérias e progresso semanal) para `components/shared/Sidebar.tsx`.
   - Portar a Topbar (título da tela + botão "⚡ Replanejar" no dashboard + notificações) para `components/shared/Topbar.tsx`.
   - `/onboarding` continua fora do shell (tela cheia, sem sidebar).
3. **Componentes de baixo nível que faltam**, usados em várias telas: `StatCard`, `Tip` (tooltip), `SchedGrid` (grade de disponibilidade — usada em Onboarding e Settings), `Notice`. Trocar o `Toast` manual do protótipo por `react-hot-toast` (já é dependência, ainda não usado) — adicionar `<Toaster/>` no `app/layout.tsx`.

## Fase 1 — Onboarding ✅ concluída

Primeira tela que o usuário vê agora. Sem referência 1:1 no protótipo (ele não tem onboarding) — é desenho novo, mas funcional:

- Passo 1 (perfil): nome + bio para IA → salva via `PATCH /api/profile` (rota nova, usa `updateProfile` que já existe em `local-db.ts`).
- Passo 2 (matérias): formulário para adicionar 1+ disciplinas (nome, horas/semana, prioridade, data de prova).
- Passo 3 (conteúdo): lista de módulos por disciplina (nome + horas estimadas).
- Passo 4 (disponibilidade): `SchedGrid` reaproveitado da Fase 0.
- Ao finalizar: `POST /api/disciplines` para cada disciplina+módulos, depois `POST /api/calendar/generate`, redireciona para `/dashboard`.
- **Rota nova necessária**: `POST /api/disciplines` já aceita módulos? Hoje não — precisa aceitar `modules[]` no body ou expor `POST /api/modules`.

## Fase 2 — Methods (vitrine, sem dependência de dados — bom teste do AppShell) ✅ concluída

- Portar `MethodsScreen` e o array `MD` (8 metodologias) quase 1:1 — é conteúdo estático, só troca inline styles por Tailwind.
- Valida que Sidebar/Topbar da Fase 0 funcionam antes de atacar as telas com dados reais.

## Fase 3 — Disciplines ✅ concluída

- `useDisciplines` hook (`GET/POST /api/disciplines`, que já existem) + rotas novas: `PATCH /api/disciplines/[id]` e `DELETE /api/disciplines/[id]` (usam `updateDiscipline`/`deleteDiscipline`, já existem em `local-db.ts`, só falta a rota).
- Portar o card de disciplina (nome editável via `InlineEdit`, horas/progresso/dias-para-prova, lista de módulos com toggle de status, ETA via `calcETA` de `lib/utils/fsrs.ts`).
- Botão "+ Nova matéria" e "✕ remover" chamando o hook.

## Fase 4 — Dashboard ✅ concluída

A tela mais complexa — depende de tudo até aqui:

- `CalGrid` (grade semanal 7×N horários) + `EventDrawer` (painel lateral ao clicar num evento).
- 4 `StatCard`s no topo (sessões da semana, horas planejadas, aderência, revisões espaçadas) — usar `Progress Agent` (`calcWeeklyAdherence`, etc., já implementado) em vez dos números fixos do protótipo.
- `GenOverlay` (loading dos agentes) ao clicar "⚡ Replanejar" → chama `useCalendar().regenerate()`, que já bate em `/api/calendar/generate`.
- Painel de IA lateral usando `useAI` (já existe) — passar `OrchestratorContext` real (montado a partir do Progress Agent) em vez de mensagens mockadas.
- **Rota nova**: `GET /api/sessions` (lista sessões — a Fase 6 também precisa).

## Fase 5 — Session ✅ concluída

- Timer com `useTimer` (já pronto) + modo foco (overlay fullscreen, tecla `F`).
- Checklist de tarefas da sessão.
- Active Recall (pergunta + textarea + "Verificar"/"Próxima").
- Ao concluir: `POST /api/sessions/complete` (já existe) + `CelebrationOverlay` (confete — pode ficar para o fim, é polish).
- Precisa saber *qual* sessão está ativa — vem do clique em "▶ Iniciar sessão" no `EventDrawer` (Fase 4) ou no card de disciplina (Fase 3), carregando a `StudySession` real em vez do módulo fixo "BFS e DFS" do protótipo.

## Fase 6 — Progress ✅ concluída

- Stats (streak, horas do mês, aderência, revisões) via `Progress Agent`.
- Heatmap de atividade (12 semanas) a partir do histórico real de `study_sessions`.
- "Sessões por matéria" (barra por disciplina).
- "Insights dos agentes" — usar `generateInsights` do Progress Agent em vez do texto fixo do protótipo.

## Fase 7 — Settings ✅ concluída

- Aba Perfil: nome/bio → `PATCH /api/profile` (mesma rota da Fase 1).
- Aba Notificações: toggles ligados a `preferences` do perfil (usar `Notification Agent` para decidir o que notificar).
- Aba Horários: `SchedGrid` reaproveitado, salva disponibilidade e regenera calendário.
- Aba IA & Agentes: seleção de modelo/personalidade (fica em `preferences`) + toggles dos 4 agentes (visual apenas, os agentes já rodam sempre — é configuração de exibição/comportamento, não liga/desliga de verdade ainda).

## Fora do roadmap por enquanto

- Tela de flashcards dedicada (o protótipo não tem uma — FSRS aparece só como rótulo "🔁 Revisão"). Entra quando/se for pedida.
- App mobile (`apps/mobile`).
- Confetti/animações de celebração — nice-to-have, deixar para depois de cada fase funcional estar de pé.
