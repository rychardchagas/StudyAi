import { Loader2 } from "lucide-react";

interface GenOverlayProps {
  visible: boolean;
}

export function GenOverlay({ visible }: GenOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center">
      <div className="bg-surface border border-border rounded-2xl p-8 text-center w-[360px]">
        <Loader2 className="w-7 h-7 mx-auto mb-3 text-secondary animate-spin" strokeWidth={2.25} />
        <div className="font-serif text-base font-semibold text-txt mb-1">Gerando calendário personalizado</div>
        <div className="text-xs text-muted">Os agentes estão trabalhando para você</div>
      </div>
    </div>
  );
}
