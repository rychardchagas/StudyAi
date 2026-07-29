import { Suspense } from "react";
import { DashboardClient } from "@/components/calendar/DashboardClient";
import { CalendarSkeleton } from "@/components/shared/Skeletons";

export const metadata = { title: "Calendário — StudyAI" };

export default function DashboardPage() {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <DashboardClient />
    </Suspense>
  );
}
