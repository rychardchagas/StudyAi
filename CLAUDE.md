# StudyAI — Convenções do projeto

Monorepo pnpm + Turborepo. App principal: `apps/web` (Next.js 15 App Router). Comandos usuais a
partir da raiz: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm type-check`; `pnpm test` roda a partir
de `apps/web` (Vitest). Visão geral de arquitetura: `docs/ARCHITECTURE.md`. Como rodar do zero:
`docs/GETTING_STARTED.md`.

## Kanban é obrigatório, em toda sessão — não é uma tarefa à parte

`docs/KANBAN.md` é o board compartilhado entre terminais/sessões do Claude Code que trabalham
neste repositório. Ele é local-only (gitignored — não vai pro GitHub público), e é justamente por
isso que ele serve de memória persistente entre sessões: `TodoWrite` morre com a conversa, o
Kanban não. Trate as regras abaixo como parte do trabalho em si, não como um passo extra a lembrar
quando alguém pedir.

1. **Antes de começar qualquer trabalho não-trivial**, abra `docs/KANBAN.md` e confira se já não
   tem um card "Em Andamento" (🔵) cobrindo a mesma coisa — evita duas sessões pisando no mesmo
   arquivo. Se não souber se ainda está sendo trabalhado, confira `git log` antes de tomar posse.
2. **Registre no Kanban toda alteração, melhoria ou erro encontrado, mesmo sem pedido explícito
   do usuário** — isso inclui:
   - Bugs/lacunas encontrados durante revisão, teste manual, ou simplesmente lendo código —
     mesmo que você não tenha corrigido ainda. As skills `qa-functional-tester`,
     `backend-senior-mentor` e `ui-ux-design-mentor` (em `.claude/skills/`) são fontes naturais
     desses achados; ao rodar qualquer uma delas, os achados relevantes viram cards.
   - Funcionalidades/melhorias entregues numa sessão.
   - Decisões explicitamente adiadas pro usuário ("não implementado ainda, precisa de decisão") —
     assim a pergunta em aberto sobrevive além dessa conversa específica, em vez de se perder.
3. **Formato**: siga a convenção já no topo do `KANBAN.md` — `- [ ]`/`- [x]`, prefixo
   `🔵 <apelido da sessão/terminal>` enquanto em andamento, `✅` + hash do commit quando concluído.
   Contexto suficiente (arquivos, o quê, por quê) pra uma sessão nova pegar o card sem precisar
   reler esta conversa — se faltar contexto, complete o card antes de mover, não deixe implícito.
4. **Ao terminar uma sessão de trabalho**, faça uma passada final: tudo que foi corrigido/entregue
   está marcado ✅ com commit? Tudo que ficou pendente ou foi adiado tem um card correspondente em
   Backlog/Em Andamento? Não deixe pro usuário ter que perguntar "isso ficou anotado em algum
   lugar?".

Dado sensível (roadmap estratégico, regras de negócio, notas internas) que não deveria ir pro
GitHub público segue o mesmo princípio de "persistir localmente, não deixar de escrever" — ver a
skill global `private-data-gatekeeper` (`~/.claude/skills/`) pra onde e como.
