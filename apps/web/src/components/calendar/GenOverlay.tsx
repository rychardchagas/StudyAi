interface GenOverlayProps {
  visible: boolean;
}

export function GenOverlay({ visible }: GenOverlayProps) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200] flex items-center justify-center">
      <div className="bg-surface border border-border rounded-2xl p-8 text-center w-[360px]">
        <div className="text-3xl mb-3 animate-spin">✦</div>
        <div className="text-sm font-bold text-txt mb-1">Gerando calendário personalizado</div>
        <div className="text-xs text-muted">Os agentes estão trabalhando para você</div>
      </div>
    </div>
  );
}
