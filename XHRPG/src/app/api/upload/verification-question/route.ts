import { NextResponse } from "next/server";
import { randomInt } from "crypto";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const count = await prisma.verifyQuestion.count({
      where: { enabled: true },
    });

    if (count === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "目前没有启用的人机验证题，请联系站长",
        },
        { status: 503 },
      );
    }

    const skip = randomInt(count);

    const question = await prisma.verifyQuestion.findFirst({
      where: { enabled: true },
      orderBy: { id: "asc" },
      skip,
      select: {
        id: true,
        question: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          message: "暂时无法获取验证题，请稍后重试",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        question: {
          id: question.id,
          question: question.question,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error("获取投稿验证题失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: "获取验证题失败，请稍后重试",
      },
      { status: 500 },
    );
  }
}
