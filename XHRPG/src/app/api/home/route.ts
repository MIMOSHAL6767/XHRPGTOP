import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*" };

// 公开接口：首页数据（轮播、头图、首页活动、最新游戏），供 Xheam 启动器使用
export async function GET() {
  try {
    const [games, banners, header, activities] = await Promise.all([
      prisma.game.findMany({
        where: { status: "已发布" },
        orderBy: { id: "desc" },
        take: 12,
        select: {
          id: true,
          name: true,
          author: true,
          version: true,
          cover: true,
        },
      }),
      prisma.banner.findMany({
        where: { enabled: true },
        orderBy: { id: "asc" },
      }),
      prisma.homeHeader.findUnique({ where: { id: 1 } }),
      prisma.activity.findMany({
        where: { enabled: true, showOnHome: true },
        orderBy: [{ sort: "asc" }, { id: "desc" }],
        select: {
          id: true,
          title: true,
          cover: true,
          background: true,
          backgroundFit: true,
          backgroundOpacity: true,
          titleColor: true,
          titleSize: true,
          content: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        headerImage: header?.imageUrl ?? null,
        banners,
        activities,
        latestGames: games,
      },
      { headers: CORS }
    );
  } catch (error) {
    console.error("读取首页数据失败：", error);
    return NextResponse.json({ error: "读取首页数据失败" }, { status: 500, headers: CORS });
  }
}
