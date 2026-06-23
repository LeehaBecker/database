import { z } from "zod";
import { prisma } from "./db.js";

const SPECIES_SLUG = z.enum(["trypanosoma-brucei", "leishmania-major"]);
const BOX_TYPE = z.enum(["C/D", "H/ACA"]);
const MAX_ROWS = 100;

export const findHomologPairsSchema = z.object({
  sourceSpecies: SPECIES_SLUG,
  targetSpecies: SPECIES_SLUG,
  sourceMinLength: z.number().int().positive().optional(),
  sourceMaxLength: z.number().int().positive().optional(),
  targetMinLength: z.number().int().positive().optional(),
  targetMaxLength: z.number().int().positive().optional(),
  boxType: BOX_TYPE.optional(),
});

export const searchSnornaSchema = z.object({
  species: SPECIES_SLUG,
  type: BOX_TYPE.optional(),
  search: z.string().optional(),
  minLength: z.number().int().positive().optional(),
  maxLength: z.number().int().positive().optional(),
  hasHomolog: z.boolean().optional(),
  limit: z.number().int().min(1).max(MAX_ROWS).default(50),
});

export const getSnornaDetailSchema = z.object({
  snornaId: z.string().min(1),
  species: SPECIES_SLUG.optional(),
});

function parseCsvIds(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item, index, arr) => item.length > 0 && arr.indexOf(item) === index);
}

function getSnornaLinkCandidates(snornaId: string): string[] {
  const base = snornaId.trim();
  const variants = [
    base,
    base.replace(/_g\d+$/i, ""),
    base.replace(/-\d+$/, ""),
    base.replace(/_copy\d+$/i, ""),
  ].filter(Boolean);
  return variants.filter((value, index) => variants.indexOf(value) === index);
}

function getHomologField(
  sourceSpecies: z.infer<typeof SPECIES_SLUG>,
  targetSpecies: z.infer<typeof SPECIES_SLUG>,
): "lmHomologIds" | "tbHomologIds" | "ldHomologIds" | null {
  if (sourceSpecies === "trypanosoma-brucei" && targetSpecies === "leishmania-major") {
    return "lmHomologIds";
  }
  if (sourceSpecies === "leishmania-major" && targetSpecies === "trypanosoma-brucei") {
    return "tbHomologIds";
  }
  return null;
}

function resolveTargetRecord<T extends { snornaId: string }>(
  targetById: Map<string, T>,
  homologId: string,
): T | undefined {
  for (const candidate of getSnornaLinkCandidates(homologId)) {
    const match = targetById.get(candidate);
    if (match) return match;
  }
  return undefined;
}

function hasHomolog(item: {
  lmHomologIds: string | null;
  tbHomologIds: string | null;
  ldHomologIds: string | null;
}): boolean {
  return Boolean(
    item.lmHomologIds?.trim() || item.tbHomologIds?.trim() || item.ldHomologIds?.trim(),
  );
}

export type AssistantTable = {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  linkColumns?: number[];
};

