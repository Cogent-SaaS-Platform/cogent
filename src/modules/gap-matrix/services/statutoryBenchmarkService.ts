import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import {
  StatutoryBenchmarkFramework,
  StatutoryClauseWithObligations,
} from '../types';
import { OrgDepartment, RegulatorCode, SeverityLevel } from '@/shared/types';
import {
  REGULATORY_INSTRUMENTS_SEED,
  REGULATORY_BODIES_SEED,
} from '@/shared/db/regulatoryCorpusData';

interface BenchmarkRow {
  id: string;
  reference_code: string;
  publication_date?: string;
  effective_date?: string;
  instrument?: {
    title?: string;
    short_name?: string;
    body?: {
      code?: RegulatorCode;
    } | null;
  } | null;
  clauses?: Array<{ count?: number }> | null;
}

interface ClauseDbRow {
  id: string;
  document_version_id: string;
  section_reference: string;
  section_heading?: string | null;
  clause_text: string;
  page_number?: number | null;
  regulatory_obligations?: Array<{
    id: string;
    obligation_type: string;
    summary: string;
    severity_floor: SeverityLevel;
    statutory_timeline_days?: number | null;
    mandatory_disclosure_text?: string | null;
    statutory_penalties?: Array<{
      penalty_min_naira?: number | null;
      penalty_max_naira?: number | null;
      daily_fine_naira?: number | null;
      carries_personal_criminal_liability?: boolean | null;
      carries_license_suspension_risk?: boolean | null;
      penalty_legal_citation?: string | null;
    }>;
  }>;
}

type SeedInstrument = (typeof REGULATORY_INSTRUMENTS_SEED)[number];
type SeedVersion = SeedInstrument['versions'][number];
type SeedClause = SeedVersion['clauses'][number];
type SeedObligation = SeedClause['obligations'][number];
type SeedPenalty = SeedObligation['penalties'][number];

/**
 * Statutory Benchmark Pairing Engine (Epic 16 / Task 16.1)
 * Links internal policies to relevant regulatory frameworks and extracts statutory baselines.
 */
export class StatutoryBenchmarkService {
  private dbClient: SupabaseClient<Database>;

  constructor(options: { dbClient: SupabaseClient<Database> } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('StatutoryBenchmarkService requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;
  }

  /**
   * Discovers available statutory benchmark frameworks, with department affinity matching
   */
  public async getAvailableBenchmarks(
    department?: OrgDepartment
  ): Promise<StatutoryBenchmarkFramework[]> {
    if (this.dbClient) {
      try {
        const { data, error } = await this.dbClient
          .from('regulatory_document_versions')
          .select(`
            id,
            version_number,
            reference_code,
            publication_date,
            effective_date,
            instrument:regulatory_instruments (
              title,
              short_name,
              body:regulatory_bodies (
                code
              )
            ),
            clauses:regulatory_clauses (count)
          `)
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          const benchmarks: StatutoryBenchmarkFramework[] = (data as unknown as BenchmarkRow[]).map((row) => {
            const bodyCode: RegulatorCode = row.instrument?.body?.code || 'CBN';
            const suggestedDepts = this.mapRegulatorToDepartments(bodyCode);
            const clausesCount = Array.isArray(row.clauses) && row.clauses.length > 0
              ? row.clauses[0].count
              : 5;

            return {
              documentVersionId: row.id,
              instrumentTitle: row.instrument?.title || 'Statutory Regulation',
              shortName: row.instrument?.short_name || 'Statutory Regulation',
              referenceCode: row.reference_code,
              regulatorCode: bodyCode,
              publicationDate: row.publication_date || '',
              effectiveDate: row.effective_date || '',
              suggestedDepartments: suggestedDepts,
              clausesCount: Number(clausesCount) || 1,
            };
          });

          if (department) {
            // Sort by affinity to department
            benchmarks.sort((a, b) => {
              const aMatch = a.suggestedDepartments.includes(department) ? 1 : 0;
              const bMatch = b.suggestedDepartments.includes(department) ? 1 : 0;
              return bMatch - aMatch;
            });
          }

          return benchmarks;
        }
      } catch (err) {
        logger.warn({ err: String(err) }, 'Failed to fetch benchmarks from DB; falling back to seed corpus');
      }
    }

    // Fallback to static seed corpus definitions
    return this.getFallbackSeedBenchmarks(department);
  }

