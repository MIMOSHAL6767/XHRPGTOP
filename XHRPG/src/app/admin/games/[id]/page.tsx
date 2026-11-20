import { requireAdminPage } from "@/lib/admin-auth";
import EditGameClient from "./EditGameClient";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminPage();

  const { id } = await params;

  return <EditGameClient id={id} />;
}
