
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Next.js 15 动态路由参数类型
type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// 获取单个 Banner
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const bannerId = Number(id);

    if (!Number.isInteger(bannerId) || bannerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner ID 无效",
        },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.findUnique({
      where: {
        id: bannerId,
      },
    });

    if (!banner) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner不存在",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (e) {
    console.error("获取 Banner 失败：", e);

    return NextResponse.json(
      {
        success: false,
        message: "获取失败",
      },
      { status: 500 }
    );
  }
}

// 修改 Banner
export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const bannerId = Number(id);

    if (!Number.isInteger(bannerId) || bannerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner ID 无效",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const banner = await prisma.banner.update({
      where: {
        id: bannerId,
      },
      data: {
        title: body.title,
        description: body.description,
        background: body.background,
        cover: body.cover,
        enabled: body.enabled,
        titleSize: Number(body.titleSize || 40),
        titleColor: body.titleColor,
        titleX: Number(body.titleX || 50),
        titleY: Number(body.titleY || 30),
        descSize: Number(body.descSize || 18),
        descColor: body.descColor,
        descX: Number(body.descX || 50),
        descY: Number(body.descY || 50),
        coverWidth: Number(body.coverWidth || 300),
        coverHeight: Number(body.coverHeight || 300),
        coverX: Number(body.coverX || 50),
        coverY: Number(body.coverY || 50),
        coverFit: body.coverFit || "contain",
      },
    });

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (e) {
    console.error("修改 Banner 失败：", e);

    return NextResponse.json(
      {
        success: false,
        message: "修改失败",
      },
      { status: 500 }
    );
  }
}

// 删除 Banner
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const bannerId = Number(id);

    if (!Number.isInteger(bannerId) || bannerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Banner ID 无效",
        },
        { status: 400 }
      );
    }

    await prisma.banner.delete({
      where: {
        id: bannerId,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (e) {
    console.error("删除 Banner 失败：", e);

    return NextResponse.json(
      {
        success: false,
        message: "删除失败",
      },
      { status: 500 }
    );
  }
}
