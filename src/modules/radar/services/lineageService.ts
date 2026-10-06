import { SupabaseClient } from '@supabase/supabase-js';
import { Database, createAdminClient, createClient } from '@/shared/db';
import { AmendmentType, LineageStatus, RegulatorCode } from '@/shared/types';
import { logger } from '@/shared/logger';

export interface SupersessionEdge {
  id: string;
  parentCircularId: string;
  childCircularId: string;
  amendmentType: AmendmentType;
  affectedClauseReferences?: string | null;
  createdAt?: string;
}

export interface CircularLineageNode {
  id: string;
  circularNumber: string;
  subject: string;
  publicationDate: string;
  lineageStatus: LineageStatus;
  relationshipToCurrent: 'SELF' | 'PARENT' | 'CHILD' | 'ANCESTOR' | 'DESCENDANT';
  amendmentType?: AmendmentType;
  affectedClauseReferences?: string | null;
}

export interface LineageGraphResult {
  currentNode: CircularLineageNode;
  activeGoverningCircular: CircularLineageNode;
  isCurrentEffectiveLaw: boolean;
  ancestors: CircularLineageNode[];
  descendants: CircularLineageNode[];
  allEdges: Array<{ fromId: string; toId: string; type: AmendmentType; clauseRef?: string | null }>;
}

/**
 * Circular Lineage & Supersession Graph Resolver (Task 2.5 / Epic 10)
 * Resolves amendment parentage, supersession trees, and the currently active governing statutory law.
 */
export class LineageService {
  private dbClient: SupabaseClient<Database> | null = null;

  constructor(dbClient?: SupabaseClient<Database>) {
    if (dbClient) {
      this.dbClient = dbClient;
    } else {
      try {
        this.dbClient = createAdminClient();
      } catch {
        try {
          this.dbClient = createClient();
        } catch {
          this.dbClient = null;
        }
      }
    }
  }

