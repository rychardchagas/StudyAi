# Guia do Usuário — StudyAI

Este guia explica como usar o StudyAI da melhor forma possível hoje, com foco especial em como o
calendário realmente funciona por baixo do capô — porque entender isso muda como você deve
cadastrar suas matérias, horários e disponibilidade para obter um calendário melhor.

> Este documento descreve o comportamento real do código nesta fase do projeto. Uma minoria dos
> controles em Configurações ainda é só preferência salva sem efeito funcional — sinalizamos isso
> explicitamente na seção "O que ainda não faz o que parece fazer", pra você não perder tempo
> configurando algo que ainda não muda nada.

## Visão geral

O StudyAI organiza seus estudos em cinco conceitos:

- **Disciplinas** — as matérias que você está cursando/estudando, com horas semanais desejadas,
  prioridade e uma ou mais provas/avaliações cadastradas.
- **Grupos** — categorias opcionais pra organizar disciplinas por contexto (ex: "Faculdade",
  "Projeto pessoal"). Puramente organizacional — não muda como o calendário é gerado.
- **Módulos** — os tópicos dentro de cada disciplina, com status `pendente` / `em progresso` /
  `concluído`.
- **Calendário** — uma grade semanal recorrente (não datas específicas) que distribui sessões de
  estudo pelos seus horários livres.
- **Sessões** — o momento real em que você estuda um módulo, com timer, checklist e active recall.

## Primeiros passos (Onboarding)

Na primeira vez que você abre o app — ou sempre que suas disciplinas cadastradas chegarem a zero
(ex: depois de "Apagar tudo" em Configurações) — você passa por 4 telas:

1. **Seu perfil** — nome (obrigatório) e uma bio curta opcional, que ajuda a IA a personalizar
   respostas. Se você já tinha um perfil salvo (reentrando depois de um "Apagar tudo", por
   exemplo), esses campos já vêm pré-preenchidos — "Apagar tudo" não mexe no perfil, só nas
   disciplinas.
2. **Suas matérias** — cadastre pelo menos uma disciplina: nome, horas por semana, prioridade
   (Alta/Média/Baixa) e data de prova (opcional — dá pra cadastrar mais provas depois, em
   "Matérias"). **A prioridade e as horas semanais são o que determina o peso de cada matéria na
   hora de distribuir sessões** — veja a seção seguinte. Também dá pra subir uma ou várias ementas
   (PDF/texto) de uma vez aqui — a IA infere nome, carga horária e módulos de cada arquivo
   automaticamente; revise o resultado antes de confirmar.
3. **Conteúdo** — adicione os módulos de cada disciplina (nome + horas estimadas + tópicos, se
   quiser perguntas de active recall fundamentadas no conteúdo real depois). Pode pular e completar
   depois em "Matérias".
4. **Disponibilidade** — marque na grade os horários em que você pode estudar, e opcionalmente
   reserve 1 dia da semana como **dia de descanso completo** (com sugestão automática baseada na
   sua carga já marcada). Por padrão já vem marcado seg-sex às 19h e 20h; ajuste para a sua
   realidade antes de gerar o primeiro calendário. Se a bio do Passo 1 mencionar um período do dia
   ("prefiro estudar de manhã"), o app sugere marcar os horários correspondentes automaticamente —
   é sempre opt-in, nunca marca nada sozinho.

Ao concluir, o app cria as disciplinas, salva seu perfil e já tenta gerar um primeiro calendário
com IA em segundo plano — se algo falhar nesse momento, você não recebe aviso na tela; se o
calendário do Dashboard parecer estranho na primeira vez, use **"⚡ Replanejar"** lá para gerar de
novo com feedback visível.

## Como o calendário é gerado (o que importa entender)

Este é o ponto mais importante do guia. **Existem dois motores de geração diferentes**, e saber
qual está ativo muda como você deve interpretar o resultado:

### Motor 1 — Local (determinístico, sempre disponível, sem custo de IA)
É o que roda automaticamente sempre que você abre ou recarrega o Dashboard — recalculado do zero,
no navegador, a partir da disponibilidade e das disciplinas atuais salvas no banco — e também o
que assume o controle silenciosamente se a chamada à IA falhar (sem internet, sem crédito na API,
chave inválida). Ele:

