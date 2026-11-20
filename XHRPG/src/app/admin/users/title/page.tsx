import { requireAdminPage } from "@/lib/admin-auth";
import TitleAdminForm from "./TitleAdminForm";

export default async function TitleAdminPage() {
  await requireAdminPage();

  return <TitleAdminForm />;
}
