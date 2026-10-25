
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

async function authenticateGame(
  req: Request,
  idString: string
) {
  if (!/^[1-9]\d*$/.test(idString)) {
    return {
      error: errorResponse("游戏 ID 无效。", 400),
      game: null,
    };
  }

  const id = Number(idString);

  if (!Number.isSafeInteger(id)) {
    return {
      error: errorResponse("游戏 ID 无效。", 400),
      game: null,
    };
  }

  const credential = req.headers.get("x-submission-credential");

  if (
    !credential ||
    !/^[a-f0-9]{48}$/i.test(credential)
  ) {
    return {
      error: errorResponse("投稿凭证缺失或格式无效。", 401),
      game: null,
    };
  }

  const game = await prisma.game.findFirst({
    where: {
      id,
      submissionCredential: credential,
    },
  });

  if (!game) {
    return {
      error: errorResponse(
        "凭证与该游戏不匹配，或游戏记录不存在。",
        403
      ),
      game: null,
    };
  }

  return { error: null, game };
}

function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function readString(
  body: Record<string, unknown>,
  key: string,
  maxLength: number
): string | undefined {
  if (!(key in body)) return undefined;

  const value = body[key];

  if (typeof value !== "string") {
    throw new Error(`${key} 必须是文本。`);
  }

  if (value.length > maxLength) {
    throw new Error(`${key} 内容过长。`);
  }

  return value.trim();
}

function readStringArray(
  body: Record<string, unknown>,
  key: string,
  maxItems: number,
  maxLength: number
): string[] | undefined {
  if (!(key in body)) return undefined;

  const value = body[key];

  if (
    !Array.isArray(value) ||
    value.length > maxItems ||
    !value.every(
      (item) =>
        typeof item === "string" &&
        item.length <= maxLength
    )
  ) {
    throw new Error(`${key} 格式不正确。`);
  }

  return value.map((item) => item.trim());
}

function readHistory(
  body: Record<string, unknown>
): Prisma.InputJsonValue | undefined {
  if (!("history" in body)) return undefined;

  const value = body.history;

  if (!Array.isArray(value) || value.length > 100) {
    throw new Error("更新记录格式不正确。");
  }

  for (const item of value) {
    if (!isPlainObject(item)) {
      throw new Error("更新记录中存在无效项目。");
    }

    for (const key of Object.keys(item)) {
      if (
        !["version", "date", "lanzou", "pan123"].includes(key)
      ) {
        throw new Error("更新记录包含不支持的字段。");
      }

      const field = item[key];

      if (
        field !== undefined &&
        (typeof field !== "string" || field.length > 2000)
      ) {
        throw new Error("更新记录字段格式不正确。");
      }
    }
  }

  return value as Prisma.InputJsonValue;
}

function readScreenshots(
  body: Record<string, unknown>
): Prisma.InputJsonValue | undefined {
  if (!("screenshots" in body)) return undefined;

  const value = body.screenshots;

  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    !value.every(
      (item) =>
        typeof item === "string" &&
        item.length <= 2000
    )
  ) {
    throw new Error("预览图列表格式不正确。");
  }

  return value as Prisma.InputJsonValue;
}

function readTags(
  body: Record<string, unknown>
): Prisma.InputJsonValue | undefined {
  if (!("tags" in body)) return undefined;

  const value = body.tags;

  if (
    !Array.isArray(value) ||
    value.length > 100 ||
    !value.every(
      (item) =>
        typeof item === "string" &&
        item.length <= 100
    )
  ) {
    throw new Error("标签列表格式不正确。");
  }

  return value as Prisma.InputJsonValue;
}

function readOpacity(
  body: Record<string, unknown>
): number | undefined {
  if (!("detailBackgroundOpacity" in body)) {
    return undefined;
  }

  const value = body.detailBackgroundOpacity;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 1
  ) {
    throw new Error("详情背景透明度必须在 0 到 1 之间。");
  }

  return value;
}

function readAllowedChoice(
  body: Record<string, unknown>,
  key: string,
  allowed: string[]
): string | undefined {
  const value = readString(body, key, 100);

  if (value === undefined) return undefined;

  if (!allowed.includes(value)) {
    throw new Error(`${key} 的取值不合法。`);
  }

  return value;
}