1. Reserva primeiro todos os **horários fixos** (aulas presenciais, ver seção abaixo) —
   incondicionalmente, sem checar conflito entre duas matérias.
2. Calcula um **peso** por disciplina = horas/semana desejadas + bônus de prioridade
   (Alta = +2, Média = 0, Baixa = −1).
3. Distribui as sessões restantes proporcionalmente a esse peso pelos seus horários livres
   (respeitando seu dia de descanso, se você marcou um), tentando intercalar disciplinas
   diferentes (interleaving) em vez de empilhar a mesma matéria em sequência.
4. Escolhe o módulo de cada sessão: prioriza o que está "em progresso" (inclusive um módulo que
   você marcou como "não terminei — retomar depois", que monopoliza as próximas sessões daquela
   matéria até você concluir de fato); revisões espaçadas de módulos concluídos são priorizadas
   pela data real de vencimento do FSRS, não por uma rotação fixa.
5. Escolhe a metodologia de estudo com base no status do módulo, na proximidade da prova e no seu
   histórico de acertos/erros (ver tabela de metodologias abaixo).
6. Projeta quando o conteúdo pendente de cada matéria "acaba" no ritmo atual — depois disso, todo
   mundo vira revisão espaçada em vez de repetir conteúdo antigo como se fosse novo.
7. Toda sessão gerada dura **45 minutos fixos** — não há ajuste de duração por módulo/matéria (você
   pode usar o modo Pomodoro dentro da sessão pra estruturar esses 45 min em ciclos de foco/pausa).

Esse motor **não é validado por nenhum QA automático** — se duas matérias disputarem o mesmo
horário fixo, por exemplo, ele resolve silenciosamente ("a primeira cadastrada ganha") sem te
avisar.

### Motor 2 — IA (LLM local via Ollama, ou o provedor configurado), acionado ao clicar em "⚡ Replanejar"
Envia suas disciplinas, módulos e disponibilidade para o modelo, que monta o calendário seguindo
regras equivalentes às do motor local (proporcionalidade, interleaving, priorizar provas próximas,
metodologia por status do módulo e taxa de lapso) — mas com mais flexibilidade de interpretação.
Depois de gerado, um **QA automático** roda sobre o resultado e verifica:

- Calendário vazio apesar de existirem disciplinas.
- Interleaving violado (mesma matéria em dois horários seguidos no mesmo dia).
- Conflito de horário fixo entre duas disciplinas.
- Disciplina com prova em menos de 14 dias e nenhuma sessão agendada.

Se algum problema for encontrado, **você vê um toast de erro para cada um**, na tela do Dashboard,
depois de replanejar. O calendário é entregue mesmo assim (o QA avisa, não bloqueia) — trate os
toasts como uma lista de coisas para revisar manualmente. Qual modelo/provedor é usado nessa
chamada é o que você configurou em **Configurações → IA & Agentes** (ver seção própria abaixo) —
não é mais fixo no código.

**Como saber qual motor gerou o calendário que você está vendo**: o toast ao clicar em
"Replanejar" diz explicitamente — *"Calendário replanejado com IA!"* ou *"Calendário atualizado
localmente — IA indisponível..."*. Fora desse clique, é sempre o motor local.

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
**Configurações → Horários** (que também é onde você ajusta ou remove seu dia de descanso). Um
ponto que confunde:

- Salvar a disponibilidade em Configurações **não empurra uma atualização pro Dashboard que já
  está aberto na sua tela** — o motor local só recalcula do zero na próxima vez que a página do
  Dashboard é carregada (navegação nova ou recarregar), lendo a disponibilidade mais recente do
  banco nesse momento.
- **Prática recomendada**: depois de mudar sua disponibilidade em Configurações, recarregue o
  Dashboard (ou clique em "⚡ Replanejar", que também relê a disponibilidade mais recente antes de
  chamar a IA) para ver o efeito, em vez de continuar olhando a mesma aba do Dashboard que já
  estava aberta antes da mudança.

