import { Suspense } from "react";
import { DashboardClient } from "@/components/calendar/DashboardClient";
import { CalendarSkeleton } from "@/components/shared/Skeletons";
import { getProfile, listDisciplines, listSessions } from "@/lib/db/local-db";
import { toAvailabilityRecord } from "@/lib/utils/constants";

export const metadata = { title: "Calendário — StudyAI" };

export default async function DashboardPage() {
  const disciplines = listDisciplines();
  const sessions = listSessions();
  const profile = getProfile();
  const availability = toAvailabilityRecord(profile.preferences.availability as Record<string, boolean> | undefined);

  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <DashboardClient initialDisciplines={disciplines} initialSessions={sessions} initialAvailability={availability} />
    </Suspense>
  );
}
