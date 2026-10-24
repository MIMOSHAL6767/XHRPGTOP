import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

const ALLOWED_GAME_STATUSES = [
  "完结",
  "更新中",
  "Demo",
  "弃坑",
  "断更",
] as const;

type GameStatus = (typeof ALLOWED_GAME_STATUSES)[number];

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

    // 作品状态与发布/审核状态分开保存。
    // 未传入有效作品状态时，默认设为“更新中”。
    let gameStatus: GameStatus = "更新中";

    if (body.gameStatus !== undefined) {
      if (
        typeof body.gameStatus !== "string" ||
        !ALLOWED_GAME_STATUSES.includes(
          body.gameStatus as GameStatus
        )
      ) {
        return NextResponse.json(
          {
            success: false,
            message: "作品状态无效，请选择：完结、更新中、Demo、弃坑或断更",
          },
          { status: 400 }
        );
      }

      gameStatus = body.gameStatus as GameStatus;
    }

    const now = new Date().toISOString().split("T")[0];

    const game = await prisma.game.create({
      data: {
        name: body.name.trim(),
        en: typeof body.en === "string" ? body.en : "",
        author: typeof body.author === "string" ? body.author : "",
        category: typeof body.category === "string" ? body.category : "",
        version: typeof body.version === "string" ? body.version : "",
        description:
          typeof body.description === "string" ? body.description : "",
        cover: typeof body.cover === "string" ? body.cover : "",
        lanzou: typeof body.lanzou === "string" ? body.lanzou : "",
        pan123: typeof body.pan123 === "string" ? body.pan123 : "",
        symbol: typeof body.symbol === "string" ? body.symbol : "✦",
        tags: body.tags ?? [],
        status:
          typeof body.status === "string" && body.status.trim()
            ? body.status
            : "已发布",
        gameStatus,
        history: body.history ?? [],
        date:
          typeof body.date === "string" && body.date
            ? body.date
            : now,
        updateDate:
          typeof body.updateDate === "string" && body.updateDate
            ? body.updateDate
            : now,
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
