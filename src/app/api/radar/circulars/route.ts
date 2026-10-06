import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/shared/db';
import { logger } from '@/shared/logger';
import { defaultCountdownCalculator } from '@/modules/radar/services/deadlineCountdownCalculator';
import { RegulatorCode } from '@/shared/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const regulator = searchParams.get('regulator');
    const priority = searchParams.get('priority');

    let db;
    try {
      db = createAdminClient();
    } catch {
      db = createClient();
    }

    let query = db
      .from('radar_circulars')
      .select('*, regulatory_document_versions(source_file_url, publication_date, effective_date)')
      .order('created_at', { ascending: false });

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query;

    if (error) {
      logger.warn({ error: error.message }, 'Failed to query radar_circulars; returning empty array');
      return NextResponse.json({ success: true, circulars: [] });
    }

    // Filter by regulator if requested
    let circulars = data || [];
    if (regulator) {
      circulars = circulars.filter((c: any) =>
        c.circular_number?.toUpperCase().startsWith(regulator.toUpperCase()) ||
        c.subject?.toUpperCase().includes(regulator.toUpperCase())
      );
    }

    // Augment circulars with dynamic statutory countdown evaluations & penalty projections
    const enrichedCirculars = circulars.map((c: any) => {
      let regulatorCode: RegulatorCode = 'CBN';
      const refPrefix = (c.circular_number || '').split('/')[0]?.toUpperCase();
      if (['CBN', 'SEC', 'ARCON', 'NDPC', 'FCCPC', 'NFIU', 'NDIC'].includes(refPrefix)) {
        regulatorCode = refPrefix as RegulatorCode;
      }

      const countdown = defaultCountdownCalculator.calculateCountdown({
        statutoryDeadline: c.statutory_deadline,
        publicationDate: c.issuance_date || c.created_at,
        regulator: regulatorCode,
      });

      return {
        ...c,
        countdown,
      };
    });

    return NextResponse.json({
      success: true,
      circulars: enrichedCirculars,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Error fetching radar circulars');
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
