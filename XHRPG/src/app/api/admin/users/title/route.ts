import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// 获取错误消息
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "服务器内部错误";
}

// 获取当前登录用户
async function getUser(): Promise<number | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const id = Number(payload.id);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

// GET：获取指定用户称号
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("uid"));

    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return NextResponse.json({
        success: false,
        message: "缺少或无效的用户ID",
      });
    }

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        nickname: true,
        title: true,
        titleStyle: true,
        showTitle: true,
        userTitles: {
          include: {
            title: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "用户不存在",
      });
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: unknown) {
    console.error("获取用户称号失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error) === "服务器内部错误"
          ? "获取失败"
          : getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

// POST：创建称号模板
export async function POST(req: Request) {
  try {
    const operatorId = await getUser();

    if (!operatorId) {
      return NextResponse.json(
        { success: false, message: "未登录或登录已失效" },
        { status: 401 }
      );
    }

    const operator = await prisma.user.findUnique({
      where: {
        id: operatorId,
      },
      select: {
        role: true,
      },
    });

    if (!operator || operator.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "只有站长可以创建称号" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const name = String(body.name ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "称号名称不能为空" },
        { status: 400 }
      );
    }

    const parsedSize = Number(body.size);
    const size =
      Number.isFinite(parsedSize) && parsedSize > 0
        ? parsedSize
        : 14;

    const title = await prisma.userTitle.create({
      data: {
        name,
        color: body.color || "#ffffff",
        background: body.background || "#333333",
        border: body.border || "none",
        shadow: body.shadow || null,
        size,
      },
    });

    return NextResponse.json({
      success: true,
      title,
    });
  } catch (error: unknown) {
    console.error("创建称号失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error) === "服务器内部错误"
          ? "创建失败"
          : getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

// PUT：授予称号
export async function PUT(req: Request) {
  try {
    const operatorId = await getUser();

    if (!operatorId) {
      return NextResponse.json(
        { success: false, message: "未登录或登录已失效" },
        { status: 401 }
      );
    }

    const operator = await prisma.user.findUnique({
      where: {
        id: operatorId,
      },
      select: {
        role: true,
      },
    });

    if (!operator || operator.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "权限不足" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const userId = Number(body.userId);
    const titleId = Number(body.titleId);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(titleId) ||
      titleId <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "参数错误" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, message: "用户不存在" },
        { status: 404 }
      );
    }

    const targetTitle = await prisma.userTitle.findUnique({
      where: { id: titleId },
      select: { id: true },
    });

    if (!targetTitle) {
      return NextResponse.json(
        { success: false, message: "称号不存在" },
        { status: 404 }
      );
    }

    const exists = await prisma.userTitleGrant.findUnique({
      where: {
        userId_titleId: {
          userId,
          titleId,
        },
      },
    });

    if (exists) {
      return NextResponse.json({
        success: false,
        message: "用户已经拥有该称号",
      });
    }

    const grant = await prisma.userTitleGrant.create({
      data: {
        userId,
        titleId,
      },
    });

    return NextResponse.json({
      success: true,
      message: "称号授予成功",
      grant,
    });
  } catch (error: unknown) {
    console.error("授予称号失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error) === "服务器内部错误"
          ? "授予失败"
          : getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}

// DELETE：收回称号
export async function DELETE(req: Request) {
  try {
    const operatorId = await getUser();

    if (!operatorId) {
      return NextResponse.json(
        { success: false, message: "未登录或登录已失效" },
        { status: 401 }
      );
    }

    const operator = await prisma.user.findUnique({
      where: {
        id: operatorId,
      },
      select: {
        role: true,
      },
    });

    if (!operator || operator.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "权限不足" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const userId = Number(searchParams.get("userId"));
    const titleId = Number(searchParams.get("titleId"));

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(titleId) ||
      titleId <= 0
    ) {
      return NextResponse.json(
        { success: false, message: "参数错误" },
        { status: 400 }
      );
    }

    const existingGrant = await prisma.userTitleGrant.findUnique({
      where: {
        userId_titleId: {
          userId,
          titleId,
        },
      },
    });

    if (!existingGrant) {
      return NextResponse.json(
        { success: false, message: "用户没有该称号，或称号已被收回" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.userTitleGrant.delete({
        where: {
          userId_titleId: {
            userId,
            titleId,
          },
        },
      });

      const remain = await tx.userTitleGrant.count({
        where: {
          userId,
        },
      });

      // 只有没有剩余称号时，才清空当前佩戴称号
      if (remain === 0) {
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            title: null,
            titleStyle: Prisma.DbNull,
            showTitle: false,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "称号已收回",
    });
  } catch (error: unknown) {
    console.error("收回称号失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: getErrorMessage(error) === "服务器内部错误"
          ? "收回失败"
          : getErrorMessage(error),
      },
      { status: 500 }
    );
  }
}