export async function GET(
  req: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const auth = await authenticateGame(req, id);

    if (auth.error || !auth.game) {
      return auth.error!;
    }

    const game = auth.game;

    // 不向客户端返回 submissionCredential 等内部字段。
    return NextResponse.json({
      success: true,
      game: {
        id: game.id,
        name: game.name,
        en: game.en,
        author: game.author,
        category: game.category,
        version: game.version,
        description: game.description,
        cover: game.cover,
        lanzou: game.lanzou,
        pan123: game.pan123,
        symbol: game.symbol,
        tags: game.tags,
        history: game.history,
        gameStatus: game.gameStatus,
        titleMode: game.titleMode,
        titleLogo: game.titleLogo,
        detailBackground: game.detailBackground,
        detailBackgroundOpacity: game.detailBackgroundOpacity,
        detailBackgroundFit: game.detailBackgroundFit,
        screenshots: game.screenshots,
        status: game.status,
      },
    });
  } catch (error) {
    console.error(
      "读取投稿编辑信息失败:",
      error instanceof Error ? error.message : "未知错误"
    );

    return errorResponse("读取游戏信息失败。", 500);
  }
}

export async function PUT(
  req: Request,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const auth = await authenticateGame(req, id);

    if (auth.error || !auth.game) {
      return auth.error!;
    }

    const body: unknown = await req.json().catch(() => null);

    if (!isPlainObject(body)) {
      return errorResponse("提交的数据格式不正确。", 400);
    }

    // 明确拒绝尝试修改权限或审核字段。
    const forbiddenFields = [
      "status",
      "submissionCredential",
      "submissionAssets",
      "submissionCoverPath",
      "id",
      "downloads",
      "createdAt",
      "updatedAt",
      "updateDate",
    ];

    if (forbiddenFields.some((key) => key in body)) {
      return errorResponse(
        "提交的数据包含不可修改的系统字段。",
        400
      );
    }

    const data: Prisma.GameUpdateInput = {};

    const name = readString(body, "name", 200);
    const en = readString(body, "en", 200);
    const author = readString(body, "author", 200);
    const category = readString(body, "category", 100);
    const version = readString(body, "version", 100);
    const description = readString(body, "description", 30000);
    const cover = readString(body, "cover", 2000);
    const lanzou = readString(body, "lanzou", 2000);
    const pan123 = readString(body, "pan123", 2000);
    const symbol = readString(body, "symbol", 100);
    const titleLogo = readString(body, "titleLogo", 2000);
    const detailBackground = readString(
      body,
      "detailBackground",
      2000
    );

    if (name !== undefined) {
      if (!name) {
        return errorResponse("游戏名称不能为空。", 400);
      }
      data.name = name;
    }

    if (en !== undefined) data.en = en || null;
    if (author !== undefined) {
      if (!author) {
        return errorResponse("作者不能为空。", 400);
      }
      data.author = author;
    }
    if (category !== undefined) data.category = category;
    if (version !== undefined) data.version = version;
    if (description !== undefined) data.description = description;
    if (cover !== undefined) data.cover = cover;
    if (lanzou !== undefined) data.lanzou = lanzou;
    if (pan123 !== undefined) data.pan123 = pan123;
    if (symbol !== undefined) data.symbol = symbol;
    if (titleLogo !== undefined) data.titleLogo = titleLogo;
    if (detailBackground !== undefined) {
      data.detailBackground = detailBackground;
    }

    const gameStatus = readAllowedChoice(
      body,
      "gameStatus",
      ["完结", "更新中", "Demo", "弃坑", "断更"]
    );

    if (gameStatus !== undefined) {
      data.gameStatus = gameStatus;
    }

    const titleMode = readAllowedChoice(
      body,
      "titleMode",
      ["text", "logo"]
    );

    if (titleMode !== undefined) {
      data.titleMode = titleMode;
    }

    const detailBackgroundFit = readAllowedChoice(
      body,
      "detailBackgroundFit",
      ["cover", "contain", "fill"]
    );

    if (detailBackgroundFit !== undefined) {
      data.detailBackgroundFit = detailBackgroundFit;
    }

    const opacity = readOpacity(body);

    if (opacity !== undefined) {
      data.detailBackgroundOpacity = opacity;
    }

    const tags = readTags(body);

    if (tags !== undefined) {
      data.tags = tags;
    }

    const history = readHistory(body);

    if (history !== undefined) {
      data.history = history;
    }

    const screenshots = readScreenshots(body);

    if (screenshots !== undefined) {
      data.screenshots = screenshots;
    }

    // 不接受客户端提供的 status。
    // 用户提交修改后统一进入审核状态。
    data.status = "审核中";

    const updated = await prisma.game.update({
      where: { id: auth.game.id },
      data,
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "修改已保存，等待站长审核。",
      game: updated,
    });
  } catch (error) {
    if (error instanceof Error) {
      const validationMessages = [
        "必须是文本",
        "内容过长",
        "格式不正确",
        "包含不支持的字段",
        "取值不合法",
        "透明度必须",
      ];

      if (
        validationMessages.some((message) =>
          error.message.includes(message)
        )
      ) {
        return errorResponse(error.message, 400);
      }
    }

    console.error(
      "保存投稿修改失败:",
      error instanceof Error ? error.message : "未知错误"
    );

    return errorResponse("保存失败，请稍后重试。", 500);
  }
}
