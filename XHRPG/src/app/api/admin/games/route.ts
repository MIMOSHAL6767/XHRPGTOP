import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

// 获取游戏列表：仅限站长
export async function GET() {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权访问，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const games = await prisma.game.findMany({
      orderBy: {
        id: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      games,
    });
  } catch (error) {
    console.error("获取游戏失败:", error);

    return NextResponse.json(
      { success: false, message: "获取游戏失败" },
      { status: 500 }
    );
  }
}

// 新建游戏：仅限站长
export async function POST(req: Request) {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权操作，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
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
      typeof body.name !== "string" ||
      !body.name.trim()
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

    const now = new Date().toISOString().split("T")[0];

    const game = await prisma.game.create({
      data: {
        name: body.name.trim(),
        en: body.en || "",
        author: body.author || "",
        category: body.category || "",
        version: body.version || "",
        description: body.description || "",
        cover: body.cover || "",
        lanzou: body.lanzou || "",
        pan123: body.pan123 || "",
        symbol: body.symbol || "✦",
        tags: body.tags || [],
        status: body.status || "已发布",
        history: body.history || [],
        date: body.date || now,
        updateDate: body.updateDate || now,
      },
    });

    return NextResponse.json({
      success: true,
      game,
    });
  } catch (error) {
    console.error("创建游戏失败:", error);

    return NextResponse.json(
      { success: false, message: "创建游戏失败" },
      { status: 500 }
    );
  }
}
