import {
  MarketingChannel,
  ProductCategoryCode,
  ScanVerdict,
  HumanApprovalStatus,
} from '@/shared/types';
import { MarketingShieldViewModel } from '@/shared/types/presentation';

export type CampaignLifecycleStatus = 'Draft' | 'Review' | 'Revision' | 'Approved';

export interface CampaignRecord {
  id: string;
  campaignName: string;
  channel: MarketingChannel;
  productCategory: ProductCategoryCode;
  targetAudience?: string;
  rawCopy: string;
  status: CampaignLifecycleStatus;
  turnaroundDays: number;
  infractionsCount: number;
  fineExposureNaira: number;
  verdict: ScanVerdict;
  authorName: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
  relativeTime: string;
  bannerImage: string;
  arconRequired: boolean;
  viewModel?: MarketingShieldViewModel;
}

export interface ProductCategoryMetadata {
  code: ProductCategoryCode;
  label: string;
  regulator: string;
  statutoryBasis: string;
  bannerImage: string;
  sampleCampaignTitle: string;
  sampleCopy: string;
}

export const PRODUCT_CATEGORIES_CATALOG: Record<ProductCategoryCode, ProductCategoryMetadata> = {
  DIGITAL_NANO_LOAN: {
    code: 'DIGITAL_NANO_LOAN',
    label: 'Digital Nano-Loan',
    regulator: 'FCCPC / CBN',
    statutoryBasis: 'FCCPC Digital Lending Guidelines 2022 & CBN CPF 2019',
    bannerImage: '/marketing/nano_loan.jpg',
    sampleCampaignTitle: 'Instant Credit Access 24/7',
    sampleCopy: 'Access urgent credit up to ₦200,000 disbursed directly into your bank account. Subject to underwriting verification. APR ranges from 18% to 28% p.a. Repayment tenure up to 90 days. Licensed by FCCPC/CBN.',
  },
  PAYMENTS_WALLET: {
    code: 'PAYMENTS_WALLET',
    label: 'Payments & Digital Wallet',
    regulator: 'CBN PSMD',
    statutoryBasis: 'CBN Regulatory Framework for Mobile Money & Payment Service Banks',
    bannerImage: '/marketing/payments.jpg',
    sampleCampaignTitle: 'NovaPay Instant Contactless Payments',
    sampleCopy: 'Experience zero-downtime payments with NovaPay. Pay bills, scan QR, and transfer funds instantly. Operating under CBN Mobile Money & Payment Service Bank licensing. Terms & conditions apply.',
  },
  REMITTANCE_FX: {
    code: 'REMITTANCE_FX',
    label: 'Remittance & FX',
    regulator: 'CBN IMTO',
    statutoryBasis: 'CBN Guidelines for International Money Transfer Operators (IMTO) 2024',
    bannerImage: '/marketing/remittance.jpg',
    sampleCampaignTitle: 'Direct Inbound Diaspora Transfers',
    sampleCopy: 'Send money home to Nigeria directly to any commercial bank account within 60 seconds. Licensed by the Central Bank of Nigeria (CBN) as an IMTO. Real-time FX rates displayed prior to execution.',
  },
  WEALTHTECH_INVEST: {
    code: 'WEALTHTECH_INVEST',
    label: 'WealthTech & Investment',
    regulator: 'SEC',
    statutoryBasis: 'SEC Rule 322 & Investments and Securities Act (ISA) 2007',
    bannerImage: '/marketing/wealthtech.jpg',
    sampleCampaignTitle: 'PrimeYield Diversified Fixed Income',
    sampleCopy: 'Grow your investment portfolio with diversified treasury bills and corporate bonds. PrimeYield is registered with the SEC as a Fund/Portfolio Manager. Investments involve market risk. Capital is not guaranteed.',
  },
  SAVINGS_DEPOSIT: {
    code: 'SAVINGS_DEPOSIT',
    label: 'Savings & Vault Deposit',
    regulator: 'CBN / NDIC',
    statutoryBasis: 'NDIC Act 2023 & BOFIA 2020 Deposit Insurance Protections',
    bannerImage: '/marketing/savings.jpg',
    sampleCampaignTitle: 'SecureVault Target Savings',
    sampleCopy: 'Automate your daily, weekly, or monthly savings with SecureVault. Earn up to 14.5% interest per annum. Deposits insured by the Nigeria Deposit Insurance Corporation (NDIC) up to statutory limits.',
  },
};
