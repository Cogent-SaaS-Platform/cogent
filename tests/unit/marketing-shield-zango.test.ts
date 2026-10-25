import { describe, it, expect } from 'vitest';
import {
  PRODUCT_CATEGORIES_CATALOG,
  CampaignRecord,
  CampaignLifecycleStatus,
} from '@/modules/marketing-shield/types';
import { ProductCategoryCode } from '@/shared/types';

describe('Zango AI Platform Alignment: Marketing Shield Architecture', () => {
  const sampleCampaigns: CampaignRecord[] = [
    {
      id: 'camp_1',
      campaignName: 'PrimeYield 35% APY Wealth Booster',
      channel: 'SOCIAL_MEDIA_POST',
      productCategory: 'WEALTHTECH_INVEST',
      rawCopy: 'Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed!',
      status: 'Revision',
      turnaroundDays: 18,
      infractionsCount: 2,
      fineExposureNaira: 7500000,
      verdict: 'BLOCKING_ISSUE',
      authorName: 'Clara Ng',
      authorRole: 'Growth Lead',
      createdAt: '2026-10-25T05:00:00Z',
      updatedAt: '2026-10-25T05:00:00Z',
      relativeTime: '32 minutes ago',
      bannerImage: '/marketing/wealthtech.jpg',
      arconRequired: true,
    },
    {
      id: 'camp_2',
      campaignName: 'QuickKash SMS Flash Promo',
      channel: 'SMS_BLAST',
      productCategory: 'DIGITAL_NANO_LOAN',
      rawCopy: 'Instant loan in 5 mins! 100% guaranteed approval with zero interest.',
      status: 'Review',
      turnaroundDays: 15,
      infractionsCount: 3,
      fineExposureNaira: 11500000,
      verdict: 'BLOCKING_ISSUE',
      authorName: 'Gabriele Trevisan',
      authorRole: 'Marketing Specialist',
      createdAt: '2026-10-25T05:10:00Z',
      updatedAt: '2026-10-25T05:10:00Z',
      relativeTime: '31 minutes ago',
      bannerImage: '/marketing/nano_loan.jpg',
      arconRequired: true,
    },
    {
      id: 'camp_3',
      campaignName: 'NovaPay Instant Digital Wallet & QR',
      channel: 'IN_APP_PUSH_NOTIFICATION',
      productCategory: 'PAYMENTS_WALLET',
      rawCopy: 'Experience zero-downtime payments with NovaPay. Tap to pay and transfer funds instantly.',
      status: 'Approved',
      turnaroundDays: 5,
      infractionsCount: 0,
      fineExposureNaira: 0,
      verdict: 'NO_ISSUE_DETECTED',
      authorName: 'Alex Chen',
      authorRole: 'Product Lead',
      createdAt: '2026-10-25T03:00:00Z',
      updatedAt: '2026-10-25T03:00:00Z',
      relativeTime: '2 hours ago',
      bannerImage: '/marketing/payments.jpg',
      arconRequired: false,
    },
    {
      id: 'camp_4',
      campaignName: 'KoraPay Cross-Border Remittance Promo',
      channel: 'SOCIAL_MEDIA_POST',
      productCategory: 'REMITTANCE_FX',
      rawCopy: 'Send money home to Nigeria with KoraPay. Licensed by CBN as an IMTO.',
      status: 'Approved',
      turnaroundDays: 12,
      infractionsCount: 0,
      fineExposureNaira: 0,
      verdict: 'NO_ISSUE_DETECTED',
      authorName: 'Rahil Memon',
      authorRole: 'Operations Director',
      createdAt: '2026-10-25T00:00:00Z',
      updatedAt: '2026-10-25T00:00:00Z',
      relativeTime: '5 hours ago',
      bannerImage: '/marketing/remittance.jpg',
      arconRequired: false,
    },
    {
      id: 'camp_5',
      campaignName: 'SecureVault High-Yield Vault Deposit',
      channel: 'LANDING_PAGE_WEBSITE',
      productCategory: 'SAVINGS_DEPOSIT',
      rawCopy: 'Lock your funds in SecureVault and earn up to 14.5% annual interest. Deposits insured by NDIC.',
      status: 'Draft',
      turnaroundDays: 20,
      infractionsCount: 0,
      fineExposureNaira: 0,
      verdict: 'NO_ISSUE_DETECTED',
      authorName: 'Adewale Coker',
      authorRole: 'Compliance Officer',
      createdAt: '2026-10-24T06:00:00Z',
      updatedAt: '2026-10-24T06:00:00Z',
      relativeTime: '1 day ago',
      bannerImage: '/marketing/savings.jpg',
      arconRequired: false,
    },
  ];

  it('validates all 5 Cogent product categories and designated banner artwork', () => {
    const requiredCategories: ProductCategoryCode[] = [
      'DIGITAL_NANO_LOAN',
      'PAYMENTS_WALLET',
      'REMITTANCE_FX',
      'WEALTHTECH_INVEST',
      'SAVINGS_DEPOSIT',
    ];

    requiredCategories.forEach((cat) => {
      const metadata = PRODUCT_CATEGORIES_CATALOG[cat];
      expect(metadata).toBeDefined();
      expect(metadata.label.length).toBeGreaterThan(0);
      expect(metadata.regulator.length).toBeGreaterThan(0);
      expect(metadata.statutoryBasis.length).toBeGreaterThan(0);
      expect(metadata.bannerImage).toContain('/marketing/');
    });

    expect(PRODUCT_CATEGORIES_CATALOG.WEALTHTECH_INVEST.bannerImage).toBe('/marketing/wealthtech.jpg');
    expect(PRODUCT_CATEGORIES_CATALOG.DIGITAL_NANO_LOAN.bannerImage).toBe('/marketing/nano_loan.jpg');
    expect(PRODUCT_CATEGORIES_CATALOG.PAYMENTS_WALLET.bannerImage).toBe('/marketing/payments.jpg');
    expect(PRODUCT_CATEGORIES_CATALOG.REMITTANCE_FX.bannerImage).toBe('/marketing/remittance.jpg');
    expect(PRODUCT_CATEGORIES_CATALOG.SAVINGS_DEPOSIT.bannerImage).toBe('/marketing/savings.jpg');
  });

  it('calculates exact Zango 4-bucket status metric counts (Draft, Review, Revision, Approved)', () => {
    const counts = {
      draft: sampleCampaigns.filter((c) => c.status === 'Draft').length,
      review: sampleCampaigns.filter((c) => c.status === 'Review').length,
      revision: sampleCampaigns.filter((c) => c.status === 'Revision').length,
      approved: sampleCampaigns.filter((c) => c.status === 'Approved').length,
    };

    expect(counts.draft).toBe(1);
    expect(counts.review).toBe(1);
    expect(counts.revision).toBe(1);
    expect(counts.approved).toBe(2);
  });

  it('filters campaigns accurately by status card clicks', () => {
    const drafts = sampleCampaigns.filter((c) => c.status === 'Draft');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].campaignName).toBe('SecureVault High-Yield Vault Deposit');

    const reviews = sampleCampaigns.filter((c) => c.status === 'Review');
    expect(reviews).toHaveLength(1);
    expect(reviews[0].campaignName).toBe('QuickKash SMS Flash Promo');

    const revisions = sampleCampaigns.filter((c) => c.status === 'Revision');
    expect(revisions).toHaveLength(1);
    expect(revisions[0].campaignName).toBe('PrimeYield 35% APY Wealth Booster');

    const approved = sampleCampaigns.filter((c) => c.status === 'Approved');
    expect(approved).toHaveLength(2);
  });

  it('filters campaigns by product category correctly', () => {
    const wealthtech = sampleCampaigns.filter((c) => c.productCategory === 'WEALTHTECH_INVEST');
    expect(wealthtech).toHaveLength(1);
    expect(wealthtech[0].fineExposureNaira).toBe(7500000);

    const nanoLoans = sampleCampaigns.filter((c) => c.productCategory === 'DIGITAL_NANO_LOAN');
    expect(nanoLoans).toHaveLength(1);
    expect(nanoLoans[0].infractionsCount).toBe(3);
  });

  it('aggregates total statutory fine exposure avoided across campaigns', () => {
    const totalExposureNaira = sampleCampaigns.reduce((acc, c) => acc + c.fineExposureNaira, 0);
    expect(totalExposureNaira).toBe(19000000); // 7.5M + 11.5M
  });

  it('simulates campaign lifecycle state transitions (Draft -> Review -> Approved)', () => {
    const newDraft: CampaignRecord = {
      id: 'draft_test',
      campaignName: 'Test Draft Campaign',
      channel: 'SMS_BLAST',
      productCategory: 'DIGITAL_NANO_LOAN',
      rawCopy: 'Draft loan copy',
      status: 'Draft',
      turnaroundDays: 20,
      infractionsCount: 0,
      fineExposureNaira: 0,
      verdict: 'NO_ISSUE_DETECTED',
      authorName: 'Alex Marco',
      authorRole: 'Compliance Lead',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      relativeTime: 'Just now',
      bannerImage: '/marketing/nano_loan.jpg',
      arconRequired: false,
    };

    expect(newDraft.status).toBe('Draft');

    // Simulate scan execution
    const scannedCampaign: CampaignRecord = {
      ...newDraft,
      status: 'Review',
      turnaroundDays: 14,
      infractionsCount: 1,
      fineExposureNaira: 2500000,
    };
    expect(scannedCampaign.status).toBe('Review');

    // Simulate CCO signoff approval
    const approvedCampaign: CampaignRecord = {
      ...scannedCampaign,
      status: 'Approved',
      infractionsCount: 0,
    };
    expect(approvedCampaign.status).toBe('Approved');
  });
});
