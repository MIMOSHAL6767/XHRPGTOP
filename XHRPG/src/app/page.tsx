import { prisma } from "@/lib/prisma";
import HomeClient from "./components/HomeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [games, banners] = await Promise.all([
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
  ]);

  return (
    <HomeClient
      games={games}
      banners={banners}
    />
  );
}
