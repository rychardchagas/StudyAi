interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export function Toggle({ checked, onChange }: ToggleProps) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        position: "relative", width: 34, height: 18,
        cursor: "pointer", flexShrink: 0,
      }}
    >
      <div style={{
        position: "absolute", inset: 0, borderRadius: 18,
        background: checked ? "#3B82F6" : "rgba(255,255,255,.13)",
        transition: "background .18s",
      }}/>
      <div style={{
        position: "absolute", top: 3, left: 3,
        width: 12, height: 12, borderRadius: "50%",
        background: "#fff", transition: "transform .18s",
        transform: checked ? "translateX(16px)" : "translateX(0)",
      }}/>
    </div>
  );
}
