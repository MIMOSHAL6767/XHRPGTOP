import { requireAdminPage } from "@/lib/admin-auth";
import UserTitleSettingsForm from "./UserTitleSettingsForm";

export default async function UserTitleSettingsPage() {
  await requireAdminPage();

  return <UserTitleSettingsForm />;
}
