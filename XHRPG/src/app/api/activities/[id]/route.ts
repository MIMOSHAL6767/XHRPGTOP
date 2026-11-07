import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*" };

// 公开接口：单个活动详情，供 Xheam 启动器使用
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const activityId = Number(id);

    if (!Number.isSafeInteger(activityId) || activityId <= 0) {
      return NextResponse.json({ error: "活动 ID 无效" }, { status: 400, headers: CORS });
    }

    const activity = await prisma.activity.findFirst({
      where: { id: activityId, enabled: true },
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
    });

    if (!activity) {
      return NextResponse.json({ error: "活动不存在" }, { status: 404, headers: CORS });
    }

    return NextResponse.json(activity, { headers: CORS });
  } catch (error) {
    console.error("读取活动详情失败：", error);
    return NextResponse.json({ error: "读取活动详情失败" }, { status: 500, headers: CORS });
  }
}
