
import { prisma } from "@/lib/prisma";
import GamesClient from "./GamesClient";
import { Prisma } from "@prisma/client";

function parseTags(value: Prisma.JsonValue | null): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    );
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0
        );
      }
    } catch {
      return value.trim() ? [value.trim()] : [];
    }

    return value.trim() ? [value.trim()] : [];
  }

  return [];
}

export default async function GamesPage() {
  // 同时获取已发布游戏和首页头图
  const [games, homeHeader] = await Promise.all([
    prisma.game.findMany({
      where: {
        status: "已发布",
      },
      select: {
        id: true,
        name: true,
        en: true,
        author: true,
        category: true,
        version: true,
        cover: true,
        tags: true,
        downloads: true,
        createdAt: true,
      },
      orderBy: {
        id: "asc",
      },
    }),

    prisma.homeHeader.findUnique({
      where: {
        id: 1,
      },
      select: {
        imageUrl: true,
      },
    }),
  ]);

  // 保留原来的标签和日期处理
  const safeGames = games.map((game) => ({
    ...game,
    tags: parseTags(game.tags),
    createdAt: game.createdAt.toISOString(),
  }));

  return (
    <GamesClient
      games={safeGames}
      headerImage={homeHeader?.imageUrl ?? null}
    />
  );
}
