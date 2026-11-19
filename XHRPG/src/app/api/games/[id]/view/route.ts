import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  }
) {
  try {
    const { id } = await params;
    const gameId = Number(id);

    if (!Number.isSafeInteger(gameId) || gameId <= 0) {
      return NextResponse.json(
        { success: false, message: "游戏 ID 无效" },
        { status: 400 }
      );
    }

    // 只统计已发布的游戏。
    // updateMany 在数据库中原子递增，不会出现普通的读后写覆盖。
    const result = await prisma.game.updateMany({
      where: {
        id: gameId,
        status: "已发布",
      },
      data: {
        downloads: {
          increment: 1,
        },
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "游戏不存在或尚未发布",
        },
        { status: 404 }
      );
    }

    // 记录访问日志，用于首页「本周热门」的一周增量统计。
    try {
      await prisma.gameViewLog.create({ data: { gameId } });

      // 偶尔清理 30 天前的日志，避免表无限增长。
      if (Math.random() < 0.01) {
        await prisma.gameViewLog.deleteMany({
          where: {
            createdAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        });
      }
    } catch (logError) {
      console.error("记录游戏访问日志失败：", logError);
    }

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("游戏访问统计失败：", error);

    return NextResponse.json(
      {
        success: false,
        message: "访问统计暂时不可用",
      },
      { status: 500 }
    );
  }
}