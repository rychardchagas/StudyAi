# Guia do Usuário — StudyAI

Este guia explica como usar o StudyAI da melhor forma possível hoje, com foco especial em como o
calendário realmente funciona por baixo do capô — porque entender isso muda como você deve
cadastrar suas matérias, horários e disponibilidade para obter um calendário melhor.

> Este documento descreve o comportamento real do código nesta fase do projeto. Algumas coisas na
> tela (textos, toggles) sugerem mais automação do que existe hoje — sinalizamos isso explicitamente
> ao longo do guia, na seção "O que ainda não faz o que parece fazer", para você não perder tempo
> configurando algo que ainda não tem efeito.

## Visão geral

O StudyAI organiza seus estudos em quatro conceitos:

- **Disciplinas** — as matérias que você está cursando/estudando, com horas semanais desejadas,
  prioridade e (opcionalmente) data de prova.
- **Módulos** — os tópicos dentro de cada disciplina, com status `pendente` / `em progresso` /
  `concluído`.
- **Calendário** — uma grade semanal recorrente (não datas específicas) que distribui sessões de
  estudo pelos seus horários livres.
- **Sessões** — o momento real em que você estuda um módulo, com timer, checklist e active recall.

## Primeiros passos (Onboarding)

Na primeira vez que você abre o app, passa por 4 telas:

1. **Seu perfil** — nome (obrigatório) e uma bio curta opcional, que ajuda a IA a personalizar
   respostas.
2. **Suas matérias** — cadastre pelo menos uma disciplina: nome, horas por semana, prioridade
   (Alta/Média/Baixa) e data de prova (opcional). **A prioridade e as horas semanais são o que
   determina o peso de cada matéria na hora de distribuir sessões** — veja a seção seguinte.
3. **Conteúdo** — adicione os módulos de cada disciplina (nome + horas estimadas). Pode pular e
   completar depois em "Matérias".
4. **Disponibilidade** — marque na grade os horários em que você pode estudar. Por padrão já vem
   marcado seg-sex às 19h e 20h; ajuste para a sua realidade antes de gerar o primeiro calendário.

Ao clicar em **"Gerar calendário ✦"**, o app cria as disciplinas, salva seu perfil e já tenta gerar
um primeiro calendário com IA em segundo plano — se algo falhar nesse momento, você não recebe
aviso na tela; se o calendário do Dashboard parecer estranho na primeira vez, use **"⚡ Replanejar"**
lá para gerar de novo com feedback visível.

## Como o calendário é gerado (o que importa entender)

Este é o ponto mais importante do guia. **Existem dois motores de geração diferentes**, e saber
qual está ativo muda como você deve interpretar o resultado:

### Motor 1 — Local (determinístico, sempre disponível, sem custo de IA)
É o que roda automaticamente sempre que você abre o Dashboard, e também o que assume o controle
silenciosamente se a chamada à IA falhar (sem internet, sem crédito na API, chave inválida). Ele:

1. Reserva primeiro todos os **horários fixos** (aulas presenciais, ver seção abaixo) —
   incondicionalmente, sem checar conflito entre duas matérias.
2. Calcula um **peso** por disciplina = horas/semana desejadas + bônus de prioridade
   (Alta = +2, Média = 0, Baixa = −1).
3. Distribui as sessões restantes proporcionalmente a esse peso pelos seus horários livres,
   tentando intercalar disciplinas diferentes (interleaving) em vez de empilhar a mesma matéria
   em sequência.
4. Escolhe o módulo de cada sessão: prioriza o que está "em progresso"; a cada ~3ª sessão de uma
   matéria, se já houver módulo concluído, agenda uma revisão dele em vez de conteúdo novo.
5. Escolhe a metodologia de estudo com base no status do módulo e na proximidade da prova (ver
   tabela de metodologias abaixo).
6. Toda sessão gerada dura **45 minutos fixos** — não há ajuste de duração por módulo/matéria.

Esse motor **não é validado por nenhum QA automático** — se duas matérias disputarem o mesmo
horário fixo, por exemplo, ele resolve silenciosamente ("a primeira cadastrada ganha") sem te
avisar.

### Motor 2 — IA (LLM local via Ollama, ou o provedor configurado), acionado ao clicar em "⚡ Replanejar"
Envia suas disciplinas, módulos e disponibilidade para o modelo, que monta o calendário seguindo
regras equivalentes às do motor local (proporcionalidade, interleaving, priorizar provas próximas,
metodologia por status do módulo) — mas com mais flexibilidade de interpretação. Depois de gerado,
um **QA automático** roda sobre o resultado e verifica:

