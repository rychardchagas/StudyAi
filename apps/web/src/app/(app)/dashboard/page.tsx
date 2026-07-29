import { Suspense } from "react";
import { DashboardClient } from "@/components/calendar/DashboardClient";
import { CalendarSkeleton } from "@/components/shared/Skeletons";
import { listDisciplines, listSessions } from "@/lib/db/local-db";

export const metadata = { title: "Calendário — StudyAI" };

export default async function DashboardPage() {
  const disciplines = listDisciplines();
  const sessions = listSessions();

  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <DashboardClient initialDisciplines={disciplines} initialSessions={sessions} />
    </Suspense>
  );
}
