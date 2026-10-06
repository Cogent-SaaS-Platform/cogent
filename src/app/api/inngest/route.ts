import { NextRequest, NextResponse } from 'next/server';
import { handleCircularIngested } from '@/modules/radar/inngest/circularIngestionHandler';
import { logger } from '@/shared/logger';

/**
 * Inngest Webhook Route Handler (ADR-006)
 * Processes asynchronous events for document parsing and deadline escalation
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const eventName = body.name || body.event?.name;
    const eventData = body.data || body.event?.data;

    logger.info({ eventName }, 'Inngest webhook received event');

    if (eventName === 'radar/circular.ingested') {
      const result = await handleCircularIngested({ data: eventData });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({
      success: true,
      message: `Event '${eventName}' acknowledged`,
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Inngest webhook handler error');
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ACTIVE',
    service: 'Cogent Inngest Workflow Handler',
    supportedEvents: ['radar/circular.ingested', 'radar/tenant.evaluated'],
  });
}
