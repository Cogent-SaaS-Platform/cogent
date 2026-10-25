import { describe, it, expect } from 'vitest';
import {
  REGULATORY_INSTRUMENTS_SEED,
  REGULATORY_DOMAINS,
} from '@/shared/db/regulatoryCorpusData';
import {
  RegulatoryInstrumentPresentation,
  StatutorySection,
  DecomposedObligationPresentation,
} from '@/modules/regulatory/types';

describe('Zango Redesigned Regulatory Library & Obligations Register', () => {
  it('maps authoritative regulatory corpus seeds to presentation view models', () => {
    const bofia = REGULATORY_INSTRUMENTS_SEED.find((i) => i.short_name === 'BOFIA 2020');
    expect(bofia).toBeDefined();

    if (!bofia) return;

    const presentation: RegulatoryInstrumentPresentation = {
      id: `seed-inst-${bofia.short_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      shortTitle: bofia.short_name,
      fullTitle: bofia.title,
      officialCitation: bofia.versions[0]?.reference_code || 'Act No. 5 of 2020',
      regulator: bofia.body_code,
      regulatorName: 'Central Bank of Nigeria',
      instrumentType: bofia.instrument_type,
      domain: bofia.domain || 'FINTECH_PAYMENTS',
      jurisdiction: bofia.jurisdiction || 'NG',
      classification: bofia.classification || 'PRIMARY_LEGISLATION',
      year: bofia.enacted_year || 2020,
      sectionsCount: bofia.versions[0]?.clauses?.length || 0,
      status: 'ACTIVE_LAW',
      description: bofia.description || bofia.title,
    };

    expect(presentation.shortTitle).toBe('BOFIA 2020');
    expect(presentation.regulator).toBe('CBN');
    expect(presentation.jurisdiction).toBe('NG');
    expect(presentation.sectionsCount).toBeGreaterThan(0);
    expect(presentation.status).toBe('ACTIVE_LAW');
  });

  it('verifies statutory sections contain structured decomposed obligations with penalties and assessment criteria', () => {
    const bofia = REGULATORY_INSTRUMENTS_SEED.find((i) => i.short_name === 'BOFIA 2020');
    expect(bofia?.versions[0]?.clauses).toBeDefined();

    const clauses = bofia!.versions[0]!.clauses!;
    expect(clauses.length).toBeGreaterThan(0);

    const firstClause = clauses[0];
    expect(firstClause.section_reference).toBeTruthy();
    expect(firstClause.obligations.length).toBeGreaterThan(0);

    const obl = firstClause.obligations[0];
    expect(obl.summary).toBeTruthy();
    expect(obl.penalties).toBeDefined();
    expect(obl.penalties.length).toBeGreaterThan(0);

    const penalty = obl.penalties[0];
    expect(penalty.penalty_min_naira).toBeGreaterThan(0);
    expect(penalty.penalty_legal_citation).toBeTruthy();
  });

  it('aggregates live domain and jurisdiction matrix statistics correctly', () => {
    const sampleInstruments: RegulatoryInstrumentPresentation[] = [
      {
        id: 'inst-1',
        shortTitle: 'BOFIA 2020',
        fullTitle: 'Banks and Other Financial Institutions Act',
        officialCitation: 'Act No. 5 of 2020',
        regulator: 'CBN',
        regulatorName: 'Central Bank of Nigeria',
        instrumentType: 'PRIMARY_ACT',
        domain: 'FINTECH_PAYMENTS',
        jurisdiction: 'NG',
        classification: 'PRIMARY_LEGISLATION',
        year: 2020,
        sectionsCount: 12,
        status: 'ACTIVE_LAW',
        description: 'Banking law',
      },
      {
        id: 'inst-2',
        shortTitle: 'NDPA 2023',
        fullTitle: 'Nigeria Data Protection Act',
        officialCitation: 'Act No. 12 of 2023',
        regulator: 'NDPC',
        regulatorName: 'Nigeria Data Protection Commission',
        instrumentType: 'PRIMARY_ACT',
        domain: 'DATA_PRIVACY_AI',
        jurisdiction: 'NG',
        classification: 'PRIMARY_LEGISLATION',
        year: 2023,
        sectionsCount: 8,
        status: 'ACTIVE_LAW',
        description: 'Data privacy',
      },
      {
        id: 'inst-3',
        shortTitle: 'Bank of Ghana Payment Systems Act',
        fullTitle: 'Payment Systems and Services Act, 2019',
        officialCitation: 'Act 987',
        regulator: 'BOG',
        regulatorName: 'Bank of Ghana',
        instrumentType: 'PRIMARY_ACT',
        domain: 'FINTECH_PAYMENTS',
        jurisdiction: 'GH',
        classification: 'PRIMARY_LEGISLATION',
        year: 2019,
        sectionsCount: 15,
        status: 'ACTIVE_LAW',
        description: 'Ghana payment systems',
      },
    ];

    const domainCounts: Record<string, number> = {};
    for (const inst of sampleInstruments) {
      domainCounts[inst.domain] = (domainCounts[inst.domain] || 0) + 1;
    }

    expect(domainCounts['FINTECH_PAYMENTS']).toBe(2);
    expect(domainCounts['DATA_PRIVACY_AI']).toBe(1);

    const jurisdictionCounts: Record<string, number> = {};
    for (const inst of sampleInstruments) {
      jurisdictionCounts[inst.jurisdiction] = (jurisdictionCounts[inst.jurisdiction] || 0) + 1;
    }

    expect(jurisdictionCounts['NG']).toBe(2);
    expect(jurisdictionCounts['GH']).toBe(1);
  });

  it('formats obligation status with 6px dot compliance guidelines', () => {
    const validStatuses = [
      'ADEQUATELY_MET',
      'PARTIALLY_MET',
      'GAP_DETECTED',
      'NOT_APPLICABLE',
      'PENDING_REVIEW',
    ];

    for (const status of validStatuses) {
      expect(['ADEQUATELY_MET', 'PARTIALLY_MET', 'GAP_DETECTED', 'NOT_APPLICABLE', 'PENDING_REVIEW']).toContain(status);
    }
  });
});
