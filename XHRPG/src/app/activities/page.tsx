
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
      select: {
        imageUrl: true,
      },
    }),
  ]);

  return (
    <main
      className="activities-page"
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "transparent",
        color: "#f8eeee",
        margin: 0,
        position: "relative",
        zIndex: 1,
        isolation: "isolate",
      }}
    >
      {/* 公共头图和导航栏 */}
      <SiteHeader headerImage={header?.imageUrl ?? null} />

      <section
        className="activities-content"
        style={{
          width: "min(calc(100% - 32px), 1440px)",
          margin: "0 auto",
          padding: "32px 0 64px",
          boxSizing: "border-box",
        }}
      >
        <div className="activities-heading">
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
              color: "#d0bfc2",
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            查看站内活动、公告与专题内容
          </p>
        </div>

        {activities.length === 0 ? (
          <div className="activities-empty">
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
                      alt={activity.title || "活动封面"}
                      loading="lazy"
                    />
                  ) : (
                    <div className="activity-no-cover">
                      暂无宣传图
                    </div>
                  )}
                </div>

                <div className="activity-card-info">
                  <h2>{activity.title || "未命名活动"}</h2>
                  <span>查看活动详情 →</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .activities-page {
          background: transparent !important;
        }

        .activities-content {
          position: relative;
          z-index: 1;
        }

        .activities-heading {
          margin-bottom: 28px;
          padding: 18px 20px;
          background: rgba(16, 9, 11, 0.45);
          border-left: 3px solid #8b1e2d;
        }

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
          background: rgba(22, 12, 15, 0.78);
          border: 1px solid rgba(74, 32, 40, 0.85);
          border-radius: 0 !important;
          transition:
            border-color 180ms ease,
            background-color 180ms ease;
        }

        .activity-list-card:hover {
          border-color: #8b1e2d;
          background: rgba(30, 13, 18, 0.88);
        }

        .activity-cover {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          overflow: hidden;
          background: rgba(33, 18, 22, 0.55);
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
          min-height: 160px;
          place-items: center;
          color: #bba9ac;
          font-size: 14px;
          background:
            linear-gradient(
              135deg,
              rgba(139, 30, 45, 0.16),
              rgba(16, 9, 11, 0.4)
            );
        }

        .activity-card-info {
          padding: 16px 18px 18px;
          background: transparent;
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
          color: #c5aeb2;
          font-size: 13px;
          transition: color 180ms ease;
        }

        .activity-list-card:hover .activity-card-info span {
          color: #ffffff;
        }

        .activities-empty {
          padding: 48px 20px;
          text-align: center;
          color: #d0bfc2;
          background: rgba(22, 12, 15, 0.78);
          border: 1px solid rgba(74, 32, 40, 0.85);
        }

        @media (max-width: 640px) {
          .activities-content {
            width: calc(100% - 24px) !important;
            padding-top: 24px !important;
          }

          .activities-heading {
            padding: 14px 12px;
          }

          .activities-heading h1 {
            font-size: 25px !important;
          }

          .activity-list-grid {
            grid-template-columns: minmax(0, 1fr);
            gap: 20px;
          }

          .activity-card-info h2 {
            font-size: 17px;
          }
        }
      `}</style>
    </main>
  );
}