export async function findHomologPairs(
  params: z.infer<typeof findHomologPairsSchema>,
): Promise<{ pairs: Array<Record<string, string | number>>; table: AssistantTable }> {
  if (params.sourceSpecies === params.targetSpecies) {
    throw new Error("sourceSpecies and targetSpecies must be different");
  }

  const homologField = getHomologField(params.sourceSpecies, params.targetSpecies);
  if (!homologField) {
    throw new Error("Unsupported species pair for homolog lookup");
  }

  const [sourceOrganism, targetOrganism] = await Promise.all([
    prisma.organism.findUnique({ where: { slug: params.sourceSpecies } }),
    prisma.organism.findUnique({ where: { slug: params.targetSpecies } }),
  ]);

  if (!sourceOrganism || !targetOrganism) {
    throw new Error("Organism not found");
  }

  const sourceRecords = await prisma.snoRna.findMany({
    where: {
      organismId: sourceOrganism.id,
      ...(params.boxType ? { type: params.boxType } : {}),
      ...(params.sourceMinLength != null || params.sourceMaxLength != null
        ? {
            length: {
              ...(params.sourceMinLength != null ? { gte: params.sourceMinLength } : {}),
              ...(params.sourceMaxLength != null ? { lte: params.sourceMaxLength } : {}),
            },
          }
        : {}),
    },
    select: {
      snornaId: true,
      length: true,
      type: true,
      lmHomologIds: true,
      tbHomologIds: true,
      ldHomologIds: true,
    },
  });

  const targetRecords = await prisma.snoRna.findMany({
    where: { organismId: targetOrganism.id },
    select: { snornaId: true, length: true, type: true },
  });

  const targetById = new Map(targetRecords.map((row) => [row.snornaId, row]));
  const seen = new Set<string>();
  const pairs: Array<Record<string, string | number>> = [];

  for (const source of sourceRecords) {
    const homologIds = parseCsvIds(source[homologField]);
    for (const homologId of homologIds) {
      const target = resolveTargetRecord(targetById, homologId);
      if (!target) continue;
      if (params.targetMinLength != null && target.length < params.targetMinLength) continue;
      if (params.targetMaxLength != null && target.length > params.targetMaxLength) continue;

      const key = `${source.snornaId}::${target.snornaId}`;
      if (seen.has(key)) continue;
      seen.add(key);

      pairs.push({
        sourceId: source.snornaId,
        sourceLength: source.length,
        sourceType: source.type,
        targetId: target.snornaId,
        targetLength: target.length,
        targetType: target.type,
      });

      if (pairs.length >= MAX_ROWS) break;
    }
    if (pairs.length >= MAX_ROWS) break;
  }

  const sourceLabel = sourceOrganism.name;
  const targetLabel = targetOrganism.name;

  return {
    pairs,
    table: {
      title: `Homolog pairs: ${sourceLabel} ↔ ${targetLabel}`,
      columns: [
        `${sourceLabel} ID`,
        `${sourceLabel} Length`,
        `${sourceLabel} Type`,
        `${targetLabel} ID`,
        `${targetLabel} Length`,
        `${targetLabel} Type`,
      ],
      rows: pairs.map((p) => [
        p.sourceId,
        p.sourceLength,
        p.sourceType,
        p.targetId,
        p.targetLength,
        p.targetType,
      ]),
      linkColumns: [0, 3],
    },
  };
}

export async function searchSnorna(
  params: z.infer<typeof searchSnornaSchema>,
): Promise<{ items: Array<Record<string, string | number | boolean>>; table: AssistantTable }> {
  const organism = await prisma.organism.findUnique({ where: { slug: params.species } });
  if (!organism) throw new Error("Organism not found");

  const records = await prisma.snoRna.findMany({
    where: {
      organismId: organism.id,
      ...(params.type ? { type: params.type } : {}),
      ...(params.search
        ? { snornaId: { contains: params.search, mode: "insensitive" as const } }
        : {}),
      ...(params.minLength != null || params.maxLength != null
        ? {
            length: {
              ...(params.minLength != null ? { gte: params.minLength } : {}),
              ...(params.maxLength != null ? { lte: params.maxLength } : {}),
            },
          }
        : {}),
    },
    include: { targets: true },
    take: params.limit * 2,
  });

  let filtered = records;
  if (params.hasHomolog != null) {
    filtered = records.filter((item) => hasHomolog(item) === params.hasHomolog);
  }

  const items = filtered.slice(0, params.limit).map((item) => ({
    snornaId: item.snornaId,
    length: item.length,
    type: item.type,
    targetType: item.type === "C/D" ? "Nm" : "Psi",
    targetCount: item.targets.length,
    hasHomolog: hasHomolog(item),
  }));

  return {
    items,
    table: {
      title: `snoRNAs — ${organism.name}`,
      columns: ["snoRNA ID", "Length", "Box Type", "Target Type", "Target Count", "Has Homolog"],
      rows: items.map((item) => [
        item.snornaId,
        item.length,
        item.type,
        item.targetType,
        item.targetCount,
        item.hasHomolog ? "Yes" : "No",
      ]),
      linkColumns: [0],
    },
  };
}

