import { DisciplinesClient } from "@/components/disciplines/DisciplinesClient";
import { listDisciplines } from "@/lib/db/local-db";

export const metadata = { title: "Matérias — StudyAI" };

export default async function DisciplinesPage() {
  const disciplines = listDisciplines();
  return <DisciplinesClient initialDisciplines={disciplines} />;
}
