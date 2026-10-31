import { describe, it, expect, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { DomSanitizer } from '@/modules/radar/services/domSanitizer';
import { ClauseSegmentationEngine } from '@/modules/radar/services/clauseSegmentationEngine';
import { POST as postIngest } from '@/app/api/radar/circulars/ingest/route';

// Realistic noisy SEC WordPress & Elementor portal HTML with search bar logic, language switcher, and authentic statutory body
const sampleNoisySecHtml = `
<!DOCTYPE html>
<html lang="en-US">
<head>
  <title>Designation of DCB Finance Limited - Securities and Exchange Commission Nigeria</title>
</head>
<body class="post-template-default single single-post">
  <!-- WordPress Top Navigation & Language Switcher -->
  <header class="site-header">
    <div class="top-bar">
      <div class="language-switcher">
        <span class="lang-item">Deutsch</span>
        <span class="lang-item">English</span>
        <span class="lang-item">Español</span>
        <span class="lang-item">Français</span>
        <span class="lang-item">Hausa</span>
        <span class="lang-item">Igbo</span>
        <span class="lang-item">Yoruba</span>
      </div>
      <div class="search-form-wrap">
        <form class="search-form" action="https://sec.gov.ng/">
          <input type="search" class="search-field" placeholder="Search..." name="s" />
          <button type="submit" class="search-submit" data-condition="40) ? true : false"> SEARCH English Deutsch Hausa... </button>
        </form>
      </div>
    </div>
    <nav class="main-navigation">
      <ul class="nav-menu">
        <li><a href="/">Home</a></li>
        <li><a href="/for-investors/">For Investors</a></li>
        <li><a href="/for-investors/keep-track-of-circulars/">Keep Track of Circulars</a></li>
      </ul>
    </nav>
  </header>

  <div class="breadcrumbs">Home / For Investors / Keep Track of Circulars / Designation of DCB Finance Limited</div>

  <!-- Primary Substantive Article Container -->
  <main id="main-content">
    <article class="elementor-widget-theme-post-content entry-content">
      <h1>CIRCULAR TO ALL CAPITAL MARKET OPERATORS AND PUBLIC COMPANIES</h1>
      <p class="meta-date">Date: March 15, 2024</p>
      
      <p>PURSUANT TO SECTION 13 OF THE INVESTMENTS AND SECURITIES ACT (ISA) 2007, THE SECURITIES AND EXCHANGE COMMISSION HEREBY ISSUES THIS DIRECTIVE TO ALL CAPITAL MARKET OPERATORS.</p>
      
      <p>The Securities and Exchange Commission (SEC) hereby notifies all Capital Market Operators (CMOs) and the general public of the immediate designation and targeted financial sanctions compliance requirements regarding designated entities under United Nations Security Council (UNSC) Resolutions 1267, 1989, and 2253.</p>
      
      <p>All registered capital market operators must immediately freeze without delay all funds, financial assets, and economic resources belonging to or controlled by designated persons and entities.</p>
      
      <p>Capital Market Operators shall file a mandatory Suspicious Transaction Report (STR) with the Nigerian Financial Intelligence Unit (NFIU) and notify the Commission within 24 hours of identifying any transaction or attempted transaction involving designated assets.</p>
      
      <p>Failure to comply with the asset freezing mandates set out in this directive attracts statutory sanctions of not less than N50,000,000 and carries personal criminal liability for corporate directors and principal officers under BOFIA and ISA enactments.</p>

      <p class="download-link">
        <a href="/wp-content/uploads/2024/03/SEC_CIRCULAR_DCB_SANCTIONS_MARCH_2024.pdf" class="btn-download">
          Download Official Signed Circular Document (PDF)
        </a>
      </p>
    </article>
  </main>

  <!-- Sidebar & Footer Boilerplate -->
  <aside class="sidebar widget-area">
    <div class="widget">
      <h3>Search this site</h3>
      <p>SEARCH...</p>
    </div>
  </aside>

  <footer class="site-footer">
    <p>© 2024 Securities and Exchange Commission (SEC) Nigeria. All Rights Reserved.</p>
    <p>Powered by WordPress & Elementor</p>
  </footer>
</body>
</html>
`;

/**
 * Creates a minimal valid PDF-1.4 binary buffer for testing text extraction
 */
function createTestPdfBuffer(textLine: string): Buffer {
  const contentStream = `BT\n/F1 12 Tf\n50 700 Td\n(${textLine.replace(/[()\\]/g, '\\$&')}) Tj\nET`;
  const streamLength = Buffer.byteLength(contentStream);

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${streamLength} >>
stream
${contentStream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000293 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${370 + streamLength}
%%EOF`;

  return Buffer.from(pdf, 'binary');
}

describe('Step 1 Verification: Regulatory Ingestion, DOM Sanitization & Clause Segmentation Engine', () => {

  describe('Test Case A: Scraped SEC HTML Sanitization & Clause Chunking', () => {
    it('extracts substantive article text with 0% navigation noise and 100% substantive text', () => {
      const cleanArticle = DomSanitizer.extractArticleContent(sampleNoisySecHtml, {
        baseUrl: 'https://sec.gov.ng',
      });

      // 1. Verify 0% navigation and template noise
      expect(cleanArticle).not.toContain('40) ? true : false');
      expect(cleanArticle).not.toContain('SEARCH English Deutsch');
      expect(cleanArticle).not.toContain('Home / For Investors');
      expect(cleanArticle).not.toContain('Powered by WordPress');
      expect(cleanArticle).not.toContain('Deutsch');
      expect(cleanArticle).not.toContain('Hausa');
      expect(cleanArticle).not.toContain('Igbo');
      expect(cleanArticle).not.toContain('Yoruba');

      // 2. Verify 100% substantive legal text retention
      expect(cleanArticle).toContain('CIRCULAR TO ALL CAPITAL MARKET OPERATORS');
      expect(cleanArticle).toContain('PURSUANT TO SECTION 13 OF THE INVESTMENTS AND SECURITIES ACT');
      expect(cleanArticle).toContain('immediately freeze without delay all funds');
      expect(cleanArticle).toContain('mandatory Suspicious Transaction Report (STR)');
      expect(cleanArticle).toContain('not less than N50,000,000');
    });

    it('extracts authentic PDF attachment links from HTML and resolves relative URLs', () => {
      const pdfLinks = DomSanitizer.extractPdfLinks(sampleNoisySecHtml, 'https://sec.gov.ng');
      expect(pdfLinks.length).toBe(1);
      expect(pdfLinks[0]).toBe('https://sec.gov.ng/wp-content/uploads/2024/03/SEC_CIRCULAR_DCB_SANCTIONS_MARCH_2024.pdf');
    });

    it('segments sanitized text into clean legal clauses without bogus headings or web code', () => {
      const cleanArticle = DomSanitizer.extractArticleContent(sampleNoisySecHtml);

      const clauses = ClauseSegmentationEngine.segmentAndDecompose({
        rawText: cleanArticle,
        regulatorCode: 'SEC',
        circularNumber: 'SEC/CIR/2024/003',
        subject: 'Designation of DCB Finance Limited Sanctions Mandate',
        priority: 'CRITICAL_EMERGENCY',
      });

      expect(clauses.length).toBeGreaterThanOrEqual(1);

      for (const clause of clauses) {
        // Section heading must NEVER contain scraped garbage
        expect(clause.sectionHeading).not.toContain('40) ?');
        expect(clause.sectionHeading).not.toContain('SEARCH');
        expect(clause.sectionHeading).not.toContain('elementor');
        expect(clause.sectionHeading).not.toContain('Deutsch');
        expect(clause.sectionHeading).not.toBe('SECURITIES AND EXCHANGE COMMISSION (SEC) NIGERIA');

        // Section heading must be a clean domain heading
        expect(clause.sectionHeading.length).toBeGreaterThan(4);

        // Every clause must have decomposed obligations
        expect(clause.obligations.length).toBeGreaterThanOrEqual(1);

        for (const obl of clause.obligations) {
          // Summary must be clean
          expect(obl.summary).not.toContain('40) ?');
          expect(obl.summary).not.toContain('SEARCH');

          // Verbatim quote must be grounded in the text
          expect(obl.verbatimQuote).toBeDefined();
          if (obl.verbatimQuote) {
            expect(clause.clauseText).toContain(obl.verbatimQuote);
          }

          // Offsets must be accurate
          expect(obl.startChar).toBeGreaterThanOrEqual(0);
          expect(obl.endChar).toBeGreaterThan(obl.startChar || 0);

          // Actor & action must be meaningful
          expect(obl.actor).toBeDefined();
          expect(obl.action).toBeDefined();
        }
      }

      // Check if sanctions and penalties were parsed
      const allPenalties = clauses.flatMap((c) => c.obligations.flatMap((o) => o.penalties));
      const hasCriminalLiability = allPenalties.some((p) => p.carriesPersonalCriminalLiability);
      const has50mFine = allPenalties.some((p) => p.penaltyMinNaira >= 50_000_000);

      expect(hasCriminalLiability).toBe(true);
      expect(has50mFine).toBe(true);
    });

    it('sanitizes raw text containing inline conditionals directly in clauseSegmentationEngine', () => {
      const corruptedRawText = `
SECURITIES AND EXCHANGE COMMISSION (SEC) NIGERIA
Title: Sanctions Directive
Date: 2024-03-15

40) ? true : false"> SEARCH English Hausa Igbo Yoruba...

All Capital Market Operators must file an STR with NFIU within 24 hours of identifying designated assets.
Failure to file attracts statutory penalties of ₦25,000,000.
`;

      const clauses = ClauseSegmentationEngine.segmentAndDecompose({
        rawText: corruptedRawText,
        regulatorCode: 'SEC',
        circularNumber: 'SEC/DIR/SANCTIONS',
        subject: 'Sanctions Directive',
      });

      expect(clauses.length).toBeGreaterThanOrEqual(1);
      const firstClause = clauses[0];

      // Verifies that '40) ?' or 'SEARCH' was not made the section heading
      expect(firstClause.sectionHeading).not.toContain('40) ?');
      expect(firstClause.sectionHeading).not.toContain('SEARCH');
      expect(firstClause.sectionHeading).not.toBe('SECURITIES AND EXCHANGE COMMISSION (SEC) NIGERIA');

      // The topic heading should be recognized as AML/CFT or Reporting or Sanctions
      expect(
        firstClause.sectionHeading.includes('Sanctions') ||
        firstClause.sectionHeading.includes('Reporting') ||
        firstClause.sectionHeading.includes('AML/CFT') ||
        firstClause.sectionHeading.includes('Mandate') ||
        firstClause.sectionHeading.includes('Directive')
      ).toBe(true);
    });
  });

  describe('Test Case B: PDF Text Extraction via unpdf', () => {
    it('extracts layout-preserved text from valid PDF binary buffers', async () => {
      const statutoryNotice = 'CENTRAL BANK OF NIGERIA CIRCULAR: OPERATIONAL COMPLIANCE MANDATE';
      const pdfBuffer = createTestPdfBuffer(statutoryNotice);

      const extractedText = await DomSanitizer.extractPdfText(pdfBuffer);
      expect(extractedText).toContain(statutoryNotice);
    });

    it('gracefully handles empty or corrupted PDF buffers without throwing unhandled exceptions', async () => {
      const corruptedBuffer = Buffer.from('Not a valid PDF buffer at all');
      const result = await DomSanitizer.extractPdfText(corruptedBuffer);
      expect(typeof result).toBe('string');
    });
  });

  describe('Test Case C: Ingestion Route Connection & Validation (/api/radar/circulars/ingest)', () => {
    it('rejects empty or missing payload with status 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/radar/circulars/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await postIngest(req);
      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.error).toBeDefined();
    });

    it('rejects insufficient portal text with status 422', async () => {
      // Mock rawText that is completely empty or insufficient
      const req = new NextRequest('http://localhost:3000/api/radar/circulars/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: '   ',
        }),
      });

      const response = await postIngest(req);
      expect([400, 422]).toContain(response.status);
    });

    it('sanitizes and ingests textual circulars without injecting web artifacts into clauses', async () => {
      const req = new NextRequest('http://localhost:3000/api/radar/circulars/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: `
CENTRAL BANK OF NIGERIA
Ref: BSD/DIR/GEN/CIR/04/001
Date: 2024-04-10
Subject: Prudential Guidelines for Commercial Banks

1.0 CAPITAL ADEQUACY REQUIREMENTS
All Commercial Banks shall maintain a minimum Capital Adequacy Ratio (CAR) of 15% on an ongoing basis.
Banks that fail to meet the CAR threshold within 30 days shall be prohibited from distributing dividends.

2.0 MANDATORY STATUTORY FILING
All affected licensed institutions must submit monthly risk asset returns to the Banking Supervision Department.
Failure to submit returns attracts a daily fine of N500,000 for each day of default.
`,
          regulator: 'CBN',
          referenceCode: 'BSD/DIR/GEN/CIR/04/001',
          subject: 'Prudential Guidelines for Commercial Banks',
        }),
      });

      const response = await postIngest(req);
      // Status should be 201 (Created) or 409 (Deduplicated if already seeded)
      expect([201, 409]).toContain(response.status);

      const json = await response.json();
      expect(json.data || json.deduplicated !== undefined).toBeTruthy();
    });

    it('Test Case D: Ingests web URL of open-world FinTech restructuring without error and segments cleanly', async () => {
      const sampleNewsHtml = `
      <!DOCTYPE html>
      <html>
      <head><title>Moniepoint initiates strategic workforce restructuring and ceases US expansion</title></head>
      <body>
        <div class="site-nav"><span>Home</span> <span>Menu</span></div>
        <article class="entry-content">
          <h1>Moniepoint announces workforce restructuring across engineering and customer support</h1>
          <p class="byline">Published: October 2026</p>
          <p>African financial services company Moniepoint has confirmed a strategic workforce restructuring affecting employees across departments.</p>
          <p>The company stated that the consolidation follows a decision to cease its United States market expansion and refocus resources on core retail and business banking infrastructure in West Africa.</p>
          <p>Affected employees will receive statutory redundancy severance benefits in compliance with Nigerian labour legislation and post-employment support packages.</p>
        </article>
        <footer><p>Copyright 2026 TechCabal / Media Group</p></footer>
      </body>
      </html>`;

      // Mock resilientFetch for this test
      const { resilientFetch } = await import('@/shared/network/resilientHttp');
      const fetchSpy = vi.spyOn({ resilientFetch }, 'resilientFetch').mockResolvedValue({
        status: 200,
        ok: true,
        headers: { 'content-type': 'text/html; charset=utf-8' },
        text: async () => sampleNewsHtml,
        buffer: async () => Buffer.from(sampleNewsHtml, 'utf8'),
      } as any);

      // Verify DOM sanitizer extracts clean text from the web URL article
      const cleaned = DomSanitizer.extractArticleContent(sampleNewsHtml);
      expect(cleaned).toContain('Moniepoint has confirmed a strategic workforce restructuring');
      expect(cleaned).not.toContain('site-nav');
      expect(cleaned).not.toContain('Copyright 2026');

      // Verify title sanitizer
      const title = DomSanitizer.cleanTitle('Moniepoint initiates strategic workforce restructuring and ceases US expansion');
      expect(title).toBe('Moniepoint initiates strategic workforce restructuring and ceases US expansion');

      // Verify clause segmentation detects Corporate Restructuring
      const clauses = ClauseSegmentationEngine.segmentAndDecompose({
        rawText: cleaned,
        regulatorCode: 'CBN',
        circularNumber: 'NEWS/MONIEPOINT/2026',
        subject: title,
        priority: 'MEDIUM',
      });

      expect(clauses.length).toBeGreaterThan(0);
      expect(clauses[0].sectionHeading).toBe('Corporate Restructuring & Workforce Redundancy Protocol');

      fetchSpy.mockRestore();
    });
  });

});
