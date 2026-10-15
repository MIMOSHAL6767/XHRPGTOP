import { requireOwnerPage } from "@/lib/admin-auth";
import EditGameClient from "./EditGameClient";

export default async function EditGamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireOwnerPage();

  const { id } = await params;

  return <EditGameClient id={id} />;
}
