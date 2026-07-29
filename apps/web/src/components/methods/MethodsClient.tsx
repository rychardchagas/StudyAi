"use client";

import { useState } from "react";

interface Method {
  id: string;
  icon: string;
  name: string;
  tagline: string;
  color: string;
  colorD: string;
  ef: string;
  w: string;
  wh: string;
  h: string[];
  sc: string;
}

const MD: Method[] = [
  {
    id: "espacada",
    icon: "🔁",
    name: "Repetição Espaçada",
    tagline: "Revisar no momento exato antes de esquecer",
    color: "#3B82F6",
    colorD: "rgba(59,130,246,.12)",
    ef: "★★★ Altíssima — memorização de longo prazo",
    w: "Revisa em intervalos crescentes: 1→3→7→15→30 dias. O algoritmo FSRS calcula o intervalo ideal para cada card com base na dificuldade histórica.",
    wh: "Vocabulário, fórmulas, definições, teoremas — qualquer conteúdo de longo prazo.",
    h: [
      "Estude o conteúdo pela primeira vez",
      "Crie um flashcard (pergunta/resposta)",
      "O sistema agenda a revisão no momento certo",
      "Avalie: fácil/ok/difícil — o intervalo ajusta",
      "Com o tempo o intervalo chega a semanas",
    ],
    sc: "A memória consolida durante o sono. Revisar 24h depois é mais eficaz do que logo após aprender.",
  },
  {
    id: "recall",
    icon: "🧠",
    name: "Active Recall",
    tagline: "Forçar o cérebro a buscar — não a reconhecer",
    color: "#22C55E",
    colorD: "rgba(34,197,94,.1)",
    ef: "★★★ Altíssima — melhor ROI por minuto",
    w: "Feche tudo e tente recordar ativamente. Pode ser flashcards, perguntas para si mesmo, ou escrever o que lembra sem consultar nada.",
    wh: "Em todas as revisões. Substitui releitura passiva e aumenta retenção em até 2×.",
    h: [
      "Estude o material normalmente",
      "Feche o livro completamente",
      "Escreva tudo que lembra",
      "Compare com o original — marque os erros",
      "Foque a próxima revisão nos pontos errados",
    ],
    sc: "O esforço de tentar recordar — mesmo falhando — fortalece a memória mais do que reler a resposta.",
  },
  {
    id: "interleaving",
    icon: "🔀",
    name: "Interleaving",
    tagline: "Misturar matérias estrategicamente",
    color: "#06B6D4",
    colorD: "rgba(6,182,212,.1)",
    ef: "★★★ Altíssima para provas com múltiplos assuntos",
    w: "Alterna entre disciplinas ou tópicos na mesma sessão. Parece mais difícil — e é. Essa dificuldade extra é o que consolida o aprendizado.",
    wh: "Quando você tem 2+ matérias. Especialmente útil antes de provas com múltiplos assuntos.",
    h: [
      "Planeje sessões com 2-3 matérias",
      "Estude 25–40 min de uma matéria",
      "Troque sem finalizar o tópico anterior",
      "Volte para a primeira depois de um intervalo",
      "Observe como o retorno parece mais difícil — isso é bom",
    ],
    sc: "Melhora a discriminação entre conceitos parecidos. Estudantes performam até 43% melhor em testes com múltiplos assuntos.",
  },
  {
    id: "feynman",
    icon: "🗣",
    name: "Técnica de Feynman",
    tagline: "Se não consegue explicar simples, não entendeu",
    color: "#F59E0B",
    colorD: "rgba(245,158,11,.1)",
    ef: "★★☆ Alta para compreensão profunda",
    w: "Explique o conceito como se estivesse ensinando alguém que nunca ouviu falar. Onde você travar ou usar jargão — são seus pontos cegos.",
    wh: "Para entender conceitos complexos: algoritmos, teoremas, leis. Não para memorização pura.",
    h: [
      "Escreva o nome do conceito no topo",
      "Explique em linguagem simples",
      "Identifique onde travou ou usou jargão",
      "Volte ao material só nesses pontos",
      "Repita até explicar sem notas",
    ],
    sc: "Richard Feynman (Nobel de Física) usava isso para mapear lacunas no próprio conhecimento.",
  },
  {
    id: "pomodoro",
    icon: "⏱",
    name: "Pomodoro",
    tagline: "25 min de foco real valem mais que 3h vagando",
    color: "#EF4444",
    colorD: "rgba(239,68,68,.1)",
    ef: "★★☆ Alta para consistência diária",
    w: "25 min de foco total, 5 min de pausa. A cada 4 pomodoros, pausa longa de 15–30 min. A unidade é o pomodoro — não a hora.",
    wh: "Qualquer sessão de estudo. Especialmente quando você tende a procrastinar.",
    h: [
      "Decida a tarefa exata",
      "Remova distrações (silenciar tudo)",
      "25 min de foco total",
      "Ao tocar: marque ✓ e descanse 5 min",
      "A cada 4 ✓: pausa de 15–30 min",
    ],
    sc: "Lei de Parkinson: o trabalho expande para preencher o tempo disponível. Limitar o tempo força o foco.",
  },
  {
    id: "pratica",
    icon: "🛠",
    name: "Prática Deliberada",
    tagline: "Resolver problemas no limite da sua competência",
    color: "#F97316",
    colorD: "rgba(249,115,22,.1)",
    ef: "★★★ Essencial para matérias com exercícios",
    w: "Não é praticar o que você já sabe — é praticar exatamente no limite da sua competência, com feedback imediato.",
    wh: "Algoritmos, matemática, física, programação. Depois de entender a teoria básica.",
    h: [
      "Identifique o tipo de problema que você ainda erra",
      "Faça 5–10 exercícios desse tipo",
      "Verifique cada resposta imediatamente",
      "Analise o erro — conceito, cálculo ou interpretação?",
      "Repita até dominar",
    ],
    sc: "Anders Ericsson: 1.000h de prática deliberada superam 10.000h de prática aleatória.",
  },
  {
    id: "mindmap",
    icon: "🗺",
    name: "Mapas Mentais",
    tagline: "Organizar o conhecimento como o cérebro funciona",
    color: "#8B5CF6",
    colorD: "rgba(139,92,246,.12)",
    ef: "★★☆ Alta para revisão panorâmica",
    w: "Conceito central no meio, ramificações para tópicos principais, sub-ramos com detalhes. Use cores e conexões visuais.",
    wh: "Para revisar uma matéria inteira antes de provas. Para conectar conceitos de diferentes módulos.",
    h: [
      "Escreva o tema central no meio",
      "Crie ramos para grandes tópicos",
      "Adicione sub-ramos com detalhes",
      "Use cores diferentes por área",
      "Conecte ramos de áreas diferentes com setas",
    ],
    sc: "Ativa o pensamento associativo — como o hipocampo organiza memórias de longo prazo.",
  },
  {
    id: "pbl",
    icon: "📐",
    name: "Aprendizagem por Problemas",
    tagline: "Aprender o que você precisa para resolver um problema real",
    color: "#14B8A6",
    colorD: "rgba(20,184,166,.1)",
    ef: "★★☆ Alta para retenção com contexto",
    w: "Começa com um problema real. A necessidade de resolvê-lo guia o que você precisa aprender — motivação e contexto integrados.",
    wh: "Engenharia, medicina, programação, negócios. Quando você tem projetos reais ou simulados.",
    h: [
      "Encontre um problema real relacionado ao conteúdo",
      "Tente resolver com o que já sabe",
      "Estude o que falta para os pontos de travamento",
      "Volte ao problema com o novo conhecimento",
      "Documente e generalize para problemas similares",
    ],
    sc: "Contexto é memória. Conceitos aprendidos para resolver um problema são retidos muito melhor do que abstratos.",
  },
];

