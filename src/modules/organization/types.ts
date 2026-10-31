import { OrgDepartment, OrgRole } from '@/shared/types';

export interface TeamMember {
  id: string; // membership id
  userId: string;
  fullName: string;
  email: string;
  orgRole: OrgRole | string;
  department: OrgDepartment | string;
  jobTitle?: string | null;
  initials: string;
  avatarUrl?: string | null;
  joinedAt: string;
}

export interface FunctionalRole {
  roleId: string;
  roleTitle: string;
  department: OrgDepartment | string;
  statutoryScope: string;
}

export interface AlertAssignmentPayload {
  assignedToUserId?: string | null;
  assignedRole?: string | null;
  targetDepartment?: string | null;
  workflowStatus?: 'Pending Review' | 'In Progress' | 'Reviewed' | 'Closed' | string;
  assignmentNotes?: string | null;
}

export interface ActionItemAssignmentPayload {
  assignedToUserId?: string | null;
  assignedRole?: string | null;
  targetDepartment?: OrgDepartment | string;
  suggestedDeadline?: string | null;
  isCompleted?: boolean;
}

export interface ObligationAssignmentPayload {
  custodianRole?: string;
  department?: OrgDepartment | string;
  controlId?: string | null;
  policyId?: string | null;
  notes?: string | null;
}

export interface OrganizationMembersResponse {
  success: boolean;
  organizationId: string;
  members: TeamMember[];
  functionalRoles: FunctionalRole[];
}
