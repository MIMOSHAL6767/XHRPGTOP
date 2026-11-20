
import FloatingWidgetClient from "./FloatingWidgetClient";
import { requireAdminPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function FloatingWidgetPage() {
  await requireAdminPage();

  return <FloatingWidgetClient />;
}
