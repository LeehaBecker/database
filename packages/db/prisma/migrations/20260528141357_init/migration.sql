-- CreateTable
CREATE TABLE "ChimeraMrnaEntry" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "rowOrder" INTEGER NOT NULL,
    "rowData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChimeraMrnaEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChimeraMrnaEntry_organismId_rowOrder_idx" ON "ChimeraMrnaEntry"("organismId", "rowOrder");

-- AddForeignKey
ALTER TABLE "ChimeraMrnaEntry" ADD CONSTRAINT "ChimeraMrnaEntry_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE CASCADE ON UPDATE CASCADE;
