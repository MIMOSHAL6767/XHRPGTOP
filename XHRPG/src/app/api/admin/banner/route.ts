import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isSiteOwner } from "@/lib/admin-auth";

// 获取全部轮换图：仅限站长
export async function GET() {
  const isOwner = await isSiteOwner();

  if (!isOwner) {
    return NextResponse.json(
      {
        success: false,
        message: "无权访问，请先登录站长账号",
      },
      { status: 401 }
    );
  }

  try {
    const banners = await prisma.banner.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      banners,
    });
  } catch (error) {
    console.error("获取Banner失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: "获取轮换图失败",
      },
      { status: 500 }
    );
  }
}

// 新增轮换图：仅限站长
export async function POST(req: Request) {
  const isOwner = await isSiteOwner();

  if (!isOwner) {
    return NextResponse.json(
      {
        success: false,
        message: "无权操作，请先登录站长账号",
      },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();

    console.log("收到Banner数据:", body);

    const banner = await prisma.banner.create({
      data: {
        name: body.title || "未命名轮换图",
        title: body.title || "未命名轮换图",
        cover: body.cover || null,
        background: body.background || body.cover || "",
        description: body.description || "",
        enabled: body.enabled ?? true,

        titleSize: Number(
          String(body.titleSize || 40).replace("px", "")
        ),
        titleColor: body.titleColor || "#ffffff",
        titleX: Number(body.titleX || 50),
        titleY: Number(body.titleY || 30),

        descSize: Number(
          String(body.descSize || 18).replace("px", "")
        ),
        descColor: body.descColor || "#ffffff",
        descX: Number(body.descX || 50),
        descY: Number(body.descY || 65),

        coverWidth: Number(
          String(body.coverWidth || 300).replace("px", "")
        ),
        coverHeight: Number(
          String(body.coverHeight || 300).replace("px", "")
        ),
        coverX: Number(body.coverX || 50),
        coverY: Number(body.coverY || 50),
        coverFit: body.coverFit || "contain",
        sort: Number(body.sort || 0),
      },
    });

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("创建Banner失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: "创建轮换图失败，请检查提交的数据",
      },
      { status: 500 }
    );
  }
}
