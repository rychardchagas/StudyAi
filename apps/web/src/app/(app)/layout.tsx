import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { ActiveSessionBar } from "@/components/shared/ActiveSessionBar";
import { listDisciplines, listSessions, getProfile } from "@/lib/db/local-db";
import { calcStreakDays, last7Days } from "@/lib/agents/progress";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const disciplines = listDisciplines();
  const sessions = listSessions();
  const profile = getProfile();

  return (
    <div className="flex h-screen bg-bg text-txt overflow-hidden">
      <Sidebar
        disciplines={disciplines}
        streakDays={calcStreakDays(sessions)}
        last7Days={last7Days(sessions)}
        profileName={profile.name}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar disciplines={disciplines} />
        <ActiveSessionBar />
        {children}
      </div>
    </div>
  );
}
