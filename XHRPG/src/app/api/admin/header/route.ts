import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isSiteAdmin } from "@/lib/admin-auth";

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
      announcement: header?.announcement ?? "",
      featuredGameIds: Array.isArray(header?.featuredGameIds)
        ? header.featuredGameIds
        : [],
    });
  } catch (error) {
    console.error("读取首页头图失败：", error);
    return errorResponse("读取首页头图失败");
  }
}

// 保存或移除首页头图
export async function PUT(req: Request) {
  try {
    if (!(await isSiteAdmin())) {
      return errorResponse("只有站长可以修改首页头图", 403);
    }

    const body = await req.json();
    const imageUrl = body?.imageUrl;
    const hasImage = imageUrl !== undefined;

    if (
      hasImage &&
      imageUrl !== null &&
      imageUrl !== "" &&
      (typeof imageUrl !== "string" ||
        !/^https:\/\/raw\.githubusercontent\.com\/[^/]+\/[^/]+\/[^/]+\/.+/.test(
          imageUrl
        ))
    ) {
      return errorResponse("图片地址无效", 400);
    }

    if (
      body?.announcement !== undefined &&
      typeof body.announcement !== "string"
    ) {
      return errorResponse("公告必须是纯文本", 400);
    }

    const featuredGameIds: number[] | undefined = Array.isArray(
      body?.featuredGameIds
    )
      ? (Array.from(
          new Set(
            body.featuredGameIds
              .map((id: unknown) => Number(id))
              .filter(
                (id: number) =>
                  Number.isSafeInteger(id) && id > 0
              )
          )
        ) as number[]).slice(0, 12)
      : undefined;

    if (
      body?.featuredGameIds !== undefined &&
      !Array.isArray(body.featuredGameIds)
    ) {
      return errorResponse("精选游戏格式错误", 400);
    }

    const update: Prisma.HomeHeaderUpdateInput = {};

    if (hasImage) update.imageUrl = imageUrl || null;
    if (body?.announcement !== undefined) {
      update.announcement =
        body.announcement.trim() || null;
    }
    if (featuredGameIds !== undefined) {
      update.featuredGameIds = featuredGameIds;
    }

    const saved = await prisma.homeHeader.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        imageUrl: hasImage ? imageUrl || null : null,
        announcement:
          typeof body?.announcement === "string"
            ? body.announcement.trim() || null
            : null,
        featuredGameIds: featuredGameIds ?? [],
      },
      update,
    });

    revalidatePath("/");

    return NextResponse.json({
      success: true,
      imageUrl: saved.imageUrl,
      announcement: saved.announcement ?? "",
      featuredGameIds: Array.isArray(saved.featuredGameIds)
        ? saved.featuredGameIds
        : [],
    });
  } catch (error) {
    console.error("保存首页头图失败：", error);
    return errorResponse("保存首页头图失败");
  }
}
