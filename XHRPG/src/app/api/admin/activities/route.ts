
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorJson(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

async function isSiteOwner() {
  try {
    const token = (await cookies()).get("token")?.value;
    if (!token) return false;

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "xhrpg-secret",
    );
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    return String(payload.id) === "1" && payload.role === "owner";
  } catch {
    return false;
  }
}

function cleanContent(value: unknown) {
  if (typeof value !== "string") return "";

  return sanitizeHtml(value, {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img", "h1", "h2", "u", "span", "div", "figure", "figcaption", "hr",
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
        width: [/^\d+(?:\.\d+)?(?:px|%|vw|auto)$/],
        height: [/^\d+(?:\.\d+)?(?:px|%|auto)$/],
        "max-width": [/^\d+(?:\.\d+)?(?:px|%|vw|auto)$/],
      },
    },
  });
}

function normalizeActivity(body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!title || title.length > 200) {
    throw new Error("活动标题不能为空，且不能超过 200 个字符");
  }

  const numberOr = (value: unknown, fallback: number) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.trunc(number) : fallback;
  };

  const backgroundOpacity = Math.max(
    0,
    Math.min(100, numberOr(body.backgroundOpacity, 35)),
  );
  const titleSize = Math.max(12, Math.min(96, numberOr(body.titleSize, 36)));
  const sort = Math.max(-100000, Math.min(100000, numberOr(body.sort, 0)));

  const titleColor =
    typeof body.titleColor === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(body.titleColor)
      ? body.titleColor
      : "#ffffff";

  const backgroundFit = body.backgroundFit === "contain" ? "contain" : "cover";

  const optionalString = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  return {
    title,
    cover: optionalString(body.cover),
    background: optionalString(body.background),
    backgroundFit,
    backgroundOpacity,
    titleColor,
    titleSize,
    content: cleanContent(body.content),
    showOnHome: body.showOnHome === true,
    enabled: body.enabled !== false,
    sort,
  };
}

export async function GET() {
  if (!(await isSiteOwner())) return errorJson("无权访问活动管理接口", 401);

  try {
    const activities = await prisma.activity.findMany({
      orderBy: [{ sort: "asc" }, { id: "desc" }],
    });

    return NextResponse.json({ success: true, activities });
  } catch (error) {
    console.error("获取活动列表失败：", error);
    return errorJson("获取活动列表失败", 500);
  }
}

export async function POST(request: Request) {
  if (!(await isSiteOwner())) return errorJson("无权创建活动", 401);

  try {
    const body = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorJson("请求数据格式不正确", 400);
    }

    let data;
    try {
      data = normalizeActivity(body as Record<string, unknown>);
    } catch (error) {
      return errorJson(
        error instanceof Error ? error.message : "活动数据不正确",
        400,
      );
    }

    const activity = await prisma.activity.create({ data });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error) {
    console.error("创建活动失败：", error);
    return errorJson("创建活动失败，请检查数据库模型和服务端日志", 500);
  }
}
