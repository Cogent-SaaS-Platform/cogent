import { NextRequest } from 'next/server';
import {
  GET as handleGet,
  POST as handlePost,
  PATCH as handlePatch,
  DELETE as handleDelete,
} from '@/app/api/gap-matrix/evaluations/route';

export const dynamic = 'force-dynamic';

/**
 * Standardized /api/gap-analyses endpoint
 * Delegates to the production concordance evaluation engine
 */
export async function GET(req: NextRequest) {
  return handleGet(req);
}

export async function POST(req: NextRequest) {
  return handlePost(req);
}

export async function PATCH(req: NextRequest) {
  return handlePatch(req);
}

export async function DELETE(req: NextRequest) {
  return handleDelete(req);
}
