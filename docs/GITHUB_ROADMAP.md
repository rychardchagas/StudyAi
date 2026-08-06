# Roadmap — Aprender a operar o GitHub neste repositório

Objetivo: você seguir estas fases sozinho, no seu ritmo, sem depender de uma sessão do Claude Code
pra cada passo. Cada fase tem o que fazer, onde clicar, e por quê — na ordem que faz sentido
(a mesma escada de maturidade DevSecOps que já usamos: nada aqui pula etapa).

## Já pronto (não refazer)

- **Estágio 0 — Baseline hygiene**: `.gitignore` cobre segredos (`.env`, `.env.local`), nunca houve
  vazamento no histórico.
- **Estágio 1 — CI**: `.github/workflows/ci.yml` roda `lint → type-check → test → build` em todo
  push/PR.
- **Estágio 2a/2c — Dependabot + CodeQL**: `.github/dependabot.yml` (deps semanais) e
  `.github/workflows/codeql.yml` (SAST, push/PR + toda segunda 06:00 UTC).
- **Estágio 3a — Testes na CI**: `pnpm test` roda como parte do `ci.yml`.

## Fase 1 — Ativar os scanners nativos do GitHub (Settings)

Isso exige permissão de admin do repositório — só dá pra fazer pela interface, não por API.

1. Acesse `github.com/rychardchagas/StudyAi` → **Settings** → **Code security and analysis**
   (menu lateral esquerdo).
2. Ative, um de cada vez, conferindo a página atualizar:

   | Toggle | O que faz |
   |---|---|
   | Dependabot alerts | Avisa quando uma dependência tem CVE conhecida |
   | Dependabot security updates | Abre PR automático de correção quando o alerta acima dispara |
   | Secret scanning | Varre commits (passados e futuros) por padrões de chave/token |
   | Push protection | Bloqueia o `git push` se detectar um segredo, antes de entrar no histórico |

3. Depois de ativar, vá em **Security** (aba do topo) → confira as sub-abas **Code scanning** (resultado do CodeQL) e **Dependabot** — é ali que os achados aparecem no dia a dia.

## Fase 2 — Decidir sobre Pull Requests + branch protection

Hoje todo commit vai direto pra `main`. Isso significa que a CI (Fase 0/1) é só informativa — nada
trava um push ruim. Pra virar gate de verdade, você precisa decidir se quer passar a trabalhar com
branches + PRs. Não tem certo/errado — depende se você valoriza mais a fricção zero (commit direto)
ou a segurança de nunca mergear código quebrado.

Se decidir migrar, o fluxo fica assim:

1. Criar uma branch pra cada mudança: `git checkout -b nome-da-mudanca`.
2. Commitar e dar `git push origin nome-da-mudanca` (não `main`).
3. No GitHub, abrir um **Pull Request** dessa branch pra `main` (o site sugere automaticamente
   depois do push).
4. A CI roda sozinha no PR — você vê o resultado ali antes de mergear.
5. Clicar **Merge pull request** quando estiver verde.
6. Configurar o gate de verdade: **Settings → Branches → Add branch protection rule** → padrão
   `main` → marcar **"Require a pull request before merging"** e **"Require status checks to pass
   before merging"** (selecionar o job `build`) → **Save**. Só depois desse passo o gate realmente
   bloqueia merge com CI vermelha.

## Fase 3 — Rotina de acompanhamento (hábito, não configuração)

Sem isso, os scanners das Fases 1 rodam mas ninguém olha o resultado. Sugestão de cadência:

- **Semanal**: abrir a aba **Security** → conferir se apareceu alerta novo do Dependabot ou do
  CodeQL. PRs automáticos do Dependabot podem ser revisados e mergeados como qualquer PR.
- **Ao ver um alerta do CodeQL**: usar o botão "Show paths" pra entender o fluxo de dado antes de
  decidir corrigir ou marcar como "Dismissed" (sempre com motivo).

## Fase 4 (opcional) — Trocar o `docs/KANBAN.md` manual por GitHub nativo

Hoje a coordenação entre sessões usa um arquivo Markdown local (não versionado, de propósito).
Como exercício de aprendizado de GitHub "de verdade", vale conhecer os equivalentes nativos:

- **Issues**: cada card do backlog vira uma issue (`Settings` não precisa; é a aba **Issues** direto).
- **Projects**: um board Kanban nativo do GitHub, ligado às issues, com colunas arrastáveis — mais
  visual que o Markdown, mas exige internet/navegador (o Markdown local funciona offline e é lido
  direto pelas sessões do Claude Code, então não é uma troca óbvia — é só bom saber que existe).

## Fase 5 — Deploy (só quando/se fizer sentido)

Não é urgente — o app hoje é local, single-user, com SQLite em arquivo (`apps/web/data/studyai.db`).
Antes de automatizar qualquer deploy, a pergunta que vem primeiro é arquitetural, não de pipeline:
**onde os dados persistem se o app rodar em outro lugar?** SQLite em arquivo não sobrevive a
ambientes serverless (Vercel, etc.) sem trocar por um banco hospedado (Turso/libSQL, Postgres).
Só depois dessa decisão um workflow de deploy automatizado faz sentido.

## Fase 6 — Observabilidade (só quando/se fizer sentido)

Relevante de verdade a partir do momento em que o app roda fora da sua máquina, ou se você quiser
acompanhar gasto da API Anthropic ao longo do tempo mesmo local. Nesse momento: logging estruturado
(hoje é só `console.error`, que some quando o terminal fecha), error tracking (ex: Sentry), e
monitoramento de custo/uso da chave da Anthropic.

---

Pendências abertas registradas no `docs/KANBAN.md` (local, não versionado) continuam lá pra quando
você quiser retomar com uma sessão do Claude Code.
