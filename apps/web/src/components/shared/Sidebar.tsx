"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, TrendingUp, BookOpen, FlaskConical, Settings, Flame, HelpCircle, type LucideIcon } from "lucide-react";
import type { Discipline } from "@/types";

interface SidebarProps {
  disciplines: Discipline[];
  streakDays: number;
  last7Days: boolean[]; // oldest -> today, 7 entries
  profileName: string | null;
}

const STUDY_ITEMS: Array<{ Icon: LucideIcon; label: string; href: string }> = [
  { Icon: Calendar, label: "Calendário", href: "/dashboard" },
  { Icon: Clock, label: "Sessão ativa", href: "/session" },
  { Icon: TrendingUp, label: "Progresso", href: "/progress" },
];

const CONFIG_ITEMS: Array<{ Icon: LucideIcon; label: string; href: string }> = [
  { Icon: BookOpen, label: "Matérias", href: "/disciplines" },
  { Icon: FlaskConical, label: "Metodologias", href: "/methods" },
  { Icon: Settings, label: "Configurações", href: "/settings" },
  { Icon: HelpCircle, label: "Como usar", href: "/help" },
];

export function Sidebar({ disciplines, streakDays, last7Days, profileName }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const initial = (profileName?.trim()?.[0] ?? "E").toUpperCase();

  function NavItem({ Icon, label, href }: { Icon: LucideIcon; label: string; href: string }) {
    const active = pathname === href;
    return (
      <Link
        href={href}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-2 rounded-md text-xs my-px transition-colors ${
          collapsed ? "justify-center py-2" : "px-2 py-1.5"
        } ${active ? "text-primary bg-primary/10" : "text-dim hover:text-txt"}`}
      >
        <Icon className="w-[15px] h-[15px] shrink-0" strokeWidth={2} />
        {!collapsed && <span className="flex-1 truncate">{label}</span>}
      </Link>
    );
  }

  return (
    <aside
      className={`bg-surface border-r border-border flex flex-col shrink-0 h-screen overflow-hidden transition-[width] duration-200 ${
        collapsed ? "w-[52px]" : "w-[250px]"
      }`}
    >
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div
          className={`flex items-center gap-2 border-b border-border shrink-0 ${
            collapsed ? "justify-center py-2.5" : "px-3 py-2.5"
          }`}
        >
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-[11px] font-bold text-bg shrink-0">
            S
          </div>
          {!collapsed && (
            <>
              <span className="font-serif text-sm font-semibold tracking-tight text-txt flex-1 whitespace-nowrap">
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
          className="flex items-center justify-center py-1.5 border-b border-border text-muted cursor-pointer text-xs shrink-0 w-full hover:text-dim transition-colors"
        >
          {collapsed ? "»" : "«"}
        </button>

        {!collapsed ? (
          <div className="mx-2.5 my-2.5 rounded-lg border border-border bg-card px-2.5 py-2">
            <div className="flex items-baseline gap-1.5 mb-2">
              <Flame className="w-3.5 h-3.5 text-primary self-center" strokeWidth={2.25} />
              <span className="font-mono text-xl font-semibold text-txt leading-none">{streakDays}</span>
              <span className="text-[10px] text-muted">
                {streakDays === 1 ? "dia seguido" : "dias seguidos"}
              </span>
            </div>
            <div className="flex gap-[3px]">
              {last7Days.map((active, i) => (
                <div key={i} className={`h-4 flex-1 rounded-sm ${active ? "bg-primary" : "bg-card2"}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-0.5 py-2.5 border-b border-border">
            <Flame className="w-3.5 h-3.5 text-primary" strokeWidth={2.25} />
            <span className="font-mono text-[11px] font-semibold text-txt">{streakDays}</span>
          </div>
        )}

        <div className={collapsed ? "px-1 py-1.5" : "px-2 py-1.5"}>
          {!collapsed && (
            <span className="text-[10px] font-semibold tracking-widest uppercase text-muted px-1 mb-1 block">
              Estudo
            </span>
          )}
          {STUDY_ITEMS.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>

        <div className={collapsed ? "px-1 py-1.5" : "px-2 py-1.5"}>
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
      </div>

      <Link
        href="/settings"
        className={`shrink-0 border-t border-border flex items-center gap-2 hover:bg-card transition-colors ${
          collapsed ? "justify-center py-2.5" : "px-3 py-2.5"
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-[10px] font-bold text-bg shrink-0">
          {initial}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium text-txt truncate">{profileName ?? "Estudante"}</div>
            <div className="text-[9px] text-muted">Ver perfil</div>
          </div>
        )}
      </Link>
    </aside>
  );
}
