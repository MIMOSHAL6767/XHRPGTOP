
import Link from "next/link";
import { notFound } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const cleanHtmlOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    ...sanitizeHtml.defaults.allowedTags,
    "img",
    "h1",
    "h2",
    "u",
    "span",
    "div",
    "figure",
    "figcaption",
    "hr",
  ],
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    "*": ["style"],
    a: ["href", "target", "rel", "style"],
    img: ["src", "alt", "title", "width", "height", "style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedStyles: {
    "*": {
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s.,%]+\)$/],
      "background-color": [/^#[0-9a-fA-F]{3,8}$/, /^rgba?\([\d\s.,%]+\)$/],
      "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      "text-align": [/^(?:left|right|center|justify)$/],
      "font-weight": [/^(?:normal|bold|[1-9]00)$/],
      "font-style": [/^(?:normal|italic)$/],
      "text-decoration": [/^(?:none|underline|line-through)$/],
      "width": [/^\d+(?:\.\d+)?(?:px|%|vw|auto)$/],
      "height": [/^\d+(?:\.\d+)?(?:px|%|auto)$/],
      "max-width": [/^\d+(?:\.\d+)?(?:px|%|vw|auto)$/],
    },
  },
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ActivityDetailPage({ params }: PageProps) {
  const { id } = await params;
  const activityId = Number(id);

  if (!Number.isSafeInteger(activityId) || activityId < 1) {
    notFound();
  }

  const activity = await prisma.activity.findFirst({
    where: { id: activityId, enabled: true },
  });

  if (!activity) {
    notFound();
  }

  const safeContent = sanitizeHtml(activity.content || "", cleanHtmlOptions);
  const backgroundOpacity = Math.max(
    0,
    Math.min(100, activity.backgroundOpacity ?? 35),
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        isolation: "isolate",
        background: "#10090b",
        color: "#f8eeee",
        overflow: "hidden",
      }}
    >
      {activity.background && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activity.background}
            alt=""
            aria-hidden="true"
            style={{
              position: "absolute",
              zIndex: -2,
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: activity.backgroundFit === "contain" ? "contain" : "cover",
              objectPosition: "center top",
              filter: "blur(3px)",
              transform: "scale(1.02)",
            }}
          />
          <div
            style={{
              position: "absolute",
              zIndex: -1,
              inset: 0,
              background: `rgba(16, 9, 11, ${1 - backgroundOpacity / 100})`,
            }}
          />
        </>
      )}

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 18px 64px" }}>
        <div style={{ marginBottom: 22 }}>
          <Link
            href="/activities"
            style={{ color: "#f2a5ae", textDecoration: "none" }}
          >
            ← 返回活动列表
          </Link>
        </div>

        <article
          style={{
            background: "rgba(22, 12, 15, 0.96)",
            border: "1px solid #4a2028",
          }}
        >
          {activity.cover && (
            <div style={{ background: "#160c0f", textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activity.cover}
                alt={activity.title}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 520,
                  objectFit: "contain",
                  margin: "0 auto",
                }}
              />
            </div>
          )}

          <header style={{ padding: "28px 30px 22px", borderBottom: "1px solid #4a2028" }}>
            <h1
              style={{
                margin: 0,
                color: activity.titleColor || "#ffffff",
                fontSize: `clamp(26px, ${Math.max(20, Math.min(64, activity.titleSize ?? 36))}px, 64px)`,
                lineHeight: 1.35,
                overflowWrap: "anywhere",
              }}
            >
              {activity.title}
            </h1>
            <p style={{ margin: "12px 0 0", color: "#bba9ac", fontSize: 13 }}>
              活动详情
            </p>
          </header>

          <div
            className="activity-rich-content"
            dangerouslySetInnerHTML={{ __html: safeContent }}
            style={{
              padding: "28px 30px 42px",
              fontSize: 16,
              lineHeight: 1.9,
              overflowWrap: "anywhere",
            }}
          />
        </article>

        <style>{`
          .activity-rich-content img {
            max-width: 100%;
            height: auto;
          }
          .activity-rich-content a {
            color: #f2a5ae;
          }
          .activity-rich-content blockquote {
            border-left: 3px solid #8b1e2d;
            margin-left: 0;
            padding-left: 16px;
            color: #d8c4c8;
          }
          .activity-rich-content pre {
            max-width: 100%;
            overflow-x: auto;
            padding: 12px;
            background: #10090b;
          }
          .activity-rich-content table {
            max-width: 100%;
            border-collapse: collapse;
          }
          .activity-rich-content td,
          .activity-rich-content th {
            border: 1px solid #4a2028;
            padding: 8px;
          }
          @media (max-width: 640px) {
            .activity-rich-content {
              padding: 20px 16px 28px !important;
            }
          }
        `}</style>
      </div>
    </main>
  );
}
