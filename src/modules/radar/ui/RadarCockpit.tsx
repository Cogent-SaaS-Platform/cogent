'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Download,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  Plus,
  RefreshCw,
  Scale,
  Shield,
  GitBranch,
  GitCommit,
  AlertOctagon,
  Calendar,
  Briefcase,
  Coins,
  Sparkles,
  ExternalLink,
  Search,
  BookOpen,
  ArrowRight,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
} from 'lucide-react';
import {
  PlatformPillar,
  CrossPillarLinkContext,
  LicenseType,
  PaymentRail,
  RadarPriority,
  RegulatorCode,
  LineageStatus,
} from '@/shared/types';
import {
  RadarCircularPresentationCard,
  RadarActionItemPresentation,
  CircularIngestResult,
} from '../types';
import { CircularCard } from './CircularCard';
import { RoleBriefViewer } from './RoleBriefViewer';
import { ActionItemTracker } from './ActionItemTracker';
import { CircularUploadDrawer } from './CircularUploadDrawer';
import { defaultCountdownCalculator } from '../services/deadlineCountdownCalculator';
import { DenseDataTable, TableColumn } from '@/shared/ui/inspector/DenseDataTable';
import { MultiPaneContainer } from '@/shared/ui/inspector/MultiPaneContainer';
import { useInspectorStore } from '@/shared/ui/inspector/inspectorStore';
import {
  circularToInspectorItem,
  obligationToInspectorItem,
} from '@/shared/ui/inspector/adapters';
import { InspectorItemData, StatutoryReferenceData } from '@/shared/ui/inspector/types';

