import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export async function GET() {
  try {
    if (!(await isSiteOwner())) {
      return NextResponse.json(
        {
          success: false,
          message: "未登录或没有站长权限",
        },
        { status: 403 }
      );
    }

    const titles = await prisma.userTitle.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        color: true,
        background: true,
        border: true,
        shadow: true,
        size: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      titles,
    });
  } catch (error) {
    console.error("获取称号列表失败:", error);

    return NextResponse.json(
      {
        success: false,
        message: "获取称号列表失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
