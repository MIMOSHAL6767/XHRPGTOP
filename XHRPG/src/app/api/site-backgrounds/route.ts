
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backgrounds = await prisma.siteBackground.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { id: "asc" }],
      select: {
        id: true,
        name: true,
        imageUrl: true,
        overlayOpacity: true,
        blur: true,
      },
    });

    return NextResponse.json(
      { backgrounds },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("读取网站背景失败：", error);
    return NextResponse.json(
      { error: "读取背景列表失败" },
      { status: 500 }
    );
  }
}
