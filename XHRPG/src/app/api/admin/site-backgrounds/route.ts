
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!(await isSiteOwner())) {
      return NextResponse.json({ error: "无权访问" }, { status: 403 });
    }

    const backgrounds = await prisma.siteBackground.findMany({
      orderBy: [{ sort: "asc" }, { id: "asc" }],
    });

    return NextResponse.json({ backgrounds });
  } catch (error) {
    console.error("读取后台背景失败：", error);
    return NextResponse.json(
      { error: "读取背景列表失败" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await isSiteOwner())) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const imageUrl =
      typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";

    if (!name || name.length > 100) {
      return NextResponse.json(
        { error: "背景名称不能为空，且不能超过100个字符" },
        { status: 400 }
      );
    }

    if (!/^https?:\/\/\S+$/i.test(imageUrl)) {
      return NextResponse.json(
        { error: "背景图片地址无效" },
        { status: 400 }
      );
    }

    const overlayOpacity = Number(body.overlayOpacity ?? 45);
    const blur = Number(body.blur ?? 0);
    const sort = Number(body.sort ?? 0);

    if (
      !Number.isInteger(overlayOpacity) ||
      overlayOpacity < 0 ||
      overlayOpacity > 90 ||
      !Number.isInteger(blur) ||
      blur < 0 ||
      blur > 20 ||
      !Number.isInteger(sort)
    ) {
      return NextResponse.json(
        { error: "遮罩、模糊或排序参数无效" },
        { status: 400 }
      );
    }

    const background = await prisma.siteBackground.create({
      data: {
        name,
        imageUrl,
        overlayOpacity,
        blur,
        sort,
        enabled: body.enabled !== false,
      },
    });

    return NextResponse.json({ success: true, background });
  } catch (error) {
    console.error("新增网站背景失败：", error);
    return NextResponse.json(
      { error: "新增背景失败" },
      { status: 500 }
    );
  }
}
