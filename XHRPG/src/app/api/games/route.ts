import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 公开接口：返回所有已发布游戏，供 Xheam 启动器拉取
export async function GET() {
  try {
    const games = await prisma.game.findMany({
      where: { status: "已发布" },
      orderBy: { createdAt: "desc" },
    });

    const data = games.map((g) => ({
      id: g.id,
      name: g.name,
      author: g.author,
      version: g.version,
      description: g.description || "",
      category: g.category || "",
      tags: Array.isArray(g.tags) ? g.tags : [],
      gameStatus: g.gameStatus || "",
      screenshots: Array.isArray(g.screenshots) ? g.screenshots : [],
      detailBackground: g.detailBackground || "",
      titleMode: g.titleMode || "text",
      titleLogo: g.titleLogo || "",
      updateDate: g.updateDate || "",
      cover: g.cover || "",
      lanzou: g.lanzou || "",
      pan123: g.pan123 || "",
      password: g.password || "",
      match: g.match || "",
      history: Array.isArray(g.history) ? g.history : [],
    }));

    return NextResponse.json(data, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (error) {
    console.error("读取游戏列表失败：", error);
    return NextResponse.json({ error: "读取游戏列表失败" }, { status: 500 });
  }
}
