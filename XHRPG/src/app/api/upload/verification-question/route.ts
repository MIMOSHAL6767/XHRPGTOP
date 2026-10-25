
import { NextResponse } from "next/server";
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
          message: "目前没有启用的人机验证题目，请联系站长",
        },
        { status: 503 }
      );
    }

    const skip = Math.floor(Math.random() * count);

    const question = await prisma.verifyQuestion.findFirst({
      where: { enabled: true },
      skip,
      select: {
        id: true,
        question: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { success: false, message: "获取验证题目失败" },
        { status: 503 }
      );
    }

    // 绝不向浏览器返回正确答案
    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("获取投稿验证题目失败:", error);

    return NextResponse.json(
      { success: false, message: "获取验证题目失败，请稍后重试" },
      { status: 500 }
    );
  }
}
