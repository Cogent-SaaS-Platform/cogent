import crypto from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { ConfigurationError } from '@/shared/errors';
import { logger } from '@/shared/logger';
import { RadarPriority, RegulatorCode } from '@/shared/types';
import { sendUrgentComplianceAlert } from '@/shared/notifications';

export interface DispatchNotificationParams {
  organizationId: string;
  circularId: string;
  circularNumber: string;
  regulatorCode: RegulatorCode;
  subject: string;
  priority: RadarPriority;
  statutoryDeadline: string | null;
  actionItemsCount: number;
  recipientEmail?: string;
  organizationName?: string;
}

export interface NotificationDispatchResult {
  notificationId: string;
  status: 'DELIVERED_IN_APP' | 'SUPPRESSED_LOW_PRIORITY';
  emailAlertTriggered: boolean;
}

/**
 * Actionable Notification & Alert Escalation Service (Task 12.3 & Task A3.3)
 * Dispatches in-app notifications and real transactional email alerts for high & critical regulatory circulars via Resend.
 */
export class RadarNotificationService {
  private dbClient: SupabaseClient<Database>;

  constructor(options: { dbClient: SupabaseClient<Database> } | SupabaseClient<Database>) {
    const client = options && 'dbClient' in options ? options.dbClient : (options as SupabaseClient<Database>);
    if (!client) {
      throw new ConfigurationError('RadarNotificationService requires an RLS-bound SupabaseClient');
    }
    this.dbClient = client;
  }

  /**
   * Dispatches actionable notification and triggers real transactional Resend email for urgent circulars
   */
  public async dispatchUrgentAlert(
    params: DispatchNotificationParams
  ): Promise<NotificationDispatchResult> {
    const {
      organizationId,
      circularId,
      circularNumber,
      regulatorCode,
      subject,
      priority,
      statutoryDeadline,
      actionItemsCount,
      recipientEmail,
      organizationName,
    } = params;

    const notificationId = crypto.randomUUID();
    const isUrgent = priority === 'HIGH' || priority === 'CRITICAL_EMERGENCY';

    const deadlineText = statutoryDeadline
      ? `Mandatory compliance deadline: ${statutoryDeadline}.`
      : 'Immediate regulatory adherence required.';

    const title = isUrgent
      ? `🚨 Urgent ${regulatorCode} Directive: ${circularNumber}`
      : `New ${regulatorCode} Circular: ${circularNumber}`;

    const message = `${subject}. ${deadlineText} ${actionItemsCount} action item${
      actionItemsCount === 1 ? '' : 's'
    } assigned to internal departments.`;

    if (this.dbClient) {
      try {
        const client = this.dbClient as unknown as {
          from: (table: string) => {
            insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
          };
        };
        await client.from('notifications').insert({
          id: notificationId,
          organization_id: organizationId,
          user_id: null,
          title,
          message,
          type: 'REGULATORY_ALERT',
          action_url: `/radar?circularId=${circularId}`,
          is_read: false,
        });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        logger.warn({ error: error.message }, 'Failed to insert notification into database');
      }
    }

    logger.info(
      {
        organizationId,
        circularNumber,
        priority,
        isUrgent,
        notificationId,
      },
      'Radar notification dispatched'
    );

    // Dispatch real transactional email via Resend for high/critical directives
    let emailAlertTriggered = false;
    if (isUrgent) {
      let resolvedOrgName = organizationName;
      if (!resolvedOrgName && this.dbClient) {
        try {
          const response = await this.dbClient
            .from('organizations')
            .select('name')
            .eq('id', organizationId)
            .single();
          const org = response.data as { name: string } | null;
          if (org?.name) {
            resolvedOrgName = org.name;
          }
        } catch (orgLookupErr: unknown) {
          logger.warn(
            { organizationId, error: orgLookupErr instanceof Error ? orgLookupErr.message : String(orgLookupErr) },
            'Could not resolve organization name for email alert'
          );
        }
      }

      const effectiveDate = statutoryDeadline || 'Immediate';
      const urgencyLevel: 'CRITICAL' | 'HIGH' | 'NORMAL' =
        priority === 'CRITICAL_EMERGENCY' ? 'CRITICAL' : 'HIGH';

      emailAlertTriggered = await sendUrgentComplianceAlert({
        recipientEmail:
          recipientEmail ||
          process.env.COMPLIANCE_ALERTS_EMAIL ||
          'compliance@paystack.fintech.internal',
        organizationName: resolvedOrgName || 'Authorized Tenant',
        circularNumber,
        circularTitle: subject,
        effectiveDate,
        urgencyLevel,
      });
    }

    return {
      notificationId,
      status: 'DELIVERED_IN_APP',
      emailAlertTriggered,
    };
  }
}
