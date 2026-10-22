
import { prisma } from "@/lib/prisma";
import RandomGameClient from "./RandomGameClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RandomGamePage() {
  const [games, header] = await Promise.all([
    // 只获取已发布的游戏
    prisma.game.findMany({
      where: {
        status: "已发布",
      },
      select: {
        id: true,
        name: true,
        description: true,
        cover: true,
        category: true,
        version: true,
        author: true,
      },
      orderBy: {
        id: "asc",
      },
    }),

    // 复用首页的头图
    prisma.homeHeader.findUnique({
      where: {
        id: 1,
      },
      select: {
        imageUrl: true,
      },
    }),
  ]);

  return (
    <RandomGameClient
      games={games.map((game) => ({
        id: game.id,
        name: game.name,
        description: game.description ?? "",
        cover: game.cover ?? "",
        category: game.category ?? "",
        version: game.version ?? "",
        author: game.author ?? "",
      }))}
      headerImage={header?.imageUrl ?? null}
    />
  );
}
