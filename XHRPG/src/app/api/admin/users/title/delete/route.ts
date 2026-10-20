import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function DELETE(req: Request) {
  try {
    // 统一使用站长认证逻辑，不允许旧密钥回退
    if (!(await isSiteOwner())) {
      return errorResponse("未登录或没有站长权限", 403);
    }

    const { searchParams } = new URL(req.url);
    const rawId = searchParams.get("id");

    if (!rawId || !/^[1-9]\d*$/.test(rawId)) {
      return errorResponse("称号 ID 无效", 400);
    }

    const id = Number(rawId);

    if (!Number.isSafeInteger(id)) {
      return errorResponse("称号 ID 无效", 400);
    }

    const title = await prisma.userTitle.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
      },
    });

    if (!title) {
      return errorResponse("称号不存在", 404);
    }

    // 检查用户当前是否正在佩戴该称号
    const wearingUsers = await prisma.user.findMany({
      where: {
        title: title.name,
      },
      select: {
        id: true,
        nickname: true,
      },
      take: 100,
    });

    // 检查是否仍有用户持有该称号的授予记录
    const grantCount = await prisma.userTitleGrant.count({
      where: {
        titleId: id,
      },
    });

    if (wearingUsers.length > 0 || grantCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "该称号仍在使用或已授予用户，请先收回所有授予记录并处理正在佩戴的用户。",
          wearingUserCount: wearingUsers.length,
          grantCount,
          users: wearingUsers,
        },
        { status: 409 }
      );
    }

    await prisma.userTitle.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "称号模板删除成功",
    });
  } catch (error) {
    console.error("删除称号失败:", error);
    return errorResponse("删除称号失败，请稍后重试", 500);
  }
}
