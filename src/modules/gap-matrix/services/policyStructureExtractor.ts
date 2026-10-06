import {
  ExtractedPolicyClause,
  ExtractedPolicyStructure,
} from '../types';
import { OrgDepartment } from '@/shared/types';
import { logger } from '@/shared/logger';

export interface PolicyExtractionInput {
  fileBuffer?: Buffer | Uint8Array;
  rawText?: string;
  fileName?: string;
  mimeType?: string;
  department?: OrgDepartment;
  versionTag?: string;
  title?: string;
}

/**
 * Layout-Preserving Policy Document Chunking & Heading Detection Engine (Epic 14 / Task 14.2)
 * Performs hierarchical heading detection, section number tracking (e.g. 3.1, 3.2.1),
 * and creates atomic policy clauses for vector embedding.
 */
export class PolicyStructureExtractor {
  // Regex patterns for detecting structured policy sections
  private sectionNumberRegex = /^(?:Section|Clause|Article|Policy|Part|Schedule)?\s*(\d+(?:\.\d+)*)\.?\s*[:\-–]?\s*(.*)$/i;
  private headingNumberRegex = /^([0-9]+\.[0-9]+(?:\.[0-9]+)*)\s+([A-Z0-9].*)$/;
  private majorHeadingRegex = /^(?:[A-Z0-9\s]{3,}:|[0-9]+\.\s+[A-Z0-9\s]{3,})/i;

  /**
   * Extracts structured policy clauses from text, PDF, or document buffer
   */
  public async extractStructure(input: PolicyExtractionInput): Promise<ExtractedPolicyStructure> {
    const rawText = this.resolveRawText(input);
    const title = input.title || this.inferTitle(input.fileName, rawText);
    const department: OrgDepartment = input.department || 'COMPLIANCE_LEGAL';
    const versionTag = input.versionTag || '1.0';

    logger.info({ title, department, textLength: rawText.length }, 'Extracting policy structure');

    const clauses = this.chunkPolicyText(rawText);

    return {
      title,
      department,
      versionTag,
      rawText,
      clauses,
    };
  }

  private resolveRawText(input: PolicyExtractionInput): string {
    if (input.rawText && input.rawText.trim().length > 0) {
      return input.rawText.trim();
    }

    if (input.fileBuffer) {
      // Decode Buffer to UTF-8 text (works for text/md/docx text streams and ASCII/UTF8 in PDFs)
      const text = Buffer.from(input.fileBuffer).toString('utf-8');
      // If it looks like plain text or markdown
      if (!text.includes('\x00')) {
        return text.trim();
      }
      // For binary PDF/DOCX streams, extract printable text tokens
      return this.extractAsciiFromBinary(input.fileBuffer);
    }

    return '';
  }

  private extractAsciiFromBinary(buffer: Buffer | Uint8Array): string {
    const raw = Buffer.from(buffer).toString('latin1');
    // Extract readable paragraphs and lines
    const lines = raw
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 5);

