
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权访问，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const games = await prisma.game.findMany({
      where: {
        status: "审核中",
      },
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      games,
      total: games.length,
    });
  } catch (error) {
    console.error("获取待审核投稿失败:", error);

    return NextResponse.json(
      { success: false, message: "获取待审核投稿失败" },
      { status: 500 }
    );
  }
}
