-- CreateTable
CREATE TABLE "Organism" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnoRna" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "snornaId" TEXT NOT NULL,
    "sequence" TEXT NOT NULL,
    "length" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "homologSnoRnaId" TEXT,
    "tritrypdbExternalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SnoRna_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenomicLocation" (
    "id" TEXT NOT NULL,
    "snoRnaId" TEXT NOT NULL,
    "chr" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "strand" TEXT NOT NULL,

    CONSTRAINT "GenomicLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnoRnaTarget" (
    "id" TEXT NOT NULL,
    "snoRnaId" TEXT NOT NULL,
    "targetSequence1" TEXT,
    "targetSequence2" TEXT,
    "cBox" TEXT,
    "cBox2" TEXT,
    "dBox" TEXT,
    "dBox2" TEXT,
    "dBox3" TEXT,
    "osLeft" TEXT,
    "leftPocket" TEXT,
    "innerStem" TEXT,
    "rightPocket" TEXT,
    "outerStemRight" TEXT,

    CONSTRAINT "SnoRnaTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RrnaUnit" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "subunit" TEXT NOT NULL,
    "start" INTEGER NOT NULL,
    "end" INTEGER NOT NULL,
    "sequence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RrnaUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModificationSite" (
    "id" TEXT NOT NULL,
    "snoRnaId" TEXT NOT NULL,
    "rrnaUnitId" TEXT,
    "source" TEXT NOT NULL,
    "rrnaSubunit" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "bp" TEXT,
    "base" TEXT,
    "modType" TEXT,

    CONSTRAINT "ModificationSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "pmid" TEXT,
    "title" TEXT NOT NULL,
    "authors" TEXT,
    "citation" TEXT,
    "firstAuthor" TEXT,
    "journalBook" TEXT,
    "publicationYear" INTEGER,
    "pmcid" TEXT,
    "nihmsId" TEXT,
    "doi" TEXT,
    "externalUrl" TEXT,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "organismId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "externalUrl" TEXT,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SequencingLibrary" (
    "id" TEXT NOT NULL,
    "organismId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "externalUrl" TEXT,
    "downloadUrl" TEXT,

    CONSTRAINT "SequencingLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "organismId" TEXT,
    "snoRnaId" TEXT,
    "rrnaUnitId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "pdbId" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organism_name_key" ON "Organism"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Organism_slug_key" ON "Organism"("slug");

-- CreateIndex
CREATE INDEX "SnoRna_snornaId_idx" ON "SnoRna"("snornaId");

-- CreateIndex
CREATE UNIQUE INDEX "SnoRna_organismId_snornaId_key" ON "SnoRna"("organismId", "snornaId");

-- CreateIndex
CREATE INDEX "GenomicLocation_chr_start_end_idx" ON "GenomicLocation"("chr", "start", "end");

-- CreateIndex
CREATE UNIQUE INDEX "RrnaUnit_organismId_subunit_key" ON "RrnaUnit"("organismId", "subunit");

-- CreateIndex
CREATE INDEX "ModificationSite_rrnaSubunit_count_idx" ON "ModificationSite"("rrnaSubunit", "count");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_slug_key" ON "Tool"("slug");

-- AddForeignKey
ALTER TABLE "SnoRna" ADD CONSTRAINT "SnoRna_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenomicLocation" ADD CONSTRAINT "GenomicLocation_snoRnaId_fkey" FOREIGN KEY ("snoRnaId") REFERENCES "SnoRna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SnoRnaTarget" ADD CONSTRAINT "SnoRnaTarget_snoRnaId_fkey" FOREIGN KEY ("snoRnaId") REFERENCES "SnoRna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RrnaUnit" ADD CONSTRAINT "RrnaUnit_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationSite" ADD CONSTRAINT "ModificationSite_snoRnaId_fkey" FOREIGN KEY ("snoRnaId") REFERENCES "SnoRna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModificationSite" ADD CONSTRAINT "ModificationSite_rrnaUnitId_fkey" FOREIGN KEY ("rrnaUnitId") REFERENCES "RrnaUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SequencingLibrary" ADD CONSTRAINT "SequencingLibrary_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_organismId_fkey" FOREIGN KEY ("organismId") REFERENCES "Organism"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_snoRnaId_fkey" FOREIGN KEY ("snoRnaId") REFERENCES "SnoRna"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_rrnaUnitId_fkey" FOREIGN KEY ("rrnaUnitId") REFERENCES "RrnaUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
