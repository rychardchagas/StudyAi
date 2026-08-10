# Como instalar a IA local do StudyAI — guia simples

Este guia é para quem **não é da área de tecnologia** e só quer deixar a parte de Inteligência
Artificial do StudyAI funcionando. Não é preciso saber programar nem mexer em código — só baixar
um programa, instalar como qualquer outro, e colar um comando uma única vez.

> Já existe uma versão técnica desse assunto em `docs/GETTING_STARTED.md`, voltada pra quem vai
> desenvolver o app. Este guia aqui é a versão para quem só vai *usar* o StudyAI.

## O que é isso e por que eu preciso?

O StudyAI usa uma IA (parecida com o ChatGPT) para montar seu calendário de estudos, criar
perguntas de revisão e conversar com você sobre suas matérias. Só que, em vez de usar a IA de uma
empresa na internet, o StudyAI roda essa IA **direto no seu computador**, através de um programa
gratuito chamado **Ollama**. Isso tem duas vantagens: é de graça e seus dados nunca saem da sua
máquina.

Sem o Ollama instalado e rodando, o app ainda funciona (o calendário continua sendo montado por
conta própria), mas os recursos que dependem da IA — replanejar com IA, conversar com o
Orchestrator, perguntas de revisão baseadas no conteúdo real, correção de active recall — não
funcionam.

## O que você vai precisar

- Windows ou Mac (o Ollama funciona nos dois)
- Cerca de **5 GB de espaço livre** no computador
- Uma internet razoável (vai baixar um arquivo grande, uma vez só)
- Uns **10 a 15 minutos**, a maior parte é só esperar o download

## Passo 1 — Baixar e instalar o Ollama

1. Abra o navegador (Chrome, Edge, etc.) e acesse **ollama.com**
2. Clique no botão **Download**
3. O site já identifica se você está no Windows ou no Mac e mostra o botão certo — clique nele
4. Abra o arquivo baixado:
   - **Windows**: dá dois cliques no arquivo baixado (algo como `OllamaSetup.exe`) e clique em
     "Instalar"/"Install". Não precisa mudar nenhuma opção.
   - **Mac**: dá dois cliques no arquivo `.dmg` baixado, e arraste o ícone do Ollama para a pasta
     Applications.
5. Depois de instalado, o Ollama já fica rodando sozinho — procure o ícone dele na bandeja do
   sistema (perto do relógio, no Windows) ou na barra de menus (no Mac). Ele fica ligado em segundo
   plano; você não precisa abrir nada toda vez.

## Passo 2 — Baixar o "cérebro" da IA (uma vez só)

O Ollama sozinho não faz nada — ele precisa de um "modelo" pra usar, que é o cérebro de verdade da
IA. Isso exige colar **um único comando** numa telinha preta chamada terminal. Parece assustador
mas é só copiar e colar.

**No Windows:**
1. Clique no botão Iniciar (ou aperte a tecla Windows)
2. Digite `PowerShell` e aperte Enter
3. Vai abrir uma janela azul ou preta — é aqui que você vai colar o comando

**No Mac:**
1. Aperte `Cmd + Espaço` ao mesmo tempo
2. Digite `Terminal` e aperte Enter
3. Vai abrir uma janela preta — é aqui que você vai colar o comando

**Agora, na janela que abriu, cole este comando e aperte Enter:**

```
ollama pull qwen2.5:7b
```

(Para colar: `Ctrl+V` no Windows, `Cmd+V` no Mac)

Isso vai baixar o modelo de IA — um arquivo de uns 4-5 GB, então pode demorar alguns minutos
dependendo da sua internet. Você vai ver uma barra de progresso na tela. Quando terminar, a
janela volta a mostrar o cursor piscando — pode fechar essa janela, terminou.

## Passo 3 — Conferir que deu certo

Ainda na mesma janela (ou abrindo uma nova, do jeito do Passo 2), cole:

```
ollama list
```

Se aparecer `qwen2.5:7b` na lista, está tudo certo.

## Passo 4 — Conectar o StudyAI à IA

1. Abra o StudyAI no navegador
2. No menu do lado esquerdo, clique em **Configurações**
3. Clique na aba **IA & Agentes**
4. O StudyAI já vem configurado por padrão pra usar o Ollama local — confira se está marcado o
   botão **"Ollama local (padrão)"**
5. Clique em **"Testar conexão"**
6. Se aparecer uma mensagem verde com um ✓, terminou — a IA já está funcionando no StudyAI

## Pronto! O que muda agora

Com a IA conectada, esses recursos passam a funcionar de verdade:

- O botão **"⚡ Replanejar"** no calendário passa a usar IA pra reorganizar suas sessões
- O **chat com o Orchestrator** (no Dashboard) responde de verdade sobre suas matérias
- As **perguntas de revisão** na sessão de estudo passam a ser baseadas no conteúdo real dos
  seus módulos, não perguntas genéricas
- A **correção do active recall** (se você acertou ou errou o que respondeu) fica mais precisa

## Problemas comuns

**"Testar conexão" deu erro / não conecta**
Confira se o Ollama está mesmo aberto — procure o ícone dele perto do relógio (Windows) ou na
barra de menus (Mac). Se não estiver lá, abra o programa Ollama de novo (procure "Ollama" no menu
Iniciar ou no Launchpad) e tente testar de novo.

**O download do modelo (Passo 2) está muito lento**
É normal — são vários gigabytes. Deixe rodando em segundo plano enquanto faz outra coisa.

**Meu computador ficou lento depois de instalar**
O modelo de IA precisa de bastante memória (pelo menos 8 GB de RAM livre) pra rodar bem. Se seu
computador for mais simples, veja a alternativa abaixo.

**Não tenho um computador forte o suficiente / não quero instalar nada local**
Dá pra usar um provedor de IA na nuvem em vez do Ollama — mais simples de configurar (só uma
chave, sem instalar nada), mas os dados passam a trafegar pela internet até esse provedor. Na
mesma tela (Configurações → IA & Agentes), clique no botão **"Groq (nuvem)"** em vez de "Ollama
local" — é gratuito com limites generosos. Você vai precisar criar uma conta de graça em
console.groq.com e colar a chave gerada lá no campo "Chave de API" do StudyAI.

## Onde pedir ajuda

Se travar em algum passo, tire um print da tela e mande pra quem te passou o StudyAI — geralmente
o problema é só o Ollama não estar aberto, ou o comando do Passo 2 ainda não ter terminado de
baixar.
