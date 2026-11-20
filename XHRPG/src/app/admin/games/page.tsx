
import { prisma } from "@/lib/prisma";
import GamesAdmin from "./GamesAdmin";
import { requireAdminPage } from "@/lib/admin-auth";

export default async function GamesPage() {
  await requireAdminPage();

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
