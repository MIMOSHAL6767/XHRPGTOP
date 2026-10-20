
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSiteOwner } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

type TrackInput = {
  title?: string;
  url?: string;
  enabled?: boolean;
  sort?: number;
};

function isValidUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await isSiteOwner())) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const widget = await prisma.floatingWidget.findUnique({
      where: { id: 1 },
      include: {
        tracks: {
          orderBy: [{ sort: "asc" }, { id: "asc" }],
        },
      },
    });

    return NextResponse.json({
      enabled: widget?.enabled ?? false,
      gifUrl: widget?.gifUrl ?? "",
      width: widget?.width ?? 90,
      height: widget?.height ?? 90,
      positionX: widget?.positionX ?? 24,
      positionY: widget?.positionY ?? 120,
      musicEnabled: widget?.musicEnabled ?? true,
      tracks: widget?.tracks ?? [],
    });
  } catch (error) {
    console.error("读取悬浮组件后台配置失败：", error);
    return NextResponse.json(
      { error: "读取配置失败，请检查数据库连接和 Prisma Client" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  if (!(await isSiteOwner())) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  try {
    const body = await request.json();

    const width = Number(body.width);
    const height = Number(body.height);
    const positionX = Number(body.positionX);
    const positionY = Number(body.positionY);

    if (
      !Number.isFinite(width) ||
      !Number.isFinite(height) ||
      !Number.isFinite(positionX) ||
      !Number.isFinite(positionY)
    ) {
      return NextResponse.json(
        { error: "尺寸和位置必须是有效数字" },
        { status: 400 }
      );
    }

    if (
      width < 30 || width > 500 ||
      height < 30 || height > 500 ||
      positionX < 0 || positionX > 3000 ||
      positionY < 0 || positionY > 3000
    ) {
      return NextResponse.json(
        { error: "尺寸需为 30–500，位置需为 0–3000" },
        { status: 400 }
      );
    }

    const gifUrl =
      typeof body.gifUrl === "string" && body.gifUrl.trim()
        ? body.gifUrl.trim()
        : null;

    if (gifUrl && !isValidUrl(gifUrl)) {
      return NextResponse.json(
        { error: "GIF 地址必须是有效的 HTTP 或 HTTPS URL" },
        { status: 400 }
      );
    }

    if (body.enabled === true && !gifUrl) {
      return NextResponse.json(
        { error: "请先上传 GIF，再启用悬浮组件" },
        { status: 400 }
      );
    }

    const rawTracks: TrackInput[] = Array.isArray(body.tracks)
      ? body.tracks
      : [];

    const tracks = rawTracks.map((track, index) => ({
      title: String(track.title ?? "").trim(),
      url: String(track.url ?? "").trim(),
      enabled: track.enabled !== false,
      sort: Number.isFinite(Number(track.sort))
        ? Math.trunc(Number(track.sort))
        : index,
    }));

    for (const track of tracks) {
      if (!track.title) {
        return NextResponse.json(
          { error: "每首音乐都必须填写名称" },
          { status: 400 }
        );
      }

      if (!isValidUrl(track.url)) {
        return NextResponse.json(
          { error: `音乐「${track.title}」的地址无效` },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.floatingWidget.upsert({
        where: { id: 1 },
        create: {
          id: 1,
          enabled: body.enabled === true,
          gifUrl,
          width: Math.round(width),
          height: Math.round(height),
          positionX: Math.round(positionX),
          positionY: Math.round(positionY),
          musicEnabled: body.musicEnabled !== false,
        },
        update: {
          enabled: body.enabled === true,
          gifUrl,
          width: Math.round(width),
          height: Math.round(height),
          positionX: Math.round(positionX),
          positionY: Math.round(positionY),
          musicEnabled: body.musicEnabled !== false,
        },
      });

      // 只替换本悬浮组件的音乐列表，不影响其他表。
      await tx.floatingWidgetTrack.deleteMany({
        where: { widgetId: 1 },
      });

      if (tracks.length > 0) {
        await tx.floatingWidgetTrack.createMany({
          data: tracks.map((track) => ({
            ...track,
            widgetId: 1,
          })),
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "悬浮组件设置已保存",
    });
  } catch (error) {
    console.error("保存悬浮组件配置失败：", error);
    return NextResponse.json(
      { error: "保存失败，请检查服务端日志和数据库状态" },
      { status: 500 }
    );
  }
}
