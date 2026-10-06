import { describe, it, expect } from 'vitest';
import { MarketingShieldService } from '@/modules/marketing-shield';
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

describe('Pillar 1 Marketing Shield Service (Task 5.3 & MVP.md)', () => {
  const aiEngine = new AiEngine(process.env.GEMINI_API_KEY);
  const dbClient = createAdminClient();
  const service = new MarketingShieldService(aiEngine, undefined, dbClient);

  it(
    'executes end-to-end pre-vetting for Canonical Test Scenario A (Digital Lending SMS)',
    async () => {
      const result = await service.executeScan({
        organizationId: '00000000-0000-0000-0000-000000000001',
        campaignName: 'QuickKash SMS Flash Campaign',
        channel: 'SMS_BLAST',
        rawCopy:
          'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval, no collateral, no credit checks. Download QuickKash app now!',
        targetAudienceDescription: 'Nigerian retail consumers seeking urgent cash',
      });

      console.log('Scenario A Execution Summary:');
      console.log('Verdict:', result.verdict);
      console.log('Risk Score:', result.overallRiskScore);
      console.log('Deterministic Penalty Total Naira:', result.deterministicPenaltyTotalNaira);
      console.log('Compliant Rewrite:', result.compliantRewrite);
      console.log('Findings Count:', result.findings.length);

      // Verify Presentation Contract (Section 7)
      expect(result.title).toContain('QuickKash SMS Flash Campaign');
      expect(result.verdict).toBe('BLOCKING_ISSUE');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(85);
      expect(result.deterministicPenaltyTotalNaira).toBeGreaterThanOrEqual(1000000);
      expect(result.findings.length).toBeGreaterThanOrEqual(3);

      // Verify specific statutory findings are linked
      const matchedExcerpts = result.findings.map((f) => f.flaggedExcerpt.toLowerCase());
      expect(matchedExcerpts.some((e) => e.includes('zero interest'))).toBe(true);
      expect(matchedExcerpts.some((e) => e.includes('guaranteed approval') || e.includes('100%'))).toBe(true);

      // Verify rewritten copy is generated and non-empty
      expect(result.compliantRewrite).toBeDefined();
      expect(result.compliantRewrite.length).toBeGreaterThan(20);

      // Verify Section 7 Progressive Disclosure Elements
      expect(result.executiveSummary).toBeDefined();
      expect(result.actions.length).toBeGreaterThan(0);
      expect(result.humanReviewState.status).toBe('PENDING_REVIEW');
      expect(result.humanReviewState.canApprove).toBe(true);
      expect(result.arconPreclearanceRequired).toBe(true);
      expect(result.telemetry.auditHash).toBeDefined();
      expect(result.telemetry.latencyMs).toBeGreaterThan(0);
    },
    90000
  );

  it(
    'executes end-to-end pre-vetting for Canonical Test Scenario B (High-Yield Investment Ad)',
    async () => {
      const result = await service.executeScan({
        organizationId: '00000000-0000-0000-0000-000000000001',
        campaignName: 'PrimeYield Wealth Ad',
        channel: 'SOCIAL_MEDIA_POST',
        rawCopy:
          'Tired of inflation? Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed! Your capital is 100% safe and backed by the government.',
      });

      expect(result.verdict).toBe('BLOCKING_ISSUE');
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(85);
      expect(result.findings.length).toBeGreaterThanOrEqual(2);
      expect(result.compliantRewrite).toBeDefined();
      expect(result.humanReviewState.status).toBe('PENDING_REVIEW');
    },
    90000
  );

  it(
    'evaluates standard promotional copy without triggering BLOCKING_ISSUE',
    async () => {
      const result = await service.executeScan({
        organizationId: '00000000-0000-0000-0000-000000000001',
        campaignName: 'Transparent Loan Campaign',
        channel: 'SOCIAL_MEDIA_POST',
        rawCopy:
          'Access personal loans up to ₦250,000 at 18% APR with flexible repayment schedules. Subject to credit assessment. QuickKash Microfinance Bank is licensed by the Central Bank of Nigeria (CBN) and registered with the FCCPC.',
      });

      console.log('Transparent Loan Campaign findings:', result.findings.map(f => ({ rule: f.ruleCode, severity: f.severity, why: f.whyItMatters })));

      expect(result.verdict).not.toBe('BLOCKING_ISSUE');
      expect(result.overallRiskScore).toBeLessThan(85);
      expect(result.humanReviewState.status).toBe('PENDING_REVIEW');
      expect(result.compliantRewrite).toBeDefined();
    },
    90000
  );
});
