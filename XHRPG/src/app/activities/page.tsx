
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ActivitiesPage() {
  const activities = await prisma.activity.findMany({
    where: { enabled: true },
    orderBy: [{ sort: "asc" }, { id: "desc" }],
    select: {
      id: true,
      title: true,
      cover: true,
      createdAt: true,
    },
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#10090b",
        color: "#f8eeee",
        padding: "32px 20px 64px",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            borderBottom: "1px solid #4a2028",
            paddingBottom: 20,
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800 }}>
              活动中心
            </h1>
            <p style={{ color: "#bba9ac", margin: "8px 0 0" }}>
              查看站内活动、公告与专题内容
            </p>
          </div>
          <Link
            href="/"
            style={{
              display: "inline-block",
              padding: "10px 16px",
              color: "#fff",
              background: "#8b1e2d",
              textDecoration: "none",
              border: "1px solid #a52a3a",
              whiteSpace: "nowrap",
            }}
          >
            返回首页
          </Link>
        </div>

        {activities.length === 0 ? (
          <div
            style={{
              border: "1px solid #4a2028",
              background: "#160c0f",
              padding: "48px 20px",
              textAlign: "center",
              color: "#bba9ac",
            }}
          >
            暂无活动，敬请期待。
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 20,
            }}
            className="activity-list-grid"
          >
            {activities.map((activity) => (
              <Link
                key={activity.id}
                href={`/activities/${activity.id}`}
                style={{
                  display: "block",
                  minWidth: 0,
                  background: "#160c0f",
                  border: "1px solid #4a2028",
                  color: "#f8eeee",
                  textDecoration: "none",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    aspectRatio: "16 / 9",
                    background: "#211216",
                    overflow: "hidden",
                  }}
                >
                  {activity.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activity.cover}
                      alt={activity.title}
                      loading="lazy"
                      style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: "100%",
                        display: "grid",
                        placeItems: "center",
                        color: "#bba9ac",
                      }}
                    >
                      暂无宣传图
                    </div>
                  )}
                </div>
                <div style={{ padding: "15px 17px" }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {activity.title}
                  </h2>
                  <p style={{ margin: "8px 0 0", color: "#bba9ac", fontSize: 13 }}>
                    查看活动详情 →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        <style>{`
          @media (max-width: 640px) {
            .activity-list-grid {
              grid-template-columns: 1fr !important;
            }
          }
          .activity-list-grid a:hover {
            border-color: #a52a3a !important;
          }
          .activity-list-grid a img {
            transition: transform 180ms ease;
          }
          .activity-list-grid a:hover img {
            transform: scale(1.025);
          }
        `}</style>
      </div>
    </main>
  );
}
