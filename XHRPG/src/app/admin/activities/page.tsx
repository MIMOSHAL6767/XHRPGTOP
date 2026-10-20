
import Link from "next/link";
import { requireOwnerPage } from "@/lib/admin-auth";
import ActivitiesClient from "./ActivitiesClient";

export const dynamic = "force-dynamic";

export default async function AdminActivitiesPage() {
  await requireOwnerPage();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#10090b",
        color: "#f8eeee",
        padding: "28px 18px 60px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 28 }}>活动管理</h1>
            <p style={{ margin: "8px 0 0", color: "#bba9ac" }}>
              管理活动内容、宣传图、背景图和展示状态
            </p>
          </div>
          <Link
            href="/admin"
            style={{
              color: "#fff",
              background: "#8b1e2d",
              padding: "10px 16px",
              textDecoration: "none",
              border: "1px solid #a52a3a",
            }}
          >
            返回站长后台
          </Link>
        </div>

        <ActivitiesClient />
      </div>
    </main>
  );
}
