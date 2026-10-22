
import { prisma } from "@/lib/prisma";
import RandomGameClient from "./RandomGameClient";

export const dynamic = "force-dynamic";

export default async function RandomGamePage() {
  const games = await prisma.game.findMany({
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
  });

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
    />
  );
}
