
import { requireOwnerPage } from "@/lib/admin-auth";
import EditGameClient from "./EditGameClient";

export default async function EditGamePage() {
  await requireOwnerPage();

  return <EditGameClient />;
}
