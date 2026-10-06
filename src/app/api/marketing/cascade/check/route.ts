import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { defaultMarketingCascadeListener } from '@/modules/marketing-shield/services/marketingCascadeListener';
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

    const tenantCtx = await getTenantContext();
    const organizationId = parsed.data.organizationId || tenantCtx.organizationId;
    const userId = parsed.data.userId || tenantCtx.userId;

    const result = await defaultMarketingCascadeListener.checkMarketingDrift({
      circularId: parsed.data.circularId,
      organizationId,
      userId,
      simulate: parsed.data.simulate,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed checking marketing cascade drift');
    return NextResponse.json(
      { error: error.message || 'Failed checking marketing cascade drift' },
      { status: 500 }
    );
  }
}
