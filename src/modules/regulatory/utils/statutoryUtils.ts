/**
 * Clean atomic requirement text by stripping portal scraping artifacts,
 * search script fragments, and repetitive header prefixes.
 */
export function sanitizeRequirementText(text: string): string {
  if (!text) return 'Deterministic statutory obligation';

  const cleaned = text
    .replace(/40\)\s*\?\s*true\s*:\s*false["']>.*?SEARCH\s+[A-Za-z\s]+/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/(?:Deutsch|Hausa|Igbo|Yoruba|French|Arabic|English)\s*\|?\s*/gi, '')
    .replace(/\|\s*/g, ' ')
    .replace(/^(?:[|\s:–-]*Section\s+[\d\.]+\s*[:–-]?\s*)/i, '')
    .replace(/^[|\s:–-]+/g, '')
    .replace(/^Section\s+[\d\.]+\s*[:–-]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned || cleaned.length < 5) {
    return 'Statutory compliance obligation under governing regulatory framework';
  }

  return cleaned;
}

/**
 * Format statutory human identifier (e.g., OBL-CBN-2024-001)
 * Guarantees zero raw database UUIDs are shown to users.
 */
export function formatStatutoryIdentifier(
  regulator: string,
  year: number | string | undefined | null,
  sequenceOrId: number | string
): string {
  const reg = (regulator || 'REG').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const yr = year ? String(year).slice(-4) : new Date().getFullYear().toString();

  if (typeof sequenceOrId === 'string' && /^OBL-[A-Z0-9]+-\d{4}-\d+$/i.test(sequenceOrId)) {
    return sequenceOrId.toUpperCase();
  }

  let seqStr = '001';
  if (typeof sequenceOrId === 'number') {
    seqStr = sequenceOrId.toString().padStart(3, '0');
  } else if (typeof sequenceOrId === 'string') {
    if (/^\d+$/.test(sequenceOrId)) {
      seqStr = sequenceOrId.padStart(3, '0');
    } else {
      let hash = 0;
      for (let i = 0; i < sequenceOrId.length; i++) {
        hash = (hash << 5) - hash + sequenceOrId.charCodeAt(i);
        hash |= 0;
      }
      const positiveHash = Math.abs(hash) % 900 + 100;
      seqStr = positiveHash.toString();
    }
  }

  return `OBL-${reg}-${yr}-${seqStr}`;
}
