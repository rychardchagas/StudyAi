import type { ReactNode } from "react";

export const metadata = { title: "Como usar — StudyAI" };

const engines = [
  {
    title: "Motor local (sempre ativo)",
    badge: "Padrão",
    badgeClass: "bg-card2 text-muted",
    points: [
      "Roda automaticamente sempre que você abre o Dashboard, e também assume o controle silenciosamente se a chamada de IA falhar (sem internet, sem crédito, chave inválida).",
      "Reserva primeiro os horários fixos, depois distribui o restante proporcionalmente ao peso de cada matéria (horas/semana + bônus de prioridade).",
      "Toda sessão gerada dura 45 minutos fixos.",
      "Não passa por nenhuma validação de qualidade (QA) — conflitos são resolvidos silenciosamente.",
    ],
  },
  {
    title: "Motor via IA (Claude)",
    badge: "⚡ Replanejar",
    badgeClass: "bg-primary/15 text-primary",
    points: [
      "Só roda quando você clica em \"⚡ Replanejar\" no Dashboard.",
      "Envia suas matérias, módulos e disponibilidade para o modelo, que monta o calendário com mais flexibilidade de interpretação.",
      "Depois de gerado, um QA automático verifica: calendário vazio, interleaving violado, conflito de horário fixo, prova próxima sem sessão.",
      "Problemas encontrados aparecem como toasts de erro na tela — são avisos reais, o calendário é entregue mesmo assim.",
    ],
  },
];

const settingsReality: Array<[string, string, boolean]> = [
  ["Perfil → nome, bio", "Funciona, usado para personalizar respostas da IA", true],
  ["Perfil → e-mail", "Cosmético — não é salvo em lugar nenhum", false],
  ["Notificações (todos os toggles)", "Preferência salva, envio ainda não implementado", false],
  ["Horários (disponibilidade)", "Funciona — mas precisa reabrir o Dashboard ou clicar em Replanejar pra valer", true],
  ["IA & Agentes → Modelo principal", "Preferência salva, mas o backend sempre usa o mesmo modelo", false],
  ["IA & Agentes → Agressividade do replanejamento", "Preferência salva, não é lida pela geração ainda", false],
  ["IA & Agentes → toggles de agentes", "Preferência salva, não desativam o agente de fato", false],
];

const methodologies: Array<[string, string]> = [
  ["🔁 Repetição Espaçada", "Automática — módulo já concluído, sessão de revisão"],
  ["🧠 Active Recall", "Automática — módulo em progresso, ou prova em menos de 14 dias"],
  ["🛠 Prática Deliberada", "Automática — módulo ainda pendente"],
  ["🗣 Técnica de Feynman", "Automática, ocasionalmente, em módulos em progresso"],
  ["🔀 Interleaving", "Só no motor via IA — o local aplica interleaving na distribuição, mas não rotula a sessão assim"],
  ["⏱ Pomodoro / 🗺 Mapas Mentais / 📐 Aprendizagem por Problemas", "Só como referência na tela Metodologias — use por conta própria"],
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-4 mb-4">
      <h2 className="text-sm font-bold text-txt mb-2.5">{title}</h2>
      {children}
    </section>
  );
}

