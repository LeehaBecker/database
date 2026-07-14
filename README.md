# snoRNA-BIU

Kinetoplastid snoRNA and rRNA modification database (Bar-Ilan University).

## Quick start

1. Copy `.env.example` to `.env`.
2. Run `npm install`.
3. Run `docker-compose up -d postgres`.
4. Run `npm run db:generate`.
5. Run `npm run db:migrate`.
6. Run `npm run db:seed`.
7. Run `npm run import:data` (reads from `Site-db-data/`).
8. Run `docker-compose up -d --build`.

Frontend: `http://localhost:3000`  
API: `http://localhost:4000/health`

## Architecture

```
snorna-database/
├── apps/api/       Express REST API (port 4000)
├── apps/web/       Next.js frontend (port 3000)
├── packages/db/    Prisma schema, migrations, import pipeline
└── packages/shared/ Shared Zod schemas
```

Biological data files live in `Site-db-data/` (mounted as `DATA_PATH` in Docker).

## Key features

- snoRNA browse/filter/export with genomic locus links
- rRNA sequence, modifications, secondary structure, 3D viewer
- snoRNA–rRNA interaction viewer
- Cross-species homolog explorer (TB ↔ LM)
- Local BLAST and genome browser (T. brucei)
- Batch downloads and REST API
- Sequence utilities (FASTA fetch, motif search, coordinate converter)

## Data file inventory

Core import files in `Site-db-data/`:

| File | Purpose |
|------|---------|
| `all_snoRNA_table.csv` | TB snoRNA catalog |
| `all_LM_snoRNA_table.csv` | LM snoRNA catalog |
| `chr_locations.xlsx` / `chr_locations_LM.xlsx` | Genomic coordinates |
| `snoRNA_targets.csv` / `snoRNA_LM_targets.csv` | C/D and H/ACA targets |
| `TB_LM_HACA_IN_PARTS_02Oct2014.xlsx` | H/ACA fragment data |
| `subunits_coordinates.xlsx` | rRNA subunit coordinates |
| `TB_rRNA_annot_Nm.xlsx` / `TB_rRNA_annot_Psi.xlsx` | TB modification sites |
| `LM_rRNA_annot_Nm.csv` / `LM_rRNA_annot_Psi.csv` | LM modification sites |
| `TriTrypDB-68_TbruceiTREU927_*` | Genome browser GTF/FASTA |
| `Articles.csv` | Publication metadata |

## Field glossary

| Term | Meaning |
|------|---------|
| C/D | snoRNA box type guiding 2'-O-methylation (Nm) |
| H/ACA | snoRNA box type guiding pseudouridylation (Psi) |
| Nm | 2'-O-methylated ribose |
| Psi (Ψ) | Pseudouridine |
| SSU / LSUα / LSUβ | rRNA subunits |

## Environment variables

See `.env.example` for `DATABASE_URL`, `DATA_PATH`, `API_PORT`, `GEMINI_API_KEY`, etc.

Optional: `DATASET_VERSION`, `DATASET_LAST_UPDATED`, `NEXT_PUBLIC_DATASET_VERSION`.

## API

See `/api-docs` on the web frontend or `GET /stats`, `/snorna`, `/tools/interactions`, `/tools/homologs`, `/downloads/*`.
