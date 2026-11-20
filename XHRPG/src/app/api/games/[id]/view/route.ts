import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 中国时区的本周一 00:00。
function getCurrentWeekStart() {
  const now = new Date();
  const chinaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const daysFromMonday = (chinaNow.getUTCDay() + 6) % 7;

  return new Date(
    Date.UTC(
      chinaNow.getUTCFullYear(),
      chinaNow.getUTCMonth(),
      chinaNow.getUTCDate() - daysFromMonday
    ) -
      8 * 60 * 60 * 1000
  );
}

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

    const currentWeekStart = getCurrentWeekStart();
    const previousWeekStart = new Date(
      currentWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000
    );

    // 单次原子 UPDATE 完成：总点击 +1、本周点击、上周点击、周起始时间重置。
    // 不再逐条插入访问日志，每次访问只产生 1 次数据库写操作。
    const affected = await prisma.$executeRaw`
      UPDATE "Game"
      SET
        "downloads" = "downloads" + 1,
        "lastWeekViews" = CASE
          WHEN "weeklyViewsWeekStart" >= ${currentWeekStart}
            THEN "lastWeekViews"
          WHEN "weeklyViewsWeekStart" >= ${previousWeekStart}
            THEN "weeklyViews"
          ELSE 0
        END,
        "weeklyViews" = CASE
          WHEN "weeklyViewsWeekStart" >= ${currentWeekStart}
            THEN "weeklyViews" + 1
          ELSE 1
        END,
        "weeklyViewsWeekStart" = ${currentWeekStart}
      WHERE "id" = ${gameId} AND "status" = '已发布'
    `;

    if (affected === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "游戏不存在或尚未发布",
        },
        { status: 404 }
      );
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
