"use client";
import { useCallback, useEffect, useState } from "react";
import { Bot, Brain, CalendarClock, CheckCircle2, FileText, TrendingUp, Bell, ShieldCheck, XCircle, RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface HealthResult {
  reachable: boolean;
  baseUrl: string;
  model: string;
  modelAvailable?: boolean;
  availableModels?: string[];
  code?: string;
  message?: string;
  latencyMs: number;
}

interface AgentInfo {
  Icon: LucideIcon;
  name: string;
  file: string;
  usesLlm: boolean;
  status: "ativo" | "planejado";
  description: string;
}

const AGENTS: AgentInfo[] = [
  {
    Icon: Bot,
    name: "Orchestrator",
    file: "app/api/agents/route.ts",
    usesLlm: true,
    status: "ativo",
    description: "Assistente de chat do Dashboard — interpreta pedidos e usa ferramentas (tool-calling) pra de fato adicionar/editar matérias e módulos, fixar horário e mudar disponibilidade.",
  },
  {
    Icon: FileText,
    name: "Curriculum Agent",
    file: "app/api/curriculum/parse/route.ts",
    usesLlm: true,
    status: "ativo",
    description: "Extrai módulos de uma ementa em PDF/texto enviada na tela Matérias.",
  },
  {
    Icon: Brain,
    name: "Pedagogy Agent",
    file: "lib/agents/pedagogy.ts",
    usesLlm: false,
    status: "ativo",
    description: "Escolhe a metodologia de cada sessão (Repetição Espaçada, Active Recall, Prática Deliberada) a partir do status do módulo e da proximidade da prova — lógica local, sem IA.",
  },
  {
    Icon: CalendarClock,
    name: "Scheduler Agent",
    file: "lib/agents/scheduler.ts",
    usesLlm: false,
    status: "ativo",
    description: "Motor local que distribui sessões pelos horários livres por peso/prioridade — roda sempre, é o fallback automático quando a IA está indisponível.",
  },
  {
    Icon: TrendingUp,
    name: "Progress Agent",
    file: "lib/agents/progress.ts",
    usesLlm: false,
    status: "ativo",
    description: "Calcula aderência semanal, streak e revisões pendentes a partir do histórico real de sessões — lógica local.",
  },
  {
    Icon: ShieldCheck,
    name: "QA Agent",
    file: "lib/agents/qa.ts",
    usesLlm: false,
    status: "ativo",
    description: "Valida o calendário gerado via IA (interleaving, conflito de horário fixo, prova sem sessão) e retorna avisos — não roda sobre o motor local.",
  },
  {
    Icon: Bell,
    name: "Notification Agent",
    file: "—",
    usesLlm: false,
    status: "planejado",
    description: "Os toggles existem em Configurações → Notificações, mas nenhum envio real está implementado ainda.",
  },
];

export function AgentsStatusClient() {
  const [health, setHealth] = useState<HealthResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [testReply, setTestReply] = useState<{ ok: boolean; text: string; latencyMs: number } | null>(null);
  const [testing, setTesting] = useState(false);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/system/health");
      setHealth(await res.json());
    } catch {
      setHealth({ reachable: false, baseUrl: "?", model: "?", message: "Falha ao chamar /api/system/health", latencyMs: 0 });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  async function testAssistant() {
    setTesting(true);
    setTestReply(null);
    const start = Date.now();
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Responda apenas: ok" }],
        }),
      });
      const data = await res.json();
      setTestReply({ ok: res.ok, text: data.content ?? data.error ?? "(sem resposta)", latencyMs: Date.now() - start });
    } catch {
      setTestReply({ ok: false, text: "Falha ao chamar /api/agents", latencyMs: Date.now() - start });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-[760px] mx-auto">
        <div className="mb-5">
          <div className="font-mono text-[10px] font-semibold tracking-[0.1em] uppercase text-muted mb-0.5">
            Sistema
          </div>
          <div className="text-lg font-bold text-txt mb-1">Agentes de IA</div>
          <div className="text-xs text-dim">
            Status real da conexão com o LLM e o que cada agente faz de fato — diferente dos
            toggles cosméticos em Configurações.
          </div>
        </div>

        {/* Connection status */}
        <section className="bg-card border border-border rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-txt">Conexão com o LLM</h2>
            <button
              onClick={checkHealth}
              disabled={checking}
              className="flex items-center gap-1.5 text-[11px] text-dim bg-card2 border border-border rounded-lg px-2.5 py-1.5 cursor-pointer hover:text-txt transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin" : ""}`} strokeWidth={2} />
              Testar conexão
            </button>
          </div>

          {health && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {health.reachable ? (
                  <CheckCircle2 className="w-4 h-4 text-success shrink-0" strokeWidth={2} />
                ) : (
                  <XCircle className="w-4 h-4 text-danger shrink-0" strokeWidth={2} />
                )}
                <span className="text-xs font-medium text-txt">
                  {health.reachable ? "Servidor de IA respondendo" : "Servidor de IA inalcançável"}
                </span>
                <span className="font-mono text-[10px] text-muted ml-auto">{health.latencyMs}ms</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-card2 rounded-lg px-2.5 py-2">
                  <div className="text-muted mb-0.5">Endpoint</div>
                  <div className="font-mono text-dim truncate">{health.baseUrl}</div>
                </div>
                <div className="bg-card2 rounded-lg px-2.5 py-2">
                  <div className="text-muted mb-0.5">Modelo configurado</div>
                  <div className="font-mono text-dim truncate">
                    {health.model} {health.reachable && (health.modelAvailable ? "✓" : "— não encontrado")}
                  </div>
                </div>
              </div>

              {!health.reachable && health.message && (
                <div className="text-[11px] text-warning bg-warning/10 border border-warning/20 rounded-lg px-2.5 py-2 leading-relaxed">
                  {health.message}
                </div>
              )}
              {health.reachable && health.modelAvailable === false && (
                <div className="text-[11px] text-warning bg-warning/10 border border-warning/20 rounded-lg px-2.5 py-2 leading-relaxed">
                  Servidor respondeu, mas o modelo &quot;{health.model}&quot; não está entre os
                  disponíveis. Rode <code className="font-mono">ollama pull {health.model}</code>.
                  {health.availableModels && health.availableModels.length > 0 && (
                    <> Modelos já baixados: {health.availableModels.join(", ")}.</>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-border my-3" />

          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-txt mb-0.5">Testar o assistente de verdade</div>
              <div className="text-[11px] text-muted">
                Manda uma mensagem mínima pelo Orchestrator real (mesma rota do chat do Dashboard).
              </div>
            </div>
            <button
              onClick={testAssistant}
              disabled={testing}
              className="text-xs font-semibold bg-primary text-bg rounded-lg px-3 py-2 cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
            >
              {testing ? "Testando..." : "Testar assistente"}
            </button>
          </div>
          {testReply && (
            <div
              className={`mt-2.5 text-[11px] rounded-lg px-2.5 py-2 leading-relaxed ${
                testReply.ok ? "bg-success/10 border border-success/20 text-txt" : "bg-danger/10 border border-danger/20 text-danger"
              }`}
            >
              <span className="font-mono text-[10px] text-muted mr-1.5">{testReply.latencyMs}ms</span>
              {testReply.text}
            </div>
          )}
        </section>

        {/* Agent roster */}
        <section className="bg-card border border-border rounded-xl p-4">
          <h2 className="text-sm font-bold text-txt mb-3">Agentes do sistema</h2>
          <div className="flex flex-col gap-2.5">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-start gap-3 bg-card2 border border-border rounded-lg p-3">
                <agent.Icon className="w-4 h-4 text-dim shrink-0 mt-0.5" strokeWidth={2} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-semibold text-txt">{agent.name}</span>
                    <span
                      className={`font-mono text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                        agent.status === "ativo" ? "bg-success/15 text-success" : "bg-card text-muted"
                      }`}
                    >
                      {agent.status}
                    </span>
                    <span
                      className={`font-mono text-[9px] px-1.5 py-0.5 rounded ${
                        agent.usesLlm ? "bg-secondary/15 text-secondary" : "bg-card text-muted"
                      }`}
                    >
                      {agent.usesLlm ? "usa LLM" : "local, sem IA"}
                    </span>
                  </div>
                  <div className="text-[11px] text-dim leading-relaxed">{agent.description}</div>
                  <div className="font-mono text-[10px] text-muted mt-1">{agent.file}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
