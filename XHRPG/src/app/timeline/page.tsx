
import { prisma } from "@/lib/prisma";
import TimelineClient from "./TimelineClient";

export const dynamic = "force-dynamic";

export default async function TimelinePage() {
  let headerImage: string | null = null;

  try {
    const homeHeader = await prisma.homeHeader.findUnique({
      where: { id: 1 },
      select: { imageUrl: true },
    });

    headerImage = homeHeader?.imageUrl ?? null;
  } catch (error) {
    console.error("读取首页头图失败：", error);
  }

  return <TimelineClient headerImage={headerImage} />;
}
