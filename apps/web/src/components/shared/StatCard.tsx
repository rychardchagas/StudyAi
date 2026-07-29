interface StatCardProps {
  icon: string;
  iconBg: string;
  value: string | number;
  label: string;
  delta?: string;
  deltaDir?: "up" | "dn" | "neu";
}

export function StatCard({ icon, iconBg, value, label, delta, deltaDir }: StatCardProps) {
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2.5 flex items-center gap-2.5">
      <div
        className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-sm shrink-0"
        style={{ background: iconBg }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-mono text-base font-semibold text-txt leading-none">{value}</div>
        <div className="text-[11px] text-muted mt-0.5">{label}</div>
      </div>
      {delta && (
        <div
          className={`font-mono text-[10px] ${
            deltaDir === "up" ? "text-success" : deltaDir === "dn" ? "text-danger" : "text-muted"
          }`}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
