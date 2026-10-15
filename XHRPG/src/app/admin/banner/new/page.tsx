
import { requireOwnerPage } from "@/lib/admin-auth";
import NewBannerForm from "./NewBannerForm";

export default async function NewBannerPage() {
  await requireOwnerPage();

  return <NewBannerForm />;
}
