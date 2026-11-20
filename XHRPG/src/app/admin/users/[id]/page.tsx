
import { requireAdminPage } from "@/lib/admin-auth";
import UserDetailForm from "./UserDetailForm";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();

  const { id } = await params;

  return <UserDetailForm id={id} />;
}
