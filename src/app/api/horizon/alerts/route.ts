import { NextRequest } from 'next/server';
import { GET as radarGet } from '@/app/api/radar/circulars/route';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return radarGet(req);
}
