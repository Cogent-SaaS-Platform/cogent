import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MarketingCascadeListener } from '@/modules/marketing-shield/services/marketingCascadeListener';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

const MarketingCascadeCheckInputSchema = z.object({
  circularId: z.string().min(1, 'circularId is required'),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  simulate: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = MarketingCascadeCheckInputSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          details: parsed.error.issues,
        },
        { status: 400 }
      );
    }

    const tenantCtx = await getTenantContext({ allowDevFallback: true });
    const organizationId =
      tenantCtx.isDevFallback && parsed.data.organizationId
        ? parsed.data.organizationId
        : tenantCtx.organizationId;
    const userId =
      tenantCtx.isDevFallback && parsed.data.userId
        ? parsed.data.userId
        : tenantCtx.userId;
    const marketingCascadeListener = new MarketingCascadeListener({ dbClient: tenantCtx.dbClient });

    const result = await marketingCascadeListener.checkMarketingDrift({
      circularId: parsed.data.circularId,
      organizationId,
      userId,
      simulate: parsed.data.simulate,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed checking marketing cascade drift');
    return NextResponse.json(
      { error: err.message || 'Failed checking marketing cascade drift' },
      { status: 500 }
    );
  }
}
