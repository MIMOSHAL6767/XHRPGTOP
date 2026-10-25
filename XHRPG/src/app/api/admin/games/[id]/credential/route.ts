
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseGameId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;

  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

// 查看投稿凭证：仅限站长
export async function GET(
  _req: Request,
  context: RouteContext
) {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权访问，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const { id: rawId } = await context.params;
    const id = parseGameId(rawId);

    if (id === null) {
      return NextResponse.json(
        { success: false, message: "游戏 ID 无效" },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        submissionCredential: true,
      },
    });

    if (!game) {
      return NextResponse.json(
        { success: false, message: "游戏不存在" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        id: game.id,
        name: game.name,
        credential: game.submissionCredential || null,
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error) {
    console.error("读取投稿凭证失败:", error);

    return NextResponse.json(
      { success: false, message: "读取投稿凭证失败" },
      { status: 500 }
    );
  }
}

// 重新生成投稿凭证：仅限站长
export async function POST(
  _req: Request,
  context: RouteContext
) {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权操作，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const { id: rawId } = await context.params;
    const id = parseGameId(rawId);

    if (id === null) {
      return NextResponse.json(
        { success: false, message: "游戏 ID 无效" },
        { status: 400 }
      );
    }

    const existingGame = await prisma.game.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        submissionCredential: true,
      },
    });

    if (!existingGame) {
      return NextResponse.json(
        { success: false, message: "游戏不存在" },
        { status: 404 }
      );
    }

    // 手动创建的游戏通常没有投稿凭证。
    // 不自动为其创建凭证，避免改变原有管理逻辑。
    if (!existingGame.submissionCredential) {
      return NextResponse.json(
        {
          success: false,
          message: "该游戏没有原始投稿凭证，无法重置。它可能是站长手动创建的游戏。",
        },
        { status: 409 }
      );
    }

    // 24 字节随机数，转为 48 位十六进制字符串。
    const newCredential = randomBytes(24).toString("hex");

    const updatedGame = await prisma.game.update({
      where: { id },
      data: {
        submissionCredential: newCredential,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "投稿凭证已重新生成，旧凭证已失效",
        id: updatedGame.id,
        name: updatedGame.name,
        credential: newCredential,
      },
      {
        headers: {
          "Cache-Control": "no-store, private",
        },
      }
    );
  } catch (error) {
    console.error("重新生成投稿凭证失败:", error);

    return NextResponse.json(
      { success: false, message: "重新生成投稿凭证失败" },
      { status: 500 }
    );
  }
}
