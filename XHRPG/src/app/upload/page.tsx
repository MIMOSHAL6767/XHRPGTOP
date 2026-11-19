import { prisma } from "@/lib/prisma";
import UploadClient from "./UploadClient";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const header = await prisma.homeHeader.findUnique({
    where: { id: 1 },
    select: { imageUrl: true },
  });

  return (
    <UploadClient headerImage={header?.imageUrl ?? null} />
  );
}
