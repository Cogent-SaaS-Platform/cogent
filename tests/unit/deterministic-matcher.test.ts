import { describe, it, expect } from 'vitest';
import {
  DeterministicRuleEvaluator,
  ProhibitedTermDefinition,
} from '@/modules/marketing-shield/deterministicMatcher';
import { REGULATORY_INSTRUMENTS_SEED } from '@/shared/db/regulatoryCorpusData';

// Flatten the seeded prohibited terms into catalog definitions
function getSeededTerms(): ProhibitedTermDefinition[] {
  const terms: ProhibitedTermDefinition[] = [];
  for (const inst of REGULATORY_INSTRUMENTS_SEED) {
    for (const ver of inst.versions) {
      for (const clause of ver.clauses) {
        for (const obl of clause.obligations) {
          const penalty = obl.penalties[0];
          for (const term of obl.prohibited_terms) {
            terms.push({
              id: `term_${terms.length + 1}`,
              obligationId: `obl_${terms.length + 1}`,
              clauseId: `clause_${clause.section_reference}`,
              regulatorCode: inst.body_code,
              exactPattern: term.exact_pattern,
              isRegex: term.is_regex,
              severity: term.severity,
              statutoryRationale: term.statutory_rationale,
              mandatoryDisclosureRequired: term.mandatory_disclosure_required,
              statutoryCitation: penalty?.penalty_legal_citation,
              statutoryPenaltyNaira: penalty?.penalty_min_naira,
            });
          }
        }
      }
    }
  }
  return terms;
}

