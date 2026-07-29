import type { ReactNode } from "react";

interface NoticeProps {
  children: ReactNode;
  type?: "info" | "warn" | "success";
}

const STYLES: Record<NonNullable<NoticeProps["type"]>, string> = {
  info: "bg-primary/10 border-primary/20",
  warn: "bg-warning/10 border-warning/20",
  success: "bg-success/10 border-success/20",
};

export function Notice({ children, type = "info" }: NoticeProps) {
  return (
    <div className={`px-3 py-2.5 rounded-lg border text-xs text-dim leading-relaxed mb-3 ${STYLES[type]}`}>
      {children}
    </div>
  );
}
