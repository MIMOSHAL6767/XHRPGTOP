import { prisma } from "@/lib/prisma";
import HomeClient from "./components/HomeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [games, banners, header, activities] = await Promise.all([
    // 已发布游戏
    prisma.game.findMany({
      where: {
        status: "已发布",
      },
      orderBy: {
        id: "asc",
      },
    }),

    // 已启用轮播图
    prisma.banner.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        id: "asc",
      },
    }),

    // 首页头图
    prisma.homeHeader.findUnique({
      where: {
        id: 1,
      },
    }),

    // 已启用且允许在首页展示的活动
    prisma.activity.findMany({
      where: {
        enabled: true,
        showOnHome: true,
      },
      orderBy: [
        {
          sort: "asc",
        },
        {
          id: "desc",
        },
      ],
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

  return (
    <HomeClient
      games={games}
      banners={banners}
      headerImage={header?.imageUrl ?? null}
      activities={activities}
    />
  );
}
