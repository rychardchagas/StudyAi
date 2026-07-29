import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { listDisciplines } from "@/lib/db/local-db";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const disciplines = listDisciplines();

  return (
    <div className="flex h-screen bg-bg text-txt overflow-hidden">
      <Sidebar disciplines={disciplines} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar disciplines={disciplines} />
        {children}
      </div>
    </div>
  );
}
