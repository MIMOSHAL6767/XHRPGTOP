import { prisma } from "@/lib/prisma";
import HomeClient from "./components/HomeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [games, banners, header, activities] = await Promise.all([
    prisma.game.findMany({
      where: {
        status: "已发布",
      },
      orderBy: {
        id: "asc",
      },
    }),

    prisma.banner.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        id: "asc",
      },
    }),

    prisma.homeHeader.findUnique({
      where: {
        id: 1,
      },
    }),

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
