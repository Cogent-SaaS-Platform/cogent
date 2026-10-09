import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { LineageService } from '@/modules/radar/services/lineageService';
import { logger } from '@/shared/logger';
import { AmendmentType } from '@/shared/types';

export async function GET(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const lineageService = new LineageService({ dbClient: tenantCtx.dbClient });
    const { searchParams } = new URL(req.url);
    const circularId = searchParams.get('circularId');

    if (!circularId) {
      return NextResponse.json(
        { success: false, error: 'Query parameter circularId is required' },
        { status: 400 }
      );
    }

    const lineageGraph = await lineageService.resolveLineageGraph(circularId);

    return NextResponse.json({
      success: true,
      data: lineageGraph,
    });
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to resolve circular lineage graph');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to resolve lineage' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const tenantCtx = await getTenantContext();
    const lineageService = new LineageService({ dbClient: tenantCtx.dbClient });
    const body = await req.json();
    const { parentCircularId, childCircularId, amendmentType, affectedClauseReferences } = body;

    if (!parentCircularId || !childCircularId || !amendmentType) {
      return NextResponse.json(
        {
          success: false,
          error: 'parentCircularId, childCircularId, and amendmentType are required',
        },
        { status: 400 }
      );
    }

    const validTypes: AmendmentType[] = [
      'AMENDS',
      'REPLACES',
      'REVOKES_AND_REPLACES',
      'REPEALS',
      'PARTIALLY_REPEALS',
      'CITES',
    ];

    if (!validTypes.includes(amendmentType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid amendmentType. Must be one of: ${validTypes.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const edge = await lineageService.createSupersessionLink({
      parentCircularId,
      childCircularId,
      amendmentType,
      affectedClauseReferences,
    });

    return NextResponse.json(
      {
        success: true,
        data: edge,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error({ error: err.message }, 'Failed to create circular supersession link');
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to create supersession link' },
      { status: 500 }
    );
  }
}
