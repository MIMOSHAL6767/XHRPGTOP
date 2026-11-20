import { requireAdminPage } from "@/lib/admin-auth";
import CommentsAdminClient from "./CommentsAdminClient";

export default async function CommentsAdminPage() {
  await requireAdminPage();

  return <CommentsAdminClient />;
}
