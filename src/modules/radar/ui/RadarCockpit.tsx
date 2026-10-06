'use client';

import React, { useState } from 'react';
import {
  Radar,
  Radio,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Download,
  Printer,
  ChevronRight,
  Filter,
  Plus,
  Building,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  Layers,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Scale,
  Shield,
  GitBranch,
  GitCommit,
  AlertOctagon,
  Calendar,
  Briefcase,
  Coins,
  Server,
  Zap,
} from 'lucide-react';
import { PlatformPillar, CrossPillarLinkContext, LicenseType, RegulatorCode, LineageStatus } from '@/shared/types';
import { RadarCircularPresentationCard } from '../types';
import { CircularCard } from './CircularCard';
import { RoleBriefViewer } from './RoleBriefViewer';
import { ActionItemTracker } from './ActionItemTracker';
import { CircularUploadDrawer } from './CircularUploadDrawer';
import { defaultCountdownCalculator } from '../services/deadlineCountdownCalculator';

// Preset Canonical Circular Data with Lineage Graphs & Penalty Escalations
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
];

export interface RadarCockpitProps {
  onSwitchPillar?: (pillar: PlatformPillar, context?: CrossPillarLinkContext) => void;
  initialContext?: CrossPillarLinkContext | null;
}

export function RadarCockpit({ onSwitchPillar, initialContext }: RadarCockpitProps) {
  const [circulars, setCirculars] = useState<RadarCircularPresentationCard[]>(PRESET_CIRCULARS);
  const [selectedCircularId, setSelectedCircularId] = useState<string>(PRESET_CIRCULARS[0].id);
  const [filterRegulator, setFilterRegulator] = useState<string>('ALL');
  const [filterUrgency, setFilterUrgency] = useState<string>('ALL');
  const [filterLicense, setFilterLicense] = useState<string>('ALL');
  const [filterLineage, setFilterLineage] = useState<string>('ALL');
  const [showLineageExplorer, setShowLineageExplorer] = useState<boolean>(true);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [isLoadingLive, setIsLoadingLive] = useState<boolean>(false);

  // Live Database Fetcher
  const fetchLiveCirculars = React.useCallback(async () => {
    try {
      setIsLoadingLive(true);
      const res = await fetch('/api/radar/circulars');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.circulars) && data.circulars.length > 0) {
        const liveCards: RadarCircularPresentationCard[] = data.circulars.map((c: any) => {
          let regCode: RegulatorCode = 'CBN';
          const prefix = (c.circular_number || '').split('/')[0]?.toUpperCase();
          if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(prefix)) {
            regCode = prefix as RegulatorCode;
          }

          const countdown = c.countdown || defaultCountdownCalculator.calculateCountdown({
            statutoryDeadline: c.statutory_deadline,
            publicationDate: c.issuance_date || c.created_at,
            regulator: regCode,
          });

          return {
            id: c.id,
            circularNumber: c.circular_number,
            regulator: regCode,
            subject: c.subject || 'Regulatory Directive',
            summary: c.summary || c.subject || 'Direct statutory directive issued by regulator.',
            publicationDate: c.issuance_date || c.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
            effectiveDate: c.effective_date || c.issuance_date,
            statutoryDeadline: c.statutory_deadline,
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
                id: `act_${c.id.slice(0, 8)}`,
                targetDepartment: 'COMPLIANCE_LEGAL',
                actionTitle: `Statutory Compliance Review: ${c.circular_number}`,
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

  React.useEffect(() => {
    fetchLiveCirculars();
  }, [fetchLiveCirculars]);

  // Cross-Pillar deep linking context consumption (Task 19.2)
  React.useEffect(() => {
    if (initialContext) {
      if (initialContext.regulatorCode) {
        setFilterRegulator(initialContext.regulatorCode);
      }
      if (initialContext.circularNumber) {
        const found = circulars.find((c) => c.circularNumber.includes(initialContext.circularNumber!));
        if (found) setSelectedCircularId(found.id);
      } else if (initialContext.searchTerm) {
        const term = initialContext.searchTerm.toLowerCase();
        const found = circulars.find(
          (c) =>
            c.subject.toLowerCase().includes(term) ||
            c.circularNumber.toLowerCase().includes(term) ||
            c.regulator.toLowerCase().includes(term)
        );
        if (found) setSelectedCircularId(found.id);
      }
    }
  }, [initialContext, circulars]);

  const selectedCircular =
    circulars.find((c) => c.id === selectedCircularId) || circulars[0];

  // Dynamic filter pipeline
  const displayedCirculars = circulars.filter((c) => {
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
    return true;
  });

  // High-level summary metrics
  const totalMonitored = circulars.length;
  const applicableCount = circulars.filter((c) => c.applicability.isApplicable).length;
  const urgentCount = circulars.filter(
    (c) => c.priority === 'CRITICAL_EMERGENCY' || c.priority === 'HIGH' || c.urgencyWindow === 'CRITICAL_EMERGENCY'
  ).length;

  const handleIngestSuccess = (result: any) => {
    const meta = result.metadata;
    const countdown = defaultCountdownCalculator.calculateCountdown({
      statutoryDeadline: meta.statutoryDeadline,
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
      statutoryDeadline: meta.statutoryDeadline,
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
        reason: `Matched during live ingestion: targets [ ${meta.targetedLicenseTypes.join(', ')} ].`,
        matchedLicenses: meta.targetedLicenseTypes,
        matchedRails: meta.affectedPaymentRails,
      },
      executiveBriefCco: `Official directive from ${meta.regulatorCode}. Full compliance required by ${meta.statutoryDeadline || 'statutory timeline'}.`,
      actionBriefCoo: `Verify rail continuity for ${meta.affectedPaymentRails.join(', ')}.`,
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
  };

  const handleExportBrief = async (format: 'markdown' | 'pdf' | 'html' = 'markdown') => {
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
    } catch (err: any) {
      alert('Error exporting brief: ' + err.message);
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

  return (
    <div className="flex min-h-screen flex-col bg-[#090D16] text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* ──────────────────────────────────────────────────────────────────────────
          COMMAND BAR & BREADCRUMB
          ────────────────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#090D16]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-extrabold tracking-wider text-cyan-400 uppercase">Cogent</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="text-slate-400 font-medium">Pillar 2: Regulatory Radar</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
              <span className="font-semibold text-slate-200 truncate max-w-[180px] sm:max-w-xs">
                {selectedCircular.circularNumber}
              </span>
            </div>

            {onSwitchPillar && (
              <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/60 p-1 text-xs">
                <button
                  onClick={() => onSwitchPillar('executive')}
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white transition-colors"
                >
                  Unified Executive
                </button>
                <button
                  onClick={() => onSwitchPillar('marketing')}
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white transition-colors"
                >
                  Pillar 1: Marketing Shield
                </button>
                <button
                  className="rounded-lg bg-cyan-500/20 text-cyan-300 font-bold px-2.5 py-1 shadow-sm"
                >
                  Pillar 2: Regulatory Radar
                </button>
                <button
                  onClick={() => onSwitchPillar('gap-matrix')}
                  className="rounded-lg px-2.5 py-1 text-slate-400 hover:text-white transition-colors"
                >
                  Pillar 3: 5-W Gap Matrix
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-[11px] text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Multi-Regulator Radar: CBN • SEC • NDIC • FCCPC • NFIU • ARCON</span>
            </div>

            <div className="relative">
              <div className="inline-flex rounded-xl shadow-sm">
                <button
                  disabled={isExporting}
                  onClick={() => handleExportBrief('markdown')}
                  className="inline-flex items-center gap-1.5 rounded-l-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-sm disabled:opacity-50"
                  title="Export official Executive Board Brief (Markdown)"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{isExporting ? 'Generating...' : 'Export Board Brief'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="inline-flex items-center rounded-r-xl border border-l-0 border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20 transition-all"
                  title="Export formats (PDF / Markdown)"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl z-50">
                  <div className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Statutory Board Briefs
                  </div>
                  <button
                    onClick={() => handleExportBrief('pdf')}
                    className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-slate-800 transition-colors group"
                  >
                    <Printer className="h-4 w-4 text-rose-400 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white group-hover:text-cyan-300">
                        Print / Save as PDF
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Executive format with CCO Attestation & SHA-256 seal
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleExportBrief('markdown')}
                    className="w-full text-left flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-xs hover:bg-slate-800 transition-colors group"
                  >
                    <FileText className="h-4 w-4 text-cyan-400 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white group-hover:text-cyan-300">
                        Download Markdown Dossier
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Board pack with statutory schedules (.md)
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => fetchLiveCirculars()}
              disabled={isLoadingLive}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
              title="Refresh circulars from live database"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingLive ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isLoadingLive ? 'Syncing...' : 'Sync Radar'}</span>
            </button>

            <button
              onClick={() => setIsUploadDrawerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-md shadow-cyan-900/30 hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ingest Circular</span>
            </button>
          </div>
        </div>
      </header>

      {/* ──────────────────────────────────────────────────────────────────────────
          MAIN RADAR COCKPIT
          ────────────────────────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
        {/* Metric Pulse Banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <Radio className="h-3.5 w-3.5 text-cyan-400" />
              <span>Monitored Directives</span>
            </div>
            <div className="text-2xl font-black text-white">{totalMonitored}</div>
            <div className="text-[10px] text-slate-500">Across 6 Nigerian Regulators</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-emerald-400 text-xs mb-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Applicable Directives</span>
            </div>
            <div className="text-2xl font-black text-emerald-300">{applicableCount}</div>
            <div className="text-[10px] text-slate-500">Zero-Noise Relational Matches</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-amber-400 text-xs mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span>Active Compliance Windows</span>
            </div>
            <div className="text-2xl font-black text-amber-300">{urgentCount}</div>
            <div className="text-[10px] text-slate-500">Statutory countdown gates</div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-rose-400 text-xs mb-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Sanction Fine Avoided</span>
            </div>
            <div className="text-2xl font-black text-rose-300">₦450M+</div>
            <div className="text-[10px] text-slate-500">BOFIA & ISA statutory exposure</div>
          </div>
        </div>

        {/* Master-Detail Split Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* ────────────────────────────────────────────────────────────────────
              LEFT PANE: CIRCULAR FEED & MULTI-FILTER BAR (4 Cols)
              ──────────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-4 space-y-4">
            {/* Filter Cockpit Bar */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800/60 text-slate-400">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px]">
                  <Filter className="h-3 w-3 text-cyan-400" />
                  Horizon Filters
                </span>
                <button
                  onClick={() => {
                    setFilterRegulator('ALL');
                    setFilterUrgency('ALL');
                    setFilterLicense('ALL');
                    setFilterLineage('ALL');
                  }}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  Reset
                </button>
              </div>

              {/* Regulator Pills */}
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">Regulator:</label>
                <div className="flex flex-wrap items-center gap-1">
                  {['ALL', 'CBN', 'SEC', 'NDIC', 'FCCPC', 'NFIU', 'ARCON'].map((reg) => (
                    <button
                      key={reg}
                      onClick={() => setFilterRegulator(reg)}
                      className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition-all ${
                        filterRegulator === reg
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-slate-800/40 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {reg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Urgency Window */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Urgency Window:</label>
                  <select
                    value={filterUrgency}
                    onChange={(e) => setFilterUrgency(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 outline-none"
                  >
                    <option value="ALL">All Windows</option>
                    <option value="CRITICAL_EMERGENCY">Critical Emergency</option>
                    <option value="URGENT_ACTION">Urgent Action</option>
                    <option value="STANDARD_WINDOW">Standard Window</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Lineage Status:</label>
                  <select
                    value={filterLineage}
                    onChange={(e) => setFilterLineage(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-cyan-500 outline-none"
                  >
                    <option value="ALL">All Lineage</option>
                    <option value="ACTIVE_LAW">🟢 Active Law</option>
                    <option value="AMENDED">🟡 Amended</option>
                    <option value="SUPERSEDED">🔴 Superseded</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Circular Feed */}
            <div className="space-y-3">
              {displayedCirculars.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-8 text-center text-slate-500">
                  <p className="text-xs">No regulatory directives match current filter criteria.</p>
                </div>
              ) : (
                displayedCirculars.map((card) => (
                  <CircularCard
                    key={card.id}
                    card={card}
                    isSelected={card.id === selectedCircularId}
                    onSelect={() => setSelectedCircularId(card.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────────────────
              RIGHT PANE: EXECUTIVE COCKPIT DETAIL (8 Cols)
              ──────────────────────────────────────────────────────────────────── */}
          <div className="lg:col-span-8 space-y-5">
            {/* 1. Header Banner & Countdown Timer */}
            <div className="rounded-2xl border border-slate-800 bg-[#0B111E]/90 p-6 shadow-xl backdrop-blur-xl">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="rounded-md border border-cyan-500/30 bg-cyan-950/60 px-2.5 py-0.5 text-xs font-mono font-bold text-cyan-300">
                      {selectedCircular.circularNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      Issued: {selectedCircular.publicationDate}
                    </span>

                    {/* Lineage Status Badge */}
                    {currentLineageStatus === 'SUPERSEDED' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/80 bg-red-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-red-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        SUPERSEDED / OBSOLETE
                      </span>
                    ) : currentLineageStatus === 'AMENDED' ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/80 bg-amber-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        AMENDED DIRECTIVE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/80 bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        ACTIVE GOVERNING LAW
                      </span>
                    )}
                  </div>
                  <h1 className="text-lg font-black text-white leading-snug">
                    {selectedCircular.subject}
                  </h1>
                </div>

                {/* Urgency Badge */}
                <div className="text-right">
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-bold ${
                      selectedCircular.countdownTier === 'CRITICAL_EMERGENCY'
                        ? 'border-red-500/80 bg-red-950/80 text-red-200 animate-pulse shadow-lg shadow-red-950/50'
                        : selectedCircular.countdownTier === 'HIGH'
                        ? 'border-amber-500/80 bg-amber-950/80 text-amber-200'
                        : 'border-emerald-600/70 bg-emerald-950/60 text-emerald-300'
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
                  <div className="text-[10px] text-slate-500 mt-1">
                    Statutory Deadline: {selectedCircular.statutoryDeadline || 'None specified'}
                  </div>
                </div>
              </div>

              {/* Supersession Warning Banner if Stale */}
              {currentLineageStatus === 'SUPERSEDED' && (
                <div className="mb-4 rounded-xl border border-red-500/60 bg-red-950/40 p-4 text-xs text-red-200">
                  <div className="flex items-start gap-3">
                    <AlertOctagon className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-bold text-red-100 uppercase tracking-wide">
                        Institutional Alert: Superseded Directive
                      </div>
                      <p className="leading-relaxed">
                        This circular has been formally superseded by Circular{' '}
                        <span className="font-mono font-bold text-white">
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
                          className="mt-1 inline-flex items-center gap-1 font-bold text-cyan-300 hover:underline"
                        >
                          <span>Switch to Active Replacement Directive</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 4 Statutory SLA Countdown Chips */}
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                  <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-cyan-400" />
                    <span>Calendar Window</span>
                  </div>
                  <div className="text-sm font-bold text-white">
                    {selectedCircular.daysRemaining !== null
                      ? `${selectedCircular.daysRemaining} Days`
                      : 'Ongoing'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                  <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-emerald-400" />
                    <span>Business Days</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-300">
                    {selectedCircular.businessDaysRemaining !== undefined && selectedCircular.businessDaysRemaining !== null
                      ? `${selectedCircular.businessDaysRemaining} Work Days`
                      : 'N/A'}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                  <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <Coins className="h-3 w-3 text-amber-400" />
                    <span>Fine Escalation</span>
                  </div>
                  <div className="text-sm font-bold text-amber-300 truncate">
                    ₦{(penalty.totalProjectedExposureNaira / 1_000_000).toFixed(1)}M Base
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-2.5">
                  <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3 text-rose-400" />
                    <span>SLA Escalation</span>
                  </div>
                  <div className="text-xs font-bold text-rose-300 truncate">
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
                <div className="mb-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-3">
                  <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="font-medium text-slate-300">
                      Statutory Enforcement Countdown Window
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {selectedCircular.daysRemaining} Days Remaining
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden border border-slate-800">
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

              {/* Summary Paragraph */}
              <p className="text-xs leading-relaxed text-slate-300 mb-4">
                {selectedCircular.summary}
              </p>

              {/* Institutional Applicability Banner */}
              <div
                className={`rounded-xl border p-4 ${
                  selectedCircular.applicability.isApplicable
                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-200'
                    : 'border-slate-800 bg-slate-950/40 text-slate-400'
                }`}
              >
                <div className="flex items-start gap-3">
                  {selectedCircular.applicability.isApplicable ? (
                    <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
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

              {/* Circular Lineage & Supersession Explorer Panel */}
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800/60">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <GitBranch className="h-4 w-4 text-cyan-400" />
                    <span>Circular Lineage & Supersession Graph (Task 2.5)</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Node ID: {selectedCircular.id}
                  </span>
                </div>

                <div className="flex items-center gap-3 overflow-x-auto py-2 text-xs">
                  {/* Ancestor / Parent Node */}
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 shrink-0">
                    <GitCommit className="h-3.5 w-3.5 text-amber-400" />
                    <div>
                      <div className="text-[10px] text-slate-500">Predecessor Law</div>
                      <div className="font-mono text-xs font-semibold text-slate-300">
                        {selectedCircular.amends?.[0] || 'Original Directive'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center text-slate-600 shrink-0">
                    <ArrowRight className="h-4 w-4 text-cyan-400" />
                  </div>

                  {/* Current Circular Node */}
                  <div className="flex items-center gap-2 rounded-lg border border-cyan-500/60 bg-cyan-950/40 px-3 py-2 shrink-0 ring-1 ring-cyan-500/40 shadow-sm">
                    <GitCommit className="h-3.5 w-3.5 text-cyan-400" />
                    <div>
                      <div className="text-[10px] text-cyan-300 font-bold">This Directive</div>
                      <div className="font-mono text-xs font-bold text-white">
                        {selectedCircular.circularNumber}
                      </div>
                    </div>
                  </div>

                  {/* Child / Successor Node if amended */}
                  {selectedCircular.supersededBy && (
                    <>
                      <div className="flex items-center text-slate-600 shrink-0">
                        <ArrowRight className="h-4 w-4 text-rose-400" />
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-rose-500/60 bg-rose-950/40 px-3 py-2 shrink-0">
                        <GitCommit className="h-3.5 w-3.5 text-rose-400" />
                        <div>
                          <div className="text-[10px] text-rose-300 font-bold">Revoked By</div>
                          <div className="font-mono text-xs font-bold text-white">
                            {selectedCircular.supersededBy}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Direct Cross-Pillar Linking Action Strip */}
              {onSwitchPillar && (
                <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[11px] font-semibold text-slate-400">
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
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all shadow-sm"
                    >
                      <Scale className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Evaluate Policy Gap Concordance in Pillar 3</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </button>
                    <button
                      onClick={() =>
                        onSwitchPillar('marketing', {
                          targetPillar: 'marketing',
                          regulatorCode: selectedCircular.regulator as any,
                          action: 'pre-vet',
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-semibold transition-all shadow-sm"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>Pre-Vet Marketing Copy for this Directive</span>
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. 4-Way Multi-Role Impact Viewer */}
            <RoleBriefViewer
              circularNumber={selectedCircular.circularNumber}
              executiveBriefCco={selectedCircular.executiveBriefCco}
              actionBriefCoo={selectedCircular.actionBriefCoo}
              technicalBriefProductEng={selectedCircular.technicalBriefProductEng}
              financialBriefCfo={selectedCircular.financialBriefCfo}
              technicalBriefCto={selectedCircular.technicalBriefCto}
              governanceBriefCeoCro={selectedCircular.governanceBriefCeoCro}
            />

            {/* 3. Action Item Tracker */}
            <ActionItemTracker
              initialItems={selectedCircular.actionItems}
              circularNumber={selectedCircular.circularNumber}
              statutoryDeadline={selectedCircular.statutoryDeadline}
            />
          </div>
        </div>
      </main>

      {/* Circular Ingestion Slide Drawer */}
      <CircularUploadDrawer
        isOpen={isUploadDrawerOpen}
        onClose={() => setIsUploadDrawerOpen(false)}
        onIngestSuccess={handleIngestSuccess}
      />
    </div>
  );
}
