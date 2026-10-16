import { requireOwnerPage } from "@/lib/admin-auth";
import TitleAdminForm from "./TitleAdminForm";

export default async function TitleAdminPage() {
  await requireOwnerPage();

  return <TitleAdminForm />;
}
