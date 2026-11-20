import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import HomeClient from "./components/HomeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const GAME_CARD_SELECT = {
  id: true,
  name: true,
  en: true,
  author: true,
  category: true,
  version: true,
  description: true,
  cover: true,
  downloads: true,
  weeklyViews: true,
  lastWeekViews: true,
  weeklyViewsWeekStart: true,
  date: true,
  createdAt: true,
  tags: true,
  gameStatus: true,
} as const;

function parseFeaturedIds(value: Prisma.JsonValue | null): number[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((id) => Number.isSafeInteger(id) && id > 0)
    )
  ).slice(0, 12);
}

async function loadHomeData() {
  // 「本周热门」统计上一自然周（周一 00:00 到本周一 00:00，中国时区）。
  const now = new Date();
  const chinaNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const daysFromMonday = (chinaNow.getUTCDay() + 6) % 7;
  const currentMonday = new Date(
    Date.UTC(
      chinaNow.getUTCFullYear(),
      chinaNow.getUTCMonth(),
      chinaNow.getUTCDate() - daysFromMonday
    ) -
      8 * 60 * 60 * 1000
  );
  // 分两批查询，避免远程数据库连接池在并发请求下被瞬间占满。
  const [allGames, header] = await Promise.all([
    prisma.game.findMany({
      where: { status: "已发布" },
      select: GAME_CARD_SELECT,
    }),

    prisma.homeHeader.findUnique({ where: { id: 1 } }),
  ]);

  const [banners, activities] = await Promise.all([
    prisma.banner.findMany({
      where: { enabled: true },
      orderBy: { id: "asc" },
    }),

    prisma.activity.findMany({
      where: { enabled: true, showOnHome: true },
      orderBy: [{ sort: "asc" }, { id: "desc" }],
      select: {
        id: true,
        title: true,
        cover: true,
        background: true,
        backgroundFit: true,
        backgroundOpacity: true,
        titleColor: true,
        titleSize: true,
        content: true,
        showOnHome: true,
        enabled: true,
        sort: true,
      },
    }),
  ]);

  const byNewest = [...allGames].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return b.id - a.id;
  });

  // 首页「最新上传」：1 条大卡 + 11 条小卡，第 12 格留给「查看更多」。
  const latestGames = byNewest.slice(0, 12);

  const hotGames = [...allGames]
    .sort((a, b) => {
      if (b.downloads !== a.downloads) {
        return b.downloads - a.downloads;
      }
      return b.id - a.id;
    })
    .slice(0, 10);

  // 上周点击量最多的游戏：只统计本周已发生周切换的计数。
  const weeklyGame =
    allGames
      .filter(
        (game) =>
          game.weeklyViewsWeekStart &&
          new Date(game.weeklyViewsWeekStart) >= currentMonday
      )
      .sort((a, b) => {
        if (b.lastWeekViews !== a.lastWeekViews) {
          return b.lastWeekViews - a.lastWeekViews;
        }
        return b.id - a.id;
      })[0] || null;

  const weeklyIncrease = weeklyGame?.lastWeekViews ?? 0;
  const weeklyFallback = weeklyGame || hotGames[0] || null;

  const featuredIds = parseFeaturedIds(
    header?.featuredGameIds ?? null
  );

  const featuredGames = featuredIds
    .map((id) => allGames.find((game) => game.id === id))
    .filter((game): game is (typeof allGames)[number] =>
      Boolean(game)
    )
    .slice(0, 12);

  if (featuredGames.length < 12) {
    const used = new Set(featuredGames.map((game) => game.id));

    for (const game of [...hotGames, ...byNewest]) {
      if (featuredGames.length >= 12) break;
      if (used.has(game.id)) continue;
      featuredGames.push(game);
      used.add(game.id);
    }
  }

  return {
    latestGames,
    hotGames,
    featuredGames,
    weeklyGame: weeklyFallback
      ? { ...weeklyFallback, weeklyIncrease }
      : null,
    announcement: header?.announcement ?? "",
    banners,
    headerImage: header?.imageUrl ?? null,
    activities,
    stats: {
      totalGames: allGames.length,
      totalDownloads: allGames.reduce(
        (sum, game) => sum + (game.downloads || 0),
        0
      ),
      weekNew: allGames.filter(
        (game) => new Date(game.createdAt) >= currentMonday
      ).length,
    },
  };
}

// 首页数据缓存 60 秒：远程数据库偶发高延迟时，后续访问直接命中缓存。
const getHomeData = unstable_cache(loadHomeData, ["xhrpg-home-data"], {
  revalidate: 60,
});

export default async function Home() {
  const data = await getHomeData();

  return <HomeClient {...data} />;
}
