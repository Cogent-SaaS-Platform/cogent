import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getTenantContext } from '@/shared/auth';
import { ClaimsLedgerService } from '@/modules/marketing-shield/claimsLedgerService';
import { ProductCategoryCode, RegulatorCode } from '@/shared/types';
import { logger } from '@/shared/logger';

const CreateClaimRequestSchema = z.object({
  productCategory: z.enum([
    'SAVINGS_DEPOSIT',
    'DIGITAL_NANO_LOAN',
    'PAYMENTS_WALLET',
    'REMITTANCE_FX',
    'WEALTHTECH_INVEST',
  ] as const),
  approvedText: z.string().min(1, 'Approved text cannot be blank'),
  prohibitedCounterpart: z.string().optional(),
  governingRegulator: z.enum(['CBN', 'ARCON', 'SEC', 'NDPC', 'FCCPC', 'NFIU'] as const),
  statutoryCitation: z.string().min(1, 'Statutory citation cannot be blank'),
  ccoRationale: z.string().min(1, 'CCO rationale cannot be blank'),
  expiresAt: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as ProductCategoryCode | null;

    const claimsService = new ClaimsLedgerService(tenantCtx.dbClient);
    const claims = await claimsService.getActiveClaims(
      tenantCtx.organizationId,
      category || undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        organizationId: tenantCtx.organizationId,
        category: category || 'ALL',
        count: claims.length,
        claims,
      },
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch tenant claims ledger');
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch claims' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const body = await req.json();

    const parseResult = CreateClaimRequestSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      productCategory,
      approvedText,
      prohibitedCounterpart,
      governingRegulator,
      statutoryCitation,
      ccoRationale,
      expiresAt,
    } = parseResult.data;

    const claimsService = new ClaimsLedgerService(tenantCtx.dbClient);
    const newClaim = await claimsService.addApprovedClaim({
      organizationId: tenantCtx.organizationId,
      productCategory,
      approvedText,
      prohibitedCounterpart,
      governingRegulator,
      statutoryCitation,
      ccoRationale,
      approvedByUserId: tenantCtx.userId,
      expiresAt,
    });

    return NextResponse.json(
      {
        success: true,
        data: newClaim,
      },
      { status: 201 }
    );
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to save claim to ledger');
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to save claim' },
      { status: 500 }
    );
  }
}
