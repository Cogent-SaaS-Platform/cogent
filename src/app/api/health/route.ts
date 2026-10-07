import { NextResponse } from 'next/server';

/**
 * Public Synthetic Health & Uptime Probe (Phase A2 / Task A2.1)
 * Used by uptime monitors and edge health checks.
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'cogent-platform',
    version: '0.1.0',
    runtime: 'edge/node-pinned-fra1',
  });
}
