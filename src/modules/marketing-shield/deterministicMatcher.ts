/**
 * Deterministic Rule Evaluator for Marketing Shield (Pillar 1)
 * Adheres to docs/PILLAR_1_MARKETING_SHIELD.md Section 3 & docs/MVP.md AC-02
 * Target Execution Latency: < 50ms
 */

import { SeverityLevel, RegulatorCode } from '@/shared/types';

export interface ProhibitedTermDefinition {
  id: string;
  obligationId: string;
  clauseId: string;
  regulatorCode: RegulatorCode;
  exactPattern: string;
  isRegex: boolean;
  severity: SeverityLevel;
  statutoryRationale: string;
  mandatoryDisclosureRequired: string | null;
  statutoryCitation?: string;
  statutoryPenaltyNaira?: number;
}

export interface DeterministicMatchFinding {
  termId: string;
  obligationId: string;
  clauseId: string;
  regulatorCode: RegulatorCode;
  matchedPattern: string;
  flaggedExcerpt: string;
  startIndex: number;
  endIndex: number;
  severity: SeverityLevel;
  statutoryRationale: string;
  mandatoryDisclosureRequired: string | null;
  statutoryCitation?: string;
  statutoryPenaltyNaira?: number;
}

export interface DeterministicEvaluationResult {
  hasViolations: boolean;
  totalFindings: number;
  findings: DeterministicMatchFinding[];
  detectedSeverities: SeverityLevel[];
  highestSeverity: SeverityLevel | 'NONE';
  suggestedVerdict: 'NO_ISSUE_DETECTED' | 'REVIEW_RECOMMENDED' | 'ISSUE_DETECTED' | 'BLOCKING_ISSUE';
  totalDeterministicPenaltyNaira: number;
  executionLatencyMs: number;
}

export class DeterministicRuleEvaluator {
  private terms: ProhibitedTermDefinition[];

  constructor(terms: ProhibitedTermDefinition[]) {
    this.terms = terms;
  }

  /**
   * Evaluates marketing copy against the prohibited terms catalog in < 50ms.
   */
  public evaluate(rawCopy: string): DeterministicEvaluationResult {
    const startTime = performance.now();
    const findings: DeterministicMatchFinding[] = [];
    const lowerCopy = rawCopy.toLowerCase();

    for (const term of this.terms) {
      if (term.isRegex) {
        try {
          const regex = new RegExp(term.exactPattern, 'gi');
          let match: RegExpExecArray | null;
          while ((match = regex.exec(rawCopy)) !== null) {
            findings.push({
              termId: term.id,
              obligationId: term.obligationId,
              clauseId: term.clauseId,
              regulatorCode: term.regulatorCode,
              matchedPattern: term.exactPattern,
              flaggedExcerpt: match[0],
              startIndex: match.index,
              endIndex: match.index + match[0].length,
              severity: term.severity,
              statutoryRationale: term.statutoryRationale,
              mandatoryDisclosureRequired: term.mandatoryDisclosureRequired,
              statutoryCitation: term.statutoryCitation,
              statutoryPenaltyNaira: term.statutoryPenaltyNaira ?? 0,
            });
          }
        } catch {
          // Skip invalid regex gracefully
        }
      } else {
        const patternLower = term.exactPattern.toLowerCase();
        let startIndex = 0;

        while ((startIndex = lowerCopy.indexOf(patternLower, startIndex)) !== -1) {
          const endIndex = startIndex + patternLower.length;
          const flaggedExcerpt = rawCopy.slice(startIndex, endIndex);

          findings.push({
            termId: term.id,
            obligationId: term.obligationId,
            clauseId: term.clauseId,
            regulatorCode: term.regulatorCode,
            matchedPattern: term.exactPattern,
            flaggedExcerpt,
            startIndex,
            endIndex,
            severity: term.severity,
            statutoryRationale: term.statutoryRationale,
            mandatoryDisclosureRequired: term.mandatoryDisclosureRequired,
            statutoryCitation: term.statutoryCitation,
            statutoryPenaltyNaira: term.statutoryPenaltyNaira ?? 0,
          });

          startIndex = endIndex;
        }
      }
    }

    const latencyMs = performance.now() - startTime;
    const severities = Array.from(new Set(findings.map((f) => f.severity)));

    let highestSeverity: SeverityLevel | 'NONE' = 'NONE';
    if (severities.includes('CRITICAL')) highestSeverity = 'CRITICAL';
    else if (severities.includes('HIGH')) highestSeverity = 'HIGH';
    else if (severities.includes('MEDIUM')) highestSeverity = 'MEDIUM';
    else if (severities.includes('LOW')) highestSeverity = 'LOW';

    let suggestedVerdict: DeterministicEvaluationResult['suggestedVerdict'] = 'NO_ISSUE_DETECTED';
    if (highestSeverity === 'CRITICAL') suggestedVerdict = 'BLOCKING_ISSUE';
    else if (highestSeverity === 'HIGH') suggestedVerdict = 'ISSUE_DETECTED';
    else if (highestSeverity === 'MEDIUM' || highestSeverity === 'LOW') suggestedVerdict = 'REVIEW_RECOMMENDED';

    const totalPenalty = findings.reduce(
      (sum, f) => sum + (f.statutoryPenaltyNaira ?? 0),
      0
    );

    return {
      hasViolations: findings.length > 0,
      totalFindings: findings.length,
      findings,
      detectedSeverities: severities,
      highestSeverity,
      suggestedVerdict,
      totalDeterministicPenaltyNaira: totalPenalty,
      executionLatencyMs: Math.round(latencyMs * 100) / 100,
    };
  }
}
