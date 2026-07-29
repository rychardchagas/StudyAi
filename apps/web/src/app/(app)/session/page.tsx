import { Suspense } from "react";
import { SessionClient } from "@/components/session/SessionClient";

export const metadata = { title: "Sessão Ativa — StudyAI" };

export default function SessionPage() {
  return (
    <Suspense fallback={<div className="flex-1 p-6" />}>
      <SessionClient />
    </Suspense>
  );
}
