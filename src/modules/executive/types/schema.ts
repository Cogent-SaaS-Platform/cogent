import { z } from 'zod';

export const CrossPillarLinkContextSchema = z.object({
  targetPillar: z.enum(['executive', 'marketing', 'radar', 'gap-matrix']),
  circularId: z.string().optional(),
  circularNumber: z.string().optional(),
  regulatorCode: z.enum(['CBN', 'ARCON', 'SEC', 'NDPC', 'FCCPC', 'NFIU']).optional(),
  benchmarkId: z.string().optional(),
  policySectionNumber: z.string().optional(),
  findingRuleCode: z.string().optional(),
  searchTerm: z.string().optional(),
  action: z.enum(['inspect', 'trace', 'pre-vet', 'filter', 'open_upload', 'open_dossier', 'open_drawer', 'run_scan']).optional(),
});
