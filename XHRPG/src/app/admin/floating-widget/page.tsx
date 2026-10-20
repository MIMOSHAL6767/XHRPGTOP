
import FloatingWidgetClient from "./FloatingWidgetClient";
import { requireOwnerPage } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function FloatingWidgetPage() {
  await requireOwnerPage();

  return <FloatingWidgetClient />;
}
