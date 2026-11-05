import { NextRequest, NextResponse } from 'next/server';
import { POST as radarResynthesize } from '@/app/api/radar/circulars/[id]/resynthesize/route';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return radarResynthesize(req, context);
}
