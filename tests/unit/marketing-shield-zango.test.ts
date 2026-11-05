import { describe, it, expect } from 'vitest';
import {
  PRODUCT_CATEGORIES_CATALOG,
  CampaignLifecycleStatus,
  MarketingCampaign,
} from '@/modules/marketing-shield/types';
import { ProductCategoryCode } from '@/shared/types';

describe('Zango AI Platform Alignment: Marketing Shield Architecture', () => {
  const sampleCampaigns: MarketingCampaign[] = [
    {
      id: 'camp_1',
      organizationId: '00000000-0000-0000-0000-000000000001',
      title: 'Sterling Commercial Paper Social Campaign',
      channel: 'SOCIAL_MEDIA_POST',
      productCategory: 'WEALTHTECH_INVEST',
      canvasContent: 'Invest in SEC-registered commercial paper and grow your treasury reserve.',
      status: 'Revision',
      createdBy: 'Ibrahim Danladi',
      assignedReviewer: 'Chief Compliance Officer',
      totalFindings: 2,
      createdAt: '2026-10-25T05:00:00Z',
      updatedAt: '2026-10-25T05:00:00Z',
    },
    {
      id: 'camp_2',
      organizationId: '00000000-0000-0000-0000-000000000001',
      title: 'Seasonal Micro-Credit SMS Blast',
      channel: 'SMS_BLAST',
      productCategory: 'DIGITAL_NANO_LOAN',
      canvasContent: 'Need urgent credit? Access working capital up to ₦100,000 at 2.5% monthly.',
      status: 'Review',
      createdBy: 'Ngozi Okonkwo',
      assignedReviewer: 'Chief Compliance Officer',
      totalFindings: 3,
      createdAt: '2026-10-25T05:10:00Z',
      updatedAt: '2026-10-25T05:10:00Z',
    },
    {
      id: 'camp_3',
      organizationId: '00000000-0000-0000-0000-000000000001',
      title: 'Contactless Merchant QR Launch',
      channel: 'IN_APP_PUSH_NOTIFICATION',
      productCategory: 'PAYMENTS_WALLET',
      canvasContent: 'Pay merchants instantly with secure QR codes. Licensed by CBN.',
      status: 'Approved',
      createdBy: 'Tunde Bakare',
      assignedReviewer: 'Chief Compliance Officer',
      totalFindings: 0,
      createdAt: '2026-10-25T05:20:00Z',
      updatedAt: '2026-10-25T05:20:00Z',
    },
  ];

  it('validates all 5 ratified Nigerian product categories in catalog', () => {
    const requiredCategories: ProductCategoryCode[] = [
      'DIGITAL_NANO_LOAN',
      'PAYMENTS_WALLET',
      'REMITTANCE_FX',
      'WEALTHTECH_INVEST',
      'SAVINGS_DEPOSIT',
    ];

    requiredCategories.forEach((cat) => {
      const entry = PRODUCT_CATEGORIES_CATALOG[cat];
      expect(entry).toBeDefined();
      expect(entry.code).toBe(cat);
      expect(entry.regulator).toBeTruthy();
      expect(entry.statutoryBasis).toBeTruthy();
    });
  });

  it('calculates lifecycle pipeline status counts accurately', () => {
    const counts = {
      draft: sampleCampaigns.filter((c) => c.status === 'Draft').length,
      review: sampleCampaigns.filter((c) => c.status === 'Review').length,
      revision: sampleCampaigns.filter((c) => c.status === 'Revision').length,
      approved: sampleCampaigns.filter((c) => c.status === 'Approved').length,
    };

    expect(counts.draft).toBe(0);
    expect(counts.review).toBe(1);
    expect(counts.revision).toBe(1);
    expect(counts.approved).toBe(1);
  });

  it('correctly filters campaigns awaiting review or revision', () => {
    const reviews = sampleCampaigns.filter((c) => c.status === 'Review' || c.status === 'Revision');
    expect(reviews).toHaveLength(2);
    expect(reviews[0].title).toBe('Sterling Commercial Paper Social Campaign');
  });
});