// Preset Canonical Circular Data with Lineage Graphs & Penalty Escalations covering all 7 Regulators
const PRESET_CIRCULARS: RadarCircularPresentationCard[] = [
  {
    id: 'circ_1',
    circularNumber: 'PSM/DIR/CON/CWS/08/014',
    regulator: 'CBN',
    subject: 'Operational Guidelines for Contactless Payments in Nigeria',
    summary:
      'The Central Bank of Nigeria mandates transaction limits, offline contactless caps, and compulsory 2FA biometric/PIN validation for all contactless card acquiring and processing infrastructure.',
    publicationDate: '2026-03-01',
    effectiveDate: '2026-03-01',
    statutoryDeadline: '2026-03-15',
    daysRemaining: 11,
    businessDaysRemaining: 9,
    countdownTier: 'HIGH',
    urgencyWindow: 'URGENT_ACTION',
    priority: 'HIGH',
    enforcementRiskLevel: 'CRITICAL_SANCTION_RISK',
    lineageStatus: 'ACTIVE_LAW',
    amends: ['BPS/DIR/GEN/CIR/05/011'],
    targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'SWITCHING_AND_PROCESSING', 'COMMERCIAL_BANK'],
    affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'CARD_ACQUIRING_VERVE', 'NIBSS_NIP'],
    appliesUniversally: false,
    penaltyEscalationProjection: {
      baselineFineNaira: 10_000_000,
      dailyFineNaira: 2_000_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 10_000_000,
      statutoryCitation: 'BOFIA 2020 Section 57(2) & CBN Sanctions Grid',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: true,
    },
    applicability: {
      isApplicable: true,
      reason:
        'Directly impacts your organization because you hold: [ PAYMENT_SOLUTION_SERVICES_PSSP (CBN/PSD/PSSP/2023/044) ] operating [ CARD ACQUIRING MASTERCARD VISA, NIBSS NIP ] rails.',
      matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      matchedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
    },
    executiveBriefCco:
      'The Central Bank of Nigeria has issued Circular PSM/DIR/CON/CWS/08/014 under Section 2(d) of the CBN Act 2007 and BOFIA 2020. This directive mandates compliance within 14 days. Failure to align processing systems with contactless transaction limits exposes the institution to administrative fines up to ₦10,000,000 and potential suspension from NIBSS interbank clearing.',
    actionBriefCoo:
      'Operational workflows on active Mastercard, Visa, and Verve contactless card acquiring channels must enforce cumulative limits. Ensure settlement reconciliation windows account for offline transaction verification. Coordinate with partner settlement banks (Access Bank, Zenith) to confirm automated cut-offs.',
    technicalBriefProductEng:
      'Engineering and Product teams must review API technical specifications and payload schemas for card acquiring rails. Implement mandatory PIN request prompts for contactless transactions exceeding ₦15,000. Update gateway error response codes for unsupported contactless limits.',
    technicalBriefCto:
      'System Architecture & Security (CTO): Deploy gateway rule engine requiring PIN/biometric challenge on contactless acquiring charges above ₦15,000. Ensure HSM keys and POS terminal configuration profiles are updated with contactless limits by March 10, 2026.',
    financialBriefCfo:
      'Treasury and Finance must evaluate transaction margin compression resulting from the 0.5% interchange cap on contactless payments. Ensure liquidity buffers and daily settlement reserves meet clearing bank collateral mandates.',
    governanceBriefCeoCro:
      'Enterprise Governance (CEO / CRO): High regulatory sanction exposure. Board Risk Committee must be notified of operational modifications. Executive attestation form must be filed with the Director of Payments System Management prior to deadline.',
    actionItems: [
      {
        id: 'act_1',
        targetDepartment: 'ENGINEERING_TECH',
        actionTitle: 'Enforce Contactless ₦15,000 2FA Threshold in Gateway API',
        actionDescription: 'Deploy logic requiring PIN or biometric verification on single transactions > ₦15,000.',
        suggestedDeadline: '2026-03-10',
        isCompleted: true,
      },
      {
        id: 'act_2',
        targetDepartment: 'OPERATIONS',
        actionTitle: 'Partner Bank Clearing & Cut-Off Confirmation',
        actionDescription: 'Verify contactless clearing parameters with NIBSS and settlement sponsor banks.',
        suggestedDeadline: '2026-03-12',
        isCompleted: false,
      },
      {
        id: 'act_3',
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: 'File CBN Supervisory Attestation Form',
        actionDescription: 'Submit formal CCO compliance attestation to the Director of Payments System Policy.',
        suggestedDeadline: '2026-03-15',
        isCompleted: false,
      },
      {
        id: 'act_4',
        targetDepartment: 'TREASURY_FINANCE',
        actionTitle: 'Interchange Fee Structure Reconciliation',
        actionDescription: 'Reconcile interchange fee margins with merchant billing schedules.',
        suggestedDeadline: '2026-03-14',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'circ_2',
    circularNumber: 'BPS/DIR/GEN/CIR/05/011',
    regulator: 'CBN',
    subject: 'Regulatory Framework for Mobile Money Services in Nigeria',
    summary:
      'CBN establishes revised operational standards for Mobile Money Operators (MMO), agent banking networks, and USSD financial session security. Partially amended by PSM/DIR/CON/CWS/08/014.',
    publicationDate: '2026-02-15',
    effectiveDate: '2026-02-15',
    statutoryDeadline: '2026-03-17',
    daysRemaining: 13,
    businessDaysRemaining: 10,
    countdownTier: 'HIGH',
    urgencyWindow: 'URGENT_ACTION',
    priority: 'HIGH',
    enforcementRiskLevel: 'HIGH',
    lineageStatus: 'AMENDED',
    supersededBy: 'PSM/DIR/CON/CWS/08/014',
    targetedLicenses: ['MOBILE_MONEY_OPERATOR_MMO', 'SUPER_AGENT'],
    affectedRails: ['USSD', 'NIBSS_NIP', 'AGENT_BANKING_CASH_IN_OUT'],
    appliesUniversally: false,
    penaltyEscalationProjection: {
      baselineFineNaira: 10_000_000,
      dailyFineNaira: 2_000_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 10_000_000,
      statutoryCitation: 'BOFIA 2020 Section 57(2) & CBN MMO Framework',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: true,
    },
    applicability: {
      isApplicable: false,
      reason:
        'Not applicable to your current operating licenses (Your entity holds PSSP; this circular binds Mobile Money Operators and Super Agents).',
      matchedLicenses: [],
      matchedRails: [],
    },
    executiveBriefCco:
      'This circular is targeted at Mobile Money Operators and does not bind pure Payment Solution Service Providers (PSSP). Note: Clause 4.2 has been superseded by PSM/DIR/CON/CWS/08/014.',
    actionBriefCoo:
      'Monitor partner MMO settlement health to ensure third-party payment requests through agent rails do not encounter external latency.',
    technicalBriefProductEng:
      'No immediate API updates required for PSSP core rails. Standard USSD aggregator gateways operate under existing agreements.',
    technicalBriefCto:
      'Architecture Note (CTO): Maintain USSD aggregator interfaces without changing payload contracts until partner MMO completes migration.',
    financialBriefCfo:
      'No direct balance sheet capital reserve impact on PSSP license holders.',
    governanceBriefCeoCro:
      'Operational risk monitoring for B2B merchant transactions originating from MMO agent networks.',
    actionItems: [
      {
        id: 'act_mmo_1',
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: 'Archive Circular for Annual Regulatory Audit',
        actionDescription: 'Log applicability assessment in CAMA audit ledger to document non-applicability rationale.',
        suggestedDeadline: '2026-03-17',
        isCompleted: true,
      },
    ],
  },
  {
    id: 'circ_3',
    circularNumber: 'FCCPC/DIR/DLR/2023/001',
    regulator: 'FCCPC',
    subject: 'Mandatory Digital Lending Conduct & Consumer Privacy Directives',
    summary:
      'FCCPC issues binding directives prohibiting contact list harvesting, predatory debt recovery, and undisclosed processing fees on digital credit applications.',
    publicationDate: '2026-02-01',
    effectiveDate: '2026-02-01',
    statutoryDeadline: '2026-03-05',
    daysRemaining: 4,
    businessDaysRemaining: 3,
    countdownTier: 'CRITICAL_EMERGENCY',
    urgencyWindow: 'CRITICAL_EMERGENCY',
    priority: 'CRITICAL_EMERGENCY',
    enforcementRiskLevel: 'CRITICAL_SANCTION_RISK',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['DIGITAL_LENDER_FCCPC_REGISTERED'],
    affectedRails: ['DIRECT_DEBIT_ACH', 'PAYSTACK', 'FLUTTERWAVE'],
    appliesUniversally: false,
    penaltyEscalationProjection: {
      baselineFineNaira: 50_000_000,
      dailyFineNaira: 1_000_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 50_000_000,
      statutoryCitation: 'FCCPA 2018 Section 155(1) & Digital Lending Regulations',
      carriesPersonalCriminalLiability: false,
      carriesLicenseSuspensionRisk: true,
    },
    applicability: {
      isApplicable: false,
      reason:
        'Not applicable to your current operating licenses (Binds registered consumer lending apps; your entity is a B2B payment gateway).',
      matchedLicenses: [],
      matchedRails: [],
    },
    executiveBriefCco:
      'Binds retail digital lenders. If your payment gateway provides payment collection for lending merchants, verify that merchants hold verified FCCPC registration.',
    actionBriefCoo:
      'Review digital lending merchant accounts to confirm FCCPC compliance certification.',
    technicalBriefProductEng:
      'Ensure loan repayment direct debit webhook callbacks pass verified transaction identifiers.',
    technicalBriefCto:
      'Ensure SDKs and mobile apps strictly avoid accessing device contacts or location permissions.',
    financialBriefCfo:
      'Ensure merchant reserve deductions are protected from unauthorized consumer refund claims.',
    governanceBriefCeoCro:
      'Third-party merchant compliance governance: Prohibit processing payments for unregistered lending entities.',
    actionItems: [
      {
        id: 'act_fc_1',
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: 'Audit Merchant Onboarding KYC for Digital Lenders',
        actionDescription: 'Require all credit platform merchants to submit valid FCCPC registration approvals.',
        suggestedDeadline: '2026-03-05',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'circ_4',
    circularNumber: 'SEC/DIR/VASP/2026/009',
    regulator: 'SEC',
    subject: 'Rules on Digital Assets Offering, Custody, and Virtual Asset Service Providers (VASP)',
    summary:
      'Securities and Exchange Commission guidelines establishing capital adequacy, client asset segregation, and mandatory travel rule reporting for digital asset exchanges.',
    publicationDate: '2026-02-10',
    effectiveDate: '2026-02-10',
    statutoryDeadline: '2026-04-10',
    daysRemaining: 40,
    businessDaysRemaining: 29,
    countdownTier: 'LOW',
    urgencyWindow: 'STANDARD_WINDOW',
    priority: 'LOW',
    enforcementRiskLevel: 'LOW',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['CRYPTO_VASP_SEC_APPROVED', 'SEC_REGISTERED_DIGITAL_SUB_BROKER'],
    affectedRails: ['NIBSS_NIP'],
    appliesUniversally: false,
    penaltyEscalationProjection: {
      baselineFineNaira: 5_000_000,
      dailyFineNaira: 100_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 5_000_000,
      statutoryCitation: 'Investments and Securities Act 2007 Section 303',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: true,
    },
    applicability: {
      isApplicable: false,
      reason:
        'Not applicable to your operating license profile (Binds SEC-regulated VASPs and Digital Sub-Brokers).',
      matchedLicenses: [],
      matchedRails: [],
    },
    executiveBriefCco:
      'Applicable strictly to SEC-licensed VASPs. Monitored for institutional awareness regarding crypto-to-fiat onramps.',
    actionBriefCoo: 'No operational disruption to standard fiat clearing rails.',
    technicalBriefProductEng: 'No technical updates required for fiat payment gateway.',
    technicalBriefCto: 'Ensure crypto-related merchant transactions adhere to AML travel rule filters.',
    financialBriefCfo: 'No capital reserve allocations required.',
    governanceBriefCeoCro: 'Board monitoring of digital asset regulatory evolution.',
    actionItems: [],
  },
  {
    id: 'circ_5',
    circularNumber: 'NDIC/DIR/DIS/2026/003',
    regulator: 'NDIC',
    subject: 'Pass-Through Deposit Insurance Framework for Fintech Wallets & PSBs',
    summary:
      'Nigeria Deposit Insurance Corporation establishes pass-through deposit insurance coverage of ₦5,000,000 per individual wallet holder held in omnibus trust accounts with settlement banks.',
    publicationDate: '2026-03-02',
    effectiveDate: '2026-03-02',
    statutoryDeadline: '2026-03-24',
    daysRemaining: 20,
    businessDaysRemaining: 15,
    countdownTier: 'MEDIUM',
    urgencyWindow: 'STANDARD_WINDOW',
    priority: 'MEDIUM',
    enforcementRiskLevel: 'HIGH',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['PAYMENT_SERVICE_BANK', 'MOBILE_MONEY_OPERATOR_MMO', 'PAYMENT_SOLUTION_SERVICES_PSSP'],
    affectedRails: ['NIBSS_NIP', 'DIRECT_DEBIT_ACH'],
    appliesUniversally: false,
    penaltyEscalationProjection: {
      baselineFineNaira: 10_000_000,
      dailyFineNaira: 500_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 10_000_000,
      statutoryCitation: 'NDIC Act 2023 Section 39 & Pass-Through Insurance Directives',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: true,
    },
    applicability: {
      isApplicable: true,
      reason:
        'Directly impacts your organization: PSSP wallet pool accounts must maintain verified pass-through trust structures with designated deposit money banks.',
      matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      matchedRails: ['NIBSS_NIP'],
    },
    executiveBriefCco:
      'NDIC mandates submission of daily beneficial ownership records for omnibus pool accounts within 21 days. Failure to establish pass-through insurance structures triggers administrative fines of ₦10,000,000 plus ₦500,000 for each day of default.',
    actionBriefCoo:
      'Operations must configure daily automated balance reconciliation feeds between customer digital wallets and custodian settlement banks (First Bank, GTBank).',
    technicalBriefProductEng:
      'Implement API export endpoint for NDIC beneficial ownership reporting schema (BVN/NIN mapping per pool sub-account).',
    technicalBriefCto:
      'System Architecture (CTO): Deploy immutable cryptographic snapshot service recording sub-account balances at 23:59:59 daily for statutory NDIC deposit verification.',
    financialBriefCfo:
      'Treasury (CFO): Reconcile custodial deposit allocations to guarantee 100% ring-fencing of merchant escrow funds against banking insolvency.',
    governanceBriefCeoCro:
      'CRO / CEO Brief: Critical depositor protection gate. Eliminates systemic risk from settlement bank insolvency. File formal attestation by March 24.',
    actionItems: [
      {
        id: 'act_ndic_1',
        targetDepartment: 'TREASURY_FINANCE',
        actionTitle: 'Ring-Fence Custodial Trust Account Allocations',
        actionDescription: 'Execute tripartite trust agreement with sponsor settlement bank under NDIC guidelines.',
        suggestedDeadline: '2026-03-20',
        isCompleted: false,
      },
      {
        id: 'act_ndic_2',
        targetDepartment: 'ENGINEERING_TECH',
        actionTitle: 'Deploy Daily NDIC Ledger Balance Export API',
        actionDescription: 'Expose automated report conforming to NDIC pass-through depositor registry format.',
        suggestedDeadline: '2026-03-22',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'circ_6',
    circularNumber: 'ARCON/DIR/ADV/2026/004',
    regulator: 'ARCON',
    subject: 'Mandatory Pre-Vetting for Digital Financial Promotions & Investment Claims',
    summary:
      'Advertising Regulatory Council of Nigeria mandates statutory vetting clearance for all digital marketing copy, billboard creatives, and social media campaigns promising financial yield or credit facilities.',
    publicationDate: '2026-02-20',
    effectiveDate: '2026-02-20',
    statutoryDeadline: '2026-03-12',
    daysRemaining: 8,
    businessDaysRemaining: 6,
    countdownTier: 'HIGH',
    urgencyWindow: 'URGENT_ACTION',
    priority: 'HIGH',
    enforcementRiskLevel: 'HIGH',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'COMMERCIAL_BANK', 'FINANCE_COMPANY'],
    affectedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
    appliesUniversally: true,
    penaltyEscalationProjection: {
      baselineFineNaira: 3_000_000,
      dailyFineNaira: 500_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 3_000_000,
      statutoryCitation: 'ARCON Act 2022 Section 24 & Nigerian Code of Advertising Practice',
      carriesPersonalCriminalLiability: false,
      carriesLicenseSuspensionRisk: false,
    },
    applicability: {
      isApplicable: true,
      reason:
        'Universal statutory mandate: All financial entities running public digital marketing or merchant onboarding ads must possess verified ARCON vetting certificates.',
      matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      matchedRails: ['CARD_ACQUIRING_MASTERCARD_VISA', 'NIBSS_NIP'],
    },
    executiveBriefCco:
      'ARCON enforces compulsory ASP vetting approval before running financial advertisements. Unvetted digital campaigns are subject to immediate takedown notices and ₦3,000,000 fines.',
    actionBriefCoo:
      'Coordinate with Growth and Product Marketing teams to freeze unvetted marketing copy across Facebook, LinkedIn, Google Ads, and in-app banners.',
    technicalBriefProductEng:
      'Integrate marketing CMS approval workflow with Cogent Marketing Shield API to block unapproved creative deployments.',
    technicalBriefCto: 'Ensure CDN edge caching respects campaign expiration and takedown directives.',
    financialBriefCfo: 'Provision budget for statutory ARCON vetting filing fees (₦50,000 per creative batch).',
    governanceBriefCeoCro: 'Board marketing governance oversight under ARCON Act 2022.',
    actionItems: [
      {
        id: 'act_arcon_1',
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: 'Audit Active Digital Ads for ARCON Certificate Numbers',
        actionDescription: 'Review all active campaign creatives in Marketing Shield to verify statutory pre-vetting codes.',
        suggestedDeadline: '2026-03-10',
        isCompleted: false,
      },
    ],
  },
  {
    id: 'circ_7',
    circularNumber: 'NDPC/DIR/DPO/2026/002',
    regulator: 'NDPC',
    subject: 'Nigeria Data Protection Act: Cross-Border Cloud Hosting & Audit Filing',
    summary:
      'Nigeria Data Protection Commission directive establishing mandatory statutory data protection compliance audit filings (CAR) and binding requirements for cross-border cloud database hosting.',
    publicationDate: '2026-01-15',
    effectiveDate: '2026-01-15',
    statutoryDeadline: '2026-03-31',
    daysRemaining: 27,
    businessDaysRemaining: 20,
    countdownTier: 'MEDIUM',
    urgencyWindow: 'STANDARD_WINDOW',
    priority: 'MEDIUM',
    enforcementRiskLevel: 'HIGH',
    lineageStatus: 'ACTIVE_LAW',
    targetedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP', 'COMMERCIAL_BANK', 'SWITCHING_AND_PROCESSING'],
    affectedRails: ['NIBSS_NIP', 'CARD_ACQUIRING_MASTERCARD_VISA'],
    appliesUniversally: true,
    penaltyEscalationProjection: {
      baselineFineNaira: 10_000_000,
      dailyFineNaira: 200_000,
      accruedDailyFineNaira: 0,
      totalProjectedExposureNaira: 10_000_000,
      statutoryCitation: 'NDPA 2023 Section 48 & General Application and Implementation Directive',
      carriesPersonalCriminalLiability: true,
      carriesLicenseSuspensionRisk: false,
    },
    applicability: {
      isApplicable: true,
      reason:
        'Universal mandate for Data Controllers of Major Importance: All fintechs processing transaction records of >10,000 data subjects must file the statutory NDPC CAR.',
      matchedLicenses: ['PAYMENT_SOLUTION_SERVICES_PSSP'],
      matchedRails: ['NIBSS_NIP'],
    },
    executiveBriefCco:
      'Mandatory annual Data Protection Compliance Audit filing due March 31, 2026. Failure triggers statutory sanctions up to 2% of annual gross revenue or ₦10,000,000 under NDPA 2023.',
    actionBriefCoo:
      'Appoint licensed DPCO (Data Protection Compliance Organization) to perform external data privacy verification.',
    technicalBriefProductEng:
      'Verify customer PII encryption in transit and at rest across PostgreSQL databases and AWS/Cloudflare storage buckets.',
    technicalBriefCto: 'Execute Data Protection Impact Assessment (DPIA) on payment gateway core token vaults.',
    financialBriefCfo: 'Audit legal penalty reserves against statutory fine thresholds.',
    governanceBriefCeoCro: 'Executive board signoff on the 2026 Annual Statutory Data Protection Attestation.',
    actionItems: [
      {
        id: 'act_ndpc_1',
        targetDepartment: 'COMPLIANCE_LEGAL',
        actionTitle: 'File 2026 Statutory Compliance Audit Report with NDPC',
        actionDescription: 'Submit certified DPCO audit dossier to the National Commissioner of the NDPC.',
        suggestedDeadline: '2026-03-25',
        isCompleted: false,
      },
    ],
  },
];

export interface RadarCockpitProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  initialContext?: CrossPillarLinkContext | null;
}

export function RadarCockpit({ onSwitchPillar, initialContext }: RadarCockpitProps) {
  const [circulars, setCirculars] = useState<RadarCircularPresentationCard[]>(PRESET_CIRCULARS);
  const [selectedCircularId, setSelectedCircularId] = useState<string>(PRESET_CIRCULARS[0].id);
  const [viewMode, setViewMode] = useState<'table' | 'dossier' | 'cards'>('table');
  const [activeTab, setActiveTab] = useState<'overview' | 'obligations' | 'briefs' | 'lineage'>('overview');

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterRegulator, setFilterRegulator] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterLicense, setFilterLicense] = useState<string>('ALL');
  const [filterLineage, setFilterLineage] = useState<string>('ALL');
  const [relevantOnly, setRelevantOnly] = useState<boolean>(false);

  // Overlay & Sync States
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);

  // Live Database Fetcher
  const fetchLiveCirculars = useCallback(async () => {
    try {
      setIsLoadingLive(true);
      const res = await fetch('/api/radar/circulars');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.circulars) && data.circulars.length > 0) {
        interface RawApiCircular {
          id?: string;
          circular_number?: string;
          subject?: string;
          summary?: string;
          statutory_deadline?: string | null;
          issuance_date?: string | null;
          effective_date?: string | null;
          priority?: RadarPriority;
          enforcement_risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_SANCTION_RISK';
          lineage_status?: LineageStatus;
          targeted_license_types?: LicenseType[];
          affected_payment_rails?: PaymentRail[];
          applies_universally?: boolean;
          created_at?: string;
          countdown?: ReturnType<typeof defaultCountdownCalculator.calculateCountdown>;
          title?: string;
          impact_score?: number;
          applicability_tier?: string;
          action_items_count?: number;
          enforcement_date?: string;
          affected_departments?: string[];
          affected_rails?: string[];
        }

        const liveCards: RadarCircularPresentationCard[] = data.circulars.map((c: RawApiCircular) => {
          let regCode: RegulatorCode = 'CBN';
          const prefix = (c.circular_number || '').split('/')[0]?.toUpperCase();
          if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(prefix)) {
            regCode = prefix as RegulatorCode;
          }

          const countdown = c.countdown || defaultCountdownCalculator.calculateCountdown({
            statutoryDeadline: c.statutory_deadline || null,
            publicationDate: c.issuance_date || c.created_at,
            regulator: regCode,
          });

          const circularId = c.id || `circ_${Date.now()}`;
          const circNum = c.circular_number || 'CIRCULAR-UNKNOWN';

          return {
            id: circularId,
            circularNumber: circNum,
            regulator: regCode,
            subject: c.subject || c.title || 'Regulatory Directive',
            summary: c.summary || c.subject || 'Direct statutory directive issued by regulator.',
            publicationDate: c.issuance_date || c.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            effectiveDate: c.effective_date || c.issuance_date || new Date().toISOString().slice(0, 10),
            statutoryDeadline: c.statutory_deadline ?? null,
            daysRemaining: countdown.daysRemaining,
            businessDaysRemaining: countdown.businessDaysRemaining,
            countdownTier: countdown.tier,
            urgencyWindow: countdown.urgencyWindow,
            priority: c.priority || 'MEDIUM',
            enforcementRiskLevel: c.enforcement_risk_level || 'HIGH',
            lineageStatus: (c.lineage_status || 'ACTIVE_LAW') as LineageStatus,
            targetedLicenses: c.targeted_license_types || [],
            affectedRails: c.affected_payment_rails || [],
            appliesUniversally: c.applies_universally ?? false,
            penaltyEscalationProjection: countdown.penaltyEscalation,
            applicability: {
              isApplicable: true,
              reason: c.applies_universally
                ? 'Universal statutory mandate applying to all regulated financial entities in Nigeria.'
                : `Targets: [ ${(c.targeted_license_types || []).join(', ') || 'Financial Institutions'} ].`,
              matchedLicenses: c.targeted_license_types || [],
              matchedRails: c.affected_payment_rails || [],
            },
            executiveBriefCco: `Statutory mandate from ${regCode}. Full institutional compliance required by ${c.statutory_deadline || 'statutory directive'}.`,
            actionBriefCoo: `Review active payment rails and operational cut-off parameters for compliance.`,
            technicalBriefProductEng: 'Implement system rules, API parameter thresholds, and audit logging.',
            technicalBriefCto: 'Audit microservice architecture, API integration contracts, and key security stores.',
            financialBriefCfo: 'Evaluate balance sheet exposure, capital buffers, and reserve allocations.',
            governanceBriefCeoCro: 'Board monitoring of regulatory governance and enforcement exposures.',
            actionItems: [
              {
                id: `act_${circularId.slice(0, 8)}`,
                targetDepartment: 'COMPLIANCE_LEGAL',
                actionTitle: `Statutory Compliance Review: ${circNum}`,
                actionDescription: 'Conduct detailed gap analysis and ensure readiness for regulatory audit.',
                suggestedDeadline: c.statutory_deadline,
                isCompleted: false,
              },
            ],
          };
        });

        setCirculars(liveCards);
        if (liveCards.length > 0) {
          setSelectedCircularId(liveCards[0].id);
        }
      }
    } catch {
      // Fallback silently to preset circulars if offline
    } finally {
      setIsLoadingLive(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveCirculars();
  }, [fetchLiveCirculars]);

  // Deep linking initial context consumption
  useEffect(() => {
    if (initialContext) {
      if (initialContext.regulatorCode) {
        setFilterRegulator(initialContext.regulatorCode);
      }
      if (initialContext.circularNumber) {
        const found = circulars.find((c) => c.circularNumber.includes(initialContext.circularNumber!));
        if (found) {
          setSelectedCircularId(found.id);
          setViewMode('dossier');
        }
      } else if (initialContext.searchTerm) {
        setSearchQuery(initialContext.searchTerm);
        const term = initialContext.searchTerm.toLowerCase();
        const found = circulars.find(
          (c) =>
            c.subject.toLowerCase().includes(term) ||
            c.circularNumber.toLowerCase().includes(term) ||
            c.regulator.toLowerCase().includes(term)
        );
        if (found) {
          setSelectedCircularId(found.id);
          setViewMode('dossier');
        }
      }
    }
  }, [initialContext, circulars]);

  // Filtered dataset
  const displayedCirculars = useMemo(() => {
    return circulars.filter((c) => {
      if (relevantOnly && !c.applicability.isApplicable) return false;
      if (filterRegulator !== 'ALL' && c.regulator !== filterRegulator) return false;
      if (filterUrgency !== 'ALL') {
        if (filterUrgency === 'CRITICAL_EMERGENCY' && c.priority !== 'CRITICAL_EMERGENCY' && c.urgencyWindow !== 'CRITICAL_EMERGENCY') return false;
        if (filterUrgency === 'URGENT_ACTION' && c.priority !== 'HIGH' && c.urgencyWindow !== 'URGENT_ACTION') return false;
        if (filterUrgency === 'STANDARD_WINDOW' && c.priority !== 'MEDIUM' && c.priority !== 'LOW' && c.urgencyWindow !== 'STANDARD_WINDOW') return false;
      }
      if (filterLicense !== 'ALL' && !c.targetedLicenses.includes(filterLicense as LicenseType) && !c.appliesUniversally) {
        return false;
      }
      if (filterLineage !== 'ALL' && (c.lineageStatus || 'ACTIVE_LAW') !== filterLineage) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesSubject = c.subject.toLowerCase().includes(q);
        const matchesNumber = c.circularNumber.toLowerCase().includes(q);
        const matchesSummary = c.summary.toLowerCase().includes(q);
        const matchesRegulator = c.regulator.toLowerCase().includes(q);
        if (!matchesSubject && !matchesNumber && !matchesSummary && !matchesRegulator) {
          return false;
        }
      }
      return true;
    });
  }, [circulars, filterRegulator, filterUrgency, filterLicense, filterLineage, relevantOnly, searchQuery]);

  const selectedCircular = useMemo(() => {
    return circulars.find((c) => c.id === selectedCircularId) || circulars[0] || PRESET_CIRCULARS[0];
  }, [circulars, selectedCircularId]);

  // Multi-Pane Inspector Engine Wiring (Level 4 & Level 5)
  const inspectableIds = useMemo(() => {
    const ids: string[] = displayedCirculars.map((c) => c.id);
    if (selectedCircular.actionItems) {
      selectedCircular.actionItems.forEach((act) => ids.push(act.id));
    }
    return ids;
  }, [displayedCirculars, selectedCircular]);

  const inspector = useInspectorStore(inspectableIds);

  // Resolve current active item data for the inspector
  const activeInspectorItem: InspectorItemData | null = useMemo(() => {
    if (!inspector.inspectId) return null;

    // Check if inspecting a circular
    const circ = circulars.find((c) => c.id === inspector.inspectId);
    if (circ) {
      return circularToInspectorItem(circ);
    }

    // Check if inspecting an action item / obligation
    for (const c of circulars) {
      const act = c.actionItems?.find((a) => a.id === inspector.inspectId);
      if (act) {
        return obligationToInspectorItem(act, c);
      }
    }

    return null;
  }, [inspector.inspectId, circulars]);

  // Resolve active statutory reference
  const activeReference: StatutoryReferenceData | null = useMemo(() => {
    if (!inspector.refId) return null;
    if (activeInspectorItem?.statutoryReference?.id === inspector.refId) {
      return activeInspectorItem.statutoryReference;
    }
    const matchedCirc = circulars.find(
      (c) => c.id === inspector.refId || `ref-${c.id}` === inspector.refId
    );
    if (matchedCirc) {
      return {
        id: `ref-${matchedCirc.id}`,
        statutoryInstrumentTitle: `${matchedCirc.regulator} Directive ${matchedCirc.circularNumber}`,
        citationClause: matchedCirc.circularNumber,
        regulatorCode: matchedCirc.regulator,
        verbatimLegalText: `${matchedCirc.subject}\n\n${matchedCirc.summary}`,
        statutoryPenaltyNaira: matchedCirc.penaltyEscalationProjection?.totalProjectedExposureNaira,
        dailyFineNaira: matchedCirc.penaltyEscalationProjection?.dailyFineNaira,
        effectiveDate: matchedCirc.effectiveDate,
        highlightedPhrase: matchedCirc.subject,
      };
    }
    return activeInspectorItem?.statutoryReference || null;
  }, [inspector.refId, activeInspectorItem, circulars]);

  // Pulse metrics
  const totalMonitored = circulars.length;
  const applicableCount = circulars.filter((c) => c.applicability.isApplicable).length;
  const urgentCount = circulars.filter(
    (c) => c.priority === 'CRITICAL_EMERGENCY' || c.priority === 'HIGH' || c.urgencyWindow === 'CRITICAL_EMERGENCY'
  ).length;

  const handleIngestSuccess = (rawResult: unknown) => {
    const result = rawResult as CircularIngestResult;
    const meta = result?.metadata;
    if (!meta) return;

    const countdown = defaultCountdownCalculator.calculateCountdown({
      statutoryDeadline: meta.statutoryDeadline || null,
      publicationDate: meta.publicationDate,
      regulator: meta.regulatorCode,
    });

    const newCard: RadarCircularPresentationCard = {
      id: result.circularId,
      circularNumber: meta.circularNumber,
      regulator: meta.regulatorCode,
      subject: meta.subject,
      summary: meta.summary,
      publicationDate: meta.publicationDate,
      effectiveDate: meta.effectiveDate,
      statutoryDeadline: meta.statutoryDeadline ?? null,
      daysRemaining: countdown.daysRemaining,
      businessDaysRemaining: countdown.businessDaysRemaining,
      countdownTier: countdown.tier,
      urgencyWindow: countdown.urgencyWindow,
      priority: meta.priority,
      enforcementRiskLevel: meta.enforcementRiskLevel,
      lineageStatus: (result.lineageStatus || 'ACTIVE_LAW') as LineageStatus,
      targetedLicenses: meta.targetedLicenseTypes,
      affectedRails: meta.affectedPaymentRails,
      appliesUniversally: meta.appliesUniversally,
      penaltyEscalationProjection: countdown.penaltyEscalation,
      deduplicated: result.deduplicated,
      applicability: {
        isApplicable: true,
        reason: `Matched during live ingestion: targets [ ${(meta.targetedLicenseTypes || []).join(', ')} ].`,
        matchedLicenses: meta.targetedLicenseTypes,
        matchedRails: meta.affectedPaymentRails,
      },
      executiveBriefCco: `Official directive from ${meta.regulatorCode}. Full compliance required by ${meta.statutoryDeadline || 'statutory timeline'}.`,
      actionBriefCoo: `Verify rail continuity for ${(meta.affectedPaymentRails || []).join(', ')}.`,
      technicalBriefProductEng: 'Implement required schema and authentication limit adjustments.',
      technicalBriefCto: 'Audit microservice APIs and database models to support statutory compliance.',
      financialBriefCfo: 'Verify reserve adequacy and transaction fee allocations.',
      governanceBriefCeoCro: 'Convene Executive Risk Committee to review remediation SLA.',
      actionItems: [
        {
          id: `act_${Date.now()}`,
          targetDepartment: 'COMPLIANCE_LEGAL',
          actionTitle: `Statutory Review: ${meta.circularNumber}`,
          actionDescription: 'Execute regulatory risk review and prepare board brief.',
          suggestedDeadline: meta.statutoryDeadline,
          isCompleted: false,
        },
      ],
    };

    setCirculars([newCard, ...circulars]);
    setSelectedCircularId(newCard.id);
    setViewMode('dossier');
  };

  const handleExportBrief = async (format: 'markdown' | 'pdf' = 'markdown') => {
    setIsExporting(true);
    try {
      const fetchFormat = format === 'pdf' ? 'html' : format;
      const res = await fetch('/api/radar/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          circular: selectedCircular,
          applicability: selectedCircular.applicability,
          roleBriefs: {
            executiveBriefCco: selectedCircular.executiveBriefCco,
            actionBriefCoo: selectedCircular.actionBriefCoo,
            technicalBriefProductEng: selectedCircular.technicalBriefProductEng,
            financialBriefCfo: selectedCircular.financialBriefCfo,
            technicalBriefCto: selectedCircular.technicalBriefCto,
            governanceBriefCeoCro: selectedCircular.governanceBriefCeoCro,
          },
          actionItems: selectedCircular.actionItems,
          format: fetchFormat,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate Board Brief');

      if (format === 'pdf') {
        const html = await res.text();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.open();
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => printWindow.print(), 350);
        }
      } else {
        const text = await res.text();
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Executive_Board_Brief_${selectedCircular.circularNumber.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: unknown) {
      alert('Error exporting brief: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const currentLineageStatus = selectedCircular.lineageStatus || 'ACTIVE_LAW';
  const penalty = selectedCircular.penaltyEscalationProjection || {
    baselineFineNaira: 10_000_000,
    dailyFineNaira: 2_000_000,
    accruedDailyFineNaira: 0,
    totalProjectedExposureNaira: 10_000_000,
    statutoryCitation: 'BOFIA 2020 Section 57(2)',
    carriesPersonalCriminalLiability: true,
    carriesLicenseSuspensionRisk: true,
  };

  // Dense Table Columns for Level 1 Horizon Scanning (Zango Dense View)
  const columns: TableColumn<RadarCircularPresentationCard>[] = [
    {
      key: 'regulator',
      header: 'Regulator',
      width: '100px',
      sortable: true,
      render: (row) => {
        const colors: Record<string, string> = {
          CBN: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          SEC: 'bg-blue-50 text-blue-800 border-blue-200',
          ARCON: 'bg-purple-50 text-purple-800 border-purple-200',
          NDPC: 'bg-teal-50 text-teal-800 border-teal-200',
          FCCPC: 'bg-amber-50 text-amber-800 border-amber-200',
          NFIU: 'bg-rose-50 text-rose-800 border-rose-200',
          NDIC: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        };
        const badgeClass = colors[row.regulator] || 'bg-slate-100 text-slate-800 border-slate-200';
        return (
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${badgeClass}`}>
            {row.regulator}
          </span>
        );
      },
    },
    {
      key: 'circularNumber',
      header: 'Directive Ref',
      width: '180px',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-bold text-[#0B0F1A] hover:text-[#2A4BFF] transition-colors">
          {row.circularNumber}
        </span>
      ),
    },
    {
      key: 'subject',
      header: 'Directive Title & AI Synthesis',
      sortable: true,
      render: (row) => (
        <div className="space-y-0.5 max-w-xl">
          <div className="text-xs font-semibold text-[#0B0F1A] line-clamp-1">
            {row.subject}
          </div>
          <div className="text-[11px] text-[#4B5565] line-clamp-1">
            {row.summary}
          </div>
        </div>
      ),
    },
    {
      key: 'publicationDate',
      header: 'Issued',
      width: '110px',
      sortable: true,
      render: (row) => (
        <span className="text-xs text-[#4B5565]">
          {row.publicationDate}
        </span>
      ),
    },
    {
      key: 'daysRemaining',
      header: 'Statutory SLA',
      width: '140px',
      sortable: true,
      render: (row) => {
        const isCritical = row.countdownTier === 'CRITICAL_EMERGENCY';
        const isHigh = row.countdownTier === 'HIGH';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isCritical
                ? 'bg-red-50 text-red-700 border-red-200 animate-pulse'
                : isHigh
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            {row.daysRemaining !== null
              ? row.daysRemaining < 0
                ? `Expired (${Math.abs(row.daysRemaining)}d)`
                : `${row.daysRemaining}d left`
              : 'Active'}
          </span>
        );
      },
    },
    {
      key: 'exposure',
      header: 'Sanction Exposure',
      width: '130px',
      render: (row) => {
        const exp = row.penaltyEscalationProjection?.totalProjectedExposureNaira;
        return (
          <span className="text-xs font-bold text-[#0B0F1A]">
            {exp ? `₦${(exp / 1_000_000).toFixed(1)}M` : 'Statutory'}
          </span>
        );
      },
    },
    {
      key: 'lineageStatus',
      header: 'Lineage',
      width: '120px',
      render: (row) => {
        const st = row.lineageStatus || 'ACTIVE_LAW';
        if (st === 'SUPERSEDED') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              Superseded
            </span>
          );
        }
        if (st === 'AMENDED') {
          return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Amended
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Active Law
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '160px',
      render: (row) => (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setSelectedCircularId(row.id);
              setViewMode('dossier');
            }}
            className="px-2.5 py-1 text-[11px] font-semibold text-[#2A4BFF] bg-[#2A4BFF]/5 hover:bg-[#2A4BFF]/10 rounded-md border border-[#2A4BFF]/20 transition-all"
          >
            Open Dossier
          </button>
          <button
            onClick={() => inspector.openInspector(row.id)}
            className="p-1 text-[#4B5565] hover:text-[#2A4BFF] hover:bg-[#F5F6FA] rounded border border-[#DDE3EE] transition-all"
            title="Inspect with Multi-Pane Side-Sheet"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <MultiPaneContainer
      inspector={inspector}
      activeItem={activeInspectorItem}
      activeReference={activeReference}
    >
      <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] font-sans pb-16">
        {/* ──────────────────────────────────────────────────────────────────────────
            TOP HEADER & COMMAND BAR
            ────────────────────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 border-b border-[#DDE3EE] bg-white/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              {/* Breadcrumb Navigation */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-extrabold tracking-wider text-[#2A4BFF] uppercase">Cogent</span>
                <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                <button
                  onClick={() => setViewMode('table')}
                  className="text-[#4B5565] hover:text-[#0B0F1A] font-medium transition-colors"
                >
                  Pillar 1: Insight
                </button>
                <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                {viewMode === 'dossier' ? (
                  <>
                    <span className="text-[#4B5565]">{selectedCircular.regulator}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-[#8D99AE]" />
                    <span className="font-semibold text-[#0B0F1A] truncate max-w-[180px] sm:max-w-xs">
                      {selectedCircular.circularNumber}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold text-[#0B0F1A]">Horizon Scanning Feed</span>
                )}
              </div>

              {/* Cross-Pillar Quick Switcher */}
              {onSwitchPillar && (
                <div className="hidden xl:flex items-center gap-1 rounded-xl border border-[#DDE3EE] bg-[#F5F6FA] p-1 text-xs">
                  <button
                    onClick={() => onSwitchPillar('executive')}
                    className="rounded-lg px-2.5 py-1 text-[#4B5565] hover:text-[#0B0F1A] hover:bg-white transition-colors"
                  >
                    Unified Executive
                  </button>
                  <button
                    className="rounded-lg bg-white text-[#2A4BFF] font-bold px-2.5 py-1 shadow-xs border border-[#DDE3EE]"
                  >
                    Pillar 1: Insight
                  </button>
                  <button
                    onClick={() => onSwitchPillar('marketing')}
                    className="rounded-lg px-2.5 py-1 text-[#4B5565] hover:text-[#0B0F1A] hover:bg-white transition-colors"
                  >
                    Pillar 2: Marketing Shield
                  </button>
                  <button
                    onClick={() => onSwitchPillar('gap-matrix')}
                    className="rounded-lg px-2.5 py-1 text-[#4B5565] hover:text-[#0B0F1A] hover:bg-white transition-colors"
                  >
                    Pillar 3: Gap Matrix
                  </button>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div className="flex items-center gap-2.5">
              {/* Regulator Badge List */}
              <div className="hidden lg:flex items-center gap-2 rounded-full border border-[#DDE3EE] bg-[#F9FAFC] px-3 py-1 text-[11px] text-[#4B5565]">
                <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                <span>CBN • SEC • NDIC • FCCPC • NFIU • ARCON • NDPC</span>
              </div>

              {/* View Switcher Pills */}
              <div className="inline-flex rounded-lg border border-[#DDE3EE] bg-[#F5F6FA] p-0.5">
                <button
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Dense Table View"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Table</span>
                </button>
                <button
                  onClick={() => setViewMode('dossier')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'dossier'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Dossier Workspace"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dossier</span>
                </button>
                <button
                  onClick={() => setViewMode('cards')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    viewMode === 'cards'
                      ? 'bg-white text-[#2A4BFF] shadow-xs'
                      : 'text-[#4B5565] hover:text-[#0B0F1A]'
                  }`}
                  title="Card Grid"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cards</span>
                </button>
              </div>

              {/* Export Button & Dropdown */}
              <div className="relative">
                <div className="inline-flex rounded-lg shadow-xs">
                  <button
                    disabled={isExporting}
                    onClick={() => handleExportBrief('markdown')}
                    className="inline-flex items-center gap-1.5 rounded-l-lg border border-[#DDE3EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 text-[#2A4BFF]" />
                    <span>{isExporting ? 'Exporting...' : 'Export'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="inline-flex items-center rounded-r-lg border border-l-0 border-[#DDE3EE] bg-white px-2 py-1.5 text-xs font-semibold text-[#4B5565] hover:bg-[#F9FAFC] transition-all"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#DDE3EE] bg-white p-1.5 shadow-xl z-50">
                    <div className="px-2.5 py-1 text-[10px] font-bold text-[#8D99AE] uppercase tracking-wider">
                      Statutory Board Briefs
                    </div>
                    <button
                      onClick={() => handleExportBrief('pdf')}
                      className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-[#F5F6FA] transition-colors"
                    >
                      <Printer className="h-4 w-4 text-[#EF4444] mt-0.5" />
                      <div>
                        <div className="font-semibold text-[#0B0F1A]">Print / Save as PDF</div>
                        <div className="text-[11px] text-[#4B5565]">
                          Board pack with CCO Attestation & SHA-256 seal
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => handleExportBrief('markdown')}
                      className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-[#F5F6FA] transition-colors"
                    >
                      <FileText className="h-4 w-4 text-[#2A4BFF] mt-0.5" />
                      <div>
                        <div className="font-semibold text-[#0B0F1A]">Download Markdown (.md)</div>
                        <div className="text-[11px] text-[#4B5565]">
                          Statutory schedules and compliance obligations
                        </div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* Sync Live Button */}
              <button
                onClick={() => fetchLiveCirculars()}
                disabled={isLoadingLive}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3EE] bg-white px-3 py-1.5 text-xs font-semibold text-[#4B5565] hover:text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all disabled:opacity-50"
                title="Sync directives from live database"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLive ? 'animate-spin text-[#2A4BFF]' : ''}`} />
                <span className="hidden sm:inline">{isLoadingLive ? 'Syncing...' : 'Sync'}</span>
              </button>

              {/* Ingest Circular CTA */}
              <button
                onClick={() => setIsUploadDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2A4BFF] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#203ECC] transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ingest Circular</span>
              </button>
            </div>
          </div>
        </header>

        {/* ──────────────────────────────────────────────────────────────────────────
            MAIN CONTENT AREA
            ────────────────────────────────────────────────────────────────────────── */}
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 space-y-6">
          {/* 1. Metric Pulse Strip (4 elevated cards) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-[#4B5565] text-xs mb-1">
                <Radio className="h-3.5 w-3.5 text-[#2A4BFF]" />
                <span className="font-medium">Monitored Directives</span>
              </div>
              <div className="text-2xl font-black text-[#0B0F1A]">{totalMonitored}</div>
              <div className="text-[10px] text-[#4B5565]">Across 7 Nigerian Regulators</div>
            </div>

            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-emerald-700 text-xs mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">Applicable Directives</span>
              </div>
              <div className="text-2xl font-black text-emerald-700">{applicableCount}</div>
              <div className="text-[10px] text-[#4B5565]">Zero-Noise Relational Matches</div>
            </div>

            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-amber-800 text-xs mb-1">
                <Clock className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-medium">Active Compliance Gates</span>
              </div>
              <div className="text-2xl font-black text-amber-800">{urgentCount}</div>
              <div className="text-[10px] text-[#4B5565]">Statutory countdown deadlines</div>
            </div>

            <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs">
              <div className="flex items-center gap-2 text-red-700 text-xs mb-1">
                <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                <span className="font-medium">Sanction Fine Avoided</span>
              </div>
              <div className="text-2xl font-black text-red-700">₦450M+</div>
              <div className="text-[10px] text-[#4B5565]">BOFIA, ISA & NDPA exposure</div>
            </div>
          </div>

          {/* ──────────────────────────────────────────────────────────────────────────
              VIEW MODE: LEVEL 1 HORIZON SCANNING (Dense Table / Cards)
              ────────────────────────────────────────────────────────────────────────── */}
          {viewMode === 'table' && (
            <div className="space-y-4">
              {/* Horizon Filter Cockpit */}
              <div className="rounded-xl border border-[#DDE3EE] bg-white p-4 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#8D99AE]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by directive code, subject, or regulatory mandate..."
                      className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-[#DDE3EE] bg-[#F9FAFC] text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:bg-white focus:border-[#2A4BFF] outline-hidden transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs text-[#8D99AE] hover:text-[#0B0F1A]"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Urgency Window */}
                    <select
                      value={filterUrgency}
                      onChange={(e) => setFilterUrgency(e.target.value)}
                      className="rounded-lg border border-[#DDE3EE] bg-white px-2.5 py-1.5 text-xs text-[#0B0F1A] outline-hidden focus:border-[#2A4BFF]"
                    >
                      <option value="ALL">All Urgency Windows</option>
                      <option value="CRITICAL_EMERGENCY">Critical Emergency (&lt; 7d)</option>
                      <option value="URGENT_ACTION">Urgent Action (&lt; 14d)</option>
                      <option value="STANDARD_WINDOW">Standard Window (&gt; 14d)</option>
                    </select>

                    {/* Lineage Status */}
                    <select
                      value={filterLineage}
                      onChange={(e) => setFilterLineage(e.target.value)}
                      className="rounded-lg border border-[#DDE3EE] bg-white px-2.5 py-1.5 text-xs text-[#0B0F1A] outline-hidden focus:border-[#2A4BFF]"
                    >
                      <option value="ALL">All Lineage States</option>
                      <option value="ACTIVE_LAW">🟢 Active Law</option>
                      <option value="AMENDED">🟡 Amended</option>
                      <option value="SUPERSEDED">🔴 Superseded</option>
                    </select>

                    {/* Relevant Only Toggle */}
                    <button
                      onClick={() => setRelevantOnly(!relevantOnly)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        relevantOnly
                          ? 'bg-[#2A4BFF] text-white border-[#2A4BFF]'
                          : 'bg-white text-[#4B5565] border-[#DDE3EE] hover:bg-[#F9FAFC]'
                      }`}
                    >
                      {relevantOnly ? '✓ Applicable Only' : 'Show All'}
                    </button>

                    {/* Reset Button */}
                    <button
                      onClick={() => {
                        setFilterRegulator('ALL');
                        setFilterUrgency('ALL');
                        setFilterLicense('ALL');
                        setFilterLineage('ALL');
                        setSearchQuery('');
                        setRelevantOnly(false);
                      }}
                      className="text-xs text-[#2A4BFF] hover:underline px-1 font-medium"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {/* Regulator Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#DDE3EE]">
                  <span className="text-[11px] font-bold text-[#8D99AE] uppercase tracking-wider mr-1">
                    Regulator:
                  </span>
                  {['ALL', 'CBN', 'SEC', 'NDIC', 'FCCPC', 'NFIU', 'ARCON', 'NDPC'].map((reg) => (
                    <button
                      key={reg}
                      onClick={() => setFilterRegulator(reg)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                        filterRegulator === reg
                          ? 'bg-[#2A4BFF] text-white shadow-xs'
                          : 'bg-[#F5F6FA] text-[#4B5565] hover:bg-[#E8EDF5] hover:text-[#0B0F1A]'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dense Data Table (Zango AI Reference) */}
              <div className="rounded-xl border border-[#DDE3EE] bg-white shadow-xs overflow-hidden">
                <DenseDataTable
                  columns={columns}
                  data={displayedCirculars}
                  selectedId={selectedCircularId}
                  onRowClick={(row) => {
                    setSelectedCircularId(row.id);
                    setViewMode('dossier');
                  }}
                  searchPlaceholder="Filter circulars in table..."
                  emptyMessage="No regulatory directives match the selected horizon criteria."
                  totalRecordsCount={displayedCirculars.length}
                />
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              VIEW MODE: CARD GRID
              ────────────────────────────────────────────────────────────────────────── */}
          {viewMode === 'cards' && (
            <div className="space-y-4">
              {/* Regulator Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 p-3 rounded-xl border border-[#DDE3EE] bg-white">
                <span className="text-[11px] font-bold text-[#8D99AE] uppercase tracking-wider mr-1">
                  Regulator:
                </span>
                {['ALL', 'CBN', 'SEC', 'NDIC', 'FCCPC', 'NFIU', 'ARCON', 'NDPC'].map((reg) => (
                  <button
                    key={reg}
                    onClick={() => setFilterRegulator(reg)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                      filterRegulator === reg
                        ? 'bg-[#2A4BFF] text-white shadow-xs'
                        : 'bg-[#F5F6FA] text-[#4B5565] hover:bg-[#E8EDF5] hover:text-[#0B0F1A]'
                    }`}
                  >
                    {reg}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayedCirculars.map((card) => (
                  <CircularCard
                    key={card.id}
                    card={card}
                    isSelected={card.id === selectedCircularId}
                    onSelect={() => {
                      setSelectedCircularId(card.id);
                      setViewMode('dossier');
                    }}
                    onInspect={() => inspector.openInspector(card.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ──────────────────────────────────────────────────────────────────────────
              VIEW MODE: LEVEL 2 CIRCULAR DOSSIER WORKSPACE
              ────────────────────────────────────────────────────────────────────────── */}
          {viewMode === 'dossier' && (
            <div className="space-y-5">
              {/* Back Navigation Bar */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setViewMode('table')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#4B5565] hover:text-[#2A4BFF] transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Horizon Scanning Table</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => inspector.openInspector(selectedCircular.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDE3EE] bg-white text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all shadow-xs"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#2A4BFF]" />
                    <span>Inspect Directive</span>
                  </button>
                  <button
                    onClick={() => {
                      inspector.openInspector(selectedCircular.id);
                      inspector.openReference(`ref-${selectedCircular.id}`);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDE3EE] bg-white text-xs font-semibold text-[#0B0F1A] hover:bg-[#F9FAFC] transition-all shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#10B981]" />
                    <span>View Gazette Text</span>
                  </button>
                </div>
              </div>

              {/* Dossier Header Card */}
              <div className="rounded-2xl border border-[#DDE3EE] bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="rounded-md border border-[#2A4BFF]/30 bg-[#2A4BFF]/5 px-2.5 py-0.5 text-xs font-mono font-bold text-[#2A4BFF]">
                        {selectedCircular.circularNumber}
                      </span>
                      <span className="text-xs text-[#4B5565]">
                        Issued: {selectedCircular.publicationDate}
                      </span>
                      <span className="text-xs text-[#4B5565]">
                        • Effective: {selectedCircular.effectiveDate}
                      </span>

                      {/* Lineage Badge */}
                      {currentLineageStatus === 'SUPERSEDED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[10px] font-extrabold text-red-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                          SUPERSEDED / OBSOLETE
                        </span>
                      ) : currentLineageStatus === 'AMENDED' ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                          AMENDED DIRECTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          ACTIVE GOVERNING LAW
                        </span>
                      )}
                    </div>

                    <h1 className="text-xl font-black text-[#0B0F1A] leading-snug">
                      {selectedCircular.subject}
                    </h1>
                  </div>

                  {/* Urgency Badge */}
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-xs font-bold ${
                        selectedCircular.countdownTier === 'CRITICAL_EMERGENCY'
                          ? 'border-red-200 bg-red-50 text-red-700 animate-pulse'
                          : selectedCircular.countdownTier === 'HIGH'
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      <Clock className="h-4 w-4" />
                      <span>
                        {selectedCircular.daysRemaining !== null
                          ? selectedCircular.daysRemaining < 0
                            ? `OVERDUE (${Math.abs(selectedCircular.daysRemaining)} DAYS)`
                            : `${selectedCircular.daysRemaining} DAYS TO COMPLIANCE`
                          : 'ACTIVE DIRECTIVE'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#4B5565] mt-1 font-medium">
                      Statutory Deadline: {selectedCircular.statutoryDeadline || 'None specified'}
                    </div>
                  </div>
                </div>

                {/* Supersession Warning Banner */}
                {currentLineageStatus === 'SUPERSEDED' && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
                    <div className="flex items-start gap-3">
                      <AlertOctagon className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-bold text-red-900 uppercase tracking-wide">
                          Institutional Alert: Superseded Directive
                        </div>
                        <p className="leading-relaxed">
                          This circular has been formally superseded by Circular{' '}
                          <span className="font-mono font-bold text-[#0B0F1A]">
                            {selectedCircular.supersededBy || 'PSM/DIR/CON/CWS/08/014'}
                          </span>
                          . Operating in reliance on this obsolete document creates severe statutory audit liability under CBN & BOFIA standards.
                        </p>
                        {selectedCircular.supersededBy && (
                          <button
                            onClick={() => {
                              const repl = circulars.find(
                                (c) => c.circularNumber === selectedCircular.supersededBy
                              );
                              if (repl) setSelectedCircularId(repl.id);
                            }}
                            className="mt-1 inline-flex items-center gap-1 font-bold text-[#2A4BFF] hover:underline"
                          >
                            <span>Switch to Active Replacement Directive</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4 Statutory SLA Countdown Chips (Zango & uio.mp4 summary strip) */}
                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <Calendar className="h-3 w-3 text-[#2A4BFF]" />
                      <span>Calendar Window</span>
                    </div>
                    <div className="text-sm font-bold text-[#0B0F1A]">
                      {selectedCircular.daysRemaining !== null
                        ? `${selectedCircular.daysRemaining} Days`
                        : 'Ongoing'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <Briefcase className="h-3 w-3 text-emerald-600" />
                      <span>Business Days</span>
                    </div>
                    <div className="text-sm font-bold text-emerald-700">
                      {selectedCircular.businessDaysRemaining !== undefined && selectedCircular.businessDaysRemaining !== null
                        ? `${selectedCircular.businessDaysRemaining} Work Days`
                        : 'N/A'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <Coins className="h-3 w-3 text-amber-600" />
                      <span>Fine Escalation</span>
                    </div>
                    <div className="text-sm font-bold text-amber-800 truncate">
                      ₦{(penalty.totalProjectedExposureNaira / 1_000_000).toFixed(1)}M Base
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="text-[10px] text-[#4B5565] mb-0.5 flex items-center gap-1 font-medium">
                      <ShieldAlert className="h-3 w-3 text-red-600" />
                      <span>SLA Escalation</span>
                    </div>
                    <div className="text-xs font-bold text-red-700 truncate">
                      {selectedCircular.countdownTier === 'CRITICAL_EMERGENCY'
                        ? 'CEO & Board Alert'
                        : selectedCircular.countdownTier === 'HIGH'
                        ? 'CCO & COO Action'
                        : 'Task Lead Gate'}
                    </div>
                  </div>
                </div>

                {/* Progress Countdown Bar */}
                {selectedCircular.statutoryDeadline && (
                  <div className="mb-4 rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] p-3">
                    <div className="flex justify-between text-[11px] text-[#4B5565] mb-1.5">
                      <span className="font-medium text-[#0B0F1A]">
                        Statutory Enforcement Countdown Window
                      </span>
                      <span className="font-mono text-[#2A4BFF] font-bold">
                        {selectedCircular.daysRemaining} Days Remaining
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-[#E8EDF5] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedCircular.countdownTier === 'CRITICAL_EMERGENCY'
                            ? 'bg-gradient-to-r from-red-600 to-rose-400 animate-pulse'
                            : selectedCircular.countdownTier === 'HIGH'
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        }`}
                        style={{
                          width: `${Math.max(
                            10,
                            Math.min(100, (selectedCircular.daysRemaining || 14) * 5)
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Institutional Applicability Card */}
                <div
                  className={`rounded-xl border p-4 ${
                    selectedCircular.applicability.isApplicable
                      ? 'border-emerald-200 bg-emerald-50/60 text-emerald-900'
                      : 'border-[#DDE3EE] bg-[#F9FAFC] text-[#4B5565]'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {selectedCircular.applicability.isApplicable ? (
                      <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-[#8D99AE] shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider">
                          {selectedCircular.applicability.isApplicable
                            ? 'Institutional Applicability: Direct Mandate'
                            : 'Institutional Applicability: Noise Filtered'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">
                        {selectedCircular.applicability.reason}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Level 3 Local Workspace Tabs */}
              <div className="space-y-4">
                <div className="flex border-b border-[#DDE3EE] gap-6 text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'overview'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    Overview & AI Synthesis
                  </button>
                  <button
                    onClick={() => setActiveTab('obligations')}
                    className={`pb-3 transition-colors relative flex items-center gap-1.5 ${
                      activeTab === 'obligations'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    <span>Statutory Obligations</span>
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#EEF2FF] text-[#2A4BFF] font-bold">
                      {selectedCircular.actionItems?.length || 0}
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('briefs')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'briefs'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    Multi-Role Impact Briefs
                  </button>
                  <button
                    onClick={() => setActiveTab('lineage')}
                    className={`pb-3 transition-colors relative ${
                      activeTab === 'lineage'
                        ? 'text-[#2A4BFF] border-b-2 border-[#2A4BFF] font-bold'
                        : 'text-[#4B5565] hover:text-[#0B0F1A]'
                    }`}
                  >
                    Circular Lineage & Supersession Tree
                  </button>
                </div>

                {/* Tab 1: Overview & AI Synthesis */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-[#DDE3EE] bg-white p-5 shadow-xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#0B0F1A]">
                        Executive Synthesis & Regulatory Scope
                      </h3>
                      <p className="text-xs leading-relaxed text-[#4B5565]">
                        {selectedCircular.summary}
                      </p>

                      {/* Connected Compliance Cascade Actions */}
                      {onSwitchPillar && (
                        <div className="pt-4 border-t border-[#DDE3EE] flex flex-wrap items-center justify-between gap-3">
                          <span className="text-[11px] font-semibold text-[#4B5565]">
                            Connected Compliance Cascade:
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              onClick={() =>
                                onSwitchPillar('gap-matrix', {
                                  targetPillar: 'gap-matrix',
                                  circularNumber: selectedCircular.circularNumber,
                                  searchTerm: selectedCircular.subject,
                                  action: 'inspect',
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FF] hover:bg-[#2A4BFF] text-[#2A4BFF] hover:text-white border border-[#2A4BFF]/30 text-xs font-semibold transition-all shadow-xs"
                            >
                              <Scale className="w-3.5 h-3.5" />
                              <span>Evaluate Policy Gap Concordance in Pillar 3</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </button>
                            <button
                              onClick={() =>
                                onSwitchPillar('marketing', {
                                  targetPillar: 'marketing',
                                  regulatorCode: selectedCircular.regulator,
                                  action: 'pre-vet',
                                })
                              }
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white border border-amber-300 text-xs font-semibold transition-all shadow-xs"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>Pre-Vet Marketing Copy for this Directive</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Statutory Obligations */}
                {activeTab === 'obligations' && (
                  <ActionItemTracker
                    initialItems={selectedCircular.actionItems}
                    circularNumber={selectedCircular.circularNumber}
                    statutoryDeadline={selectedCircular.statutoryDeadline}
                    onInspectItem={(item) => inspector.openInspector(item.id)}
                  />
                )}

                {/* Tab 3: Multi-Role Impact Briefs */}
                {activeTab === 'briefs' && (
                  <RoleBriefViewer
                    circularNumber={selectedCircular.circularNumber}
                    executiveBriefCco={selectedCircular.executiveBriefCco}
                    actionBriefCoo={selectedCircular.actionBriefCoo}
                    technicalBriefProductEng={selectedCircular.technicalBriefProductEng}
                    financialBriefCfo={selectedCircular.financialBriefCfo}
                    technicalBriefCto={selectedCircular.technicalBriefCto}
                    governanceBriefCeoCro={selectedCircular.governanceBriefCeoCro}
                  />
                )}

                {/* Tab 4: Circular Lineage & Supersession Tree */}
                {activeTab === 'lineage' && (
                  <div className="rounded-xl border border-[#DDE3EE] bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-[#DDE3EE]">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#0B0F1A]">
                        <GitBranch className="h-4 w-4 text-[#2A4BFF]" />
                        <span>Statutory Circular Lineage & Supersession DAG</span>
                      </div>
                      <span className="text-[10px] text-[#4B5565] font-mono">
                        Node ID: {selectedCircular.id}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto py-3 text-xs">
                      {/* Predecessor Node */}
                      <div className="flex items-center gap-2 rounded-xl border border-[#DDE3EE] bg-[#F9FAFC] px-3.5 py-2.5 shrink-0">
                        <GitCommit className="h-3.5 w-3.5 text-amber-500" />
                        <div>
                          <div className="text-[10px] text-[#4B5565]">Predecessor Law</div>
                          <div className="font-mono text-xs font-semibold text-[#0B0F1A]">
                            {selectedCircular.amends?.[0] || 'Original Directive'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-[#8D99AE] shrink-0">
                        <ArrowRight className="h-4 w-4 text-[#2A4BFF]" />
                      </div>

                      {/* Current Node */}
                      <div className="flex items-center gap-2 rounded-xl border border-[#2A4BFF] bg-[#2A4BFF]/5 px-3.5 py-2.5 shrink-0 ring-1 ring-[#2A4BFF]">
                        <GitCommit className="h-3.5 w-3.5 text-[#2A4BFF]" />
                        <div>
                          <div className="text-[10px] text-[#2A4BFF] font-bold">This Directive</div>
                          <div className="font-mono text-xs font-bold text-[#0B0F1A]">
                            {selectedCircular.circularNumber}
                          </div>
                        </div>
                      </div>

                      {/* Successor Node if superseded */}
                      {selectedCircular.supersededBy && (
                        <>
                          <div className="flex items-center text-[#8D99AE] shrink-0">
                            <ArrowRight className="h-4 w-4 text-red-500" />
                          </div>
                          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 shrink-0">
                            <GitCommit className="h-3.5 w-3.5 text-red-500" />
                            <div>
                              <div className="text-[10px] text-red-700 font-bold">Revoked By</div>
                              <div className="font-mono text-xs font-bold text-red-900">
                                {selectedCircular.supersededBy}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Circular Ingestion Drawer (Level 6) */}
        <CircularUploadDrawer
          isOpen={isUploadDrawerOpen}
          onClose={() => setIsUploadDrawerOpen(false)}
          onIngestSuccess={handleIngestSuccess}
        />
      </div>
    </MultiPaneContainer>
  );
}