export function MethodsClient() {
  const [sel, setSel] = useState<string | null>(null);
  const m = sel ? MD.find((x) => x.id === sel) : undefined;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mb-4">
        <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">
          Referência
        </div>
        <div className="mb-1 text-lg font-bold text-txt">Metodologias de Aprendizagem</div>
        <div className="text-xs leading-relaxed text-dim">
          Guia das técnicas aplicadas pelo Pedagogy Agent. Clique para ver como usar na prática.
        </div>
      </div>

      {!sel && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-2.5">
          {MD.map((md) => (
            <div
              key={md.id}
              onClick={() => setSel(md.id)}
              className="relative cursor-pointer overflow-hidden rounded-[10px] border border-border bg-card p-3.5"
            >
              <div className="absolute left-0 right-0 top-0 h-0.5" style={{ background: md.color }} />
              <div className="mb-1.5 flex items-start gap-2.5">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-base"
                  style={{ background: md.colorD }}
                >
                  {md.icon}
                </div>
                <div>
                  <div className="mb-0.5 text-xs font-bold text-txt">{md.name}</div>
                  <div className="text-[11px] leading-snug text-muted">{md.tagline}</div>
                </div>
              </div>
              <div className="mb-2 text-[11px] leading-relaxed text-dim">{md.w.slice(0, 90)}…</div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[9px]" style={{ color: md.color }}>
                  {md.ef}
                </span>
                <span className="text-[11px] text-primary">Ver →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {sel && m && (
        <div>
          <button
            onClick={() => setSel(null)}
            className="cursor-pointer border-none bg-transparent p-0 pb-4 font-sans text-xs text-muted hover:text-dim"
          >
            ← Voltar
          </button>
          <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[1fr_300px]">
            <div>
              <div
                className="mb-3 rounded-xl border p-5"
                style={{ background: m.colorD, borderColor: `${m.color}33` }}
              >
                <div className="mb-2.5 flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-2xl"
                    style={{ background: `${m.color}22` }}
                  >
                    {m.icon}
                  </div>
                  <div>
                    <div className="mb-0.5 text-lg font-bold text-txt">{m.name}</div>
                    <div className="text-xs italic text-dim">{m.tagline}</div>
                  </div>
                </div>
                <span
                  className="rounded-full border px-2.5 py-0.5 font-mono text-[10px]"
                  style={{ color: m.color, background: `${m.color}15`, borderColor: `${m.color}33` }}
                >
                  {m.ef}
                </span>
              </div>

              {([
                ["O que é", m.w],
                ["Quando usar", m.wh],
              ] as const).map(([t, v]) => (
                <div key={t} className="mb-2.5 rounded-[9px] border border-border bg-card p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-txt">
                    <span style={{ color: m.color }}>●</span>
                    {t}
                  </div>
                  <div className="text-xs leading-relaxed text-dim">{v}</div>
                </div>
              ))}

              <div className="rounded-[9px] border border-border bg-card p-3">
                <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-txt">
                  <span style={{ color: m.color }}>●</span>
                  Passo a passo
                </div>
                {m.h.map((step, i) => (
                  <div key={i} className="mb-1.5 flex items-start gap-2.5">
                    <div
                      className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border font-mono text-[10px] font-semibold"
                      style={{ background: m.colorD, borderColor: `${m.color}44`, color: m.color }}
                    >
                      {i + 1}
                    </div>
                    <div className="pt-0.5 text-xs leading-snug text-dim">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2.5 rounded-[9px] border border-secondary/20 bg-secondary/10 p-3.5">
                <div className="mb-1.5 text-[11px] font-semibold text-secondary">🧬 Por que funciona</div>
                <div className="text-xs leading-relaxed text-dim">{m.sc}</div>
              </div>
              <div className="rounded-[9px] border border-border bg-card p-3">
                <div className="mb-2 text-[11px] font-semibold text-txt">Outras metodologias</div>
                {MD.filter((x) => x.id !== sel)
                  .slice(0, 5)
                  .map((x) => (
                    <div
                      key={x.id}
                      onClick={() => setSel(x.id)}
                      className="mb-0.5 flex cursor-pointer items-center gap-1.5 rounded-md p-1.5 hover:bg-card2"
                    >
                      <span className="text-sm">{x.icon}</span>
                      <div className="flex-1">
                        <div className="text-[11px] text-txt">{x.name}</div>
                        <div className="text-[10px] text-muted">{x.ef}</div>
                      </div>
                      <span className="text-[10px] text-primary">→</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
