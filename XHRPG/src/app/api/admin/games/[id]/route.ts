import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";
import { Prisma } from "@prisma/client";

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
  return (
    !/^[1-9]\d*$/.test(id) ||
    !Number.isSafeInteger(Number(id))
  );
}

function isOptionalString(value: unknown) {
  return value === null || typeof value === "string";
}

function isValidImageUrl(value: unknown) {
  return (
    value === null ||
    (typeof value === "string" &&
      (value === "" ||
        value.startsWith("https://raw.githubusercontent.com/")))
  );
}

// 作品状态：与发布审核状态 status 分开保存
const ALLOWED_GAME_STATUSES = [
  "完结",
  "更新中",
  "Demo",
  "弃坑",
  "断更",
] as const;

type GameStatus = (typeof ALLOWED_GAME_STATUSES)[number];

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
      {
        success: false,
        message: "获取失败，请检查数据库字段和服务日志",
      },
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

    const body: unknown = await req.json();

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

    const input = body as Record<string, unknown>;

    // 校验游戏名称
    if (
      input.name !== undefined &&
      (typeof input.name !== "string" || !input.name.trim())
    ) {
      return NextResponse.json(
        { success: false, message: "游戏名称不能为空" },
        { status: 400 }
      );
    }

    // 校验标签
    if (
      input.tags !== undefined &&
      !Array.isArray(input.tags)
    ) {
      return NextResponse.json(
        { success: false, message: "游戏标签格式错误" },
        { status: 400 }
      );
    }

    // 校验历史记录
    if (
      input.history !== undefined &&
      !Array.isArray(input.history)
    ) {
      return NextResponse.json(
        { success: false, message: "游戏历史记录格式错误" },
        { status: 400 }
      );
    }

    // 校验封面
    if (
      input.cover !== undefined &&
      !isOptionalString(input.cover)
    ) {
      return NextResponse.json(
        { success: false, message: "封面地址格式错误" },
        { status: 400 }
      );
    }

    // 校验详情页背景
    if (
      input.detailBackground !== undefined &&
      !isValidImageUrl(input.detailBackground)
    ) {
      return NextResponse.json(
        { success: false, message: "详情背景地址格式错误" },
        { status: 400 }
      );
    }

    // 校验标题图片
    if (
      input.titleLogo !== undefined &&
      !isValidImageUrl(input.titleLogo)
    ) {
      return NextResponse.json(
        { success: false, message: "标题图片地址格式错误" },
        { status: 400 }
      );
    }

    // 校验标题显示模式
    if (
      input.titleMode !== undefined &&
      input.titleMode !== "text" &&
      input.titleMode !== "image"
    ) {
      return NextResponse.json(
        { success: false, message: "标题显示模式无效" },
        { status: 400 }
      );
    }

    // 校验背景透明度
    if (
      input.detailBackgroundOpacity !== undefined &&
      (
        !Number.isInteger(input.detailBackgroundOpacity) ||
        Number(input.detailBackgroundOpacity) < 0 ||
        Number(input.detailBackgroundOpacity) > 100
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "背景透明度必须为 0 到 100 的整数",
        },
        { status: 400 }
      );
    }

    // 校验背景适配模式
    if (
      input.detailBackgroundFit !== undefined &&
      input.detailBackgroundFit !== "cover" &&
      input.detailBackgroundFit !== "contain"
    ) {
      return NextResponse.json(
        { success: false, message: "背景适配模式无效" },
        { status: 400 }
      );
    }

    // 校验详情页预览图
    if (
      input.screenshots !== undefined &&
      (
        !Array.isArray(input.screenshots) ||
        input.screenshots.length > 100 ||
        !input.screenshots.every(
          (url) =>
            typeof url === "string" &&
            url.startsWith(
              "https://raw.githubusercontent.com/"
            )
        )
      )
    ) {
      return NextResponse.json(
        { success: false, message: "详情预览图列表格式错误" },
        { status: 400 }
      );
    }

    // 校验发布审核状态 status
    if (
      input.status !== undefined &&
      (
        typeof input.status !== "string" ||
        !["已发布", "隐藏", "审核中", "未通过"].includes(
          input.status
        )
      )
    ) {
      return NextResponse.json(
        { success: false, message: "发布状态无效" },
        { status: 400 }
      );
    }

    // 校验作品状态 gameStatus
    if (
      input.gameStatus !== undefined &&
      (
        typeof input.gameStatus !== "string" ||
        !ALLOWED_GAME_STATUSES.includes(
          input.gameStatus as GameStatus
        )
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "作品状态无效，可选：完结、更新中、Demo、弃坑、断更",
        },
        { status: 400 }
      );
    }

    // 只更新请求中明确提供的字段
    const data: Prisma.GameUpdateInput = {
      ...(input.name !== undefined && {
        name: (input.name as string).trim(),
      }),

      ...(input.en !== undefined && {
        en: input.en as string | null,
      }),

      ...(input.author !== undefined && {
        author: input.author as string,
      }),

      ...(input.category !== undefined && {
        category: input.category as string,
      }),

      ...(input.version !== undefined && {
        version: input.version as string,
      }),

      ...(input.description !== undefined && {
        description: input.description as string,
      }),

      ...(input.cover !== undefined && {
        cover: input.cover as string,
      }),

      ...(input.lanzou !== undefined && {
        lanzou: input.lanzou as string,
      }),

      ...(input.pan123 !== undefined && {
        pan123: input.pan123 as string,
      }),

      ...(input.symbol !== undefined && {
        symbol: input.symbol as string,
      }),

      ...(input.tags !== undefined && {
        tags: input.tags as Prisma.InputJsonValue,
      }),

      ...(input.history !== undefined && {
        history: input.history as Prisma.InputJsonValue,
      }),

      // 发布审核状态
      ...(input.status !== undefined && {
        status: input.status as string,
      }),

      // 作品状态：仅在请求明确提供时更新
      ...(input.gameStatus !== undefined && {
        gameStatus: input.gameStatus as string,
      }),

      // 详情页背景设置
      ...(input.detailBackground !== undefined && {
        detailBackground:
          input.detailBackground as string | null,
      }),

      ...(input.detailBackgroundOpacity !== undefined && {
        detailBackgroundOpacity:
          input.detailBackgroundOpacity as number,
      }),

      ...(input.detailBackgroundFit !== undefined && {
        detailBackgroundFit:
          input.detailBackgroundFit as string,
      }),

      // 详情页标题设置
      ...(input.titleMode !== undefined && {
        titleMode: input.titleMode as string,
      }),

      ...(input.titleLogo !== undefined && {
        titleLogo: input.titleLogo as string | null,
      }),

      // 详情页预览图列表
      ...(input.screenshots !== undefined && {
        screenshots:
          input.screenshots as Prisma.InputJsonValue,
      }),

      // 更新日期
      updateDate: new Date().toISOString().split("T")[0],
    };

    const game = await prisma.game.update({
      where: { id: Number(id) },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "游戏修改成功",
      game,
    });
  } catch (error) {
    console.error("修改游戏失败:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "修改失败，请检查数据库字段、提交的数据和服务日志",
      },
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
