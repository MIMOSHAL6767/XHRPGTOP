import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

function isPositiveId(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function isValidColor(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(value)
  );
}

function isValidBorder(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) {
    return false;
  }

  if (value === "none") return true;

  return /^\d{1,3}px\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20})$/.test(
    value
  );
}

function isValidShadow(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 100) {
    return false;
  }

  if (value === "") return true;

  // 只接受简单的像素阴影，拒绝 URL、分号和其他 CSS 表达式。
  return /^-?\d{1,3}px\s+-?\d{1,3}px\s+\d{1,3}px(?:\s+-?\d{1,3}px)?\s+(#[0-9a-fA-F]{3,8}|[a-zA-Z]{1,20})$/.test(
    value
  );
}

async function requireOwner() {
  try {
    return await isSiteOwner();
  } catch (error) {
    console.error("站长权限检查失败:", error);
    return false;
  }
}

async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

// GET：获取指定用户称号
export async function GET(req: Request) {
  if (!(await requireOwner())) {
    return jsonError("未登录或没有站长权限", 403);
  }

  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid || !/^[1-9]\d*$/.test(uid)) {
      return jsonError("缺少或无效的用户 ID", 400);
    }

    const userId = Number(uid);

    if (!isPositiveId(userId)) {
      return jsonError("用户 ID 无效", 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        nickname: true,
        title: true,
        titleStyle: true,
        showTitle: true,
        userTitles: {
          include: {
            title: true,
          },
        },
      },
    });

    if (!user) {
      return jsonError("用户不存在", 404);
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("获取用户称号失败:", error);
    return jsonError("获取用户称号失败", 500);
  }
}

// POST：创建称号模板
export async function POST(req: Request) {
  if (!(await requireOwner())) {
    return jsonError("未登录或没有站长权限", 403);
  }

  try {
    const body = await readJson(req);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("请求数据格式错误", 400);
    }

    const data = body as Record<string, unknown>;
    const name =
      typeof data.name === "string" ? data.name.trim() : "";

    if (!name) {
      return jsonError("称号名称不能为空", 400);
    }

    if (name.length > 30) {
      return jsonError("称号名称不能超过 30 个字符", 400);
    }

    const color = data.color ?? "#ffffff";
    const background = data.background ?? "#333333";
    const border = data.border ?? "none";
    const shadow = data.shadow ?? "";
    const size = data.size ?? 14;

    if (!isValidColor(color)) {
      return jsonError("文字颜色格式无效", 400);
    }

    if (!isValidColor(background)) {
      return jsonError("背景颜色格式无效", 400);
    }

    if (!isValidBorder(border)) {
      return jsonError("边框格式无效", 400);
    }

    if (!isValidShadow(shadow)) {
      return jsonError("阴影格式无效", 400);
    }

    if (
      typeof size !== "number" ||
      !Number.isInteger(size) ||
      size < 8 ||
      size > 72
    ) {
      return jsonError("字号必须是 8 到 72 之间的整数", 400);
    }

    const title = await prisma.userTitle.create({
      data: {
        name,
        color,
        background,
        border,
        shadow: shadow || null,
        size,
      },
    });

    return NextResponse.json({
      success: true,
      title,
    });
  } catch (error) {
    console.error("创建称号失败:", error);
    return jsonError("创建称号失败", 500);
  }
}

// PUT：授予用户称号
export async function PUT(req: Request) {
  if (!(await requireOwner())) {
    return jsonError("未登录或没有站长权限", 403);
  }

  try {
    const body = await readJson(req);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonError("请求数据格式错误", 400);
    }

    const data = body as Record<string, unknown>;
    const userId = data.userId;
    const titleId = data.titleId;

    if (!isPositiveId(userId) || !isPositiveId(titleId)) {
      return jsonError("用户 ID 或称号 ID 无效", 400);
    }

    const [targetUser, targetTitle] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      prisma.userTitle.findUnique({
        where: { id: titleId },
        select: { id: true },
      }),
    ]);

    if (!targetUser) {
      return jsonError("用户不存在", 404);
    }

    if (!targetTitle) {
      return jsonError("称号不存在", 404);
    }

    const grant = await prisma.userTitleGrant.upsert({
      where: {
        userId_titleId: {
          userId,
          titleId,
        },
      },
      update: {},
      create: {
        userId,
        titleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "称号授予成功",
      grant,
    });
  } catch (error) {
    console.error("授予称号失败:", error);
    return jsonError("授予称号失败", 500);
  }
}

// DELETE：收回用户称号
export async function DELETE(req: Request) {
  if (!(await requireOwner())) {
    return jsonError("未登录或没有站长权限", 403);
  }

  try {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");
    const titleIdParam = searchParams.get("titleId");

    if (
      !userIdParam ||
      !titleIdParam ||
      !/^[1-9]\d*$/.test(userIdParam) ||
      !/^[1-9]\d*$/.test(titleIdParam)
    ) {
      return jsonError("用户 ID 或称号 ID 无效", 400);
    }

    const userId = Number(userIdParam);
    const titleId = Number(titleIdParam);

    if (!isPositiveId(userId) || !isPositiveId(titleId)) {
      return jsonError("用户 ID 或称号 ID 无效", 400);
    }

    const existingGrant = await prisma.userTitleGrant.findUnique({
      where: {
        userId_titleId: {
          userId,
          titleId,
        },
      },
      include: {
        title: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!existingGrant) {
      return jsonError("用户没有该称号，或称号已被收回", 404);
    }

    await prisma.$transaction(async (tx) => {
      await tx.userTitleGrant.delete({
        where: {
          userId_titleId: {
            userId,
            titleId,
          },
        },
      });

      const [user, remain] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: { title: true },
        }),
        tx.userTitleGrant.count({
          where: { userId },
        }),
      ]);

      // 如果被收回的是用户当前佩戴的称号，清空佩戴信息。
      // 即使用户还有其他称号，也不保留已收回称号的佩戴状态。
      if (
        user &&
        user.title === existingGrant.title.name
      ) {
        await tx.user.update({
          where: { id: userId },
          data: {
            title: null,
            titleStyle: Prisma.DbNull,
            showTitle: false,
          },
        });
      } else if (remain === 0 && user) {
        // 没有剩余称号时，确保佩戴信息已清空。
        await tx.user.update({
          where: { id: userId },
          data: {
            title: null,
            titleStyle: Prisma.DbNull,
            showTitle: false,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "称号已收回",
    });
  } catch (error) {
    console.error("收回称号失败:", error);
    return jsonError("收回称号失败", 500);
  }
}
