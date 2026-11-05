import { NextRequest, NextResponse } from 'next/server';
import { GET as radarGetDetail, PATCH as radarPatchDetail } from '@/app/api/radar/circulars/[id]/route';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return radarGetDetail(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return radarPatchDetail(req, context);
}
