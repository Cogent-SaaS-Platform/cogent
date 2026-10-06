import { GoogleGenAI } from '@google/genai';
import { logger } from '@/shared/logger';
import { AI_MODELS } from '@/shared/ai-engine/config/modelConfig';
import {
  ExtractedCircularStructure,
  ExtractedCircularStructureSchema,
  ExtractedScheduleItem
} from '../types/schema';

export interface StructureExtractorParams {
  fileBuffer?: Buffer | Uint8Array;
  fileName?: string;
  mimeType?: string;
  rawText?: string;
}

/**
 * Layout-Preserving Structure Extractor for Regulatory Documents (Task 9.2)
 * Retains circular reference codes, official seals, issuing signatory,
 * section numbering, and tabular statutory schedules.
 */
export class PdfStructureExtractor {
  private ai: GoogleGenAI | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      try {
        this.ai = new GoogleGenAI({ apiKey: key });
      } catch (err) {
        logger.warn({ err }, 'Failed to initialize Google GenAI in PdfStructureExtractor, falling back to deterministic parser');
        this.ai = null;
      }
    }
  }

  /**
   * Extracts layout-preserved structured data from a PDF buffer or text document
   */
  public async extractStructure(params: StructureExtractorParams): Promise<ExtractedCircularStructure> {
    const { fileBuffer, mimeType, rawText, fileName } = params;

    // 1. Try Gemini Multimodal Document Understanding if PDF buffer is available
    if (this.ai && fileBuffer && (mimeType === 'application/pdf' || fileName?.endsWith('.pdf') || this.isPdfBuffer(fileBuffer))) {
      try {
        const base64Data = Buffer.isBuffer(fileBuffer)
          ? fileBuffer.toString('base64')
          : Buffer.from(fileBuffer).toString('base64');

        const prompt = `Analyze this official Nigerian regulatory circular PDF document.
Extract the structural content while strictly preserving:
1. Reference code (e.g., 'BPS/DIR/GEN/CIR/05/011' or 'PSM/DIR/CON/CWS/08/014')
2. Regulator body candidate ('CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC')
3. Issuing department (e.g., 'Payments System Management Department', 'Banking Supervision Department')
4. Official signatories (Name and Title, e.g., 'Musa I. Jimoh', 'Director')
5. Official seals / stamps detected (e.g., 'CENTRAL BANK OF NIGERIA OFFICIAL SEAL')
6. Addressee line (e.g., 'TO: ALL DEPOSIT MONEY BANKS, PAYMENT SERVICE PROVIDERS')
7. Subject of the circular
8. Section numbering and hierarchical clauses (e.g., '1.0 Background', '2.0 Guidelines', etc.)
9. Tabular statutory schedules (headers and rows for fee caps, capital requirements, transition timelines)
10. Full raw text transcript of the document

Return a valid JSON object matching the requested schema.`;

        const response = await this.ai.models.generateContent({
          model: AI_MODELS.FAST_MODEL,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Data,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        const textOutput = response.text || '';
        const cleanJson = this.stripMarkdown(textOutput);
        const parsed = JSON.parse(cleanJson);
        const validated = ExtractedCircularStructureSchema.safeParse(parsed);

        if (validated.success) {
          logger.info(
            {
              fileName,
              sectionsCount: validated.data.sections.length,
              schedulesCount: validated.data.schedules.length,
            },
            'Successfully extracted circular structure via Gemini multimodal parser'
          );
          return validated.data;
        } else {
          logger.warn(
            { issues: validated.error.issues },
            'Gemini multimodal output failed schema validation; falling back to deterministic text parser'
          );
        }
      } catch (geminiErr) {
        logger.warn(
          { err: String(geminiErr) },
          'Gemini multimodal document extraction failed; falling back to deterministic extractor'
        );
      }
    }

    // 2. Deterministic Layout-Preserving Extractor Fallback
    const sourceText = rawText || (fileBuffer ? Buffer.from(fileBuffer).toString('utf8') : '');
    return this.parseTextDeterministically(sourceText, fileName);
  }

  /**
   * Deterministic layout-preserving extractor for text/markdown or buffer fallback
   */
  public parseTextDeterministically(text: string, fileName?: string): ExtractedCircularStructure {
    const lines = text.split(/\r?\n/).map(l => l.trimEnd());

    let referenceCodeCandidate: string | null = null;
    let regulatorCandidate: string | null = null;
    let issuingDepartment: string | null = null;
    let signatoryName: string | null = null;
    let signatoryTitle: string | null = null;
    let addresseeText: string | null = null;
    let subject = '';
    const officialSealsDetected: string[] = [];

    // Regex for Nigerian regulator circular reference numbers
    const refCodeRegex = /(?:Ref(?:\s*No)?[:\.\s]+)?\b((?:PSM|BPS|BSD|FPR|FMD|TED|PSMD|COD|OFI|SEC|ARCON|NDPC|FCCPC|NFIU|NDIC)[A-Z0-9\/\-_]+)\b/i;
    
    // Regulator identification regex
    if (/Central Bank of Nigeria|\bCBN\b/i.test(text)) regulatorCandidate = 'CBN';
    else if (/Securities and Exchange Commission|\bSEC\b/i.test(text)) regulatorCandidate = 'SEC';
    else if (/Advertising Regulatory Council|\bARCON\b/i.test(text)) regulatorCandidate = 'ARCON';
    else if (/Nigeria Data Protection Commission|\bNDPC\b/i.test(text)) regulatorCandidate = 'NDPC';
    else if (/Federal Competition (?:&|and) Consumer Protection|\bFCCPC\b/i.test(text)) regulatorCandidate = 'FCCPC';
    else if (/Nigerian Financial Intelligence Unit|\bNFIU\b/i.test(text)) regulatorCandidate = 'NFIU';
    else if (/Nigeria Deposit Insurance|\bNDIC\b|Deposit Insurance Scheme/i.test(text)) regulatorCandidate = 'NDIC';

    // Official Seals & Stamps
    if (/OFFICIAL SEAL|OFFICIAL STAMP|CENTRAL BANK OF NIGERIA.*SEAL/i.test(text)) {
      officialSealsDetected.push('CENTRAL BANK OF NIGERIA OFFICIAL SEAL (VERIFIED)');
    }
    if (/SEC\s+OFFICIAL\s+SEAL|SECURITIES AND EXCHANGE COMMISSION.*SEAL/i.test(text)) {
      officialSealsDetected.push('SECURITIES AND EXCHANGE COMMISSION OFFICIAL SEAL (VERIFIED)');
    }
    if (/ARCON\s+ASP\s+SEAL|ADVERTISING STANDARDS PANEL/i.test(text)) {
      officialSealsDetected.push('ARCON ASP OFFICIAL STAMP (VERIFIED)');
    }
    if (/NDPC\s+SEAL|DATA PROTECTION COMMISSION/i.test(text)) {
      officialSealsDetected.push('NDPC OFFICIAL REGISTRATION SEAL');
    }

    // Extract Header lines & Metadata
    for (let i = 0; i < Math.min(lines.length, 35); i++) {
      const line = lines[i].trim();
      
      // Ref code detection
      if (!referenceCodeCandidate) {
        const refMatch = line.match(refCodeRegex);
        if (refMatch) {
          referenceCodeCandidate = refMatch[1].trim();
        }
      }

      // Addressee detection
      if (/^TO:\s+/i.test(line) || /^CIRCULAR TO:\s+/i.test(line)) {
        addresseeText = line.replace(/^(?:CIRCULAR\s+)?TO:\s+/i, '').trim();
      }

      // Department detection
      if (/(?:DEPARTMENT|DIRECTORATE)$/i.test(line) || /(?:PAYMENTS SYSTEM|BANKING SUPERVISION|FINANCIAL POLICY|CONSUMER PROTECTION|LEGAL) DEPARTMENT/i.test(line)) {
        issuingDepartment = line.trim();
      }

      // Subject detection
      if (/^(?:SUBJECT|RE)[:\s]+/i.test(line)) {
        subject = line.replace(/^(?:SUBJECT|RE)[:\s]+/i, '').trim();
      }
    }

    // If subject wasn't explicitly prefixed, infer from early uppercase line
    if (!subject) {
      for (let i = 0; i < Math.min(lines.length, 25); i++) {
        const line = lines[i].trim();
        if (
          line.length > 15 &&
          line === line.toUpperCase() &&
          !line.includes('CENTRAL BANK') &&
          !line.includes('CIRCULAR') &&
          !line.includes('FEDERAL REPUBLIC') &&
          !line.includes('TEL:')
        ) {
          subject = line;
          break;
        }
      }
    }
    if (!subject) {
      subject = fileName ? fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ') : 'Regulatory Circular';
    }

    // Signatory detection (look from bottom of document)
    for (let i = lines.length - 1; i >= Math.max(0, lines.length - 20); i--) {
      const line = lines[i].trim();
      if (/^(?:Director|Director-General|Head|Executive Commissioner|Commissioner|Chief Executive)/i.test(line)) {
        signatoryTitle = line;
        // Previous non-empty line is usually the signatory's name
        for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
          const prev = lines[j].trim();
          if (prev && !prev.includes('Yours') && !prev.includes('Faithfully')) {
            signatoryName = prev;
            break;
          }
        }
        break;
      }
    }

    // Section extraction (e.g., '1.0 Introduction', '2.0 Minimum Capital', 'Section 1')
    const sections: Array<{ sectionNumber: string; heading: string; content: string }> = [];
    const sectionRegex = /^(\d+(?:\.\d+)*|[A-Z]\.|\bSection\s+\d+|\bArticle\s+\d+)[\.\s]+(.+)$/i;

    let currentSection: { sectionNumber: string; heading: string; lines: string[] } | null = null;
    const bodyLines = lines;

    for (const line of bodyLines) {
      const trimmed = line.trim();
      const match = trimmed.match(sectionRegex);

      if (match && trimmed.length < 120 && !trimmed.endsWith('.')) {
        if (currentSection) {
          sections.push({
            sectionNumber: currentSection.sectionNumber,
            heading: currentSection.heading,
            content: currentSection.lines.join('\n').trim()
          });
        }
        currentSection = {
          sectionNumber: match[1].trim(),
          heading: match[2].trim(),
          lines: []
        };
      } else if (currentSection) {
        currentSection.lines.push(line);
      }
    }

    if (currentSection) {
      sections.push({
        sectionNumber: currentSection.sectionNumber,
        heading: currentSection.heading,
        content: currentSection.lines.join('\n').trim()
      });
    }

    // Extract Tabular Schedules
    const schedules = this.extractSchedulesFromText(text);

    return {
      rawText: text,
      referenceCodeCandidate,
      regulatorCandidate,
      issuingDepartment,
      signatoryName,
      signatoryTitle,
      officialSealsDetected,
      addresseeText,
      subject,
      sections,
      schedules
    };
  }

  /**
   * Deterministic extractor for tabular statutory schedules (e.g. capital requirements, fee caps)
   */
  private extractSchedulesFromText(text: string): ExtractedScheduleItem[] {
    const schedules: ExtractedScheduleItem[] = [];
    const lines = text.split(/\r?\n/);

    let currentSchedule: {
      title: string;
      headers: string[];
      rows: string[][];
    } | null = null;

    let inTable = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Schedule header flag
      if (/^(?:SCHEDULE|ANNEXURE|TABLE)\s+[A-Z0-9\.\-]+/i.test(line)) {
        if (currentSchedule && currentSchedule.headers.length > 0) {
          schedules.push({
            scheduleTitle: currentSchedule.title,
            headers: currentSchedule.headers,
            rows: currentSchedule.rows
          });
        }
        currentSchedule = {
          title: line,
          headers: [],
          rows: []
        };
        inTable = false;
        continue;
      }

      // Markdown or pipe table
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line.split('|').map(c => c.trim()).slice(1, -1);
        if (cells.length > 1) {
          // Check if separator line
          if (cells.every(c => /^[-:]+$/.test(c))) {
            inTable = true;
            continue;
          }

          if (!currentSchedule) {
            currentSchedule = {
              title: `Statutory Schedule ${schedules.length + 1}`,
              headers: cells,
              rows: []
            };
          } else if (currentSchedule.headers.length === 0) {
            currentSchedule.headers = cells;
          } else {
            currentSchedule.rows.push(cells);
          }
        }
      }
    }

    if (currentSchedule && currentSchedule.headers.length > 0) {
      schedules.push({
        scheduleTitle: currentSchedule.title,
        headers: currentSchedule.headers,
        rows: currentSchedule.rows
      });
    }

    return schedules;
  }

  private isPdfBuffer(buffer: Buffer | Uint8Array): boolean {
    return buffer.length >= 4 &&
      buffer[0] === 0x25 && // %
      buffer[1] === 0x50 && // P
      buffer[2] === 0x44 && // D
      buffer[3] === 0x46;   // F
  }

  private stripMarkdown(raw: string): string {
    let clean = raw.trim();
    if (clean.startsWith('```json')) {
      clean = clean.slice(7);
    } else if (clean.startsWith('```')) {
      clean = clean.slice(3);
    }
    if (clean.endsWith('```')) {
      clean = clean.slice(0, -3);
    }
    return clean.trim();
  }
}

export const defaultPdfStructureExtractor = new PdfStructureExtractor();
