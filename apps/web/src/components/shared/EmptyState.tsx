import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: string;
  onCta?: () => void;
}

export function EmptyState({ icon: Icon, title, description, cta, onCta }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 p-12 text-center">
      <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center mb-5">
        <Icon className="w-6 h-6 text-muted" strokeWidth={1.75} />
      </div>
      <h3 className="text-base font-bold text-txt mb-2">{title}</h3>
      <p className="text-sm text-muted leading-relaxed max-w-xs mb-6">{description}</p>
      {cta && onCta && (
        <button
          onClick={onCta}
          className="px-5 py-2.5 bg-primary text-bg text-sm font-semibold rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
        >
          {cta}
        </button>
      )}
    </div>
  );
}
