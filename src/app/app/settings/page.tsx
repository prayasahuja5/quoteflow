import { SettingsForm } from "@/app/app/settings/settings-form";
import { requireUser } from "@/lib/auth/session";
import { getBusinessProfile } from "@/lib/proposals/service";

export default async function SettingsPage() {
  const user = await requireUser();
  const profile = await getBusinessProfile(user.id);

  return (
    <SettingsForm
      profile={profile}
      accountName={user.name}
      accountEmail={user.email}
      demo={user.email === "demo@quoteflow.app"}
    />
  );
}
