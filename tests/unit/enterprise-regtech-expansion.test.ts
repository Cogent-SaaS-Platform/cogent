import { describe, it, expect, vi } from 'vitest';
import { SourceRegistry, VERIFIED_REGULATORY_SOURCES } from '@/modules/radar/services/sourceRegistry';
import {
  REGULATORY_INSTRUMENTS_SEED,
  REGULATORY_DOMAINS,
  getCorpusByDomain,
  getCorpusByJurisdiction,
} from '@/shared/db/regulatoryCorpusData';
import { StatutoryBenchmarkService } from '@/modules/gap-matrix/services/statutoryBenchmarkService';
import { LiveFeedCollector } from '@/modules/radar/services/liveFeedCollector';

describe('Enterprise RegTech Expansion: Multi-Source Mesh & Domain Library', () => {
  describe('SourceRegistry Catalog', () => {
    it('registers at least 15 verified regulatory & intelligence sources', () => {
      const allSources = SourceRegistry.getAllSources();
      expect(allSources.length).toBeGreaterThanOrEqual(15);
    });

    it('indexes sources across Apex Regulators, Law Firms, and Media', () => {
      const apexSources = SourceRegistry.getSourcesByCategory('APEX_REGULATOR');
      const lawFirmSources = SourceRegistry.getSourcesByCategory('LAW_FIRM_ADVISORY');
      const mediaSources = SourceRegistry.getSourcesByCategory('REGULATORY_NEWS_MEDIA');

      expect(apexSources.length).toBeGreaterThanOrEqual(6);
      expect(lawFirmSources.length).toBeGreaterThanOrEqual(3);
      expect(mediaSources.length).toBeGreaterThanOrEqual(3);

      expect(lawFirmSources.some((s) => s.code === 'TEMPLARS')).toBe(true);
      expect(mediaSources.some((s) => s.code === 'TECHCABAL')).toBe(true);
    });

    it('provides multi-jurisdictional coverage across Nigeria and Pan-African corridors', () => {
      const ngSources = SourceRegistry.getSourcesByJurisdiction('NG');
      const ghSources = SourceRegistry.getSourcesByJurisdiction('GH');
      const keSources = SourceRegistry.getSourcesByJurisdiction('KE');

      expect(ngSources.length).toBeGreaterThanOrEqual(5);
      expect(ghSources.some((s) => s.code === 'BOG')).toBe(true);
      expect(keSources.some((s) => s.code === 'CBK')).toBe(true);
    });
  });

  describe('Multi-Tier Regulatory Corpus & Domains', () => {
    it('defines 7 comprehensive enterprise regulatory domains', () => {
      expect(REGULATORY_DOMAINS.length).toBe(7);
      const domainCodes = REGULATORY_DOMAINS.map((d) => d.code);
      expect(domainCodes).toContain('FINTECH_PAYMENTS');
      expect(domainCodes).toContain('AML_CFT');
      expect(domainCodes).toContain('DIGITAL_LENDING');
      expect(domainCodes).toContain('DATA_PRIVACY_AI');
      expect(domainCodes).toContain('CAPITAL_MARKETS');
      expect(domainCodes).toContain('CRYPTO_VASP');
      expect(domainCodes).toContain('CONSUMER_PROTECTION');
    });

    it('contains authentic primary acts and subsidiary frameworks', () => {
      const bofia = REGULATORY_INSTRUMENTS_SEED.find((i) => i.short_name === 'BOFIA 2020');
      expect(bofia).toBeDefined();
      expect(bofia?.domain).toBe('FINTECH_PAYMENTS');
      expect(bofia?.classification).toBe('PRIMARY_LEGISLATION');

      const ndpa = REGULATORY_INSTRUMENTS_SEED.find((i) => i.short_name === 'NDPA 2023');
      expect(ndpa).toBeDefined();
      expect(ndpa?.domain).toBe('DATA_PRIVACY_AI');

      const vasp = REGULATORY_INSTRUMENTS_SEED.find((i) => i.short_name.includes('VASP'));
      expect(vasp).toBeDefined();
      expect(vasp?.domain).toBe('CRYPTO_VASP');

      const bog = REGULATORY_INSTRUMENTS_SEED.find((i) => i.jurisdiction === 'GH');
      expect(bog).toBeDefined();
      expect(bog?.short_name).toContain('BOG Act 987');
    });

    it('decomposes obligations into structured assessment criteria and deterministic penalties', () => {
      const bofia = REGULATORY_INSTRUMENTS_SEED.find((i) => i.short_name === 'BOFIA 2020');
      const sec57Clause = bofia?.versions[0]?.clauses?.find((c) => c.section_reference.includes('57'));
      expect(sec57Clause).toBeDefined();

      const obligation = sec57Clause?.obligations[0];
      expect(obligation).toBeDefined();
      expect(obligation?.severity_floor).toBe('CRITICAL');
      expect(obligation?.target_role).toBeDefined();

      // Verify assessment criteria checklist exists
      expect(obligation?.assessment_criteria).toBeDefined();
      expect(obligation?.assessment_criteria?.length).toBeGreaterThanOrEqual(2);
      expect(obligation?.assessment_criteria?.[0].criterionText).toBeDefined();

      // Verify deterministic penalty exists (ADR-004)
      expect(obligation?.penalties.length).toBeGreaterThan(0);
      const penalty = obligation?.penalties[0];
      expect(penalty?.penalty_min_naira).toBe(50000000);
      expect(penalty?.carries_personal_criminal_liability).toBe(true);
      expect(penalty?.carries_license_suspension_risk).toBe(true);
    });

    it('filters corpus by domain and jurisdiction correctly', () => {
      const fintechCorpus = getCorpusByDomain('FINTECH_PAYMENTS');
      expect(fintechCorpus.length).toBeGreaterThanOrEqual(2);

      const ghanaCorpus = getCorpusByJurisdiction('GH');
      expect(ghanaCorpus.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('LiveFeedCollector Multi-Stream Polling', () => {
    it('executes pollLawFirmAdvisories returning structured legal intelligence', async () => {
      const mockDb: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      const collector = new LiveFeedCollector({ dbClient: mockDb });

      const items = await collector.pollLawFirmAdvisories();
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].referenceCode.length).toBeGreaterThan(5);
      expect(items[0].content.length).toBeGreaterThan(20);
      // Validates either live Aluko & Oyebode advisory or Templars advisory
      const isExpectedFirm = items[0].referenceCode.includes('AO/ADV') || items[0].referenceCode.includes('TEMPLARS');
      expect(isExpectedFirm).toBe(true);
    });

    it('executes pollFintechMedia returning zero-day policy news', async () => {
      const mockDb: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      const collector = new LiveFeedCollector({ dbClient: mockDb });

      const items = await collector.pollFintechMedia();
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].referenceCode.length).toBeGreaterThan(5);
      expect(items[0].content.length).toBeGreaterThan(20);
      // Validates either live Nairametrics / TechCabal feed or policy advisory fallback
      const isExpectedMedia =
        items[0].referenceCode.includes('NM/FIN') ||
        items[0].referenceCode.includes('TC/') ||
        items[0].referenceCode.includes('TECHCABAL');
      expect(isExpectedMedia).toBe(true);
    });

    it('executes pollPanAfricanCorridors returning cross-border settlement directives', async () => {
      const mockDb: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
      const collector = new LiveFeedCollector({ dbClient: mockDb });

      const items = await collector.pollPanAfricanCorridors();
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].referenceCode).toContain('BOG');
      expect(items[0].content).toContain('Act 987');
    });
  });

  describe('StatutoryBenchmarkService Resolution with Multi-Domain Baselines', () => {
    it('resolves BOFIA 2020 benchmark with decomposed clauses and penalties', async () => {
      const mockDb: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
      const service = new StatutoryBenchmarkService({ dbClient: mockDb });

      const clauses = await service.getBenchmarkClausesWithObligations('bench-bofia-2020');
      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses[0].sectionReference).toContain('Section 57');
      expect(clauses[0].obligations.length).toBeGreaterThan(0);
      expect(clauses[0].obligations[0].penalties[0].penaltyMaxNaira).toBe(100000000);
    });

    it('resolves NDPA 2023 benchmark for data privacy gap evaluations', async () => {
      const mockDb: any = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
      const service = new StatutoryBenchmarkService({ dbClient: mockDb });

      const clauses = await service.getBenchmarkClausesWithObligations('bench-ndpa-2023');
      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses[0].sectionReference).toContain('Section 24');
    });
  });
});
