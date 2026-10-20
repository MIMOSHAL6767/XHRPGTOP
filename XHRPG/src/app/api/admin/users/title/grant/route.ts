import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    // 统一使用服务端站长认证
    if (!(await isSiteOwner())) {
      return errorResponse("未登录或没有站长权限", 403);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return errorResponse("请求数据不是有效的 JSON", 400);
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return errorResponse("请求数据格式错误", 400);
    }

    const data = body as Record<string, unknown>;
    const userId = data.userId;
    const titleId = data.titleId;

    // 只接受正整数，拒绝字符串、0、负数和小数
    if (
      typeof userId !== "number" ||
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      typeof titleId !== "number" ||
      !Number.isSafeInteger(titleId) ||
      titleId <= 0
    ) {
      return errorResponse("用户 ID 或称号 ID 无效", 400);
    }

    const [targetUser, title] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      }),
      prisma.userTitle.findUnique({
        where: { id: titleId },
        select: {
          id: true,
          name: true,
          color: true,
          background: true,
          border: true,
          shadow: true,
          size: true,
        },
      }),
    ]);

    if (!targetUser) {
      return errorResponse("目标用户不存在", 404);
    }

    if (!title) {
      return errorResponse("称号不存在", 404);
    }

    // 数据库唯一约束应保证同一用户不会重复获得同一称号
    const grant = await prisma.userTitleGrant.upsert({
      where: {
        userId_titleId: {
          userId,
          titleId,
        },
      },
      create: {
        userId,
        titleId,
      },
      update: {},
      include: {
        title: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "称号已授予；用户可自行选择是否佩戴",
      grant,
    });
  } catch (error) {
    console.error("授予称号失败:", error);
    return errorResponse("授予称号失败，请稍后重试", 500);
  }
}
