
import { requireAdminPage } from "@/lib/admin-auth";
import VerifyAdminForm from "./VerifyAdminForm";

export default async function VerifyAdminPage() {
  await requireAdminPage();

  return <VerifyAdminForm />;
}