export default function HelpPage() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[720px] mx-auto">
        <div className="mb-5">
          <div className="font-mono text-[10px] font-semibold tracking-[0.1em] uppercase text-muted mb-0.5">
            Guia
          </div>
          <div className="text-lg font-bold text-txt mb-1">Como usar o StudyAI</div>
          <div className="text-xs text-dim">
            Como o calendário é gerado de verdade, e o que cada tela e configuração realmente faz hoje.
          </div>
        </div>

        <Section title="Visão geral">
          <p className="text-[13px] text-dim leading-relaxed">
            O StudyAI organiza seus estudos em quatro conceitos: <strong className="text-txt">disciplinas</strong>{" "}
            (suas matérias, com horas semanais e prioridade), <strong className="text-txt">módulos</strong>{" "}
            (os tópicos dentro de cada uma, com status pendente/em progresso/concluído), o{" "}
            <strong className="text-txt">calendário</strong> (uma grade semanal recorrente, não datas
            específicas) e as <strong className="text-txt">sessões</strong> (o momento real em que você estuda,
            com timer e active recall).
          </p>
        </Section>

        <Section title="Como o calendário é gerado">
          <p className="text-[13px] text-dim leading-relaxed mb-3">
            Existem <strong className="text-txt">dois motores diferentes</strong>. Saber qual gerou o
            calendário que você está vendo muda como interpretar o resultado — o toast ao clicar em
            “Replanejar” sempre diz qual foi usado.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {engines.map((e) => (
              <div key={e.title} className="bg-card2 border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-txt">{e.title}</div>
                  <span className={`font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded ${e.badgeClass}`}>
                    {e.badge}
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {e.points.map((p, i) => (
                    <li key={i} className="text-[11px] text-dim leading-relaxed pl-3 relative before:content-['—'] before:absolute before:left-0 before:text-muted">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Horário fixo e disponibilidade">
          <ul className="flex flex-col gap-2.5">
            <li className="text-[13px] text-dim leading-relaxed">
              <strong className="text-txt">Horário fixo</strong> (em Matérias → editar) é pra um compromisso
              que se repete toda semana, como uma aula presencial. Ele é sempre garantido no motor local —
              no motor via IA é só mais um dado no prompt, o modelo tende a respeitar mas não é garantido.
              Se duas matérias competem pelo mesmo horário fixo, o app não impede o cadastro — revise você
              mesmo, o aviso automático (QA) só aparece quando você usa o motor via IA.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              <strong className="text-txt">Disponibilidade</strong> (Configurações → Horários) define seus
              horários livres. Salvar ali <strong className="text-txt">não regenera o calendário sozinho</strong>,
              mesmo que o aviso na tela sugira isso — depois de mudar, volte ao Dashboard e clique em
              “Replanejar” para ver o efeito.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              O calendário é sempre um <strong className="text-txt">modelo semanal recorrente</strong> — a
              mesma grade se repete toda semana. Navegar entre semanas no Dashboard só troca as datas
              exibidas como rótulo.
            </li>
          </ul>
        </Section>

        <Section title="Metodologias — quais são automáticas">
          <div className="flex flex-col">
            {methodologies.map(([name, note]) => (
              <div key={name} className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3 py-1.5 border-b border-white/[0.04] last:border-b-0">
                <span className="text-xs font-medium text-txt sm:w-[280px] shrink-0">{name}</span>
                <span className="text-[11px] text-muted">{note}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2.5">
            Abra a tela <strong>Metodologias</strong> para o passo a passo completo de cada uma — vale a
            pena mesmo sabendo que a escolha automática cobre só uma parte.
          </p>
        </Section>

        <Section title="Usando a tela de Sessão">
          <ul className="flex flex-col gap-1.5">
            <li className="text-[13px] text-dim leading-relaxed">
              Você chega numa sessão clicando em um evento do calendário ou no botão “▶ Estudar” de uma
              matéria — isso cria o registro da sessão no momento em que você inicia, não no horário
              original do slot.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              Atalhos: <kbd className="font-mono text-[10px] bg-card2 border border-border rounded px-1">Espaço</kbd>{" "}
              play/pause, <kbd className="font-mono text-[10px] bg-card2 border border-border rounded px-1">F</kbd>{" "}
              modo foco, <kbd className="font-mono text-[10px] bg-card2 border border-border rounded px-1">Esc</kbd>{" "}
              sair do foco, <kbd className="font-mono text-[10px] bg-card2 border border-border rounded px-1">→</kbd>{" "}
              próxima pergunta de active recall.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              Escreva de verdade nas perguntas de active recall antes de checar qualquer coisa — é a parte
              da tela com mais evidência de eficácia real. O checklist é só apoio visual.
            </li>
          </ul>
        </Section>

        <Section title="Configurações — o que já tem efeito real">
          <div className="flex flex-col">
            {settingsReality.map(([label, note, works]) => (
              <div key={label} className="flex items-start gap-2.5 py-1.5 border-b border-white/[0.04] last:border-b-0">
                <span className={`mt-0.5 text-[10px] shrink-0 ${works ? "text-success" : "text-muted"}`}>
                  {works ? "✓" : "○"}
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-txt">{label}</div>
                  <div className="text-[11px] text-muted">{note}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted mt-2.5">
            Não é bug o app deixar você configurar essas coisas — é trabalho futuro já mapeado no roadmap.
            Não gaste tempo esperando efeito visível dos itens marcados com ○.
          </p>
        </Section>

        <Section title="Resumo — como tirar o melhor proveito hoje">
          <ol className="flex flex-col gap-1.5 list-decimal list-inside">
            <li className="text-[13px] text-dim leading-relaxed">
              Cadastre horas semanais e prioridade de forma realista — é isso que decide o espaço de cada
              matéria na distribuição.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              Use horário fixo só para compromissos reais, e confie no motor local (não no “Replanejar”)
              pra garanti-lo sem conflito.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              Depois de mudar disponibilidade, sempre clique em “Replanejar” pra ver o efeito.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              Preste atenção nos toasts de erro do QA depois de replanejar — são avisos reais.
            </li>
            <li className="text-[13px] text-dim leading-relaxed">
              Na sessão, invista tempo de verdade nas perguntas de active recall.
            </li>
          </ol>
        </Section>
      </div>
    </div>
  );
}
