
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

  // 将首页实际使用的头图地址传给公共导航组件。
  // 请将这里替换成首页服务端组件中获取 headerImage 的原有逻辑。
  const headerImage: string | null = null;

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
      headerImage={headerImage}
    />
  );
}
