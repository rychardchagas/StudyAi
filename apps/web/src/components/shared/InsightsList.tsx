import { Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/agents/progress";

interface InsightsListProps {
  insights: Insight[];
  emptyText: string;
}

export function InsightsList({ insights, emptyText }: InsightsListProps) {
  if (insights.length === 0) {
    return <div className="text-xs text-muted">{emptyText}</div>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {insights.map((insight, i) => (
        <div key={i} className="bg-card2 border border-border rounded-md px-2.5 py-2 flex gap-2.5">
          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" strokeWidth={2.25} />
          <div className="min-w-0 flex-1">
            <div className="text-xs text-txt leading-relaxed">{insight.text}</div>
            <div className="font-mono text-[9px] font-semibold uppercase tracking-wider text-secondary mt-1">
              {insight.agent}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
