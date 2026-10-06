import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriftWatcherService } from '@/modules/marketing-shield/driftWatcherService';

describe('DriftWatcherService (Phase 1 / Task 1.4)', () => {
  const dummyOrgId = '00000000-0000-0000-0000-000000000001';
  const dummyScanId = '00000000-0000-0000-0000-000000000099';

  let mockSupabase: any;
  let mockAiEngine: any;
  let watcher: DriftWatcherService;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: dummyScanId,
            compliant_rewrite_full:
              'Flexible savings with competitive yield. Capital at risk. Licensed by the Central Bank of Nigeria. Deposits insured by NDIC.',
            raw_copy: 'Save money and earn interest.',
          },
          error: null,
        }),
        update: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'mock-asset-uuid-1',
            organization_id: dummyOrgId,
            scan_id: dummyScanId,
            live_url: 'https://example.com/landing',
            channel: 'LANDING_PAGE',
            original_approved_hash: 'a'.repeat(64),
            last_checked_at: new Date().toISOString(),
            drift_status: 'SYNCED',
            drift_findings: null,
            created_at: new Date().toISOString(),
          },
          error: null,
        }),
      }),
    };

    mockAiEngine = {
      generateStructured: vi.fn().mockResolvedValue({
        data: {
          isDrifted: true,
          omittedDisclosures: ['CBN License'],
          modifiedClaims: [],
          unapprovedPromises: [],
          findings: [],
          summary: 'Omitted mandatory disclosure.',
        },
      }),
    };

    watcher = new DriftWatcherService(mockSupabase, mockAiEngine);
  });

  it('extracts visible text from raw HTML by removing scripts and tags', () => {
    const rawHtml = `
      <html>
        <head>
          <script>console.log("secret");</script>
          <style>body { color: red; }</style>
        </head>
        <body>
          <h1>Get Quick Cash</h1>
          <p>Instant approval nano-loans &amp; zero hidden fees.</p>
          <!-- Internal tracking comment -->
        </body>
      </html>
    `;

    const extracted = watcher.extractVisibleText(rawHtml);
    expect(extracted).not.toContain('console.log');
    expect(extracted).not.toContain('body { color: red; }');
    expect(extracted).not.toContain('Internal tracking');
    expect(extracted).toContain('Get Quick Cash');
    expect(extracted).toContain('Instant approval nano-loans & zero hidden fees.');
  });

  it('detects SYNCED state when live text matches approved copy hash', async () => {
    const approvedCopy =
      'Flexible savings with competitive yield. Capital at risk. Licensed by the Central Bank of Nigeria. Deposits insured by NDIC.';

    const report = await watcher.verifyLiveUrl({
      liveUrl: 'https://example.com/promo',
      organizationId: dummyOrgId,
      originalScanId: dummyScanId,
      directLiveText: approvedCopy,
    });

    expect(report.isDrifted).toBe(false);
    expect(report.driftStatus).toBe('SYNCED');
    expect(report.driftSeverity).toBe('NONE');
    expect(report.omittedDisclosures.length).toBe(0);
    expect(report.findings.length).toBe(0);
  });

  it('detects DRIFT when live copy strips mandatory CBN and NDIC disclosures', async () => {
    // Stripped of "Licensed by the Central Bank of Nigeria" and "Deposits insured by NDIC"
    const driftedCopy =
      'Flexible savings with competitive yield. Start saving now and watch your money grow.';

    const report = await watcher.verifyLiveUrl({
      liveUrl: 'https://example.com/promo',
      organizationId: dummyOrgId,
      originalScanId: dummyScanId,
      directLiveText: driftedCopy,
    });

    expect(report.isDrifted).toBe(true);
    expect(report.driftStatus).toBe('DRIFT_DETECTED');
    expect(report.driftSeverity).toBe('CRITICAL');
    expect(report.omittedDisclosures).toContain('CBN License Disclosure');
    expect(report.omittedDisclosures).toContain('NDIC Insurance Coverage');
    expect(
      report.findings.some((f) => f.findingType === 'OMITTED_MANDATORY_DISCLOSURE')
    ).toBe(true);
  });

  it('detects unapproved exaggerated promise added to live published asset', async () => {
    const driftedCopyWithPromise =
      'Flexible savings with competitive yield. Guaranteed returns of 40% annually! Licensed by the Central Bank of Nigeria. Deposits insured by NDIC.';

    const report = await watcher.verifyLiveUrl({
      liveUrl: 'https://example.com/promo',
      organizationId: dummyOrgId,
      originalScanId: dummyScanId,
      directLiveText: driftedCopyWithPromise,
    });

    expect(report.isDrifted).toBe(true);
    expect(report.driftStatus).toBe('DRIFT_DETECTED');
    expect(
      report.findings.some((f) => f.findingType === 'UNAPPROVED_PROMISE')
    ).toBe(true);
    expect(
      report.findings.some((f) => f.description.includes('Guaranteed Returns'))
    ).toBe(true);
  });

  it('registers live asset record with valid SHA-256 hash', async () => {
    const hash = 'b'.repeat(64);
    const asset = await watcher.registerLiveAsset({
      organizationId: dummyOrgId,
      scanId: dummyScanId,
      liveUrl: 'https://example.com/landing',
      channel: 'LANDING_PAGE_WEBSITE',
      originalApprovedHash: hash,
    });

    expect(asset.organizationId).toBe(dummyOrgId);
    expect(asset.liveUrl).toBe('https://example.com/landing');
    expect(mockSupabase.from).toHaveBeenCalledWith('marketing_live_assets');
  });
});
