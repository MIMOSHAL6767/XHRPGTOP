
import { prisma } from "@/lib/prisma";
import SiteHeader from "@/app/components/SiteHeader";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ActivitiesPage() {
  const [activities, header] = await Promise.all([
    prisma.activity.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        cover: true,
        createdAt: true,
      },
    }),
    prisma.homeHeader.findUnique({
      where: { id: 1 },
      select: { imageUrl: true },
    }),
  ]);

  return (
    <main
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#10090b",
        color: "#f8eeee",
        margin: 0,
      }}
    >
      {/* 复用首页的公共头图和导航栏。
          不传递事件处理函数，避免 Server/Client Component 边界错误。 */}
      <SiteHeader headerImage={header?.imageUrl ?? null} />

      <section
        style={{
          width: "min(100% - 32px, 1440px)",
          margin: "0 auto",
          padding: "32px 0 64px",
          boxSizing: "border-box",
        }}
      >
        {/* 页面标题 */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 30,
              lineHeight: 1.4,
              fontWeight: 800,
            }}
          >
            活动中心
          </h1>

          <p
            style={{
              margin: "8px 0 0",
              color: "#bba9ac",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            查看站内活动、公告与专题内容
          </p>
        </div>

        {/* 活动列表 */}
        {activities.length === 0 ? (
          <div
            style={{
              background: "#160c0f",
              padding: "48px 20px",
              textAlign: "center",
              color: "#bba9ac",
            }}
          >
            暂无活动，敬请期待。
          </div>
        ) : (
          <div className="activity-list-grid">
            {activities.map((activity) => (
              <a
                key={activity.id}
                href={`/activities/${activity.id}`}
                className="activity-list-card"
              >
                <div className="activity-cover">
                  {activity.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activity.cover}
                      alt={activity.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="activity-no-cover">
                      暂无宣传图
                    </div>
                  )}
                </div>

                <div className="activity-card-info">
                  <h2>{activity.title}</h2>
                  <span>查看活动详情 →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .activity-list-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          width: 100%;
        }

        .activity-list-card {
          display: block;
          min-width: 0;
          overflow: hidden;
          color: #f8eeee;
          text-decoration: none;
          background: #160c0f;
          border: none;
          border-radius: 0;
        }

        .activity-cover {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: #211216;
        }

        .activity-cover img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 180ms ease;
        }

        .activity-list-card:hover .activity-cover img {
          transform: scale(1.025);
        }

        .activity-no-cover {
          display: grid;
          width: 100%;
          height: 100%;
          place-items: center;
          color: #bba9ac;
          font-size: 14px;
        }

        .activity-card-info {
          padding: 16px 0 8px;
        }

        .activity-card-info h2 {
          margin: 0;
          font-size: 18px;
          line-height: 1.6;
          font-weight: 700;
          overflow-wrap: anywhere;
        }

        .activity-card-info span {
          display: inline-block;
          margin-top: 8px;
          color: #bba9ac;
          font-size: 13px;
          transition: color 180ms ease;
        }

        .activity-list-card:hover .activity-card-info span {
          color: #ffffff;
        }

        @media (max-width: 640px) {
          .activity-list-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 24px;
          }

          .activity-card-info h2 {
            font-size: 17px;
          }
        }
      `}</style>
    </main>
  );
}
