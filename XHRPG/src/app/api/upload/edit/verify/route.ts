
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const credential =
      typeof body?.credential === "string"
        ? body.credential.trim()
        : "";

    if (!/^[a-f0-9]{48}$/i.test(credential)) {
      return errorResponse("投稿凭证格式不正确。", 400);
    }

    const game = await prisma.game.findFirst({
      where: {
        submissionCredential: credential,
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    if (!game) {
      return errorResponse("投稿凭证无效，请检查后重试。", 401);
    }

    return NextResponse.json({
      success: true,
      id: game.id,
      name: game.name,
      status: game.status,
    });
  } catch (error) {
    console.error(
      "投稿凭证验证失败:",
      error instanceof Error ? error.message : "未知错误"
    );

    return errorResponse("服务器暂时无法验证凭证，请稍后重试。", 500);
  }
}
