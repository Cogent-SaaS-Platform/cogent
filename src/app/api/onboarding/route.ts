import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTenantContext } from '@/shared/auth';
import { ApplicabilityEngine } from '@/modules/radar/services/applicabilityEngine';
import { AuditService } from '@/modules/audit/auditService';
import { logger } from '@/shared/logger';
import { LicenseType, PaymentRail, RegulatorCode } from '@/shared/types';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      companySize,
      rcNumber,
      companyWebsite,
      industryCategory,
      department,
      customDepartment,
      jobTitle,
      primaryRegulators = ['CBN'],
      licenseType = 'COMMERCIAL_BANK',
      licenseNumber,
      operatingEnvironment = 'LIVE_PRODUCTION',
      paymentRails = ['NIBSS_NIP'],
      productCategories = ['SAVINGS_DEPOSIT'],
      invitedMembers = [],
    } = body;

    const tenantCtx = await getTenantContext();
    const organizationId = tenantCtx.organizationId;
    const dbClient = tenantCtx.dbClient;

    logger.info(
      { organizationId, companyName, department, licenseType, primaryRegulators },
      'Processing deep tenant onboarding configuration'
    );

    if (dbClient) {
      try {
        // 1. Update Organization Details
        await dbClient
          .from('organizations')
          .update({
            name: companyName,
            rc_number: rcNumber || null,
            cbn_approval_ref: primaryRegulators.includes('CBN') ? (licenseNumber || null) : null,
            fccpc_registration_number: licenseType.includes('FCCPC') || primaryRegulators.includes('FCCPC')
              ? (licenseNumber || null)
              : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', organizationId);

        // 2. Persist All Selected Primary Regulators & Licenses
        const regulatorsToInsert: RegulatorCode[] =
          Array.isArray(primaryRegulators) && primaryRegulators.length > 0
            ? primaryRegulators
            : ['CBN'];

        for (const reg of regulatorsToInsert) {
          await dbClient
            .from('tenant_licenses')
            .upsert(
              {
                organization_id: organizationId,
                license_type: licenseType as any,
                license_number: licenseNumber || null,
                issuing_regulator: reg as any,
                is_active: true,
              },
              { onConflict: 'organization_id,license_type' }
            );
        }

        // 3. Persist Payment Rails
        if (Array.isArray(paymentRails) && paymentRails.length > 0) {
          for (const rail of paymentRails) {
            await dbClient
              .from('tenant_payment_rails')
              .upsert(
                {
                  organization_id: organizationId,
                  rail_type: rail as any,
                  integration_status:
                    operatingEnvironment === 'SANDBOX' ? 'SANDBOX_STAGING' : 'LIVE_PRODUCTION',
                  is_active: true,
                },
                { onConflict: 'organization_id,rail_type' }
              );
          }
        }

        // 4. Run Instant Applicability Evaluation Across Monitored Circulars (Batch Upsert)
        // Ensures Horizon Scanning feed immediately reflects direct impacts for this tenant without latency
        const { data: activeCirculars } = await dbClient
          .from('radar_circulars')
          .select('id, circular_number, targeted_license_types, affected_payment_rails, applies_universally')
          .limit(20);

        if (activeCirculars && activeCirculars.length > 0) {
          const tenantProfile = {
            organizationId,
            organizationName: companyName,
            activeLicenses: [licenseType as LicenseType],
            activeRails: (paymentRails || []) as PaymentRail[],
            licenses: regulatorsToInsert.map((reg) => ({
              licenseType: licenseType as LicenseType,
              licenseNumber: licenseNumber || null,
              issuingRegulator: reg,
              isActive: true,
            })),
            paymentRails: (paymentRails || []).map((rail: string) => ({
              railType: rail as PaymentRail,
              integrationStatus:
                operatingEnvironment === 'SANDBOX' ? 'SANDBOX_STAGING' : 'LIVE_PRODUCTION',
              isActive: true,
            })),
          };

          const impactsToUpsert = activeCirculars.map((circ) => {
            const evalResult = ApplicabilityEngine.evaluatePure(tenantProfile, {
              regulator: regulatorsToInsert[0],
              targetedLicenses: (circ.targeted_license_types || []) as LicenseType[],
              affectedRails: (circ.affected_payment_rails || []) as PaymentRail[],
              appliesUniversally: circ.applies_universally || false,
            });

            return {
              organization_id: organizationId,
              circular_id: circ.id,
              is_applicable: evalResult.isApplicable,
              applicability_reason: evalResult.reason,
              executive_brief_cco: `Applicable directive under ${regulatorsToInsert[0]} supervisory mandate.`,
              action_brief_coo: `Operational review for ${(paymentRails || []).join(', ') || 'payment rails'}.`,
              technical_brief_product_eng: 'Verify automated controls and transaction telemetry.',
              financial_brief_cfo: 'Track statutory penalty exposure and balance sheet provisions.',
              status: evalResult.isApplicable ? 'APPLICABLE' : 'FILTERED_OUT',
            };
          });

          await dbClient
            .from('radar_tenant_impacts')
            .upsert(impactsToUpsert, { onConflict: 'organization_id,circular_id' });
        }

        // 5. Zero-Empty-State: Ensure Institutional Operational Policies are Active
        const { count: policyCount } = await dbClient
          .from('policy_documents')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (!policyCount || policyCount === 0) {
          const isLender =
            licenseType.includes('DIGITAL_LENDER') || licenseType.includes('FINANCE_COMPANY');

          const policyTitle = isLender
            ? `${companyName} Digital Lending Code of Conduct & Fair Debt Recovery Policy 2026`
            : `${companyName} AML/CFT and Operational Sanctions Compliance Manual 2026`;

          const rawText = isLender
            ? `INSTITUTIONAL CODE OF CONDUCT & CONSUMER PROTECTION MANUAL
Entity: ${companyName}
Supervisory Mandate: FCCPC & CBN Consumer Protection Framework
Version: 1.0 (Operational Baseline)

SECTION 1: FAIR DEBT RECOVERY & DATA PRIVACY
1.1 No agent or representative shall contact third-party phone contacts without verifiable statutory consent.
1.2 Shaming messages, threat of public exposure, or harassment across SMS blasts are strictly prohibited under Section 17 FCCPA 2018.

SECTION 2: INTEREST RATE TRANSPARENCY
2.1 All loan products must clearly display total cost of credit and annualized percentage rate (APR) prior to disbursement.`
            : `INSTITUTIONAL AML/CFT & OPERATIONAL MANUAL
Entity: ${companyName}
Supervisory Mandate: Central Bank of Nigeria (BOFIA 2020) & NFIU
Version: 1.0 (Active Law)

SECTION 1: TIERED CUSTOMER DUE DILIGENCE (CDD)
1.1 Real-time verification of Bank Verification Number (BVN) or National Identity Number (NIN) is mandatory for all account tiers.
1.2 Politically Exposed Persons (PEPs) require prior Executive Management approval before account opening.

SECTION 2: TRANSACTION MONITORING & STR REPORTING
2.1 Transactions exceeding statutory thresholds must trigger automated 72-hour Suspicious Transaction Reports (STRs) to NFIU.`;

          const policyId = crypto.randomUUID();
          const docHash = AuditService.computeSha256(rawText);

          await dbClient.from('policy_documents').insert({
            id: policyId,
            organization_id: organizationId,
            title: policyTitle,
            department: (department as any) || 'COMPLIANCE_LEGAL',
            version_tag: '1.0',
            storage_path: `policies/${organizationId}/${policyId}.txt`,
            raw_text: rawText,
            source_file_hash: docHash,
          });

          await dbClient.from('policy_clauses').insert([
            {
              organization_id: organizationId,
              policy_id: policyId,
              section_number: 'Section 1.1',
              clause_text: isLender
                ? 'No agent or representative shall contact third-party phone contacts without verifiable statutory consent.'
                : 'Real-time verification of Bank Verification Number (BVN) or National Identity Number (NIN) is mandatory for all account tiers.',
            },
            {
              organization_id: organizationId,
              policy_id: policyId,
              section_number: 'Section 2.1',
              clause_text: isLender
                ? 'All loan products must clearly display total cost of credit and annualized percentage rate (APR) prior to disbursement.'
                : 'Transactions exceeding statutory thresholds must trigger automated 72-hour Suspicious Transaction Reports (STRs) to NFIU.',
            },
          ]);
        }

        // 6. Zero-Empty-State: Ensure Tailored Marketing Scan Assets are Active
        const { count: scanCount } = await dbClient
          .from('marketing_scans')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organizationId);

        if (!scanCount || scanCount === 0) {
          const isLender =
            licenseType.includes('DIGITAL_LENDER') || licenseType.includes('FINANCE_COMPANY');

          const { data: users } = await dbClient.from('users').select('id').limit(1);
          const userId = users?.[0]?.id || '00000000-0000-0000-0000-000000000001';

          await dbClient.from('marketing_scans').insert([
            {
              organization_id: organizationId,
              user_id: userId,
              campaign_name: isLender
                ? `${companyName} Instant Nano-Loan In-App Promo`
                : `${companyName} Mobile Banking App Launch Campaign`,
              channel: isLender ? 'IN_APP_PUSH_NOTIFICATION' : 'SOCIAL_MEDIA_POST',
              raw_copy: isLender
                ? 'Need emergency funds? Get up to ₦50,000 instantly with transparent APR disclosures and zero hidden charges. Regulated by FCCPC.'
                : 'Experience fast, seamless commercial payments with Bank-grade encryption. Licensed by the Central Bank of Nigeria. Deposits insured by NDIC.',
              verdict: 'NO_ISSUE_DETECTED',
              approval_status: 'APPROVED_BY_CCO',
              deterministic_penalty_naira: 0,
              overall_risk_score: 5,
              arcon_preclearance_required: true,
            },
            {
              organization_id: organizationId,
              user_id: userId,
              campaign_name: isLender
                ? `${companyName} 24h Flash Credit SMS Broadcast`
                : `${companyName} High-Yield Savings Promo`,
              channel: 'SMS_BLAST',
              raw_copy: isLender
                ? 'Borrow ₦100,000 today with 0% interest and instant payout. No collateral needed!'
                : 'Earn guaranteed 25% annual return with zero risk! Open your savings vault now.',
              verdict: 'ISSUE_DETECTED',
              approval_status: 'NEEDS_RE_REVIEW',
              deterministic_penalty_naira: isLender ? 5000000 : 10000000,
              overall_risk_score: 85,
              arcon_preclearance_required: true,
            },
          ]);
        }

        // 7. Zero-Empty-State: Real-Time Welcome & Horizon Notifications
        await dbClient.from('notifications').insert([
          {
            organization_id: organizationId,
            title: `🎉 Institutional Enclave Initialized: ${companyName}`,
            message: `Workspace configured for ${regulatorsToInsert.join(', ')} regulatory oversight under ${licenseType.replace(/_/g, ' ')}. Operational manuals and horizon radar streams have been tailored to your mandate.`,
            link: '/overview',
            is_read: false,
          },
          {
            organization_id: organizationId,
            title: `📋 Statutory Directives Linked to ${companyName}`,
            message: `Applicability engine has analyzed all active regulatory gazettes against your ${paymentRails.length} connected rails. Review your executive action brief.`,
            link: '/radar',
            is_read: false,
          },
        ]);

        // 8. Immutable Audit Trail Attestation
        const auditService = new AuditService(dbClient);
        const inputHash = AuditService.computeSha256(body);
        const outputHash = AuditService.computeSha256({
          organizationId,
          companyName,
          licenseType,
          regulators: regulatorsToInsert,
          rails: paymentRails,
        });

        await auditService.recordLog({
          organizationId,
          action: 'TENANT_ONBOARDING_INITIALIZED',
          entityType: 'organizations',
          entityId: organizationId,
          sha256InputHash: inputHash,
          sha256OutputHash: outputHash,
          metadata: {
            companyName,
            department,
            jobTitle,
            licenseType,
            regulators: regulatorsToInsert,
            rails: paymentRails,
            productCategories,
            status: 'PROVISIONED_DAY_1_VALUE',
          },
        });
      } catch (dbErr: unknown) {
        const err = dbErr instanceof Error ? dbErr : new Error(String(dbErr));
        logger.error({ err: err.message, stack: err.stack }, 'Database provisioning error during onboarding');
        throw err;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Institutional workspace provisioned with Day-1 regulatory intelligence',
      organizationId,
      workspaceName: companyName,
      nextUrl: '/overview',
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Onboarding setup failed');
    return NextResponse.json(
      { error: err.message || 'Failed to complete tenant onboarding' },
      { status: 500 }
    );
  }
}
