import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import {
  TeamService,
  computeInitials,
  CANONICAL_FUNCTIONAL_ROLES,
} from '@/modules/organization/services/teamService';
import { TeamMember, FunctionalRole } from '@/modules/organization/types';

// Mock DB client
let mockDbClient: any = null;
let currentMockTenantId = 'org-zenith-bank-001';
let currentMockUserId = 'usr-alex-marco-001';

const createChainableQuery = (data: any = null, error: any = null) => {
  const queryObj: any = {
    select: () => queryObj,
    insert: (payload: any) => {
      queryObj._inserted = payload;
      return {
        select: () => ({
          single: async () => ({ data: payload, error: null }),
        }),
        then: (resolve: any) => resolve({ data: [payload], error: null }),
      };
    },
    update: (payload: any) => {
      queryObj._updated = payload;
      return queryObj;
    },
    upsert: (payload: any) => {
      queryObj._upserted = payload;
      return queryObj;
    },
    eq: () => queryObj,
    in: () => queryObj,
    or: () => queryObj,
    ilike: () => queryObj,
    limit: () => queryObj,
    order: () => queryObj,
    maybeSingle: async () => ({ data, error }),
    single: async () => ({ data, error }),
    then: (resolve: any) => resolve({ data, error }),
  };
  return queryObj;
};

vi.mock('@/shared/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/auth')>();
  return {
    ...actual,
    getTenantContext: vi.fn().mockImplementation(async () => ({
      organizationId: currentMockTenantId,
      userId: currentMockUserId,
      dbClient: mockDbClient,
      isDevFallback: false,
    })),
  };
});

// Import route handlers
import { GET as getMembersRoute } from '@/app/api/organization/members/route';
import { PATCH as patchAssignCircularRoute } from '@/app/api/radar/circulars/[id]/assign/route';
import { PATCH as patchActionItemRoute } from '@/app/api/radar/action-items/[id]/route';
import { PATCH as patchAssignObligationRoute } from '@/app/api/regulatory/obligations/[id]/assign/route';

