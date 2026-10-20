
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

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

async function getId(context: Context) {
  const { id } = await context.params;
  const parsed = Number(id);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
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

  const optionalString = (value: unknown) =>
    typeof value === "string" && value.trim() ? value.trim() : null;

  const backgroundOpacity = Math.max(
    0,
    Math.min(100, numberOr(body.backgroundOpacity, 35)),
  );

  return {
    title,
    cover: optionalString(body.cover),
    background: optionalString(body.background),
    backgroundFit: body.backgroundFit === "contain" ? "contain" : "cover",
    backgroundOpacity,
    titleColor:
      typeof body.titleColor === "string" &&
      /^#[0-9a-fA-F]{6}$/.test(body.titleColor)
        ? body.titleColor
        : "#ffffff",
    titleSize: Math.max(12, Math.min(96, numberOr(body.titleSize, 36))),
    content: cleanContent(body.content),
    showOnHome: body.showOnHome === true,
    enabled: body.enabled !== false,
    sort: Math.max(-100000, Math.min(100000, numberOr(body.sort, 0))),
  };
}

export async function GET(_request: Request, context: Context) {
  if (!(await isSiteOwner())) return errorJson("无权访问活动管理接口", 401);

  const id = await getId(context);
  if (!id) return errorJson("活动 ID 不正确", 400);

  try {
    const activity = await prisma.activity.findUnique({ where: { id } });

    if (!activity) return errorJson("活动不存在", 404);

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error("读取活动失败：", error);
    return errorJson("读取活动失败", 500);
  }
}

export async function PUT(request: Request, context: Context) {
  if (!(await isSiteOwner())) return errorJson("无权编辑活动", 401);

  const id = await getId(context);
  if (!id) return errorJson("活动 ID 不正确", 400);

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

    const exists = await prisma.activity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) return errorJson("活动不存在", 404);

    const activity = await prisma.activity.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, activity });
  } catch (error) {
    console.error("更新活动失败：", error);
    return errorJson("更新活动失败，请检查数据库和服务端日志", 500);
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (!(await isSiteOwner())) return errorJson("无权删除活动", 401);

  const id = await getId(context);
  if (!id) return errorJson("活动 ID 不正确", 400);

  try {
    const exists = await prisma.activity.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!exists) return errorJson("活动不存在", 404);

    await prisma.activity.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除活动失败：", error);
    return errorJson("删除活动失败", 500);
  }
}