### O calendário é um modelo semanal recorrente, não um calendário com datas
O que você vê é sempre "toda segunda às 19h", não "segunda dia 12/08 às 19h". Navegar entre
semanas no Dashboard recalcula os horários daquela semana específica (a semana atual exclui dias já
passados; semanas futuras já contam com a progressão de módulos — não é o mesmo conteúdo repetido
pra sempre). Nenhum evento de calendário fica salvo por semana específica; o que fica salvo de fato
são suas disciplinas, módulos e as sessões que você realmente iniciou — mas sessões concluídas na
semana atual aparecem com um selo ✓ verde sobre o evento correspondente, e dá pra marcar um evento
como concluído direto pelo calendário (sem abrir a tela de sessão) clicando nele e usando
"✓ Marcar como concluída", pra quando você já estudou por fora do app.

## Grupos de matérias

Em **Matérias**, use "+ Novo grupo" pra criar uma categoria (ex: "Faculdade", "Curso online") e
arraste/associe disciplinas a ela. É só organização visual — apagar um grupo desagrupa as
disciplinas dele (não apaga as disciplinas), e nenhuma lógica de geração de calendário lê o grupo
de uma matéria.

## Múltiplas provas/avaliações por matéria

Cada disciplina pode ter várias avaliações cadastradas (nome, data, peso opcional) em vez de uma
única data de prova — abra a disciplina em **Matérias** e use a seção "Provas e avaliações". O
resto do app (urgência no card da matéria, guia de progresso, priorização de Active Recall) sempre
usa a avaliação futura mais próxima da lista. Se uma disciplina antiga ainda não tem nenhuma
avaliação cadastrada na tabela nova, o app cai de volta pra data de prova legada dela — nada quebra
por não migrar matérias antigas.

## Metodologias de estudo

A tela **Metodologias** lista 8 técnicas, cada uma com explicação completa, quando usar, avaliação
de eficácia e passo a passo. A maior parte delas já é atribuída automaticamente pelo agente
pedagógico, por um critério real (não aleatório):

| Metodologia | Atribuída automaticamente? | Quando aparece |
|---|---|---|
| 🔁 Repetição Espaçada | Sim | Módulo já concluído, dentro do prazo do FSRS — sessão de revisão |
| 🧠 Active Recall | Sim | Módulo em progresso, prova em menos de 14 dias, ou parte do ciclo de "em progresso" (ver Prática Deliberada abaixo) |
| 🛠 Prática Deliberada | Sim | Módulo pendente (primeiro contato), **ou** qualquer módulo com taxa de lapso alta (>40% de revisões erradas) — mesmo já tendo sido "concluído", uma taxa de erro alta faz o app preferir prática ativa a revisão passiva |
| 🗣 Técnica de Feynman | Sim (parcial) | Ciclo de módulos "em progresso" (junto com Active Recall e Aprendizagem por Problemas) |
| 🗺 Mapas Mentais | Sim (critério restrito) | Módulo pendente com 4+ tópicos cadastrados — material com muitos subtópicos interligados se beneficia de organizar antes de praticar |
| 📐 Aprendizagem por Problemas | Sim (parcial) | Ciclo de módulos "em progresso" — aplicar a um problema real encaixa melhor quando já existe alguma base |
| 🔀 Interleaving | Não é rotulado como "metodologia da sessão" | O motor *aplica* interleaving na distribuição das sessões (intercala matérias), mas isso é sobre a ordem das sessões, não sobre o que fazer dentro de uma — não aparece como rótulo |
| ⏱ Pomodoro | Não é atribuída pelo agendador | É uma técnica estrutural (organiza *quando/quanto tempo* estudar), não de conteúdo — disponível como modo de timer opcional dentro de qualquer sessão, independente da metodologia escolhida pra ela |

Vale abrir a tela Metodologias e ler o passo a passo de cada uma antes de uma sessão — o conteúdo
lá é completo e fundamentado na base de evidência do projeto (Dunlosky et al. 2013 e outras
referências citadas na skill interna `study-methodology-mentor`).