export async function getSnornaDetail(params: z.infer<typeof getSnornaDetailSchema>) {
  const where = params.species
    ? { snornaId: params.snornaId, organism: { slug: params.species } }
    : { snornaId: params.snornaId };

  const item = await prisma.snoRna.findFirst({
    where,
    include: {
      organism: true,
      targets: true,
      modificationSites: { include: { rrnaUnit: true } },
      genomicLocations: true,
    },
  });

  if (!item) {
    return { found: false as const, snornaId: params.snornaId };
  }

  return {
    found: true as const,
    snornaId: item.snornaId,
    organism: item.organism.name,
    organismSlug: item.organism.slug,
    length: item.length,
    type: item.type,
    targetType: item.type === "C/D" ? "Nm" : "Psi",
    sequence: item.sequence,
    referenceUrl: item.referenceUrl,
    lmHomologIds: parseCsvIds(item.lmHomologIds),
    tbHomologIds: parseCsvIds(item.tbHomologIds),
    ldHomologIds: parseCsvIds(item.ldHomologIds),
    targetCount: item.targets.length,
    modificationSiteCount: item.modificationSites.length,
    genomicLocationCount: item.genomicLocations.length,
  };
}

export async function listOrganisms() {
  const organisms = await prisma.organism.findMany({
    select: { name: true, slug: true, description: true },
    orderBy: { name: "asc" },
  });
  return { organisms };
}

export const ASSISTANT_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "find_homolog_pairs",
      description:
        "Find cross-species homolog pairs between T. brucei and L. major with optional per-species length and box-type filters. Use for queries comparing homolog lengths across species.",
      parameters: {
        type: "object",
        properties: {
          sourceSpecies: {
            type: "string",
            enum: ["trypanosoma-brucei", "leishmania-major"],
            description: "Slug of the source species",
          },
          targetSpecies: {
            type: "string",
            enum: ["trypanosoma-brucei", "leishmania-major"],
            description: "Slug of the target homolog species",
          },
          sourceMinLength: { type: "integer", description: "Minimum length (nt) for source snoRNA" },
          sourceMaxLength: { type: "integer", description: "Maximum length (nt) for source snoRNA" },
          targetMinLength: { type: "integer", description: "Minimum length (nt) for target homolog" },
          targetMaxLength: { type: "integer", description: "Maximum length (nt) for target homolog" },
          boxType: { type: "string", enum: ["C/D", "H/ACA"], description: "Filter by box type on source records" },
        },
        required: ["sourceSpecies", "targetSpecies"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "search_snorna",
      description:
        "Search snoRNAs within a single species by ID substring, box type, length range, and homolog presence.",
      parameters: {
        type: "object",
        properties: {
          species: {
            type: "string",
            enum: ["trypanosoma-brucei", "leishmania-major"],
          },
          type: { type: "string", enum: ["C/D", "H/ACA"] },
          search: { type: "string", description: "Substring match on snoRNA ID" },
          minLength: { type: "integer" },
          maxLength: { type: "integer" },
          hasHomolog: { type: "boolean" },
          limit: { type: "integer", description: "Max rows to return (default 50, max 100)" },
        },
        required: ["species"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_snorna_detail",
      description: "Get detailed information about a specific snoRNA by ID, optionally scoped to a species.",
      parameters: {
        type: "object",
        properties: {
          snornaId: { type: "string", description: "The snoRNA identifier, e.g. Cs11-1" },
          species: {
            type: "string",
            enum: ["trypanosoma-brucei", "leishmania-major"],
            description: "Optional species slug to disambiguate",
          },
        },
        required: ["snornaId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_organisms",
      description: "List available organisms in the database with their slugs.",
      parameters: { type: "object", properties: {} },
    },
  },
];

export async function executeAssistantTool(
  name: string,
  args: unknown,
): Promise<{ result: unknown; table?: AssistantTable }> {
  switch (name) {
    case "find_homolog_pairs": {
      const parsed = findHomologPairsSchema.parse(args);
      const { pairs, table } = await findHomologPairs(parsed);
      return { result: { count: pairs.length, pairs }, table };
    }
    case "search_snorna": {
      const parsed = searchSnornaSchema.parse(args);
      const { items, table } = await searchSnorna(parsed);
      return { result: { count: items.length, items }, table };
    }
    case "get_snorna_detail": {
      const parsed = getSnornaDetailSchema.parse(args);
      const detail = await getSnornaDetail(parsed);
      return { result: detail };
    }
    case "list_organisms": {
      const result = await listOrganisms();
      return { result };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
