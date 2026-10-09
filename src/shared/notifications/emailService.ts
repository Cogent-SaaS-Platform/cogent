import { Resend } from 'resend';
import { logger } from '@/shared/logger';
import { ConfigurationError } from '@/shared/errors';

/**
 * Resend Transactional Email Client Configuration
 * Adheres strictly to docs/launch/PHASE_A3_APIS_WORKERS_INTEGRATIONS.md & docs/SECURITY.md
 */
const resendApiKey: string = process.env.RESEND_API_KEY || '';

export function getResendClient(): Resend {
  const isBuildPhase =
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.npm_lifecycle_event === 'build' ||
    Boolean(process.env.CI);

  if (process.env.NODE_ENV === 'production' && !isBuildPhase && !resendApiKey) {
    throw new ConfigurationError('RESEND_API_KEY is required in production environment');
  }
  return new Resend(resendApiKey || 're_mock_api_key_placeholder');
}

export const resend: Resend = getResendClient();

export interface ComplianceAlertPayload {
  recipientEmail: string;
  organizationName: string;
  circularNumber: string;
  circularTitle: string;
  effectiveDate: string;
  urgencyLevel: 'CRITICAL' | 'HIGH' | 'NORMAL';
}

export interface EmailDispatchSuccess {
  id: string;
}

/**
 * Dispatches an urgent regulatory compliance alert transactional email via Resend
 * 
 * @param payload Metadata describing the regulatory directive and recipient organization
 * @returns boolean indicating whether the email was accepted by the Resend network API
 */
export async function sendUrgentComplianceAlert(
  payload: ComplianceAlertPayload
): Promise<boolean> {
  const fromAddress: string =
    process.env.RESEND_FROM_EMAIL || 'Cogent Regulatory Alerts <alerts@compliance.cogent.africa>';

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [payload.recipientEmail],
      subject: `[ACTION REQUIRED] Regulatory Update: ${payload.circularNumber}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #dc2626; padding-bottom: 16px; margin-bottom: 20px;">
            <span style="display: inline-block; padding: 4px 8px; background-color: #fee2e2; color: #dc2626; font-size: 12px; font-weight: 700; border-radius: 4px; text-transform: uppercase;">
              ${payload.urgencyLevel} DIRECTIVE
            </span>
            <h2 style="color: #111827; margin: 12px 0 0 0; font-size: 20px;">Urgent Regulatory Directive Issued</h2>
          </div>
          <p style="color: #374151; font-size: 15px; line-height: 1.5;">
            Dear Compliance Officer at <strong>${payload.organizationName}</strong>,
          </p>
          <p style="color: #374151; font-size: 15px; line-height: 1.5;">
            A new binding regulatory circular impacting your operating licenses and transactional rails has been published:
          </p>
          <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <ul style="list-style-type: none; padding: 0; margin: 0; font-size: 14px; color: #1f2937;">
              <li style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>Circular Ref:</strong> ${payload.circularNumber}</li>
              <li style="padding: 6px 0; border-bottom: 1px solid #f3f4f6;"><strong>Title:</strong> ${payload.circularTitle}</li>
              <li style="padding: 6px 0;"><strong>Effective Date:</strong> ${payload.effectiveDate}</li>
            </ul>
          </div>
          <div style="margin: 28px 0; text-align: center;">
            <a href="https://compliance.cogent.africa/radar?circularNumber=${encodeURIComponent(payload.circularNumber)}" 
               style="display: inline-block; padding: 12px 28px; background-color: #1e40af; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 6px;">
              Open Regulatory Radar Cockpit
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 12px; color: #6b7280; margin: 0; text-align: center;">
            Project Cogent — Automated RegTech for Nigerian Financial Institutions.<br/>
            Adheres to NDPA 2023, CBN BOFIA 2020, and SEC Regulatory Sandboxes.
          </p>
        </div>
      `,
    });

    if (error) {
      logger.error(
        {
          error: error.message,
          name: error.name,
          circularNumber: payload.circularNumber,
          organizationName: payload.organizationName,
        },
        'Resend API rejected transactional compliance alert'
      );
      return false;
    }

    logger.info(
      {
        emailId: data?.id,
        circularNumber: payload.circularNumber,
        organizationName: payload.organizationName,
        urgencyLevel: payload.urgencyLevel,
      },
      'Urgent compliance email successfully dispatched via Resend'
    );

    return true;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error(
      {
        error: err.message,
        stack: err.stack,
        circularNumber: payload.circularNumber,
        organizationName: payload.organizationName,
      },
      'Failed to dispatch Resend email alert over network'
    );
    return false;
  }
}