  /**
   * Fetches clauses, obligations, and statutory penalties for a benchmark version
   */
  public async getBenchmarkClausesWithObligations(
    documentVersionId: string
  ): Promise<StatutoryClauseWithObligations[]> {
    if (this.dbClient) {
      try {
        const { data, error } = await this.dbClient
          .from('regulatory_clauses')
          .select(`
            id,
            document_version_id,
            section_reference,
            section_heading,
            clause_text,
            page_number,
            regulatory_obligations (
              id,
              obligation_type,
              summary,
              severity_floor,
              statutory_timeline_days,
              mandatory_disclosure_text,
              statutory_penalties (
                penalty_min_naira,
                penalty_max_naira,
                daily_fine_naira,
                carries_personal_criminal_liability,
                carries_license_suspension_risk,
                penalty_legal_citation
              )
            )
          `)
          .eq('document_version_id', documentVersionId);

        if (!error && data && data.length > 0) {
          return (data as unknown as ClauseDbRow[]).map((c) => ({
            clauseId: c.id,
            documentVersionId: c.document_version_id,
            sectionReference: c.section_reference,
            sectionHeading: c.section_heading || c.section_reference,
            clauseText: c.clause_text,
            pageNumber: c.page_number,
            obligations: (c.regulatory_obligations || []).map((o) => ({
              obligationId: o.id,
              obligationType: o.obligation_type,
              summary: o.summary,
              severityFloor: (o.severity_floor || 'MEDIUM') as SeverityLevel,
              statutoryTimelineDays: o.statutory_timeline_days ?? null,
              mandatoryDisclosureText: o.mandatory_disclosure_text ?? null,
              penalties: (o.statutory_penalties || []).map((p) => ({
                penaltyMinNaira: Number(p.penalty_min_naira) || 0,
                penaltyMaxNaira: Number(p.penalty_max_naira) || 0,
                dailyFineNaira: Number(p.daily_fine_naira) || 0,
                carriesPersonalCriminalLiability: Boolean(p.carries_personal_criminal_liability),
                carriesLicenseSuspensionRisk: Boolean(p.carries_license_suspension_risk),
                penaltyLegalCitation: p.penalty_legal_citation || 'BOFIA 2020 / Relevant Act',
              })),
            })),
          }));
        }
      } catch (err) {
        logger.warn({ err: String(err) }, 'Error querying DB for benchmark clauses, falling back to seed');
      }
    }

    return this.getFallbackSeedClauses(documentVersionId);
  }

  private mapRegulatorToDepartments(regulator: RegulatorCode): OrgDepartment[] {
    switch (regulator) {
      case 'CBN':
        return ['COMPLIANCE_LEGAL', 'OPERATIONS', 'TREASURY_FINANCE'];
      case 'ARCON':
        return ['GROWTH_MARKETING', 'COMPLIANCE_LEGAL'];
      case 'FCCPC':
        return ['COMPLIANCE_LEGAL', 'OPERATIONS', 'GROWTH_MARKETING'];
      case 'SEC':
        return ['COMPLIANCE_LEGAL', 'TREASURY_FINANCE', 'PRODUCT_MANAGEMENT'];
      case 'NDPC':
        return ['COMPLIANCE_LEGAL', 'ENGINEERING_TECH', 'OPERATIONS'];
      case 'NFIU':
        return ['COMPLIANCE_LEGAL', 'OPERATIONS'];
      default:
        return ['COMPLIANCE_LEGAL'];
    }
  }

