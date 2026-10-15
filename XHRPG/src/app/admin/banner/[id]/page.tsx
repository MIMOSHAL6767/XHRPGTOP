
import { requireOwnerPage } from "@/lib/admin-auth";
import EditBannerForm from "./EditBannerForm";

export default async function EditBannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOwnerPage();

  const { id } = await params;

  return <EditBannerForm id={id} />;
}
