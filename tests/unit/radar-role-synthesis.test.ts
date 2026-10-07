import { describe, it, expect } from 'vitest';
import { RoleSynthesisService } from '@/modules/radar/services/roleSynthesisService';
import { RadarNotificationService } from '@/modules/radar/services/radarNotificationService';
import { RadarRoleImpactOutputSchema } from '@/modules/radar/types/schema';
import { createAdminClient } from '@/shared/db';

describe('Epic 12: Multi-Role Impact Synthesis & Notification Engine (Tasks 12.1 & 12.3)', () => {
  const dbClient = createAdminClient();
  const synthesisService = new RoleSynthesisService({ dbClient });
  const notificationService = new RadarNotificationService({ dbClient });

  const mockInput = {
    circular: {
      id: 'circ-cbn-contactless-01',
      circularNumber: 'PSM/DIR/CON/CWS/08/014',
      regulatorCode: 'CBN' as const,
      subject: 'Operational Guidelines for Contactless Payments in Nigeria',
      summary: 'CBN directive establishing mandatory limits and 2FA rules for contactless card payments.',
      statutoryDeadline: '2026-03-31',
      sections: [
        {
          sectionNumber: '1.0',
          heading: 'Introduction',
          content: 'Guidelines issued under powers conferred by BOFIA 2020.',
        },
        {
          sectionNumber: '2.0',
          heading: 'Transaction Thresholds',
          content: 'Transactions above ₦15,000 shall require PIN or biometric verification.',
        },
      ],
      schedules: [
        {
          scheduleTitle: 'Interchange Cap Schedule',
          headers: ['Tier', 'Cap'],
          rows: [['Domestic Contactless', '0.5%']],
        },
      ],
    },
    tenant: {
      organizationId: 'org-fintech-test',
      organizationName: 'PayApex Technologies Ltd',
      matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP' as const, 'SWITCHING_AND_PROCESSING' as const],
      matchedRails: ['CARD_ACQUIRING_MASTERCARD_VISA' as const, 'NIBSS_NIP' as const],
      applicabilityReason: 'Directly impacts your operating licenses and card acquiring rails.',
    },
    userId: 'user-cco-1',
  };

  it('synthesizes 4 distinct, role-tailored briefs and actionable checklist matching Zod schema', async () => {
    const fallbackOutput = synthesisService.generateDeterministicFallback(mockInput);

    // Validate that output adheres strictly to RadarRoleImpactOutputSchema
    const validated = RadarRoleImpactOutputSchema.parse(fallbackOutput);
    expect(validated).toBeDefined();

    // 1. CCO Brief: Statutory mandates & sanctions
    expect(validated.executiveBriefCco).toContain('CBN');
    expect(validated.executiveBriefCco).toContain('PSM/DIR/CON/CWS/08/014');
    expect(validated.executiveBriefCco).toContain('PAYMENT_SOLUTION_SERVICES_PSSP');
    expect(validated.executiveBriefCco).toContain('sanctions');

    // 2. COO Brief: Operations, rails, and settlement
    expect(validated.actionBriefCoo).toContain('CARD_ACQUIRING_MASTERCARD_VISA');
    expect(validated.actionBriefCoo).toContain('settlement');
    expect(validated.actionBriefCoo).toContain('cut-offs');

    // 3. Product & Eng Brief: API specs, KYC, authentication
    expect(validated.technicalBriefProductEng).toContain('API');
    expect(validated.technicalBriefProductEng).toContain('authentication');

    // 4. CFO Brief: Capital reserves, fees, balance sheet
    expect(validated.financialBriefCfo).toContain('balance sheet');
    expect(validated.financialBriefCfo.toLowerCase()).toContain('reserve');

    // 5. Action Checklist
    expect(validated.actionChecklist.length).toBeGreaterThanOrEqual(3);
    const departments = validated.actionChecklist.map((a) => a.targetDepartment);
    expect(departments).toContain('COMPLIANCE_LEGAL');
    expect(departments).toContain('OPERATIONS');
    expect(departments).toContain('ENGINEERING_TECH');
    expect(departments).toContain('TREASURY_FINANCE');

    for (const item of validated.actionChecklist) {
      expect(item.actionTitle).toBeTruthy();
      expect(item.actionDescription).toBeTruthy();
      expect(item.suggestedDeadline).toBe('2026-03-31');
    }
  });

  it(
    'executes synthesizeRoleImpacts and generates execution telemetry',
    async () => {
      const result = await synthesisService.synthesizeRoleImpacts(mockInput);

      expect(result.analysisRunId).toBeDefined();
      expect(result.output).toBeDefined();
      expect(result.output.executiveBriefCco).toBeTruthy();
      expect(result.output.actionChecklist.length).toBeGreaterThanOrEqual(3);
      expect(result.telemetry.promptHash).toHaveLength(64);
      expect(result.telemetry.outputHash).toHaveLength(64);
      expect(result.telemetry.latencyMs).toBeGreaterThanOrEqual(0);
    },
    90000
  );

  it('dispatches urgent notification for critical regulatory directives (Task 12.3)', async () => {
    const alertResult = await notificationService.dispatchUrgentAlert({
      organizationId: mockInput.tenant.organizationId,
      circularId: mockInput.circular.id,
      circularNumber: mockInput.circular.circularNumber,
      regulatorCode: mockInput.circular.regulatorCode,
      subject: mockInput.circular.subject,
      priority: 'CRITICAL_EMERGENCY',
      statutoryDeadline: mockInput.circular.statutoryDeadline,
      actionItemsCount: 4,
    });

    expect(alertResult.notificationId).toBeDefined();
    expect(alertResult.status).toBe('DELIVERED_IN_APP');
  });
});
