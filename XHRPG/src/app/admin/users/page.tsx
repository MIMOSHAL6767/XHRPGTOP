
import { requireOwnerPage } from "@/lib/admin-auth";
import UsersAdminForm from "./UsersAdminForm";

export default async function UsersAdminPage() {
  await requireOwnerPage();

  return <UsersAdminForm />;
}