    return lines.join('\n');
  }

  private inferTitle(fileName?: string, text?: string): string {
    if (text) {
      const firstLines = text.split('\n').slice(0, 5);
      for (const line of firstLines) {
        const clean = line.replace(/^[#*=\s]+/, '').trim();
        if (clean.length > 5 && clean.length < 120 && !clean.toLowerCase().includes('table of contents')) {
          return clean;
        }
      }
    }

    if (fileName) {
      return fileName
        .replace(/\.[^/.]+$/, '')
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return 'Internal Operational Compliance Policy';
  }

  /**
   * Chunks policy text by hierarchical section numbering or markdown headings
   */
  public chunkPolicyText(text: string): ExtractedPolicyClause[] {
    const lines = text.split(/\r?\n/);
    const clauses: ExtractedPolicyClause[] = [];

    let currentSectionNumber = '';
    let currentHeading = '';
    let currentClauseLines: string[] = [];
    let currentPage = 1;
    let clauseStartPage = 1;
    let headingsDetectedCount = 0;

    const flushClause = () => {
      const content = currentClauseLines.join('\n').trim();
      if (content.length > 0) {
        clauses.push({
          sectionNumber: currentSectionNumber || `Section ${clauses.length + 1}.0`,
          heading: currentHeading || (currentSectionNumber ? `Section ${currentSectionNumber}` : 'General Provisions'),
          clauseText: content,
          pageNumber: clauseStartPage,
        });
      }
      currentClauseLines = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        continue;
      }

      // Track page transitions if indicated in text (e.g. "--- Page 2 ---" or "[Page 3]")
      const pageMatch = line.match(/(?:---\s*Page\s*(\d+)\s*---|\[Page\s*(\d+)\])/i);
      if (pageMatch) {
        flushClause();
        currentPage = parseInt(pageMatch[1] || pageMatch[2], 10);
        clauseStartPage = currentPage;
        continue;
      }

      // 1. Check for Markdown headers like `### Section 1.0: Consumer Grievance` or `## 2.0 KYC`
      const mdHeaderMatch = line.match(/^#{1,6}\s*(.*)$/);
      if (mdHeaderMatch) {
        const headerText = mdHeaderMatch[1].trim();
        flushClause();
        headingsDetectedCount++;
        const detected = this.detectSectionAndHeading(headerText);
        if (detected) {
          currentSectionNumber = detected.sectionNumber;
          currentHeading = detected.heading;
        } else {
          currentHeading = headerText;
          currentSectionNumber = `Section ${clauses.length + 1}.0`;
        }
        clauseStartPage = currentPage;
        continue;
      }

      // 2. Check if line starts a new numbered clause or section: e.g. "1.1 ...", "2.1 ...", "Section 3.2: ..."
      const clauseStartMatch =
        line.match(/^([0-9]+\.[0-9]+(?:\.[0-9]+)*)\s+(.*)$/) ||
        line.match(/^(?:Section|Clause|Article|Part)\s+([0-9]+(?:\.[0-9]+)*)\.?\s*[:\-–]?\s*(.*)$/i);

      if (clauseStartMatch) {
        const num = clauseStartMatch[1];
        const rest = clauseStartMatch[2]?.trim() || '';

        // Determine if it is a standalone heading line vs an active clause sentence
        const isStandaloneHeader =
          rest.length > 0 &&
          rest.length < 70 &&
          !rest.endsWith('.') &&
          !/\b(?:shall|must|will|is|are|requires|authorizes)\b/i.test(rest);

        flushClause();
        headingsDetectedCount++;
        currentSectionNumber = `Section ${num}`;

        if (isStandaloneHeader) {
          currentHeading = rest;
          clauseStartPage = currentPage;
          continue;
        } else {
          // Check if there is an inline title before a colon, e.g. "1.2 Grievance Resolution: All complaints..."
          const colonIdx = rest.indexOf(':');
          if (colonIdx > 0 && colonIdx < 50) {
            currentHeading = rest.slice(0, colonIdx).trim();
          } else if (!currentHeading) {
            currentHeading = `Section ${num}`;
          }
          currentClauseLines.push(line);
          clauseStartPage = currentPage;
          continue;
        }
      }

      // 3. Check for standalone all-caps or labeled section titles: "SECTION 4 - CUSTOMER DUE DILIGENCE"
      const allCapsMatch = line.match(/^(?:SECTION|CLAUSE|ARTICLE|PART)\s+(\d+|[IVXLCDM]+)\s*[:\-–]?\s*(.*)$/i);
      if (allCapsMatch) {
        flushClause();
        headingsDetectedCount++;
        currentSectionNumber = `Section ${allCapsMatch[1]}`;
        currentHeading = allCapsMatch[2]?.trim() || `Section ${allCapsMatch[1]}`;
        clauseStartPage = currentPage;
        continue;
      }

      if (currentClauseLines.length === 0) {
        clauseStartPage = currentPage;
      }
      currentClauseLines.push(line);
    }

    // Flush any remaining content
    flushClause();

    // Fallback if no hierarchical headings were detected:
    // Split into logical semantic paragraph chunks
    if (headingsDetectedCount === 0 && text.trim().length > 0) {
      return this.fallbackChunkByParagraphs(text);
    }

    return clauses;
  }

  private detectSectionAndHeading(line: string): { sectionNumber: string; heading: string } | null {
    // 1. Check decimal hierarchical e.g. "3.2.1 Mandatory Senior Management Approval"
    const headingNumMatch = line.match(this.headingNumberRegex);
    if (headingNumMatch) {
      return {
        sectionNumber: `Section ${headingNumMatch[1]}`,
        heading: headingNumMatch[2].trim(),
      };
    }

    // 2. Check "Section 4.1: Timeline for Filing STRs" or "Clause 2.3 - Due Diligence"
    const secMatch = line.match(this.sectionNumberRegex);
    if (secMatch && secMatch[1]) {
      const num = secMatch[1];
      const remainder = secMatch[2]?.trim() || '';
      return {
        sectionNumber: `Section ${num}`,
        heading: remainder.length > 0 ? remainder : `Section ${num}`,
      };
    }

    return null;
  }

  private fallbackChunkByParagraphs(text: string): ExtractedPolicyClause[] {
    const paragraphs = text
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 20);

    return paragraphs.map((para, index) => {
      const firstLine = para.split('\n')[0].slice(0, 80);
      return {
        sectionNumber: `Section ${index + 1}.0`,
        heading: firstLine.length < 50 ? firstLine : `Section ${index + 1}.0 Policy Clause`,
        clauseText: para,
        pageNumber: 1,
      };
    });
  }
}

export const defaultPolicyStructureExtractor = new PolicyStructureExtractor();
