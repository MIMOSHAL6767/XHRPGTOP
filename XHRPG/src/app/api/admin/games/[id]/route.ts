import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

function unauthorized() {
  return NextResponse.json(
    {
      success: false,
      message: "无权访问，请使用站长账号登录",
    },
    { status: 401 }
  );
}

function invalidId(id: string) {
  return !/^[1-9]\d*$/.test(id) ||
    !Number.isSafeInteger(Number(id));
}

// 获取单个游戏
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "游戏 ID 无效" },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: Number(id) },
    });

    if (!game) {
      return NextResponse.json(
        { success: false, message: "游戏不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error("获取游戏失败:", error);

    return NextResponse.json(
      { success: false, message: "获取失败" },
      { status: 500 }
    );
  }
}

// 修改游戏
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "游戏 ID 无效" },
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

    if (
      body.name !== undefined &&
      (typeof body.name !== "string" || !body.name.trim())
    ) {
      return NextResponse.json(
        { success: false, message: "游戏名称不能为空" },
        { status: 400 }
      );
    }

    if (
      body.tags !== undefined &&
      !Array.isArray(body.tags)
    ) {
      return NextResponse.json(
        { success: false, message: "游戏标签格式错误" },
        { status: 400 }
      );
    }

    if (
      body.history !== undefined &&
      !Array.isArray(body.history)
    ) {
      return NextResponse.json(
        { success: false, message: "游戏历史记录格式错误" },
        { status: 400 }
      );
    }

    const data = {
      ...(body.name !== undefined && {
        name: body.name.trim(),
      }),
      ...(body.en !== undefined && { en: body.en }),
      ...(body.author !== undefined && { author: body.author }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.version !== undefined && { version: body.version }),
      ...(body.description !== undefined && {
        description: body.description,
      }),
      ...(body.cover !== undefined && { cover: body.cover }),
      ...(body.lanzou !== undefined && { lanzou: body.lanzou }),
      ...(body.pan123 !== undefined && { pan123: body.pan123 }),
      ...(body.symbol !== undefined && { symbol: body.symbol }),
      ...(body.tags !== undefined && { tags: body.tags }),
      ...(body.history !== undefined && { history: body.history }),
      ...(body.status !== undefined && { status: body.status }),
      updateDate: new Date().toISOString().split("T")[0],
    };

    const game = await prisma.game.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json({ success: true, game });
  } catch (error) {
    console.error("修改游戏失败:", error);

    return NextResponse.json(
      { success: false, message: "修改失败，游戏可能不存在或数据无效" },
      { status: 500 }
    );
  }
}

// 删除游戏
export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isSiteOwner())) {
    return unauthorized();
  }

  try {
    const { id } = await context.params;

    if (invalidId(id)) {
      return NextResponse.json(
        { success: false, message: "游戏 ID 无效" },
        { status: 400 }
      );
    }

    const existing = await prisma.game.findUnique({
      where: { id: Number(id) },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "游戏不存在" },
        { status: 404 }
      );
    }

    await prisma.game.delete({
      where: { id: Number(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除游戏失败:", error);

    return NextResponse.json(
      { success: false, message: "删除失败" },
      { status: 500 }
    );
  }
}