## Usando a tela de Sessão

Você chega em uma sessão clicando em um evento no calendário e depois em "▶ Iniciar sessão" (ou
pelo card de uma disciplina). Isso cria o registro da sessão no banco *no momento em que você
inicia* — não no horário original do slot do calendário.

- **Timer**: play/pause, reset, pular, ou troque pro **modo Pomodoro** (ciclo de 25 min de foco /
  5 min de pausa, com transição automática e contagem de ciclos completos). Atalho de teclado:
  `Espaço` (play/pause, segue o modo ativo), `F` (modo foco em tela cheia), `Esc` (sair do modo
  foco), `→` (próxima pergunta de active recall).
- **Checklist**: "Revisar anotações", "Praticar exercícios", "Active recall final" — é só um guia
  visual, não é salvo nem afeta nada além da própria tela.
- **Active Recall**: se o módulo tem tópicos cadastrados, as 3 perguntas são geradas pela IA com
  base nesse conteúdo real (não genéricas); sem tópicos, ou se a chamada à IA falhar, cai num
  template genérico — a sessão nunca trava esperando a IA. Depois de responder e clicar
  "Verificar", a resposta é avaliada por IA como certa/incompleta com um feedback curto (se essa
  chamada falhar, sua resposta continua sendo registrada, só sem o veredito).
- **Concluir sessão**: registra a sessão como concluída, aplica o resultado ao FSRS (data da
  próxima revisão daquele módulo é recalculada de verdade a partir da sua autoavaliação de recall)
  e volta ao Dashboard.
- **Não terminei — retomar depois**: se você estudou mas não terminou o módulo, use este botão em
  vez de forçar uma conclusão. A sessão ainda conta pro seu tempo estudado/streak, mas **não**
  gera uma nota de recall falsa nem mexe no FSRS — o módulo só é marcado "em progresso" e volta a
  ser priorizado nas próximas sessões dessa matéria até você realmente concluir.

Se você sair da tela de sessão sem concluir nem clicar em "retomar depois", uma barra fica visível
no topo de qualquer outra tela do app enquanto a sessão continua ativa, com atalhos pra "Continuar"
(volta direto pra sessão) ou "✓ Concluir" (completa sem precisar reabrir a tela cheia).

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
| Horários → disponibilidade | Funciona — releia a seção "Disponibilidade" acima: o efeito aparece na próxima vez que o Dashboard carregar, não instantaneamente na aba já aberta |
| Horários → dia de descanso | Funciona — some das sessões geradas por ambos os motores, com nota explícita passada pro motor via IA também |
| IA & Agentes → Base URL / Chave / Modelo | **Funciona de verdade** — troca o provedor/modelo usado por todas as chamadas de IA do app (Orchestrator, geração de calendário via IA, parser de ementa, geração/correção de active recall), sem precisar editar `.env.local` nem reiniciar o servidor. Use "Testar conexão" pra validar antes de salvar |
| IA & Agentes → Agressividade do replanejamento | Preferência salva, **não é lida por nenhuma parte da geração de calendário** ainda |
| IA & Agentes → toggles de Curriculum/Pedagogy/Progress/QA Agent | Preferência salva, **não desativam de fato o agente correspondente** — por exemplo, desligar "QA Agent" aqui não impede o QA de rodar |
| Manutenção → Corrigir progresso | Funciona — recalcula o % de conclusão de todas as matérias a partir dos módulos realmente marcados como concluídos, útil se o progresso ficou dessincronizado |
| Zona de risco → Apagar tudo | Funciona — remove matérias/módulos/grupos/sessões, mas preserva seu perfil e suas preferências (você reentra pelo onboarding com nome/bio/disponibilidade já preenchidos, não do zero) |

Não é bug o app deixar você configurar Notificações/Agressividade/toggles de agente sem efeito
ainda — é trabalho futuro já mapeado no roadmap do projeto. A recomendação prática: não gaste tempo
ajustando essas três coisas esperando um efeito visível.

## Agentes de IA — ver o status real

