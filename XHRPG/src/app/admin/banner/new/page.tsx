
import { requireAdminPage } from "@/lib/admin-auth";
import NewBannerForm from "./NewBannerForm";

export default async function NewBannerPage() {
  await requireAdminPage();

  return <NewBannerForm />;
}
