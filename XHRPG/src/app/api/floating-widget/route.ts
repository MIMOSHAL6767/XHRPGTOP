
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const widget = await prisma.floatingWidget.findUnique({
      where: { id: 1 },
      include: {
        tracks: {
          where: { enabled: true },
          orderBy: [{ sort: "asc" }, { id: "asc" }],
          select: {
            id: true,
            title: true,
            url: true,
          },
        },
      },
    });

    return NextResponse.json({
      enabled: widget?.enabled ?? false,
      gifUrl: widget?.gifUrl ?? null,
      width: widget?.width ?? 90,
      height: widget?.height ?? 90,
      positionX: widget?.positionX ?? 24,
      positionY: widget?.positionY ?? 120,
      musicEnabled: widget?.musicEnabled ?? true,
      tracks: widget?.tracks ?? [],
    });
  } catch (error) {
    console.error("读取悬浮组件配置失败：", error);
    return NextResponse.json(
      { error: "读取悬浮组件配置失败" },
      { status: 500 }
    );
  }
}
