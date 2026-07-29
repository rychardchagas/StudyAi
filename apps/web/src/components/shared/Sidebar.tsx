"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Discipline } from "@/types";

interface SidebarProps {
  disciplines: Discipline[];
}

const STUDY_ITEMS = [
  { icon: "📅", label: "Calendário", href: "/dashboard" },
  { icon: "⏱", label: "Sessão ativa", href: "/session" },
  { icon: "📈", label: "Progresso", href: "/progress" },
] as const;

const CONFIG_ITEMS = [
  { icon: "📚", label: "Matérias", href: "/disciplines" },
  { icon: "🧪", label: "Metodologias", href: "/methods" },
  { icon: "⚙️", label: "Configurações", href: "/settings" },
] as const;

export function Sidebar({ disciplines }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  function NavItem({ icon, label, href }: { icon: string; label: string; href: string }) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-2 rounded-md text-xs my-px transition-colors ${
          collapsed ? "justify-center py-2" : "px-2 py-1.5"
        } ${active ? "text-primary bg-primary/10" : "text-dim hover:text-txt"}`}
      >
        <span className="text-[15px] w-4 text-center shrink-0">{icon}</span>
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={`bg-surface border-r border-border flex flex-col shrink-0 h-screen overflow-y-auto overflow-x-hidden transition-[width] duration-200 ${
        collapsed ? "w-[52px]" : "w-[212px]"
      }`}
    >
      <div
        className={`flex items-center gap-2 border-b border-border shrink-0 ${
          collapsed ? "justify-center py-2.5" : "px-3 py-2.5"
        }`}
      >
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-[11px] font-bold text-white shrink-0">
          S
        </div>
        {!collapsed && (
          <>
            <span className="text-sm font-semibold tracking-tight text-txt flex-1 whitespace-nowrap">
              StudyAI
            </span>
            <span className="font-mono text-[9px] font-semibold text-secondary bg-secondary/10 border border-secondary/20 px-1.5 py-0.5 rounded-full">
              Beta
            </span>
          </>
        )}
      </div>

      <button
        onClick={() => setCollapsed((p) => !p)}
        title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
        className="flex items-center justify-center py-1.5 border-b border-border text-muted cursor-pointer text-xs shrink-0"
      >
        {collapsed ? "»" : "«"}
      </button>

      <div className={collapsed ? "px-1 py-1.5" : "px-2 py-2.5 pb-1"}>
        {!collapsed && (
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted px-1 mb-1 block">
            Estudo
          </span>
        )}
        {STUDY_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      <div className={collapsed ? "px-1 py-1.5" : "px-2 py-2.5 pb-1"}>
        {!collapsed && (
          <span className="text-[10px] font-semibold tracking-widest uppercase text-muted px-1 mb-1 block">
            Configuração
          </span>
        )}
        {CONFIG_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} />
        ))}
      </div>

      {!collapsed && (
        <div className="px-2 pb-2 pt-1">
          <div className="flex items-center justify-between px-1 mb-1.5">
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted">
              Matérias
            </span>
            <Link
              href="/disciplines"
              className="w-[17px] h-[17px] rounded flex items-center justify-center bg-card border border-border text-muted text-xs"
            >
              +
            </Link>
          </div>
          {disciplines.map((d) => (
            <Link
              key={d.id}
              href="/disciplines"
              className="flex items-center gap-1.5 px-1.5 py-1 rounded-md mb-0.5"
            >
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: d.color }} />
              <span className="text-[11px] text-dim flex-1 truncate">{d.name}</span>
              <span className="font-mono text-[9px] text-muted">{d.horas_semana}h</span>
            </Link>
          ))}
        </div>
      )}
    </aside>
  );
}
