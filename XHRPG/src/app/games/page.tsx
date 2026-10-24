
import { prisma } from "@/lib/prisma";
import GamesClient from "./GamesClient";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

function parseTags(value: Prisma.JsonValue | null): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter(
            (item): item is string =>
              typeof item === "string" &&
              item.trim().length > 0
          )
          .map((item) => item.trim())
      )
    );
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return Array.from(
          new Set(
            parsed
              .filter(
                (item): item is string =>
                  typeof item === "string" &&
                  item.trim().length > 0
              )
              .map((item) => item.trim())
          )
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

        // 作品状态，与发布审核状态 status 分开
        gameStatus: true,
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

  const safeGames = games.map((game) => ({
    ...game,
    tags: parseTags(game.tags),
    createdAt: game.createdAt.toISOString(),
    gameStatus: game.gameStatus || "更新中",
  }));

  return (
    <GamesClient
      games={safeGames}
      headerImage={homeHeader?.imageUrl ?? null}
    />
  );
}
