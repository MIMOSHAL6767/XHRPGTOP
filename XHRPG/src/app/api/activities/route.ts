import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*" };

// 公开接口：已启用的活动列表，供 Xheam 启动器使用
export async function GET() {
  try {
    const activities = await prisma.activity.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        cover: true,
        createdAt: true,
      },
    });

    return NextResponse.json(activities, { headers: CORS });
  } catch (error) {
    console.error("读取活动列表失败：", error);
    return NextResponse.json({ error: "读取活动列表失败" }, { status: 500, headers: CORS });
  }
}