  private getFallbackSeedBenchmarks(department?: OrgDepartment): StatutoryBenchmarkFramework[] {
    const list: StatutoryBenchmarkFramework[] = [];

    for (const instrument of REGULATORY_INSTRUMENTS_SEED) {
      for (const version of instrument.versions) {
        const id = `bench-${instrument.body_code.toLowerCase()}-${version.version_number.toLowerCase()}`;
        list.push({
          documentVersionId: id,
          instrumentTitle: instrument.title,
          shortName: instrument.short_name,
          referenceCode: version.reference_code,
          regulatorCode: instrument.body_code,
          publicationDate: version.publication_date,
          effectiveDate: version.effective_date,
          suggestedDepartments: this.mapRegulatorToDepartments(instrument.body_code),
          clausesCount: version.clauses.length,
        });
      }
    }

    if (department) {
      list.sort((a, b) => {
        const aMatch = a.suggestedDepartments.includes(department) ? 1 : 0;
        const bMatch = b.suggestedDepartments.includes(department) ? 1 : 0;
        return bMatch - aMatch;
      });
    }

    return list;
  }

  private getFallbackSeedClauses(documentVersionId: string): StatutoryClauseWithObligations[] {
    const normReq = documentVersionId.toLowerCase().trim();

    // 1. Search for matching instrument version
    for (const instrument of REGULATORY_INSTRUMENTS_SEED) {
      for (const version of instrument.versions) {
        const seedId = `bench-${instrument.body_code.toLowerCase()}-${version.version_number.toLowerCase()}`;
        if (
          seedId === normReq ||
          version.reference_code.toLowerCase() === normReq ||
          (normReq.includes('aml') && seedId.includes('aml')) ||
          (normReq.includes('cpf') && seedId.includes('2019')) ||
          (normReq.includes('fccpc') && seedId.includes('fccpc')) ||
          (normReq.includes('sec') && seedId.includes('sec'))
        ) {
          return this.mapVersionToStatutoryClauses(instrument, version, documentVersionId);
        }
      }
    }

    // 2. Default to first instrument with clauses
    const firstInst = REGULATORY_INSTRUMENTS_SEED.find((inst) => inst.versions.some((v) => v.clauses.length > 0));
    if (firstInst) {
      const firstVer = firstInst.versions.find((v) => v.clauses.length > 0);
      if (firstVer) {
        return this.mapVersionToStatutoryClauses(firstInst, firstVer, documentVersionId);
      }
    }

    return [];
  }

  private mapVersionToStatutoryClauses(
    instrument: SeedInstrument,
    version: SeedVersion,
    documentVersionId: string
  ): StatutoryClauseWithObligations[] {
    return version.clauses.map((cl: SeedClause, i: number) => ({
      clauseId: `clause-${i + 1}-${instrument.body_code}`,
      documentVersionId,
      sectionReference: cl.section_reference,
      sectionHeading: cl.section_heading,
      clauseText: cl.clause_text,
      pageNumber: cl.page_number || 1,
      obligations: cl.obligations.map((o: SeedObligation, oIdx: number) => ({
        obligationId: `ob-${oIdx + 1}-${i}`,
        obligationType: o.obligation_type,
        summary: o.summary,
        severityFloor: o.severity_floor,
        statutoryTimelineDays: o.statutory_timeline_days,
        mandatoryDisclosureText: o.mandatory_disclosure_text,
        penalties: o.penalties.map((p: SeedPenalty) => ({
          penaltyMinNaira: p.penalty_min_naira,
          penaltyMaxNaira: p.penalty_max_naira,
          dailyFineNaira: p.daily_fine_naira,
          carriesPersonalCriminalLiability: p.carries_personal_criminal_liability,
          carriesLicenseSuspensionRisk: p.carries_license_suspension_risk,
          penaltyLegalCitation: p.penalty_legal_citation,
        })),
      })),
    }));
  }
}
