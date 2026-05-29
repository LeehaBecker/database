import { z } from "zod";

export const organismSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().nullable().optional(),
});

export const snornaFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(25),
  species: z.string().optional(),
  type: z.enum(["C/D", "H/ACA"]).optional(),
  search: z.string().optional(),
});

export const blastRunSchema = z.object({
  sequence: z
    .string()
    .min(10)
    .regex(/^[ACGTUNacgtun\s]+$/, "Sequence may only contain nucleotide characters"),
});

export const chimeraFilterSchema = z.object({
  species: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  search: z.string().optional(),
});
