import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { CascadeTriggerService } from '@/modules/radar/services/cascadeTriggerService';
import { getTenantContext } from '@/shared/auth';
import { logger } from '@/shared/logger';

const TriggerCascadeInputSchema = z.object({
  circularId: z.string().min(1, 'circularId is required'),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  overrideDomain: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TriggerCascadeInputSchema.safeParse(body);

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
    const cascadeTriggerService = new CascadeTriggerService({ dbClient: tenantCtx.dbClient });

    const result = await cascadeTriggerService.triggerGapReEvaluation({
      circularId: parsed.data.circularId,
      organizationId,
      userId,
      overrideDomain: parsed.data.overrideDomain,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed triggering cascade gap re-evaluation');
    return NextResponse.json(
      { error: err.message || 'Failed triggering cascade gap re-evaluation' },
      { status: 500 }
    );
  }
}
