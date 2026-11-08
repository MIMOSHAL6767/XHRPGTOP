import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CORS = { "Access-Control-Allow-Origin": "*" };

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status, headers: CORS });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...CORS,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// 提交 / 修改评分（同一设备对同一游戏只算一次）
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return bad("请求格式错误");

    const gameId = Number(body.gameId);
    const score = Number(body.score);
    const voterId = String(body.voterId || "").trim();

    // 取真实来源 IP（Vercel 会写入 x-forwarded-for）
    const forwarded = req.headers.get("x-forwarded-for") || "";
    const ip = (forwarded.split(",")[0] || req.headers.get("x-real-ip") || "").trim() || "unknown";

    if (!Number.isSafeInteger(gameId) || gameId <= 0) return bad("游戏 ID 无效");
    if (!Number.isInteger(score) || score < 1 || score > 5) return bad("评分必须是 1-5 的整数");
    if (voterId.length < 6 || voterId.length > 120) return bad("设备标识无效");

    const game = await prisma.game.findFirst({
      where: { id: gameId, status: "已发布" },
      select: { id: true },
    });
    if (!game) return bad("游戏不存在或尚未发布", 404);

    // 同一 IP 对同一游戏只能评价一次（再次提交视为修改）
    await prisma.rating.upsert({
      where: { gameId_ip: { gameId, ip } },
      update: { score, voterId },
      create: { gameId, voterId, ip, score },
    });

    const agg = await prisma.rating.aggregate({
      where: { gameId },
      _count: { _all: true },
      _sum: { score: true },
    });

    const count = agg._count._all;
    const sum = agg._sum.score ?? 0;

    await prisma.game.update({
      where: { id: gameId },
      data: { ratingCount: count, ratingSum: sum },
    });

    return NextResponse.json(
      {
        ok: true,
        count,
        avg: count ? Math.round((sum / count) * 100) / 100 : 0,
      },
      { headers: CORS }
    );
  } catch (error) {
    console.error("提交评分失败：", error);
    return bad("提交评分失败", 500);
  }
}
