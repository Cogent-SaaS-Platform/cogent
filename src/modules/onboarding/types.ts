import { RegulatorCode } from '@/shared/types';

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export type DepartmentMandate =
  | 'EXECUTIVE_LEADERSHIP'
  | 'COMPLIANCE_LEGAL'
  | 'GROWTH_MARKETING'
  | 'PRODUCT_MANAGEMENT'
  | 'ENGINEERING_TECH'
  | 'OPERATIONS'
  | 'TREASURY_FINANCE'
  | 'OTHER';

export interface InvitedTeamMember {
  id: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'OTHER';
  department: string;
}

export interface OnboardingState {
  // Step 1: Company / Institution Details
  companyName: string;
  companySize: CompanySize;
  rcNumber: string; // Explicitly Optional as per TASK-08
  companyWebsite: string;
  industryCategory: string;

  // Step 2: Your Role & Mandate
  department: DepartmentMandate;
  customDepartment: string; // Explicitly required when department === 'OTHER'
  jobTitle: string;
  complianceObjectives: string[];

  // Step 3: Regulatory Scope & Licenses
  primaryRegulators: RegulatorCode[];
  licenseType: string;
  licenseNumber: string; // Optional
  operatingEnvironment: 'SANDBOX' | 'LIVE_PRODUCTION';

  // Step 4: Payment Rails & Product Scope
  paymentRails: string[];
  productCategories: string[];

  // Step 5: Invite Team Members
  invitedMembers: InvitedTeamMember[];
}

export interface OnboardingStepInfo {
  step: number;
  title: string;
  subtitle: string;
}
