
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import GameDetailClient, {
  type DetailHistoryItem,
} from "./GameDetailClient";

export const dynamic = "force-dynamic";

function parseHistory(
  value: Prisma.JsonValue
): DetailHistoryItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is Prisma.JsonObject =>
        item !== null &&
        typeof item === "object" &&
        !Array.isArray(item)
    )
    .map((item) => ({
      version:
        typeof item.version === "string" ? item.version : "",
      date:
        typeof item.date === "string" ? item.date : "",
      lanzou:
        typeof item.lanzou === "string" ? item.lanzou : "",
      pan123:
        typeof item.pan123 === "string" ? item.pan123 : "",
    }));
}

function parseScreenshots(
  value: Prisma.JsonValue
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0
  );
}

function parseTags(
  value: Prisma.JsonValue | null
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

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

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gameId = Number(id);

  if (!Number.isSafeInteger(gameId) || gameId <= 0) {
    notFound();
  }

  const game = await prisma.game.findFirst({
    where: {
      id: gameId,
      status: "已发布",
    },
  });

  if (!game) {
    notFound();
  }

  const cover =
    game.cover?.trim() ||
    `/assets/games/games${game.id}.png`;

  const history = parseHistory(game.history);
  const screenshots = parseScreenshots(game.screenshots);
  const tags = parseTags(game.tags);

  return (
    <GameDetailClient
      gameId={game.id}
      name={game.name}
      author={game.author}
      category={game.category}
      version={game.version}
      description={game.description}
      cover={cover}
      lanzou={game.lanzou}
      pan123={game.pan123}
      history={history}
      titleMode={game.titleMode}
      titleLogo={game.titleLogo}
      detailBackground={game.detailBackground}
      detailBackgroundOpacity={game.detailBackgroundOpacity}
      detailBackgroundFit={game.detailBackgroundFit}
      screenshots={screenshots}
      tags={tags}
    />
  );
}
