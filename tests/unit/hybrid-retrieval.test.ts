import { describe, it, expect } from 'vitest';
import { HybridRetrievalService } from '@/modules/marketing-shield/hybridRetrieval';
import { AiEngine } from '@/shared/ai-engine';
import { createAdminClient } from '@/shared/db';
import fs from 'fs';
import path from 'path';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(import.meta.dirname, '../../.env.local');
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, 'utf-8');
  const env: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnvLocal();
for (const [k, v] of Object.entries(env)) {
  process.env[k] = v;
}

describe('Hybrid Statutory Retrieval Service (Task 5.2)', () => {
  const aiEngine = new AiEngine(process.env.GEMINI_API_KEY);
  const dbClient = createAdminClient();
  const service = new HybridRetrievalService(aiEngine, dbClient);

  it(
    'retrieves statutory clauses for Canonical Scenario A (Digital Lending SMS)',
    async () => {
      const copy =
        'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval, no collateral, no credit checks. Download QuickKash app now!';

      const result = await service.retrieveRelevantClauses(copy, {
        limit: 5,
        minSimilarity: 0.1,
      });

      expect(result.clauses.length).toBeGreaterThan(0);
      expect(result.latencyMs).toBeGreaterThan(0);
      expect(result.embeddingHash).toBeDefined();

      const references = result.clauses.map((c) => c.sectionReference);
      console.log('Scenario A retrieved references:', references);

      // Verify clause structure
      const topClause = result.clauses[0];
      expect(topClause.clauseId).toBeDefined();
      expect(topClause.sectionReference).toBeDefined();
      expect(topClause.clauseText).toBeDefined();
      expect(topClause.regulatorCode).toBeDefined();
      expect(topClause.rrfScore).toBeGreaterThan(0);
    },
    120000
  );

  it(
    'retrieves statutory clauses for Canonical Scenario B (High-Yield Investment Ad)',
    async () => {
      const copy =
        'Tired of inflation? Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed! Your capital is 100% safe and backed by the government.';

      const result = await service.retrieveRelevantClauses(copy, {
        limit: 5,
        minSimilarity: 0.1,
      });

      expect(result.clauses.length).toBeGreaterThan(0);
      const regulators = result.clauses.map((c) => c.regulatorCode);
      console.log('Scenario B retrieved regulators:', regulators);

      expect(result.clauses[0].rrfScore).toBeGreaterThan(0);
    },
    120000
  );

  it(
    'supports filtering retrieval by specific regulator (e.g. ARCON)',
    async () => {
      const copy = 'Get your 100% guaranteed approval loan today!';

      const result = await service.retrieveRelevantClauses(copy, {
        limit: 3,
        minSimilarity: 0.1,
        filterRegulator: 'ARCON',
      });

      expect(result.clauses.length).toBeGreaterThan(0);
      for (const clause of result.clauses) {
        expect(clause.regulatorCode).toBe('ARCON');
      }
    },
    120000
  );
});
