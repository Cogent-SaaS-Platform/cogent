import { NextRequest, NextResponse } from 'next/server';
import { POST as radarIngest } from '@/app/api/radar/circulars/ingest/route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return radarIngest(req);
}