describe('Pillar 1 Deterministic Rule Evaluator (docs/MVP.md)', () => {
  const terms = getSeededTerms();
  const evaluator = new DeterministicRuleEvaluator(terms);

  it('evaluates Canonical Test Scenario A (Digital Lending SMS) in < 50ms with BLOCKING_ISSUE', () => {
    const scenarioACopy =
      'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval, no collateral, no credit checks. Download QuickKash app now!';

    // JIT warm-up
    evaluator.evaluate('Warm up copy evaluation');
    const result = evaluator.evaluate(scenarioACopy);

    expect(result.executionLatencyMs).toBeLessThan(50);
    expect(result.hasViolations).toBe(true);
    expect(result.suggestedVerdict).toBe('BLOCKING_ISSUE');
    expect(result.highestSeverity).toBe('CRITICAL');

    const matchedPatterns = result.findings.map((f) => f.matchedPattern.toLowerCase());
    expect(matchedPatterns).toContain('zero interest');
    expect(matchedPatterns).toContain('100% guaranteed approval');
    expect(matchedPatterns).toContain('no credit checks');

    // Verify statutory citations are linked
    const cbnFinding = result.findings.find((f) => f.matchedPattern === 'zero interest');
    expect(cbnFinding?.regulatorCode).toBe('CBN');
    expect(cbnFinding?.statutoryCitation).toContain('BOFIA 2020');

    const arconFinding = result.findings.find((f) => f.matchedPattern === '100% guaranteed approval');
    expect(arconFinding?.regulatorCode).toBe('ARCON');
    expect(arconFinding?.statutoryCitation).toContain('ARCON Act 2022');
  });

  it('evaluates Canonical Test Scenario B (High-Yield Investment Ad) with BLOCKING_ISSUE', () => {
    const scenarioBCopy =
      'Tired of inflation? Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed! Your capital is 100% safe and backed by the government.';

    const result = evaluator.evaluate(scenarioBCopy);

    expect(result.executionLatencyMs).toBeLessThan(50);
    expect(result.hasViolations).toBe(true);
    expect(result.suggestedVerdict).toBe('BLOCKING_ISSUE');

    const matchedPatterns = result.findings.map((f) => f.matchedPattern.toLowerCase());
    expect(matchedPatterns).toContain('risk-free annual return guaranteed');
    expect(matchedPatterns).toContain('100% safe');
    expect(matchedPatterns).toContain('backed by the government');

    const secFinding = result.findings.find((f) => f.matchedPattern === 'risk-free annual return guaranteed');
    expect(secFinding?.regulatorCode).toBe('SEC');

    const govFinding = result.findings.find((f) => f.matchedPattern === 'backed by the government');
    expect(govFinding?.regulatorCode).toBe('CBN');
  });

  it('returns NO_ISSUE_DETECTED for compliant copy without false positives', () => {
    const compliantCopy =
      'Access personal loans up to ₦250,000 with transparent rates and flexible repayment schedules. Subject to credit assessment. QuickKash is registered with the FCCPC.';

    const result = evaluator.evaluate(compliantCopy);

    expect(result.hasViolations).toBe(false);
    expect(result.totalFindings).toBe(0);
    expect(result.suggestedVerdict).toBe('NO_ISSUE_DETECTED');
    expect(result.totalDeterministicPenaltyNaira).toBe(0);
  });

  it('correctly handles regex patterns and multiple occurrences', () => {
    const customTerms: ProhibitedTermDefinition[] = [
      {
        id: 'term_regex_1',
        obligationId: 'obl_1',
        clauseId: 'clause_1',
        regulatorCode: 'CBN',
        exactPattern: '\\b\\d+[%]\\s+guaranteed\\b',
        isRegex: true,
        severity: 'CRITICAL',
        statutoryRationale: 'Guaranteed rate percentage claims violate CBN rules.',
        mandatoryDisclosureRequired: 'Terms apply.',
        statutoryPenaltyNaira: 2000000,
      },
      {
        id: 'term_exact_dup',
        obligationId: 'obl_2',
        clauseId: 'clause_2',
        regulatorCode: 'ARCON',
        exactPattern: 'instant cash',
        isRegex: false,
        severity: 'HIGH',
        statutoryRationale: 'Deceptive speed claim.',
        mandatoryDisclosureRequired: null,
        statutoryPenaltyNaira: 1000000,
      },
    ];

    const customEvaluator = new DeterministicRuleEvaluator(customTerms);
    const testCopy = 'Get 50% guaranteed returns and instant cash today, plus another instant cash tomorrow!';
    const result = customEvaluator.evaluate(testCopy);

    expect(result.hasViolations).toBe(true);
    expect(result.totalFindings).toBe(3); // 1 regex match + 2 exact substring matches
    expect(result.highestSeverity).toBe('CRITICAL');
    expect(result.suggestedVerdict).toBe('BLOCKING_ISSUE');
    expect(result.totalDeterministicPenaltyNaira).toBe(4000000); // 2,000,000 + 1,000,000 * 2
  });

  it('gracefully skips invalid regex patterns without throwing', () => {
    const brokenRegexTerms: ProhibitedTermDefinition[] = [
      {
        id: 'term_broken',
        obligationId: 'obl_broken',
        clauseId: 'clause_broken',
        regulatorCode: 'SEC',
        exactPattern: '(?+broken', // Invalid regex syntax
        isRegex: true,
        severity: 'MEDIUM',
        statutoryRationale: 'Test broken regex handling',
        mandatoryDisclosureRequired: null,
      },
    ];

    const safeEvaluator = new DeterministicRuleEvaluator(brokenRegexTerms);
    const result = safeEvaluator.evaluate('Some normal text');

    expect(result.hasViolations).toBe(false);
    expect(result.suggestedVerdict).toBe('NO_ISSUE_DETECTED');
  });

  it('evaluates MEDIUM and LOW severity tiers accurately', () => {
    const tieredTerms: ProhibitedTermDefinition[] = [
      {
        id: 'term_medium',
        obligationId: 'obl_med',
        clauseId: 'clause_med',
        regulatorCode: 'ARCON',
        exactPattern: 'best rates',
        isRegex: false,
        severity: 'MEDIUM',
        statutoryRationale: 'Comparative superlatives require substantiation.',
        mandatoryDisclosureRequired: 'Certified by independent audit.',
        statutoryPenaltyNaira: 500000,
      },
    ];

    const medEvaluator = new DeterministicRuleEvaluator(tieredTerms);
    const medResult = medEvaluator.evaluate('We offer the best rates in Nigeria.');
    expect(medResult.highestSeverity).toBe('MEDIUM');
    expect(medResult.suggestedVerdict).toBe('REVIEW_RECOMMENDED');
    expect(medResult.totalDeterministicPenaltyNaira).toBe(500000);

    const lowTerms: ProhibitedTermDefinition[] = [
      {
        id: 'term_low',
        obligationId: 'obl_low',
        clauseId: 'clause_low',
        regulatorCode: 'FCCPC',
        exactPattern: 'fast transfer',
        isRegex: false,
        severity: 'LOW',
        statutoryRationale: 'Minor promotional claim.',
        mandatoryDisclosureRequired: null,
      },
    ];

    const lowEvaluator = new DeterministicRuleEvaluator(lowTerms);
    const lowResult = lowEvaluator.evaluate('Enjoy fast transfer services.');
    expect(lowResult.highestSeverity).toBe('LOW');
    expect(lowResult.suggestedVerdict).toBe('REVIEW_RECOMMENDED');
  });

  it('handles empty and whitespace-only copy gracefully', () => {
    const emptyResult = evaluator.evaluate('');
    expect(emptyResult.hasViolations).toBe(false);
    expect(emptyResult.totalFindings).toBe(0);
    expect(emptyResult.suggestedVerdict).toBe('NO_ISSUE_DETECTED');

    const wsResult = evaluator.evaluate('     \n\t   ');
    expect(wsResult.hasViolations).toBe(false);
  });
});
