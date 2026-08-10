import type { LucideIcon } from "lucide-react";
import { Tip } from "@/components/ui/Tip";

interface StatCardProps {
  icon: LucideIcon;
  accent?: "primary" | "secondary" | "success" | "danger" | "muted";
  value: string | number;
  label: string;
  delta?: string;
  deltaDir?: "up" | "dn" | "neu";
  /** Plain-language explanation of what this number means and how it's computed — shown on
   * hover. Optional so a card can be used without one, but every real usage should have it: a
   * bare number like "1" under "revisões espaçadas" doesn't explain itself. */
  tooltip?: string;
}

const ACCENT_TEXT: Record<NonNullable<StatCardProps["accent"]>, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  success: "text-success",
  danger: "text-danger",
  muted: "text-muted",
};

export function StatCard({ icon: Icon, accent = "muted", value, label, delta, deltaDir, tooltip }: StatCardProps) {
  const card = (
    <div className="bg-card border border-border rounded-lg px-3.5 py-3 flex flex-col gap-2.5 w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-muted truncate">
          {label}
        </span>
        <Icon className={`w-3.5 h-3.5 shrink-0 ${ACCENT_TEXT[accent]}`} strokeWidth={2.25} />
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="font-mono text-2xl font-semibold text-txt leading-none">{value}</div>
        {delta && (
          <div
            className={`font-mono text-[10px] leading-none pb-px ${
              deltaDir === "up" ? "text-success" : deltaDir === "dn" ? "text-danger" : "text-muted"
            }`}
          >
            {delta}
          </div>
        )}
      </div>
    </div>
  );

  if (!tooltip) return card;
  return (
    <Tip label={tooltip} wide>
      {card}
    </Tip>
  );
}
