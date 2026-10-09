import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '@/shared/logger';
import { AuditService } from '@/modules/audit';
import { getTenantContext } from '@/shared/auth';
import { ClaimsLedgerService } from '@/modules/marketing-shield/claimsLedgerService';

const SignoffRequestSchema = z.object({
  scanId: z.string().optional(),
  campaignName: z.string(),
  status: z.enum(['APPROVED_BY_CCO', 'MODIFIED_AND_APPROVED', 'REJECTED'] as const),
  reviewerName: z.string().min(1, 'Reviewer name is required'),
  reviewerTitle: z.string().default('Chief Compliance Officer'),
  attestationNotes: z.string().optional(),
  auditHash: z.string().optional(),
  saveToClaimsLedger: z.boolean().optional(),
  claimData: z
    .object({
      productCategory: z.enum([
        'SAVINGS_DEPOSIT',
        'DIGITAL_NANO_LOAN',
        'PAYMENTS_WALLET',
        'REMITTANCE_FX',
        'WEALTHTECH_INVEST',
      ] as const),
      approvedText: z.string().min(1),
      prohibitedCounterpart: z.string().optional(),
      governingRegulator: z.enum(['CBN', 'ARCON', 'SEC', 'NDPC', 'FCCPC', 'NFIU'] as const),
      statutoryCitation: z.string().min(1),
      ccoRationale: z.string().min(1),
    })
    .optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validationResult = SignoffRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      scanId,
      campaignName,
      status,
      reviewerName,
      reviewerTitle,
      attestationNotes,
      auditHash,
      saveToClaimsLedger,
      claimData,
    } = validationResult.data;

    // Resolve tenant context from Clerk session or dev fallback
    const tenantCtx = await getTenantContext();
    const timestamp = new Date().toISOString();

    const signoffPayload = JSON.stringify({
      campaignName,
      status,
      reviewerName,
      reviewerTitle,
      attestationNotes,
      timestamp,
      previousAuditHash: auditHash,
    });

    const attestationHash = crypto.createHash('sha256').update(signoffPayload).digest('hex');

    // Update approval status on marketing_scans record if scanId provided
    if (scanId) {
      try {
        await tenantCtx.dbClient
          .from('marketing_scans')
          .update({
            approval_status: status,
            approved_by_user_id: tenantCtx.userId,
            approved_at: timestamp,
          })
          .eq('id', scanId)
          .eq('organization_id', tenantCtx.organizationId);
      } catch (dbErr) {
        logger.warn({ dbErr, scanId }, 'Could not update scan approval status in marketing_scans table');
      }
    }

    // Optionally persist approved phrasing to tenant_claims_ledger (Task 1.2)
    let savedClaim = null;
    if (saveToClaimsLedger && claimData) {
      try {
        const claimsLedgerService = new ClaimsLedgerService(tenantCtx.dbClient);
        savedClaim = await claimsLedgerService.addApprovedClaim({
          organizationId: tenantCtx.organizationId,
          productCategory: claimData.productCategory,
          approvedText: claimData.approvedText,
          prohibitedCounterpart: claimData.prohibitedCounterpart,
          governingRegulator: claimData.governingRegulator,
          statutoryCitation: claimData.statutoryCitation,
          ccoRationale: claimData.ccoRationale,
          approvedByUserId: tenantCtx.userId,
        });
      } catch (claimErr) {
        logger.warn({ claimErr }, 'Could not add approved claim to tenant_claims_ledger');
      }
    }

    // Record immutable audit log entry in audit_logs table
    const auditService = new AuditService(tenantCtx.dbClient);
    await auditService.recordLog({
      organizationId: tenantCtx.organizationId,
      userId: tenantCtx.userId,
      action: 'CCO_SIGNOFF_RECORDED',
      entityType: 'marketing_scans',
      entityId: scanId || crypto.randomUUID(),
      sha256InputHash: auditHash || '0000000000000000000000000000000000000000000000000000000000000000',
      sha256OutputHash: attestationHash,
      metadata: {
        campaignName,
        status,
        reviewerName,
        reviewerTitle,
        attestationNotes: attestationNotes || 'Authorized for deployment across designated channel.',
        timestamp,
        savedClaimId: savedClaim?.id,
      },
    });

    logger.info(
      {
        organizationId: tenantCtx.organizationId,
        userId: tenantCtx.userId,
        campaignName,
        status,
        reviewerName,
        reviewerTitle,
        attestationHash,
        savedClaimId: savedClaim?.id,
      },
      'CCO formal sign-off recorded'
    );

    return NextResponse.json({
      success: true,
      data: {
        status,
        reviewedBy: `${reviewerName} (${reviewerTitle})`,
        reviewedAt: timestamp,
        attestationNotes: attestationNotes || 'Authorized for deployment across designated channel.',
        attestationHash,
        savedClaim,
      },
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to record CCO sign-off');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to record sign-off' },
      { status: 500 }
    );
  }
}