- Calendário vazio apesar de existirem disciplinas.
- Interleaving violado (mesma matéria em dois horários seguidos no mesmo dia).
- Conflito de horário fixo entre duas disciplinas.
- Disciplina com prova em menos de 14 dias e nenhuma sessão agendada.

Se algum problema for encontrado, **você vê um toast de erro para cada um**, na tela do Dashboard,
depois de replanejar. O calendário é entregue mesmo assim (o QA avisa, não bloqueia) — trate os
toasts como uma lista de coisas para revisar manualmente.

**Como saber qual motor gerou o calendário que você está vendo**: o toast ao clicar em
"Replanejar" diz explicitamente — *"Calendário replanejado com IA!"* ou *"Calendário atualizado
localmente — IA indisponível..."*. Fora desse clique (ex: ao simplesmente abrir o Dashboard), é
sempre o motor local.

### Horário fixo (`fixed_schedule`)
Use isso para um compromisso que se repete toda semana no mesmo horário — uma aula presencial, por
exemplo. Ele é configurado na tela **Matérias**, editando a disciplina. Diferente de uma sessão
normal, o horário fixo:
- É sempre reservado primeiro, antes da distribuição proporcional.
- Reduz a cota "livre" daquela disciplina (ela recebe menos sessões extras, já que uma parte da
  carga semanal está coberta pelo horário fixo).
- **Só é garantido no motor local.** No motor via IA, o horário fixo é só mais um dado enviado no
  prompt — o modelo tende a respeitar, mas não é uma trava garantida como no motor local.

**Dica prática**: se você tem uma aula fixa que *precisa* aparecer sempre no mesmo lugar, prefira
não depender do "Replanejar" para isso — confie no motor local, que reserva o slot sem exceção. Se
duas matérias competem pelo mesmo horário fixo, o app não impede o cadastro — ele só avisa via QA
(e só quando você usa o motor via IA). Revise você mesmo se marcou dois horários fixos conflitantes.

### Disponibilidade — onde configurar e quando ela realmente entra em vigor
Você define seus horários livres em dois lugares equivalentes: no Onboarding, e depois em
**Configurações → Horários**. Um ponto que confunde bastante:

- Salvar a disponibilidade em Configurações **não regenera o calendário automaticamente**, mesmo
  que o toast diga "Salvo e calendário atualizado!" — isso grava sua preferência, mas o layout
  visível no Dashboard só é recalculado quando a página recarrega (motor local, com a
  disponibilidade nova) ou quando você clica em "⚡ Replanejar" (motor IA, que relê sua
  disponibilidade mais recente do banco no momento do clique).
- **Prática recomendada**: depois de mudar sua disponibilidade em Configurações, vá ao Dashboard e
  clique em "Replanejar" para ver o efeito imediatamente, em vez de confiar que já aconteceu
  sozinho.

### O calendário é um modelo semanal recorrente, não um calendário com datas
O que você vê é sempre "toda segunda às 19h", não "segunda dia 12/08 às 19h". Navegar entre
semanas no Dashboard troca só as datas mostradas como rótulo — os mesmos horários se repetem
indefinidamente até você replanejar de novo. Nenhum evento de calendário fica salvo por semana
específica; o que fica salvo de fato são suas disciplinas, módulos e as sessões que você realmente
iniciou.

## Metodologias de estudo

A tela **Métodos** lista 8 técnicas, cada uma com explicação completa, quando usar, avaliação de
eficácia e passo a passo. Só uma parte delas é atribuída automaticamente pelo agente pedagógico:

| Metodologia | Atribuída automaticamente? | Quando aparece |
|---|---|---|
| 🔁 Repetição Espaçada | Sim | Módulo já concluído — sessão de revisão |
| 🧠 Active Recall | Sim | Módulo em progresso, ou prova em menos de 14 dias |
| 🛠 Prática Deliberada | Sim | Módulo ainda pendente (primeiro contato) |
| 🗣 Técnica de Feynman | Sim (parcial) | Ocasionalmente, em módulos em progresso |
| 🔀 Interleaving | Só no motor via IA | O modelo pode escolher; o motor local não atribui isso como "metodologia da sessão" (ele *aplica* interleaving na distribuição, mas não rotula a sessão com esse nome) |
| ⏱ Pomodoro, 🗺 Mapas Mentais, 📐 Aprendizagem por Problemas | Não | Só como material de referência na tela Métodos — use por conta própria, o agendador não as escolhe sozinho |

Vale abrir a tela Métodos e ler o passo a passo de cada uma antes de uma sessão — o conteúdo lá é
completo e vale a pena, mesmo sabendo que a escolha automática cobre só uma parte delas.

