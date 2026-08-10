import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { ActiveSessionBar } from "@/components/shared/ActiveSessionBar";
import { listDisciplines, listSessions, getProfile } from "@/lib/db/local-db";
import { calcStreakDays, last7Days, countPendingReviews } from "@/lib/agents/progress";
import { nearestEvaluationDate, daysUntil } from "@/lib/utils/evaluations";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const disciplines = listDisciplines();
  const sessions = listSessions();
  const profile = getProfile();

  const allModules = disciplines.flatMap((d) => d.modules ?? []);
  // Real, already-computed signals — no new "notification" infrastructure, just surfacing what
  // the app already knows. Sorted soonest-first; capped at 7 days out so the bell doesn't turn
  // into a second copy of the full Matérias list.
  const upcomingExams = disciplines
    .map((d) => ({ name: d.name, days: daysUntil(nearestEvaluationDate(d)) }))
    .filter((e): e is { name: string; days: number } => e.days !== null && e.days <= 7)
    .sort((a, b) => a.days - b.days);

  return (
    <div className="flex h-screen bg-bg text-txt overflow-hidden">
      <Sidebar
        disciplines={disciplines}
        streakDays={calcStreakDays(sessions)}
        last7Days={last7Days(sessions)}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar
          disciplines={disciplines}
          profileName={profile.name}
          pendingReviews={countPendingReviews(allModules)}
          upcomingExams={upcomingExams}
        />
        <ActiveSessionBar disciplineIds={disciplines.map((d) => d.id)} />
        {children}
      </div>
    </div>
  );
}