describe('Step 4: Dynamic Team Delegation, Organization Members & Multi-Tenant Assignment Architecture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockTenantId = 'org-zenith-bank-001';
    currentMockUserId = 'usr-alex-marco-001';
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 1: Dynamic resolution with strict multi-tenant isolation
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 1: Dynamic Resolution of Organization Members with Strict Multi-Tenant Isolation', () => {
    it('accurately computes user initials according to RegTech rules', () => {
      expect(computeInitials('Chioma Okonkwo')).toBe('CO');
      expect(computeInitials('Alex Marco')).toBe('AM');
      expect(computeInitials('Babajide Olusola Sanwo-Olu')).toBe('BS');
      expect(computeInitials('Tunde')).toBe('TU');
      expect(computeInitials('')).toBe('U');
    });

    it('resolves only Tenant A members and strictly prevents cross-tenant data leakage', async () => {
      // Mock data representing database rows for multiple tenants
      const mockMemberships = [
        {
          id: 'mem-101',
          organization_id: 'org-zenith-bank-001',
          user_id: 'usr-chioma-001',
          role: 'ADMIN',
          department: 'COMPLIANCE_LEGAL',
          job_title: 'Chief Compliance Officer',
          created_at: '2025-01-10T08:00:00Z',
        },
        {
          id: 'mem-102',
          organization_id: 'org-zenith-bank-001',
          user_id: 'usr-alex-marco-001',
          role: 'OWNER',
          department: 'COMPLIANCE_LEGAL',
          job_title: 'General Counsel',
          created_at: '2025-01-08T08:00:00Z',
        },
        // Tenant B membership (GTB)
        {
          id: 'mem-201',
          organization_id: 'org-gtb-fintech-002',
          user_id: 'usr-leaked-person-999',
          role: 'MEMBER',
          department: 'TREASURY_FINANCE',
          job_title: 'Treasury Analyst',
          created_at: '2025-01-12T08:00:00Z',
        },
      ];

      const mockUsers = [
        {
          id: 'usr-chioma-001',
          full_name: 'Chioma Okonkwo',
          email: 'chioma.o@zenith.example.com',
          avatar_url: null,
          job_title: 'Chief Compliance Officer',
        },
        {
          id: 'usr-alex-marco-001',
          full_name: 'Alex Marco',
          email: 'alex.m@zenith.example.com',
          avatar_url: 'https://images.example.com/avatar.jpg',
          job_title: 'General Counsel',
        },
        {
          id: 'usr-leaked-person-999',
          full_name: 'Foreign Institution User',
          email: 'foreign@gtb.example.com',
          avatar_url: null,
          job_title: 'Treasury Analyst',
        },
      ];

      // Build mock DB client with strict tenant filtering
      const fakeDb: any = {
        from: (table: string) => {
          if (table === 'organization_memberships') {
            return {
              select: () => ({
                eq: (col: string, val: string) => {
                  if (col === 'organization_id') {
                    const filtered = mockMemberships.filter((m) => m.organization_id === val);
                    return Promise.resolve({ data: filtered, error: null });
                  }
                  return Promise.resolve({ data: [], error: null });
                },
              }),
            };
          }
          if (table === 'users') {
            return {
              select: () => ({
                in: (col: string, ids: string[]) => {
                  const filtered = mockUsers.filter((u) => ids.includes(u.id));
                  return Promise.resolve({ data: filtered, error: null });
                },
              }),
            };
          }
          return createChainableQuery();
        },
      };

      const service = new TeamService(fakeDb);

      // Query Tenant A
      const tenantAMembers = await service.getTeamMembers('org-zenith-bank-001');
      expect(tenantAMembers).toHaveLength(2);
      expect(tenantAMembers.map((m) => m.fullName)).toEqual(['Chioma Okonkwo', 'Alex Marco']);
      expect(tenantAMembers.map((m) => m.initials)).toEqual(['CO', 'AM']);
      expect(tenantAMembers.map((m) => m.jobTitle)).toEqual(['Chief Compliance Officer', 'General Counsel']);

      // Assert ZERO leaked records from Tenant B
      const leakedFound = tenantAMembers.some((m) => m.userId === 'usr-leaked-person-999');
      expect(leakedFound).toBe(false);

      // Query Tenant B
      const tenantBMembers = await service.getTeamMembers('org-gtb-fintech-002');
      expect(tenantBMembers).toHaveLength(1);
      expect(tenantBMembers[0].fullName).toBe('Foreign Institution User');
      expect(tenantBMembers[0].userId).toBe('usr-leaked-person-999');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 2: GET /api/organization/members endpoint
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 2: GET /api/organization/members Route', () => {
    it('returns tenant members list and canonical sovereign functional roles', async () => {
      mockDbClient = {
        from: (table: string) => {
          if (table === 'organization_memberships') {
            return {
              select: () => ({
                eq: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: 'mem-1',
                        organization_id: 'org-zenith-bank-001',
                        user_id: 'usr-1',
                        role: 'OWNER',
                        department: 'COMPLIANCE_LEGAL',
                        job_title: 'Chief Compliance Officer',
                        created_at: '2025-01-01T00:00:00Z',
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          }
          if (table === 'users') {
            return {
              select: () => ({
                in: () =>
                  Promise.resolve({
                    data: [
                      {
                        id: 'usr-1',
                        full_name: 'Chioma Okonkwo',
                        email: 'chioma@zenith.com',
                        avatar_url: null,
                        job_title: 'Chief Compliance Officer',
                      },
                    ],
                    error: null,
                  }),
              }),
            };
          }
          return createChainableQuery();
        },
      };

      const req = new NextRequest('http://localhost:3000/api/organization/members');
      const response = await getMembersRoute(req);
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.organizationId).toBe('org-zenith-bank-001');
      expect(json.members).toHaveLength(1);
      expect(json.members[0]).toMatchObject({
        userId: 'usr-1',
        fullName: 'Chioma Okonkwo',
        email: 'chioma@zenith.com',
        orgRole: 'OWNER',
        department: 'COMPLIANCE_LEGAL',
        jobTitle: 'Chief Compliance Officer',
        initials: 'CO',
      });

      // Canonical functional roles check
      expect(Array.isArray(json.functionalRoles)).toBe(true);
      expect(json.functionalRoles.length).toBeGreaterThanOrEqual(7);

      const roleTitles = json.functionalRoles.map((r: FunctionalRole) => r.roleTitle);
      expect(roleTitles).toContain('Chief Compliance Officer');
      expect(roleTitles).toContain('General Counsel');
      expect(roleTitles).toContain('Chief Risk Officer');
      expect(roleTitles).toContain('Head of IT Infrastructure');
      expect(roleTitles).toContain('Chief Operating Officer');
      expect(roleTitles).toContain('Chief Financial Officer');
      expect(roleTitles).toContain('Head of Internal Audit');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 3: PATCH /api/radar/circulars/[id]/assign & Audit Logging
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 3: PATCH /api/radar/circulars/[id]/assign & Immutable Audit Log', () => {
    it('persists circular assignment and creates an immutable cryptographic audit record', async () => {
      let recordedAuditLog: any = null;
      let persistedImpact: any = null;

      mockDbClient = {
        from: (table: string) => {
          if (table === 'radar_tenant_impacts') {
            return {
              select: () => ({
                eq: (c1: string, v1: string) => ({
                  eq: (c2: string, v2: string) => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'impact-001',
                        organization_id: v1,
                        circular_id: v2,
                        workflow_status: 'Pending Review',
                        status: 'NEW',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (payload: any) => {
                persistedImpact = { id: 'impact-001', ...payload };
                return {
                  eq: () => ({
                    eq: () => ({
                      select: () => ({
                        single: async () => ({ data: persistedImpact, error: null }),
                      }),
                    }),
                  }),
                };
              },
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: (entry: any) => {
                recordedAuditLog = entry;
                return {
                  select: () => ({
                    single: async () => ({ data: entry, error: null }),
                  }),
                  then: (resolve: any) => resolve({ data: [entry], error: null }),
                };
              },
            };
          }
          return createChainableQuery();
        },
      };

      const payload = {
        assignedToUserId: 'usr-chioma-001',
        targetDepartment: 'COMPLIANCE_LEGAL',
        workflowStatus: 'In Progress',
        assignmentNotes: 'Assigned for immediate Section 65 balance-sheet impact assessment.',
      };

      const req = new NextRequest('http://localhost:3000/api/radar/circulars/cir-cbn-2024-001/assign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const response = await patchAssignCircularRoute(req, {
        params: Promise.resolve({ id: 'cir-cbn-2024-001' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(persistedImpact).not.toBeNull();
      expect(persistedImpact.assigned_to_user_id).toBe('usr-chioma-001');
      expect(persistedImpact.target_department).toBe('COMPLIANCE_LEGAL');
      expect(persistedImpact.workflow_status).toBe('In Progress');

      // Verify immutable audit log
      expect(recordedAuditLog).not.toBeNull();
      expect(recordedAuditLog.action).toBe('RADAR_ALERT_ASSIGNED');
      expect(recordedAuditLog.entity_type).toBe('radar_circular');
      expect(recordedAuditLog.entity_id).toBe('cir-cbn-2024-001');
      expect(typeof recordedAuditLog.sha256_input_hash).toBe('string');
      expect(recordedAuditLog.sha256_input_hash).toHaveLength(64);
      expect(typeof recordedAuditLog.sha256_output_hash).toBe('string');
      expect(recordedAuditLog.sha256_output_hash).toHaveLength(64);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 4: Dual-Mode Assignment Validation (User UUID vs Statutory Role)
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 4: Dual-Mode Assignment Validation (User UUID & Statutory Roles)', () => {
    it('supports delegation to a sovereign statutory functional role (Role String)', async () => {
      let savedImpact: any = null;
      let recordedAudit: any = null;

      const fakeDb: any = {
        from: (table: string) => {
          if (table === 'radar_tenant_impacts') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'impact-role-002',
                        organization_id: 'org-zenith-bank-001',
                        circular_id: 'cir-cyber-002',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (payload: any) => {
                savedImpact = payload;
                return {
                  eq: () => ({
                    eq: () => ({
                      select: () => ({
                        single: async () => ({ data: { id: 'impact-role-002', ...payload }, error: null }),
                      }),
                    }),
                  }),
                };
              },
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: (entry: any) => {
                recordedAudit = entry;
                return {
                  select: () => ({
                    single: async () => ({ data: entry, error: null }),
                  }),
                  then: (resolve: any) => resolve({ data: [entry], error: null }),
                };
              },
            };
          }
          return createChainableQuery();
        },
      };

      const service = new TeamService(fakeDb);
      const updated = await service.assignRadarAlert(
        'org-zenith-bank-001',
        'cir-cyber-002',
        {
          assignedRole: 'Head of IT Infrastructure',
          targetDepartment: 'ENGINEERING_TECH',
          workflowStatus: 'In Progress',
        },
        'usr-alex-marco-001'
      );

      expect(savedImpact.assigned_role).toBe('Head of IT Infrastructure');
      expect(savedImpact.target_department).toBe('ENGINEERING_TECH');
      expect(recordedAudit.action).toBe('RADAR_ALERT_ASSIGNED');
    });

    it('supports PATCH /api/radar/action-items/[id] dual-mode reassignment', async () => {
      let savedActionItem: any = null;

      mockDbClient = {
        from: (table: string) => {
          if (table === 'radar_action_items') {
            return {
              update: (payload: any) => {
                savedActionItem = payload;
                return {
                  eq: () => ({
                    eq: () => ({
                      select: () => ({
                        single: async () => ({ data: { id: 'act-99', ...payload }, error: null }),
                      }),
                    }),
                  }),
                };
              },
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: (entry: any) => ({
                select: () => ({
                  single: async () => ({ data: entry, error: null }),
                }),
                then: (resolve: any) => resolve({ data: [entry], error: null }),
              }),
            };
          }
          return createChainableQuery();
        },
      };

      const req = new NextRequest('http://localhost:3000/api/radar/action-items/act-99', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedToUserId: 'usr-chioma-001',
          targetDepartment: 'OPERATIONS',
          isCompleted: true,
        }),
      });

      const response = await patchActionItemRoute(req, {
        params: Promise.resolve({ id: 'act-99' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(savedActionItem.assigned_to_user_id).toBe('usr-chioma-001');
      expect(savedActionItem.target_department).toBe('OPERATIONS');
      expect(savedActionItem.is_completed).toBe(true);
      expect(typeof savedActionItem.completed_at).toBe('string');
    });

    it('supports PATCH /api/regulatory/obligations/[id]/assign with audit logging', async () => {
      let savedObligationControl: any = null;
      let recordedAudit: any = null;

      mockDbClient = {
        from: (table: string) => {
          if (table === 'tenant_obligation_controls') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({
                      data: {
                        id: 'ctrl-map-1',
                        custodian_role: 'Unassigned',
                        department: 'COMPLIANCE_LEGAL',
                      },
                      error: null,
                    }),
                  }),
                }),
              }),
              update: (payload: any) => {
                savedObligationControl = payload;
                return {
                  eq: () => ({
                    select: () => ({
                      single: async () => ({ data: { id: 'ctrl-map-1', ...payload }, error: null }),
                    }),
                  }),
                };
              },
            };
          }
          if (table === 'audit_logs') {
            return {
              insert: (entry: any) => {
                recordedAudit = entry;
                return {
                  select: () => ({
                    single: async () => ({ data: entry, error: null }),
                  }),
                  then: (resolve: any) => resolve({ data: [entry], error: null }),
                };
              },
            };
          }
          return createChainableQuery();
        },
      };

      const req = new NextRequest('http://localhost:3000/api/regulatory/obligations/obl-cbn-01/assign', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          custodianRole: 'Chief Risk Officer',
          department: 'RISK_INTERNAL_AUDIT',
          controlId: 'CTRL-RISK-001',
        }),
      });

      const response = await patchAssignObligationRoute(req, {
        params: Promise.resolve({ id: 'obl-cbn-01' }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.success).toBe(true);
      expect(savedObligationControl.custodian_role).toBe('Chief Risk Officer');
      expect(savedObligationControl.department).toBe('RISK_INTERNAL_AUDIT');
      expect(recordedAudit.action).toBe('OBLIGATION_ASSIGNED');
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // TEST CASE 5: UI Regression Tests Ensuring Zero Static Assignee Mocks
  // ──────────────────────────────────────────────────────────────────────────
  describe('Test Case 5: UI Regression Tests Ensuring Zero Static Assignee Mocks', () => {
    it('verifies HorizonAlertDetail.tsx has eradicated static <option value="AM"> and <option value="CCO"> mocks', () => {
      const detailFilePath = path.join(process.cwd(), 'src/modules/radar/ui/HorizonAlertDetail.tsx');
      const content = fs.readFileSync(detailFilePath, 'utf8');

      // Assert static mocks are completely absent
      expect(content).not.toContain('<option value="AM">Alex Marco</option>');
      expect(content).not.toContain('<option value="CCO">Chief Compliance Officer</option>');
      expect(content).not.toContain('<option value="UN">Unassigned</option>');

      // Assert modern AssigneeSelect component is bound
      expect(content).toContain('<AssigneeSelect');
      expect(content).toContain('handleAssigneeChange');
      expect(content).toContain('/api/radar/circulars/');
    });

    it('verifies HorizonAlertFeed.tsx has eradicated static <option value="AM"> and <option value="CCO"> mocks', () => {
      const feedFilePath = path.join(process.cwd(), 'src/modules/radar/ui/HorizonAlertFeed.tsx');
      const content = fs.readFileSync(feedFilePath, 'utf8');

      // Assert static mocks are completely absent
      expect(content).not.toContain('<option value="AM">Alex Marco</option>');
      expect(content).not.toContain('<option value="CCO">Chief Compliance Officer</option>');

      // Assert dynamic team member and statutory role optgroups are present
      expect(content).toContain('/api/organization/members');
      expect(content).toContain('label="Organization Members"');
      expect(content).toContain('label="Statutory Roles"');
    });

    it('verifies ObligationDetailDrawer.tsx binds dynamic members & functional roles without hardcoded selects', () => {
      const drawerFilePath = path.join(process.cwd(), 'src/modules/regulatory/ui/ObligationDetailDrawer.tsx');
      const content = fs.readFileSync(drawerFilePath, 'utf8');

      expect(content).toContain('/api/organization/members');
      expect(content).toContain('label="Organization Members"');
      expect(content).toContain('label="Statutory Functional Roles"');
    });
  });
});
