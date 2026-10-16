import { requireOwnerPage } from "@/lib/admin-auth";
import UserTitleSettingsForm from "./UserTitleSettingsForm";

export default async function UserTitleSettingsPage() {
  await requireOwnerPage();

  return <UserTitleSettingsForm />;
}
