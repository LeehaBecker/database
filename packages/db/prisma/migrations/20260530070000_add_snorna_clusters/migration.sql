-- CreateTable
CREATE TABLE "SnornaClusterItem" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "clusterId" INTEGER NOT NULL,
    "itemOrder" INTEGER NOT NULL,
    "coordinates" TEXT,
    "snornaId" TEXT NOT NULL,
    "boxType" TEXT,
    "geneLengthNt" INTEGER,
    "intergenicLengthNt" TEXT,
    "clusterRepeatInGenome" INTEGER,
    "referenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnornaClusterItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SnornaClusterItem_organismId_clusterId_itemOrder_idx" ON "SnornaClusterItem"("organismId", "clusterId", "itemOrder");

-- CreateIndex
CREATE INDEX "SnornaClusterItem_organismId_snornaId_idx" ON "SnornaClusterItem"("organismId", "snornaId");

-- AddForeignKey
ALTER TABLE "SnornaClusterItem" ADD CONSTRAINT "SnornaClusterItem_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE CASCADE ON UPDATE CASCADE;
