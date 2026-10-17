import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isSiteOwner } from "@/lib/admin-auth";

// 获取全部验证题：仅限站长
export async function GET() {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权访问，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const questions = await prisma.verifyQuestion.findMany({
      orderBy: {
        id: "asc",
      },
    });

    return NextResponse.json({
      success: true,
      questions,
    });
  } catch (error) {
    console.error("获取验证题失败:", error);

    return NextResponse.json(
      { success: false, message: "获取验证题失败" },
      { status: 500 }
    );
  }
}

// 添加验证题：仅限站长
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
      typeof body.question !== "string" ||
      !body.question.trim() ||
      typeof body.answer !== "string" ||
      !body.answer.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "问题和答案不能为空" },
        { status: 400 }
      );
    }

    const question = await prisma.verifyQuestion.create({
      data: {
        question: body.question.trim(),
        answer: body.answer.trim(),
        enabled: true,
      },
    });

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("添加验证题失败:", error);

    return NextResponse.json(
      { success: false, message: "添加验证题失败" },
      { status: 500 }
    );
  }
}

// 修改启用状态：仅限站长
export async function PUT(req: Request) {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权操作，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const id = Number(body.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "验证题 ID 无效" },
        { status: 400 }
      );
    }

    if (typeof body.enabled !== "boolean") {
      return NextResponse.json(
        { success: false, message: "启用状态无效" },
        { status: 400 }
      );
    }

    const existing = await prisma.verifyQuestion.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "验证题不存在" },
        { status: 404 }
      );
    }

    const question = await prisma.verifyQuestion.update({
      where: { id },
      data: {
        enabled: body.enabled,
      },
    });

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error("修改验证题失败:", error);

    return NextResponse.json(
      { success: false, message: "修改验证题失败" },
      { status: 500 }
    );
  }
}

// 删除验证题：仅限站长
export async function DELETE(req: Request) {
  if (!(await isSiteOwner())) {
    return NextResponse.json(
      { success: false, message: "无权操作，请先登录站长账号" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json(
        { success: false, message: "验证题 ID 无效" },
        { status: 400 }
      );
    }

    const existing = await prisma.verifyQuestion.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "验证题不存在" },
        { status: 404 }
      );
    }

    await prisma.verifyQuestion.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "删除成功",
    });
  } catch (error) {
    console.error("删除验证题失败:", error);

    return NextResponse.json(
      { success: false, message: "删除验证题失败" },
      { status: 500 }
    );
  }
}
