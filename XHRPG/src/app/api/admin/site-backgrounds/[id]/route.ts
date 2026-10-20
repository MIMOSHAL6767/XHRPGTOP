
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = {
  params: Promise<{ id: string }>;
};

async function getId(context: Context) {
  const { id } = await context.params;
  const parsed = Number(id);

  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function PUT(request: Request, context: Context) {
  try {
    if (!(await isSiteOwner())) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const id = await getId(context);

    if (!id) {
      return NextResponse.json({ error: "背景 ID 无效" }, { status: 400 });
    }

    const body = await request.json();
    const data: {
      name?: string;
      imageUrl?: string;
      enabled?: boolean;
      sort?: number;
      overlayOpacity?: number;
      blur?: number;
    } = {};

    if (body.name !== undefined) {
      if (
        typeof body.name !== "string" ||
        !body.name.trim() ||
        body.name.trim().length > 100
      ) {
        return NextResponse.json(
          { error: "背景名称无效" },
          { status: 400 }
        );
      }

      data.name = body.name.trim();
    }

    if (body.imageUrl !== undefined) {
      if (
        typeof body.imageUrl !== "string" ||
        !/^https?:\/\/\S+$/i.test(body.imageUrl.trim())
      ) {
        return NextResponse.json(
          { error: "背景图片地址无效" },
          { status: 400 }
        );
      }

      data.imageUrl = body.imageUrl.trim();
    }

    if (body.enabled !== undefined) {
      if (typeof body.enabled !== "boolean") {
        return NextResponse.json(
          { error: "启用状态无效" },
          { status: 400 }
        );
      }

      data.enabled = body.enabled;
    }

    for (const field of ["sort", "overlayOpacity", "blur"] as const) {
      if (body[field] === undefined) continue;

      const value = Number(body[field]);

      if (!Number.isInteger(value)) {
        return NextResponse.json(
          { error: `${field} 必须是整数` },
          { status: 400 }
        );
      }

      if (field === "overlayOpacity" && (value < 0 || value > 90)) {
        return NextResponse.json(
          { error: "遮罩范围为 0–90" },
          { status: 400 }
        );
      }

      if (field === "blur" && (value < 0 || value > 20)) {
        return NextResponse.json(
          { error: "模糊范围为 0–20" },
          { status: 400 }
        );
      }

      data[field] = value;
    }

    const background = await prisma.siteBackground.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, background });
  } catch (error) {
    console.error("修改网站背景失败：", error);
    return NextResponse.json(
      { error: "修改背景失败，请确认背景记录存在" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  try {
    if (!(await isSiteOwner())) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const id = await getId(context);

    if (!id) {
      return NextResponse.json({ error: "背景 ID 无效" }, { status: 400 });
    }

    await prisma.siteBackground.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除网站背景失败：", error);
    return NextResponse.json(
      { error: "删除背景失败，请确认背景记录存在" },
      { status: 500 }
    );
  }
}
