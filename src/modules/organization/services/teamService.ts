import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/shared/db';
import { logger } from '@/shared/logger';
import { AuditService } from '@/modules/audit/auditService';
import {
  TeamMember,
  FunctionalRole,
  AlertAssignmentPayload,
  ActionItemAssignmentPayload,
  ObligationAssignmentPayload,
} from '../types';

/**
 * Computes uppercase initials from a person's full name.
 * e.g. "Chioma Okonkwo" -> "CO", "Alex Marco" -> "AM", "Tunde" -> "TU"
 */
export function computeInitials(fullName: string): string {
  if (!fullName) return 'U';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Canonical sovereign financial institution roles for Nigerian financial institutions
 * Mapped to standard operational departments.
 */
export const CANONICAL_FUNCTIONAL_ROLES: FunctionalRole[] = [
  {
    roleId: 'CCO',
    roleTitle: 'Chief Compliance Officer',
    department: 'COMPLIANCE_LEGAL',
    statutoryScope: 'BOFIA 2020 §65, AML/CFT/CPF & Statutory Filings',
  },
  {
    roleId: 'GC',
    roleTitle: 'General Counsel',
    department: 'COMPLIANCE_LEGAL',
    statutoryScope: 'Statutory Interpretation, Legal Defense & Corporate Governance',
  },
  {
    roleId: 'CRO',
    roleTitle: 'Chief Risk Officer',
    department: 'RISK_INTERNAL_AUDIT',
    statutoryScope: 'Prudential Guidelines, Capital Ratios & Credit Limits',
  },
  {
    roleId: 'HEAD_IT',
    roleTitle: 'Head of IT Infrastructure',
    department: 'ENGINEERING_TECH',
    statutoryScope: 'CBN Cybersecurity Framework & Core Settlement Resilience',
  },
  {
    roleId: 'CISO',
    roleTitle: 'Chief Information Security Officer',
    department: 'ENGINEERING_TECH',
    statutoryScope: 'NDPA 2023, Data Protection & Infosec Controls',
  },
  {
    roleId: 'COO',
    roleTitle: 'Chief Operating Officer',
    department: 'OPERATIONS',
    statutoryScope: 'Operational SLAs, Branch Operations & Customer Safeguards',
  },
  {
    roleId: 'CFO',
    roleTitle: 'Chief Financial Officer',
    department: 'TREASURY_FINANCE',
    statutoryScope: 'Statutory Reserves, Liquidity Ratios & BOFIA Capital Adequacy',
  },
  {
    roleId: 'HEAD_AUDIT',
    roleTitle: 'Head of Internal Audit',
    department: 'RISK_INTERNAL_AUDIT',
    statutoryScope: 'Third-Line Defense & Supervisory Inspection Readiness',
  },
];

/**
 * Organization Team Service
 * Provides multi-tenant team member resolution, functional statutory role mapping,
 * and cryptographic audit-logged delegation across Radar alerts, Action items, and Obligations.
 */
export class TeamService {
  private dbClient: SupabaseClient<Database>;
  private auditService: AuditService;

  constructor(dbClient: SupabaseClient<Database>) {
    this.dbClient = dbClient;
    this.auditService = new AuditService(this.dbClient);
  }

  /**
   * Resolves all verified members of a given tenant organization.
   * Enforces strict multi-tenant data isolation:
   * A tenant will strictly NEVER receive members of another organization.
   */
  public async getTeamMembers(organizationId: string): Promise<TeamMember[]> {
    if (!organizationId) {
      throw new Error('Organization ID is required to resolve team members');
    }

    try {
      // 1. Query memberships strictly scoped to the tenant's organization ID
      const { data: memberships, error: memError } = await this.dbClient
        .from('organization_memberships')
        .select('id, organization_id, user_id, role, department, job_title, created_at')
        .eq('organization_id', organizationId);

      if (memError) {
        logger.error({ error: memError.message, organizationId }, 'Failed to query organization memberships');
        throw new Error(`Database error resolving organization memberships: ${memError.message}`);
      }

      if (!memberships || memberships.length === 0) {
        return [];
      }

      const userIds = Array.from(new Set(memberships.map((m) => m.user_id).filter(Boolean)));
      if (userIds.length === 0) {
        return [];
      }

      // 2. Fetch associated user profile records
      const { data: users, error: userError } = await (this.dbClient.from('users') as any)
        .select('id, email, full_name, avatar_url, job_title')
        .in('id', userIds);

      if (userError) {
        logger.error({ error: userError.message, organizationId }, 'Failed to fetch user profiles for memberships');
        throw new Error(`Database error fetching user profiles: ${userError.message}`);
      }

      const userMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));

      // 3. Compose clean TeamMember models
      const members: TeamMember[] = [];
      for (const m of memberships) {
        const user = userMap.get(m.user_id);
        if (!user) continue;

        members.push({
          id: m.id,
          userId: user.id,
          fullName: user.full_name || 'Team Member',
          email: user.email || '',
          orgRole: m.role || 'MEMBER',
          department: m.department || 'COMPLIANCE_LEGAL',
          jobTitle: m.job_title || user.job_title || null,
          initials: computeInitials(user.full_name || 'TM'),
          avatarUrl: user.avatar_url || null,
          joinedAt: m.created_at,
        });
      }

      return members;
    } catch (err: any) {
      logger.error({ error: err.message, organizationId }, 'Error in getTeamMembers');
      throw err;
    }
  }

  /**
   * Returns canonical sovereign statutory roles.
   */
  public getAssignableRoles(): FunctionalRole[] {
    return CANONICAL_FUNCTIONAL_ROLES;
  }

  /**
   * Assigns a Radar Circular Alert to either:
   * - A specific verified team member (via user ID)
   * - A sovereign statutory functional role (e.g. Chief Compliance Officer)
   * Automatically persists changes and creates an immutable cryptographic audit record.
   */
  public async assignRadarAlert(
    organizationId: string,
    circularId: string,
    assignment: AlertAssignmentPayload,
    actorUserId?: string | null
  ) {
    if (!organizationId || !circularId) {
      throw new Error('Organization ID and Circular ID are required for alert assignment');
    }

    try {
      // 1. Fetch existing impact record for this tenant and circular
      const { data: existingImpact, error: fetchError } = await this.dbClient
        .from('radar_tenant_impacts')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('circular_id', circularId)
        .maybeSingle();

      if (fetchError) {
        logger.error({ error: fetchError.message, organizationId, circularId }, 'Error checking radar_tenant_impacts');
      }

      const now = new Date().toISOString();
      const updatedWorkflowStatus = assignment.workflowStatus || (existingImpact as any)?.workflow_status || 'Pending Review';

      let updatedImpactRecord: any;

      if (existingImpact) {
        // Update existing impact record
        const { data: updated, error: updateError } = await (this.dbClient.from('radar_tenant_impacts') as any)
          .update({
            assigned_to_user_id: assignment.assignedToUserId !== undefined ? assignment.assignedToUserId : (existingImpact as any).assigned_to_user_id,
            assigned_role: assignment.assignedRole !== undefined ? assignment.assignedRole : (existingImpact as any).assigned_role,
            target_department: assignment.targetDepartment !== undefined ? assignment.targetDepartment : (existingImpact as any).target_department,
            workflow_status: updatedWorkflowStatus,
            assignment_notes: assignment.assignmentNotes !== undefined ? assignment.assignmentNotes : (existingImpact as any).assignment_notes,
            assigned_at: now,
            ...(assignment.assignedToUserId ? { acknowledged_by: assignment.assignedToUserId, acknowledged_at: now } : {}),
          })
          .eq('id', existingImpact.id)
          .eq('organization_id', organizationId)
          .select('*')
          .single();

        if (updateError || !updated) {
          throw new Error(`Failed to update radar alert assignment: ${updateError?.message}`);
        }
        updatedImpactRecord = updated;
      } else {
        // Insert new impact record with default briefs
        const { data: inserted, error: insertError } = await (this.dbClient.from('radar_tenant_impacts') as any)
          .insert({
            organization_id: organizationId,
            circular_id: circularId,
            is_applicable: true,
            applicability_reason: 'Assigned for institutional review',
            executive_brief_cco: 'Directive assigned to institutional custodian for statutory review.',
            action_brief_coo: 'Operational impact under review.',
            technical_brief_product_eng: 'Technical specifications under review.',
            financial_brief_cfo: 'Balance sheet and fee review in progress.',
            status: 'NEW',
            assigned_to_user_id: assignment.assignedToUserId || null,
            assigned_role: assignment.assignedRole || null,
            target_department: assignment.targetDepartment || null,
            workflow_status: updatedWorkflowStatus,
            assignment_notes: assignment.assignmentNotes || null,
            assigned_at: now,
            acknowledged_by: assignment.assignedToUserId || null,
            acknowledged_at: assignment.assignedToUserId ? now : null,
          })
          .select('*')
          .single();

        if (insertError || !inserted) {
          throw new Error(`Failed to insert radar alert assignment: ${insertError?.message}`);
        }
        updatedImpactRecord = inserted;
      }

      // 2. Commit immutable cryptographic audit entry
      const inputDigest = AuditService.computeSha256(assignment);
      const outputDigest = AuditService.computeSha256(updatedImpactRecord);

      await this.auditService.recordLog({
        organizationId,
        userId: actorUserId || assignment.assignedToUserId || null,
        action: 'RADAR_ALERT_ASSIGNED',
        entityType: 'radar_circular',
        entityId: circularId,
        sha256InputHash: inputDigest,
        sha256OutputHash: outputDigest,
        metadata: {
          circularId,
          impactId: updatedImpactRecord.id,
          assignedToUserId: assignment.assignedToUserId,
          assignedRole: assignment.assignedRole,
          targetDepartment: assignment.targetDepartment,
          workflowStatus: updatedWorkflowStatus,
          timestamp: now,
        },
      });

      logger.info(
        { organizationId, circularId, assignedTo: assignment.assignedToUserId || assignment.assignedRole },
        'Radar alert delegated and recorded to immutable audit ledger'
      );

      return updatedImpactRecord;
    } catch (err: any) {
      logger.error({ error: err.message, organizationId, circularId }, 'Failed to assign radar alert');
      throw err;
    }
  }

  /**
   * Updates an action item assignment and completion status.
   * Commits immutable audit log with ACTION_ITEM_DELEGATED.
   */
  public async assignActionItem(
    organizationId: string,
    actionItemId: string,
    payload: ActionItemAssignmentPayload,
    actorUserId?: string | null
  ) {
    if (!organizationId || !actionItemId) {
      throw new Error('Organization ID and Action Item ID are required');
    }

    try {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (payload.assignedToUserId !== undefined) updatePayload.assigned_to_user_id = payload.assignedToUserId;
      if (payload.assignedRole !== undefined) updatePayload.assigned_role = payload.assignedRole;
      if (payload.targetDepartment !== undefined) updatePayload.target_department = payload.targetDepartment;
      if (payload.suggestedDeadline !== undefined) updatePayload.suggested_deadline = payload.suggestedDeadline;
      if (payload.isCompleted !== undefined) {
        updatePayload.is_completed = payload.isCompleted;
        updatePayload.completed_at = payload.isCompleted ? new Date().toISOString() : null;
      }

      const { data: updatedItem, error: updateError } = await (this.dbClient.from('radar_action_items') as any)
        .update(updatePayload)
        .eq('id', actionItemId)
        .eq('organization_id', organizationId)
        .select('*')
        .single();

      if (updateError || !updatedItem) {
        throw new Error(`Failed updating action item: ${updateError?.message || 'Item not found'}`);
      }

      // Record immutable audit entry
      await this.auditService.recordLog({
        organizationId,
        userId: actorUserId || payload.assignedToUserId || null,
        action: 'ACTION_ITEM_DELEGATED',
        entityType: 'radar_action_item',
        entityId: actionItemId,
        sha256InputHash: AuditService.computeSha256(payload),
        sha256OutputHash: AuditService.computeSha256(updatedItem),
        metadata: {
          actionItemId,
          assignedToUserId: payload.assignedToUserId,
          assignedRole: payload.assignedRole,
          targetDepartment: payload.targetDepartment,
          isCompleted: payload.isCompleted,
        },
      });

      return updatedItem;
    } catch (err: any) {
      logger.error({ error: err.message, organizationId, actionItemId }, 'Failed to assign action item');
      throw err;
    }
  }

  /**
   * Delegates a statutory obligation from the 4-Phase Obligation Register.
   * Commits immutable audit log with OBLIGATION_ASSIGNED.
   */
  public async assignObligation(
    organizationId: string,
    obligationId: string,
    payload: ObligationAssignmentPayload,
    actorUserId?: string | null
  ) {
    if (!organizationId || !obligationId) {
      throw new Error('Organization ID and Obligation ID are required');
    }

    try {
      const now = new Date().toISOString();
      const { data: existingControl } = await (this.dbClient.from('tenant_obligation_controls') as any)
        .select('*')
        .eq('organization_id', organizationId)
        .eq('obligation_id', obligationId)
        .maybeSingle();

      let result: any;

      if (existingControl) {
        const { data: updated, error } = await (this.dbClient.from('tenant_obligation_controls') as any)
          .update({
            custodian_role: payload.custodianRole !== undefined ? payload.custodianRole : existingControl.custodian_role,
            department: payload.department !== undefined ? payload.department : existingControl.department,
            control_id: payload.controlId !== undefined ? payload.controlId : existingControl.control_id,
            policy_id: payload.policyId !== undefined ? payload.policyId : existingControl.policy_id,
            notes: payload.notes !== undefined ? payload.notes : existingControl.notes,
            updated_at: now,
          })
          .eq('id', existingControl.id)
          .select('*')
          .single();

        if (error || !updated) {
          throw new Error(`Failed updating obligation custodian: ${error?.message}`);
        }
        result = updated;
      } else {
        const { data: inserted, error } = await (this.dbClient.from('tenant_obligation_controls') as any)
          .insert({
            organization_id: organizationId,
            obligation_id: obligationId,
            custodian_role: payload.custodianRole || 'Chief Compliance Officer',
            department: payload.department || 'COMPLIANCE_LEGAL',
            control_id: payload.controlId || null,
            policy_id: payload.policyId || null,
            notes: payload.notes || null,
            effectiveness_status: 'NEEDS_REVIEW',
            evidence_status: 'PENDING_AUDIT',
            updated_at: now,
          })
          .select('*')
          .single();

        if (error || !inserted) {
          throw new Error(`Failed inserting obligation delegation: ${error?.message}`);
        }
        result = inserted;
      }

      // Record immutable audit entry
      await this.auditService.recordLog({
        organizationId,
        userId: actorUserId || null,
        action: 'OBLIGATION_ASSIGNED',
        entityType: 'regulatory_obligation',
        entityId: obligationId,
        sha256InputHash: AuditService.computeSha256(payload),
        sha256OutputHash: AuditService.computeSha256(result),
        metadata: {
          obligationId,
          custodianRole: payload.custodianRole,
          department: payload.department,
          controlId: payload.controlId,
        },
      });

      return result;
    } catch (err: any) {
      logger.error({ error: err.message, organizationId, obligationId }, 'Failed to assign obligation');
      throw err;
    }
  }
}
