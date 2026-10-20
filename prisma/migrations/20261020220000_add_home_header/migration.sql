-- CreateTable
CREATE TABLE "HomeHeader" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeHeader_pkey" PRIMARY KEY ("id")
);