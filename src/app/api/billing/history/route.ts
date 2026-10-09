/**
 * Cogent Tenant Billing History Route
 * GET /api/billing/history
 * 
 * Returns historical transactions and billing events for the tenant.
 */

import { NextResponse } from 'next/server';
import { getTenantContext } from '@/shared/auth';
import { createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { AppError } from '@/shared/errors';

export async function GET(): Promise<NextResponse> {
  try {
    const tenantCtx = await getTenantContext();
    const adminDb = createAdminClient();

    const { data: events, error } = await adminDb
      .from('billing_events')
      .select('id, event_id, event_type, payload, processed_at')
      .eq('organization_id', tenantCtx.organizationId)
      .order('processed_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error({ error: error.message }, 'Failed to query billing events for tenant');
      throw new AppError({
        message: 'Failed to retrieve billing history',
        code: 'INTERNAL_SERVER_ERROR',
        statusCode: 500,
      });
    }

    const formattedHistory = (events || []).map((evt) => {
      const payload = evt.payload as {
        data?: {
          amount?: number;
          status?: string;
          reference?: string;
          channel?: string;
        };
      } | null;
      const amount = payload?.data?.amount
        ? `₦${(payload.data.amount / 100).toLocaleString()}`
        : '₦0';

      return {
        id: evt.id,
        eventId: evt.event_id,
        eventType: evt.event_type,
        date: evt.processed_at,
        amount,
        status: payload?.data?.status || 'success',
        reference: payload?.data?.reference || evt.event_id,
        channel: payload?.data?.channel || 'card',
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedHistory,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return NextResponse.json(err.toJSON(), { status: err.statusCode });
    }

    const error = err instanceof Error ? err : new Error(String(err));
    logger.error({ error: error.message }, 'Error retrieving billing history');
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
