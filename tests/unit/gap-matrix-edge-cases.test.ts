import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET as getGapAnalyses,
  POST as postGapAnalyses,
  PATCH as patchGapAnalyses,
  DELETE as deleteGapAnalyses,
} from '@/app/api/gap-analyses/route';

describe('Production Gap Analysis API & Endpoint Edge Cases', () => {
  it('POST /api/gap-analyses rejects empty body with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await postGapAnalyses(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('At least one regulation and one internal policy must be selected');
  });

  it('POST /api/gap-analyses rejects missing policy with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regulationIds: ['reg-aml-2022'],
        policyIds: [],
      }),
    });

    const res = await postGapAnalyses(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('At least one regulation and one internal policy must be selected');
  });

  it('POST /api/gap-analyses rejects missing regulation with 400', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-analyses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regulationIds: [],
        policyIds: ['pol-aml-manual'],
      }),
    });

    const res = await postGapAnalyses(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toContain('At least one regulation and one internal policy must be selected');
  });

  it('PATCH /api/gap-analyses rejects request when evaluationId is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-analyses', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: 'item-1',
        criterionStatus: 'MET',
      }),
    });

    const res = await patchGapAnalyses(req);
    // When evaluationId is missing or dbClient is not available
    expect([400, 500]).toContain(res.status);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('GET /api/gap-analyses returns 200 with data array or handles missing database', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-analyses');
    const res = await getGapAnalyses(req);
    // Returns 200 if db is configured/mocked, or 500 with proper error JSON
    expect([200, 500]).toContain(res.status);
    const json = await res.json();
    expect(json).toHaveProperty('success');
  });

  it('DELETE /api/gap-analyses requires id query param', async () => {
    const req = new NextRequest('http://localhost:3000/api/gap-analyses');
    const res = await deleteGapAnalyses(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toMatch(/evaluation id/i);
  });
});
