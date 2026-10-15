
import { prisma } from "@/lib/prisma";
import GamesAdmin from "./GamesAdmin";
import { requireOwnerPage } from "@/lib/admin-auth";

export default async function GamesPage() {
  await requireOwnerPage();

  const games = await prisma.game.findMany({
    orderBy: {
      id: "asc",
    },
  });

  return (
    <GamesAdmin
      games={games}
    />
  );
}
