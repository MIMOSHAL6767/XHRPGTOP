import { NextResponse } from "next/server";
import { isSiteAdmin } from "@/lib/admin-auth";
import {
  deleteGiscusComment,
  isGiscusAdminConfigured,
  listGiscusComments,
} from "@/lib/giscus-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isSiteAdmin())) {
    return NextResponse.json(
      { success: false, message: "无权访问，请先登录后台账号" },
      { status: 401 }
    );
  }

  if (!isGiscusAdminConfigured()) {
    return NextResponse.json({
      success: true,
      configured: false,
      comments: [],
      message:
        "未配置 GITHUB_TOKEN 或 GISCUS_GITHUB_TOKEN，暂时无法读取 GitHub 评论",
    });
  }

  try {
    const data = await listGiscusComments();

    return NextResponse.json({
      success: true,
      configured: true,
      ...data,
    });
  } catch (error) {
    console.error("读取评论失败：", error);

    return NextResponse.json(
      {
        success: false,
        configured: true,
        message:
          error instanceof Error ? error.message : "读取评论失败",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!(await isSiteAdmin())) {
    return NextResponse.json(
      { success: false, message: "无权操作，请先登录后台账号" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";

    if (!id) {
      return NextResponse.json(
        { success: false, message: "缺少评论 ID" },
        { status: 400 }
      );
    }

    await deleteGiscusComment(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除评论失败：", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "删除评论失败",
      },
      { status: 500 }
    );
  }
}
