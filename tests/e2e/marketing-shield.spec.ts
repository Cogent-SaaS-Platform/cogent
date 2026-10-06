import { test, expect } from '@playwright/test';

test.describe('Marketing & Growth Pre-Vetting Shield E2E (Epic 8 / Task 8.3 & USER_FLOWS.md)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads the Master Cockpit with breadcrumb lineage and evidence-bounded verdict banner', async ({
    page,
  }) => {
    // 1. Verify spatial breadcrumb lineage
    await expect(page.locator('text=Pillar 1: Marketing Shield')).toBeVisible();

    // 2. Verify Level 1 Verdict Banner
    const banner = page.locator('#marketing-shield-verdict-banner');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('BLOCKING ISSUE');

    // 3. Verify deterministic penalty banner
    await expect(banner).toContainText('₦');
    await expect(banner).toContainText('Deterministic Fine Exposure');
  });

  test('renders Split-View Comparison with interactive highlighted spans and compliant rewrite', async ({
    page,
  }) => {
    // Ensure Split-View tab is active
    const splitTab = page.locator('#tab-split-view');
    await expect(splitTab).toBeVisible();
    await splitTab.click();

    // Verify original draft copy panel
    await expect(page.locator('text=Submitted Draft Copy')).toBeVisible();

    // Verify highlighted violation spans exist
    const highlightedExcerpt = page.locator('mark, span[title*="Violation"]').first();
    await expect(highlightedExcerpt).toBeVisible();

    // Verify Compliant Rewrite panel
    await expect(page.locator('text=Verified Compliant Rewrite')).toBeVisible();
    await expect(page.locator('button[title*="Copy"]')).toBeVisible();
  });

  test('navigates Findings Feed and verifies Nigerian regulatory classifications', async ({
    page,
  }) => {
    // Switch to Findings Feed tab
    const findingsTab = page.locator('#tab-findings-feed');
    await expect(findingsTab).toBeVisible();
    await findingsTab.click();

    // Verify findings list is displayed
    const findingsList = page.locator('#marketing-shield-findings-list');
    await expect(findingsList).toBeVisible();

    // Verify regulator badges
    await expect(page.locator('text=ARCON').first()).toBeVisible();
    await expect(page.locator('text=CBN').first()).toBeVisible();

    // Test filter pills
    const allFilter = page.locator('button:has-text("All")').first();
    await expect(allFilter).toBeVisible();
  });

  test('interacts with Remediation Action Plan and updates completion progress', async ({
    page,
  }) => {
    // Switch to Action Plan tab
    const actionTab = page.locator('#tab-action-plan');
    await expect(actionTab).toBeVisible();
    await actionTab.click();

    // Verify action checklist is displayed
    const actionChecklist = page.locator('#marketing-shield-action-checklist');
    await expect(actionChecklist).toBeVisible();

    // Verify departmental owner tags
    await expect(page.locator('text=Marketing').first()).toBeVisible();
    await expect(page.locator('text=Legal').first()).toBeVisible();

    // Toggle the first action item
    const firstAction = page.locator('#marketing-shield-action-checklist > div:last-child > div').first();
    await firstAction.click();

    // Progress counter should update
    await expect(page.locator('text=1 of')).toBeVisible();
  });

  test('demonstrates progressive disclosure: clicking a finding opens the Contextual Side Sheet Inspector', async ({
    page,
  }) => {
    // Switch to Findings Feed
    await page.locator('#tab-findings-feed').click();

    // Click on the first finding card
    const firstFindingCard = page.locator('#marketing-shield-findings-list .finding-card, #marketing-shield-findings-list > div:nth-child(2) > div').first();
    await firstFindingCard.click();

    // Verify Contextual Inspector opens with verbatim statutory legal text
    const inspector = page.locator('#contextual-side-inspector');
    await expect(inspector).toBeVisible();
    await expect(inspector).toContainText('Statutory Clause Inspector');
    await expect(inspector).toContainText('Why It Matters');
  });

  test('triggers ARCON Pre-Clearance Dossier export', async ({ page }) => {
    const exportButton = page.locator('#export-dossier-top-button');
    await expect(exportButton).toBeVisible();

    // Setup download listener
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('ARCON_PreClearance_Dossier');
    expect(download.suggestedFilename()).toContain('.md');
  });
});
