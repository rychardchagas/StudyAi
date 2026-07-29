import { SettingsClient } from "@/components/settings/SettingsClient";
import { getProfile } from "@/lib/db/local-db";

export const metadata = { title: "Configurações — StudyAI" };

export default async function SettingsPage() {
  const profile = getProfile();

  return <SettingsClient initialProfile={profile} />;
}
