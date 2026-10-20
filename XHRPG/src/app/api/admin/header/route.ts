import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(message: string, status = 500) {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
}

// 读取当前首页头图
export async function GET() {
  try {
    const header = await prisma.homeHeader.findUnique({
      where: { id: 1 },
    });

    return NextResponse.json({
      success: true,
      imageUrl: header?.imageUrl ?? null,
    });
  } catch (error) {
    console.error("读取首页头图失败：", error);
    return errorResponse("读取首页头图失败");
  }
}

// 保存或移除首页头图
export async function PUT(req: Request) {
  try {
    if (!(await isSiteOwner())) {
      return errorResponse("只有站长可以修改首页头图", 403);
    }

    const body = await req.json();
    const imageUrl = body?.imageUrl;

    if (
      imageUrl !== null &&
      imageUrl !== "" &&
      (
        typeof imageUrl !== "string" ||
        !/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/.+/.test(
          imageUrl
        )
      )
    ) {
      return errorResponse("图片地址无效", 400);
    }

    const saved = await prisma.homeHeader.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        imageUrl: imageUrl || null,
      },
      update: {
        imageUrl: imageUrl || null,
      },
    });

    return NextResponse.json({
      success: true,
      imageUrl: saved.imageUrl,
    });
  } catch (error) {
    console.error("保存首页头图失败：", error);
    return errorResponse("保存首页头图失败");
  }
}
