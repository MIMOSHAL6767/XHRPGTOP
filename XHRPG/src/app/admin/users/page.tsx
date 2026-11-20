
import { requireAdminPage } from "@/lib/admin-auth";
import UsersAdminForm from "./UsersAdminForm";

export default async function UsersAdminPage() {
  await requireAdminPage();

  return <UsersAdminForm />;
}