A tela **Agentes de IA** (separada de Configurações) mostra o status ao vivo da conexão com o LLM
configurado (endpoint, modelo, latência de resposta), um botão pra testar o Orchestrator de ponta a
ponta com uma mensagem mínima real, e uma lista dos agentes do sistema com o que cada um faz de
fato — inclusive marcando quais são 100% lógica local determinística, sem IA nenhuma (Pedagogy,
Scheduler, Progress), versus os que realmente dependem de um LLM (Orchestrator, Curriculum). Use
essa tela, não os toggles de Configurações, quando quiser saber se um agente está "ativo" de
verdade.

**"Ativo" não quer dizer "responde ao que você pede no chat"** — é uma confusão fácil de fazer
olhando a lista. Só o **Orchestrator** tem tool-calling de verdade, e só pra 7 ações específicas:
cadastrar/editar/remover uma matéria, adicionar um módulo, mudar o status de um módulo, fixar um
horário, e mudar disponibilidade. Peça uma dessas 7 no chat ("marca terça às 19h como indisponível",
"adiciona uma matéria de Cálculo com 4h/semana") e o Orchestrator executa de verdade.

O que **não** dá pra pedir no chat, mesmo com os outros agentes marcados "ativo":
- **Curriculum Agent** só roda quando você faz upload de um PDF/texto de ementa na tela Matérias —
  não tem como processar uma ementa só descrevendo ela no chat.
- **Pedagogy Agent** e **Scheduler Agent** rodam automaticamente dentro da geração do calendário —
  não são acionáveis por um pedido isolado.
- **Progress Agent** só calcula quando você abre `/progress` ou o Dashboard.
- **QA Agent** só valida quando o motor via IA gera um calendário (clique em "⚡ Replanejar").
- **Replanejar o calendário em si não é uma das 7 ações** — mesmo pedindo no chat, ainda precisa
  clicar no botão "⚡ Replanejar" pra disparar isso de verdade.

## O que ainda não faz o que parece fazer (para você não estranhar)

- **Notificações** (lembrete de sessão, relatório semanal, revisão atrasada, streak em risco,
  silêncio noturno) são só preferências salvas — nenhum disparo automático existe ainda.
- **"Agressividade do replanejamento"** e os **toggles de ativar/desativar agente** em
  Configurações → IA & Agentes são salvos mas não têm efeito funcional ainda.
- **E-mail** em Configurações → Perfil não é salvo em lugar nenhum.
- Fora isso, o núcleo do app — geração de calendário (os dois motores), sessão de estudo com active
  recall fundamentado em conteúdo real e corrigido por IA, FSRS conectado de ponta a ponta, e
  configuração de provedor de IA — já reflete o que a interface promete.

## Resumo — como tirar o melhor proveito hoje

1. Cadastre horas semanais e prioridade de forma realista — é isso que decide quanto espaço cada
   matéria ganha na distribuição proporcional.
2. Cadastre tópicos nos módulos que puder — é o que permite perguntas de active recall
   fundamentadas no conteúdo real em vez do template genérico.
3. Use horário fixo só para compromissos que realmente se repetem toda semana, e confie no motor
   local (não no "Replanejar") para garanti-lo sem conflito.
4. Depois de mudar disponibilidade em Configurações, recarregue o Dashboard (ou clique em
   "Replanejar") para ver o efeito — a aba que já estava aberta antes não atualiza sozinha.
5. Preste atenção nos toasts de erro do QA depois de replanejar — são avisos reais, não decoração.
6. Na sessão, invista tempo de verdade nas perguntas de active recall antes de olhar qualquer
   material — é a parte com base científica mais forte, e agora tem correção real por IA. Use
   "Não terminei — retomar depois" em vez de forçar uma conclusão que geraria dado falso no FSRS.
7. Configure seu provedor de IA em Configurações → IA & Agentes se não quiser depender do Ollama
   local, e confira a tela **Agentes de IA** pra ver o status real da conexão a qualquer momento.
8. Ignore por enquanto Notificações e os toggles de "ativar agente"/"agressividade" em IA &
   Agentes — ainda não têm efeito funcional comprovado.
