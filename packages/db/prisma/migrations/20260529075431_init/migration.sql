-- CreateTable
CREATE TABLE "ChimeraDatasetMeta" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "datasetKey" TEXT NOT NULL,
    "sourceFile" TEXT,
    "columns" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChimeraDatasetMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChimeraDatasetMeta_organismId_datasetKey_key" ON "ChimeraDatasetMeta"("organismId", "datasetKey");

-- AddForeignKey
ALTER TABLE "ChimeraDatasetMeta" ADD CONSTRAINT "ChimeraDatasetMeta_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE CASCADE ON UPDATE CASCADE;