  /**
   * Records a lineage relationship between a parent circular and a newer child circular
   */
  public async createSupersessionLink(params: {
    parentCircularId: string;
    childCircularId: string;
    amendmentType: AmendmentType;
    affectedClauseReferences?: string;
  }): Promise<SupersessionEdge> {
    const { parentCircularId, childCircularId, amendmentType, affectedClauseReferences } = params;

    const edgeId = crypto.randomUUID();
    const resultEdge: SupersessionEdge = {
      id: edgeId,
      parentCircularId,
      childCircularId,
      amendmentType,
      affectedClauseReferences: affectedClauseReferences || null,
      createdAt: new Date().toISOString(),
    };

    if (!this.dbClient) {
      return resultEdge;
    }

    try {
      const client = this.dbClient as any;

      // 1. Insert or update the supersession link
      const { data, error } = await client
        .from('circular_supersession_links')
        .upsert(
          {
            parent_circular_id: parentCircularId,
            child_circular_id: childCircularId,
            amendment_type: amendmentType,
            affected_clause_references: affectedClauseReferences || null,
          },
          { onConflict: 'parent_circular_id,child_circular_id' }
        )
        .select()
        .single();

      if (error) {
        logger.warn({ error: error.message }, 'Failed to insert circular_supersession_links; using generated ID');
      } else if (data) {
        resultEdge.id = data.id;
      }

      // 2. Cascade lineage status to parent circular
      let newParentStatus: LineageStatus = 'ACTIVE_LAW';
      if (
        amendmentType === 'REVOKES_AND_REPLACES' ||
        amendmentType === 'REPLACES' ||
        amendmentType === 'REPEALS'
      ) {
        newParentStatus = 'SUPERSEDED';
      } else if (amendmentType === 'AMENDS' || amendmentType === 'PARTIALLY_REPEALS') {
        newParentStatus = 'AMENDED';
      }

      if (newParentStatus !== 'ACTIVE_LAW') {
        await client
          .from('radar_circulars')
          .update({ lineage_status: newParentStatus })
          .eq('id', parentCircularId);

        logger.info(
          { parentCircularId, childCircularId, amendmentType, newParentStatus },
          'Updated parent circular lineage_status in response to supersession edge'
        );
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error creating supersession link');
    }

    return resultEdge;
  }

  /**
   * Resolves the full bidirectional lineage graph (ancestors, descendants, active governing version)
   */
  public async resolveLineageGraph(circularId: string): Promise<LineageGraphResult> {
    const defaultNode: CircularLineageNode = {
      id: circularId,
      circularNumber: 'CIRCULAR-UNKNOWN',
      subject: 'Regulatory Directive',
      publicationDate: new Date().toISOString().slice(0, 10),
      lineageStatus: 'ACTIVE_LAW',
      relationshipToCurrent: 'SELF',
    };

    if (!this.dbClient) {
      return {
        currentNode: defaultNode,
        activeGoverningCircular: defaultNode,
        isCurrentEffectiveLaw: true,
        ancestors: [],
        descendants: [],
        allEdges: [],
      };
    }

    try {
      const client = this.dbClient as any;

      // 1. Fetch current circular
      const { data: currentData, error: currentError } = await client
        .from('radar_circulars')
        .select('*')
        .eq('id', circularId)
        .single();

      if (currentError || !currentData) {
        return {
          currentNode: defaultNode,
          activeGoverningCircular: defaultNode,
          isCurrentEffectiveLaw: true,
          ancestors: [],
          descendants: [],
          allEdges: [],
        };
      }

      const currentNode: CircularLineageNode = {
        id: currentData.id,
        circularNumber: currentData.circular_number,
        subject: currentData.subject,
        publicationDate: currentData.issuance_date || currentData.created_at?.slice(0, 10) || new Date().toISOString().slice(0, 10),
        lineageStatus: (currentData.lineage_status || 'ACTIVE_LAW') as LineageStatus,
        relationshipToCurrent: 'SELF',
      };

      // 2. Fetch parents (ancestors that this circular amends/replaces/cites)
      const { data: parentLinks } = await client
        .from('circular_supersession_links')
        .select('*, radar_circulars!circular_supersession_links_parent_circular_id_fkey(*)')
        .eq('child_circular_id', circularId);

      const ancestors: CircularLineageNode[] = [];
      const allEdges: Array<{ fromId: string; toId: string; type: AmendmentType; clauseRef?: string | null }> = [];

      if (parentLinks) {
        for (const link of parentLinks) {
          const parent = link.radar_circulars;
          if (parent) {
            ancestors.push({
              id: parent.id,
              circularNumber: parent.circular_number,
              subject: parent.subject,
              publicationDate: parent.issuance_date || parent.created_at?.slice(0, 10) || '',
              lineageStatus: (parent.lineage_status || 'AMENDED') as LineageStatus,
              relationshipToCurrent: 'PARENT',
              amendmentType: link.amendment_type as AmendmentType,
              affectedClauseReferences: link.affected_clause_references,
            });
            allEdges.push({
              fromId: parent.id,
              toId: circularId,
              type: link.amendment_type as AmendmentType,
              clauseRef: link.affected_clause_references,
            });
          }
        }
      }

      // 3. Fetch children (descendants that amend/replace this circular)
      const { data: childLinks } = await client
        .from('circular_supersession_links')
        .select('*, radar_circulars!circular_supersession_links_child_circular_id_fkey(*)')
        .eq('parent_circular_id', circularId);

      const descendants: CircularLineageNode[] = [];

      if (childLinks) {
        for (const link of childLinks) {
          const child = link.radar_circulars;
          if (child) {
            descendants.push({
              id: child.id,
              circularNumber: child.circular_number,
              subject: child.subject,
              publicationDate: child.issuance_date || child.created_at?.slice(0, 10) || '',
              lineageStatus: (child.lineage_status || 'ACTIVE_LAW') as LineageStatus,
              relationshipToCurrent: 'CHILD',
              amendmentType: link.amendment_type as AmendmentType,
              affectedClauseReferences: link.affected_clause_references,
            });
            allEdges.push({
              fromId: circularId,
              toId: child.id,
              type: link.amendment_type as AmendmentType,
              clauseRef: link.affected_clause_references,
            });
          }
        }
      }

      // 4. Determine Active Governing Circular:
      // If any descendant replaces/supersedes this circular with ACTIVE_LAW status, traverse forward to find the governing version
      let activeGoverningCircular = currentNode;
      if (descendants.length > 0) {
        const activeChild = descendants.find(
          (d) =>
            (d.amendmentType === 'REVOKES_AND_REPLACES' ||
              d.amendmentType === 'REPLACES' ||
              d.amendmentType === 'AMENDS') &&
            d.lineageStatus === 'ACTIVE_LAW'
        );
        if (activeChild) {
          activeGoverningCircular = activeChild;
        }
      }

      const isCurrentEffectiveLaw =
        currentNode.lineageStatus === 'ACTIVE_LAW' && descendants.length === 0;

      return {
        currentNode,
        activeGoverningCircular,
        isCurrentEffectiveLaw,
        ancestors,
        descendants,
        allEdges,
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error resolving lineage graph');
      return {
        currentNode: defaultNode,
        activeGoverningCircular: defaultNode,
        isCurrentEffectiveLaw: true,
        ancestors: [],
        descendants: [],
        allEdges: [],
      };
    }
  }

  /**
   * Scans circular text for revocation, amendment, or reference clauses and links lineage automatically
   */
  public async detectAndLinkLineageFromText(
    childCircularId: string,
    rawText: string
  ): Promise<SupersessionEdge[]> {
    const createdEdges: SupersessionEdge[] = [];
    if (!this.dbClient || !rawText) return createdEdges;

    try {
      const client = this.dbClient as any;

      // Regex patterns for Nigerian circular supersession and amendment language
      const patterns = [
        {
          regex: /(?:supersedes|revokes and replaces|replaces in its entirety|hereby revoked and replaced by)\s+(?:circular(?:\s+no)?\.?\s*)?([A-Z0-9\/\-_]{5,40})/gi,
          type: 'REVOKES_AND_REPLACES' as AmendmentType,
        },
        {
          regex: /(?:amends|amendment to|modifies section\s+[0-9\.]+\s+of|hereby amended by)\s+(?:circular(?:\s+no)?\.?\s*)?([A-Z0-9\/\-_]{5,40})/gi,
          type: 'AMENDS' as AmendmentType,
        },
        {
          regex: /(?:repeals|hereby repealed)\s+(?:circular(?:\s+no)?\.?\s*)?([A-Z0-9\/\-_]{5,40})/gi,
          type: 'REPEALS' as AmendmentType,
        },
        {
          regex: /(?:with reference to|pursuant to|in line with circular(?:\s+ref)?\.?\s*)\s+([A-Z0-9\/\-_]{5,40})/gi,
          type: 'CITES' as AmendmentType,
        },
      ];

      for (const { regex, type } of patterns) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(rawText)) !== null) {
          const rawRef = match[1]?.trim();
          if (rawRef && rawRef.length >= 6) {
            // Find existing circular matching this reference code
            const { data: matchedCirculars } = await client
              .from('radar_circulars')
              .select('id, circular_number')
              .ilike('circular_number', `%${rawRef}%`)
              .neq('id', childCircularId)
              .limit(1);

            if (matchedCirculars && matchedCirculars.length > 0) {
              const parentId = matchedCirculars[0].id;
              const edge = await this.createSupersessionLink({
                parentCircularId: parentId,
                childCircularId,
                amendmentType: type,
                affectedClauseReferences: match[0],
              });
              createdEdges.push(edge);
            }
          }
        }
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Automated lineage text detection encountered warning');
    }

    return createdEdges;
  }
}

export const defaultLineageService = new LineageService();