## Usando a tela de Sessão

Você chega em uma sessão clicando em um evento no calendário e depois em "▶ Iniciar sessão" (ou
pelo card de uma disciplina). Isso cria o registro da sessão no banco *no momento em que você
inicia* — não no horário original do slot do calendário.

- **Timer**: play/pause, reset, pular. Atalho de teclado: `Espaço` (play/pause), `F` (modo foco em
  tela cheia), `Esc` (sair do modo foco), `→` (próxima pergunta de active recall).
- **Checklist**: "Revisar anotações", "Praticar exercícios", "Active recall final" — é só um guia
  visual, não é salvo nem afeta nada além da própria tela.
- **Active Recall**: 3 perguntas genéricas sobre o módulo, para você responder em texto livre antes
  de olhar qualquer material. As respostas ficam registradas como anotação da sessão — não há
  correção automática, é para você mesmo se autoavaliar enquanto escreve.
- **Concluir sessão**: registra a sessão como concluída e volta ao Dashboard.

**Dica prática**: escreva de verdade nas perguntas de active recall antes de checar qualquer coisa
— é a parte da tela com mais evidência de eficácia (veja a skill `study-methodology-mentor` para o
porquê). O checklist é só apoio; o ganho real de aprendizado está no recall.

## Configurações — o que já funciona e o que ainda é só preferência salva

Seja realista sobre o que mexer aqui muda de fato, hoje:

| Aba / opção | Efeito real hoje |
|---|---|
| Perfil → nome, bio | Funciona, usado para personalizar respostas da IA |
| Perfil → e-mail | **Cosmético** — não é salvo em lugar nenhum |
| Notificações (todos os 5 toggles) | Preferência salva, mas **nenhum envio de notificação está implementado** ainda — ligar/desligar não muda o comportamento do app hoje |
| Horários (disponibilidade) | Funciona — mas releia a seção "Disponibilidade" acima: salvar não regenera o calendário sozinho, precisa reabrir o Dashboard ou clicar em Replanejar |
| IA & Agentes → Modelo principal | Preferência salva, mas **o backend sempre usa o mesmo modelo** independentemente da escolha aqui |
| IA & Agentes → Agressividade do replanejamento | Preferência salva, **não é lida por nenhuma parte da geração de calendário** ainda |
| IA & Agentes → toggles de Curriculum/Pedagogy/Progress/QA Agent | Preferência salva, **não desativam de fato o agente correspondente** — por exemplo, desligar "QA Agent" aqui não impede o QA de rodar |

Não é bug o app deixar você configurar essas coisas — é trabalho futuro já mapeado no roadmap do
projeto. A recomendação prática: não gaste tempo ajustando "Agressividade do replanejamento" ou os
toggles de agentes esperando um efeito visível ainda.

## O que ainda não faz o que parece fazer (para você não estranhar)

- **A nota de autoavaliação de uma sessão concluída é sempre fixa** — completar uma sessão hoje
  não gera uma pontuação real de desempenho, então não afeta ainda a repetição espaçada de fato
  (o algoritmo FSRS do projeto existe no código, mas ainda não está conectado a esse fluxo).
- **Sequências de dias estudados (streak) e relatórios semanais** aparecem como conceito na tela
  de Progresso, mas o disparo automático de aviso de streak em risco (toggle em Notificações)
  ainda não existe de fato.
- Isso significa: hoje, o maior valor do app está na **geração e organização do calendário** e na
  **estrutura da sessão de estudo** (timer + active recall) — trate o restante como espaço em
  construção, não como algo que já otimiza sozinho a sua repetição espaçada.

## Resumo — como tirar o melhor proveito hoje

1. Cadastre horas semanais e prioridade de forma realista — é isso que decide quanto espaço cada
   matéria ganha na distribuição proporcional.
2. Use horário fixo só para compromissos que realmente se repetem toda semana, e confie no motor
   local (não no "Replanejar") para garanti-lo sem conflito.
3. Depois de mudar disponibilidade em Configurações, sempre clique em "Replanejar" no Dashboard
   para ver o efeito — não assuma que já aconteceu.
4. Preste atenção nos toasts de erro do QA depois de replanejar — são avisos reais, não decoração.
5. Na sessão, invista tempo de verdade nas perguntas de active recall — é a parte com base
   científica mais forte, mesmo sem correção automática ainda.
6. Ignore por enquanto os controles de Notificações e "IA & Agentes" além de nome/bio/horários —
   eles ainda não têm efeito funcional comprovado.
