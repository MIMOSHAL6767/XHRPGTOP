import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { isSiteOwner } from "@/lib/admin-auth";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      message: "无权访问，请使用站长账号登录",
    },
    { status: 401 }
  );
}

function parseBannerId(id: string): number | null {
  if (!/^[1-9]\d*$/.test(id)) return null;

  const bannerId = Number(id);

  if (!Number.isSafeInteger(bannerId)) return null;

  return bannerId;
}

// 获取单个 Banner：仅限站长
export async function GET(
  req: NextRequest,
  context: RouteContext
) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const bannerId = parseBannerId(id);

    if (bannerId === null) {
      return NextResponse.json(
        { success: false, message: "Banner ID 无效" },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.findUnique({
      where: { id: bannerId },
    });

    if (!banner) {
      return NextResponse.json(
        { success: false, message: "Banner 不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("获取 Banner 失败：", error);

    return NextResponse.json(
      { success: false, message: "获取失败" },
      { status: 500 }
    );
  }
}

// 修改 Banner：仅限站长
export async function PUT(
  req: NextRequest,
  context: RouteContext
) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const bannerId = parseBannerId(id);

    if (bannerId === null) {
      return NextResponse.json(
        { success: false, message: "Banner ID 无效" },
        { status: 400 }
      );
    }

    const body = await req.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { success: false, message: "提交的数据格式错误" },
        { status: 400 }
      );
    }

    const existing = await prisma.banner.findUnique({
      where: { id: bannerId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Banner 不存在" },
        { status: 404 }
      );
    }

    const numericFields = [
      "titleSize",
      "titleX",
      "titleY",
      "descSize",
      "descX",
      "descY",
      "coverWidth",
      "coverHeight",
      "coverX",
      "coverY",
    ];

    for (const field of numericFields) {
      if (
        body[field] !== undefined &&
        (body[field] === null ||
          body[field] === "" ||
          !Number.isFinite(Number(body[field])))
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `${field} 数值无效`,
          },
          { status: 400 }
        );
      }
    }

    if (
      body.enabled !== undefined &&
      typeof body.enabled !== "boolean"
    ) {
      return NextResponse.json(
        { success: false, message: "enabled 必须是布尔值" },
        { status: 400 }
      );
    }

    const banner = await prisma.banner.update({
      where: { id: bannerId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && {
          description: body.description,
        }),
        ...(body.background !== undefined && {
          background: body.background,
        }),
        ...(body.cover !== undefined && { cover: body.cover }),
        ...(body.enabled !== undefined && {
          enabled: body.enabled,
        }),
        ...(body.titleSize !== undefined && {
          titleSize: Number(body.titleSize),
        }),
        ...(body.titleColor !== undefined && {
          titleColor: body.titleColor,
        }),
        ...(body.titleX !== undefined && {
          titleX: Number(body.titleX),
        }),
        ...(body.titleY !== undefined && {
          titleY: Number(body.titleY),
        }),
        ...(body.descSize !== undefined && {
          descSize: Number(body.descSize),
        }),
        ...(body.descColor !== undefined && {
          descColor: body.descColor,
        }),
        ...(body.descX !== undefined && {
          descX: Number(body.descX),
        }),
        ...(body.descY !== undefined && {
          descY: Number(body.descY),
        }),
        ...(body.coverWidth !== undefined && {
          coverWidth: Number(body.coverWidth),
        }),
        ...(body.coverHeight !== undefined && {
          coverHeight: Number(body.coverHeight),
        }),
        ...(body.coverX !== undefined && {
          coverX: Number(body.coverX),
        }),
        ...(body.coverY !== undefined && {
          coverY: Number(body.coverY),
        }),
        ...(body.coverFit !== undefined && {
          coverFit: body.coverFit,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("修改 Banner 失败：", error);

    return NextResponse.json(
      { success: false, message: "修改失败，请检查提交的数据" },
      { status: 500 }
    );
  }
}

// 删除 Banner：仅限站长
export async function DELETE(
  req: NextRequest,
  context: RouteContext
) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;
    const bannerId = parseBannerId(id);

    if (bannerId === null) {
      return NextResponse.json(
        { success: false, message: "Banner ID 无效" },
        { status: 400 }
      );
    }

    const existing = await prisma.banner.findUnique({
      where: { id: bannerId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Banner 不存在" },
        { status: 404 }
      );
    }

    await prisma.banner.delete({
      where: { id: bannerId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除 Banner 失败：", error);

    return NextResponse.json(
      { success: false, message: "删除失败" },
      { status: 500 }
    );
  }
}
