
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET = process.env.JWT_SECRET || "xhrpg-secret";

type AuthUser = {
  id: string;
  role: string;
};

async function getAuthorizedUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET);

    if (typeof decoded !== "object" || decoded === null) {
      return null;
    }

    // 兼容常见的 JWT 用户 ID 字段
    const payload = decoded as jwt.JwtPayload & {
      userId?: string | number;
      user?: { id?: string | number };
    };

    const rawId =
      payload.id ?? payload.userId ?? payload.user?.id;

    if (rawId === undefined || rawId === null || String(rawId) === "") {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: String(rawId) },
      select: {
        id: true,
        role: true,
        hidden: true,
        banUntil: true,
      },
    });

    if (!user || user.hidden) return null;

    if (
      user.banUntil &&
      new Date(user.banUntil).getTime() > Date.now()
    ) {
      return null;
    }

    if (user.role !== "owner" && user.role !== "admin") {
      return null;
    }

    return {
      id: String(user.id),
      role: user.role,
    };
  } catch {
    return null;
  }
}

function cleanContent(content: unknown): string {
  if (typeof content !== "string") {
    throw new Error("大事记内容必须是文本");
  }

  if (content.length > 1_000_000) {
    throw new Error("大事记内容过长，不能超过 1 MB");
  }

  return sanitizeHtml(content, {
    allowedTags: [
      "h1", "h2", "h3", "h4",
      "p", "div", "span", "br", "hr",
      "strong", "b", "em", "i", "u", "s",
      "blockquote", "ul", "ol", "li",
      "a", "img",
    ],
    allowedAttributes: {
      "*": ["style"],
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
    },
    allowedStyles: {
      "*": {
        "font-size": [
          /^\d{1,2}(?:\.\d+)?(?:px|pt|em|rem|%)$/,
        ],
        color: [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgba?\([\d\s.,%]+\)$/,
          /^[a-zA-Z]+$/,
        ],
        "background-color": [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgba?\([\d\s.,%]+\)$/,
          /^[a-zA-Z]+$/,
        ],
        "text-align": [
          /^(?:left|right|center|justify)$/,
        ],
        "font-weight": [
          /^(?:normal|bold|[1-9]00)$/,
        ],
        "font-style": [
          /^(?:normal|italic|oblique)$/,
        ],
        "text-decoration": [
          /^(?:none|underline|line-through)$/,
        ],
        width: [
          /^\d{1,3}(?:\.\d+)?(?:px|%)$/,
        ],
        height: [
          /^\d{1,3}(?:\.\d+)?(?:px|%)$/,
        ],
      },
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
      }),
    },
  });
}

// GET：所有访客均可读取大事记
export async function GET() {
  try {
    const timeline = await prisma.timeline.findUnique({
      where: { id: 1 },
    });

    const user = await getAuthorizedUser();

    return NextResponse.json({
      content: timeline?.content ?? "",
      updatedAt: timeline?.updatedAt ?? null,
      canEdit: Boolean(user),
    });
  } catch (error) {
    console.error("读取大事记失败：", error);

    return NextResponse.json(
      { error: "读取大事记失败，请检查数据库配置" },
      { status: 500 },
    );
  }
}

// PUT：只有站长和管理员可以保存
export async function PUT(request: NextRequest) {
  const user = await getAuthorizedUser();

  if (!user) {
    return NextResponse.json(
      { error: "没有编辑权限，请使用站长或管理员账号登录" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const content = cleanContent(body.content);

    const timeline = await prisma.timeline.upsert({
      where: { id: 1 },
      create: { id: 1, content },
      update: { content },
    });

    return NextResponse.json({
      success: true,
      message: "大事记保存成功",
      content: timeline.content,
      updatedAt: timeline.updatedAt,
    });
  } catch (error) {
    console.error("保存大事记失败：", error);

    const message =
      error instanceof Error ? error.message : "未知错误";

    return NextResponse.json(
      { error: `保存大事记失败：${message}` },
      { status: 400 },
    );
  }
}
