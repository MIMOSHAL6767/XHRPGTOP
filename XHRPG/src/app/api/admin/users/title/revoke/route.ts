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

    const result = await prisma.$transaction(async (tx) => {
      const [user, title, grant] = await Promise.all([
        tx.user.findUnique({
          where: { id: userId },
          select: { id: true, title: true },
        }),
        tx.userTitle.findUnique({
          where: { id: titleId },
          select: { id: true, name: true },
        }),
        tx.userTitleGrant.findUnique({
          where: {
            userId_titleId: { userId, titleId },
          },
          select: { userId: true, titleId: true },
        }),
      ]);

      if (!user) {
        return { error: "目标用户不存在", status: 404 as const };
      }

      if (!title) {
        return { error: "称号不存在", status: 404 as const };
      }

      if (!grant) {
        return {
          error: "该用户没有获得这个称号",
          status: 404 as const,
        };
      }

      await tx.userTitleGrant.delete({
        where: {
          userId_titleId: { userId, titleId },
        },
      });

      // 仅当用户当前佩戴的正是被撤销的称号时才清除佩戴状态
      if (user.title === title.name) {
        await tx.user.update({
          where: { id: userId },
          data: {
            title: null,
            titleStyle: {},
            showTitle: false,
          },
        });
      }

      return { error: null, status: 200 as const };
    });

    if (result.error) {
      return errorResponse(result.error, result.status);
    }

    return NextResponse.json({
      success: true,
      message: "称号已收回",
    });
  } catch (error) {
    console.error("收回称号失败:", error);
    return errorResponse("收回称号失败，请稍后重试", 500);
  }
}
