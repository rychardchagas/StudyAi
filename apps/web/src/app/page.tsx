import { redirect } from "next/navigation";
import { listDisciplines } from "@/lib/db/local-db";

export default async function RootPage() {
  const disciplines = listDisciplines();
  if (disciplines.length > 0) redirect("/dashboard");
  redirect("/onboarding");
}
