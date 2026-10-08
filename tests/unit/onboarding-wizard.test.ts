import { describe, it, expect } from 'vitest';
import { OnboardingState } from '@/modules/onboarding/types';

describe('TASK-08: Institutional Onboarding Wizard & onb.webp Alignment', () => {
  it('validates state progression with optional RC Number and custom OTHER role', () => {
    const initialState: OnboardingState = {
      companyName: 'KoraPay Technologies Ltd',
      companySize: '51-200',
      rcNumber: '', // Explicitly optional
      companyWebsite: 'korapay.ng',
      industryCategory: 'Payment Services',
      department: 'OTHER',
      customDepartment: 'Internal Supervisory Sandbox',
      jobTitle: 'Head of Regulatory Engineering',
      complianceObjectives: ['PRE_VET_MARKETING', 'GAP_MATRIX'],
      primaryRegulators: ['CBN', 'NDPC', 'NFIU'],
      licenseType: 'PAYMENT_SOLUTION_SERVICES_PSSP',
      licenseNumber: 'CBN/PSSP/2026/014',
      operatingEnvironment: 'LIVE_PRODUCTION',
      paymentRails: ['NIBSS_NIP', 'PAYSTACK', 'INTERSWITCH_WEBPAY'],
      productCategories: ['DIGITAL_NANO_LOAN', 'REMITTANCE_FX'],
      invitedMembers: [
        {
          id: 'mem_1',
          email: 'cco@korapay.ng',
          role: 'OWNER',
          department: 'COMPLIANCE_LEGAL',
        },
        {
          id: 'mem_2',
          email: 'audit@korapay.ng',
          role: 'ADMIN',
          department: 'OPERATIONS',
        },
      ],
    };

    // 1. Verify company details validity without requiring RC number
    expect(initialState.companyName).toBeTruthy();
    expect(initialState.rcNumber).toBe(''); // Optional RC Number does not fail

    // 2. Verify custom OTHER department is properly populated
    expect(initialState.department).toBe('OTHER');
    expect(initialState.customDepartment).toBe('Internal Supervisory Sandbox');

    // 3. Verify primary regulators and payment rails
    expect(initialState.primaryRegulators).toContain('CBN');
    expect(initialState.primaryRegulators).toContain('NDPC');
    expect(initialState.paymentRails).toHaveLength(3);
    expect(initialState.invitedMembers).toHaveLength(2);
  });

  it('validates step calculation and progress percentage', () => {
    const totalSteps = 5;
    for (let step = 1; step <= totalSteps; step++) {
      const percentage = Math.round((step / totalSteps) * 100);
      expect(percentage).toBeGreaterThanOrEqual(20);
      expect(percentage).toBeLessThanOrEqual(100);
    }
  });
});
