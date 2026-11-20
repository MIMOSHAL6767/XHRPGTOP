
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import GameDetailClient, {
  type DetailHistoryItem,
} from "./GameDetailClient";

export const dynamic = "force-dynamic";

// 「其他推荐」候选池与当前游戏无关，全站共用一份，缓存 60 秒，
// 避免每次打开详情页都对全部已发布游戏做一次排序查询。
const getRecommendationPool = unstable_cache(
  async () =>
    prisma.game.findMany({
      where: { status: "已发布" },
      orderBy: { downloads: "desc" },
      take: 100,
      select: { id: true, name: true, cover: true },
    }),
  ["xhrpg-recommendation-pool"],
  { revalidate: 60 }
);

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

  // 其他推荐：点击量（downloads）前 100 名里随机选 4 个，排除当前游戏。
  const topGames = (await getRecommendationPool()).filter(
    (item) => item.id !== game.id
  );

  // Fisher–Yates 洗牌后取前 4 个，每次访问顺序与结果都可能不同。
  for (let i = topGames.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [topGames[i], topGames[j]] = [topGames[j], topGames[i]];
  }

  const recommendations = topGames.slice(0, 4).map((item) => ({
    id: item.id,
    name: item.name,
    cover:
      item.cover?.trim() ||
      `/assets/games/games${item.id}.png`,
  }));

  return (
    <GameDetailClient
      gameId={game.id}
      name={game.name}
      author={game.author}
      category={game.category}
      version={game.version}
      description={game.description}
      estimatedTime={game.estimatedTime}
      engine={game.engine}
      reqOs={game.reqOs}
      reqCpu={game.reqCpu}
      reqMemory={game.reqMemory}
      reqGpu={game.reqGpu}
      reqRuntime={game.reqRuntime}
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
      recommendations={recommendations}
      uploadDate={game.createdAt.toISOString()}
      downloads={game.downloads}
      ratingCount={game.ratingCount}
      ratingSum={game.ratingSum}
    />
  );
}
