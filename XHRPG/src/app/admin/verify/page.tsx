
import { requireOwnerPage } from "@/lib/admin-auth";
import VerifyAdminForm from "./VerifyAdminForm";

export default async function VerifyAdminPage() {
  await requireOwnerPage();

  return <VerifyAdminForm />;
}
