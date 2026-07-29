import { ProgressClient } from "@/components/progress/ProgressClient";
import { listDisciplines, listSessions } from "@/lib/db/local-db";

export const metadata = { title: "Progresso — StudyAI" };

export default async function ProgressPage() {
  const disciplines = listDisciplines();
  const sessions = listSessions();

  return <ProgressClient initialDisciplines={disciplines} initialSessions={sessions} />;
}
