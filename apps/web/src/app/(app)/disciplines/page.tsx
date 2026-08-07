import { DisciplinesClient } from "@/components/disciplines/DisciplinesClient";
import { listDisciplines, listGroups } from "@/lib/db/local-db";

export const metadata = { title: "Matérias — StudyAI" };

export default async function DisciplinesPage() {
  const disciplines = listDisciplines();
  const groups = listGroups();
  return <DisciplinesClient initialDisciplines={disciplines} initialGroups={groups} />;
}
