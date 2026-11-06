/**
 * Shared regulatory topic taxonomy.
 *
 * Single source of truth for topic classification used by:
 *  - the overview dashboard trending-topics partition (/api/dashboard/overview)
 *  - the Horizon Scanning list filter (/insight?topic=<topicKey>)
 *
 * Both consumers MUST use `classifyTopic` so that a topic count shown on the
 * overview always equals the number of rows the /insight topic filter returns.
 */

export interface RegulatoryTopic {
  key: RegulatoryTopicKey;
  name: string;
  keywords: string[];
}

export type RegulatoryTopicKey =
  | 'aml_cft'
  | 'consumer_protection'
  | 'data_privacy'
  | 'payments_rails'
  | 'digital_lending'
  | 'corporate_governance';

export const TOPIC_TAXONOMY: RegulatoryTopic[] = [
  {
    key: 'aml_cft',
    name: 'AML/CFT & Sanctions',
    keywords: [
      'aml',
      'cft',
      'kyc',
      'sanction',
      'fatf',
      'nigsac',
      'ofac',
      'str',
      'money laundering',
      'beneficial ownership',
      'dcb finance',
      'pep',
      'unscrs',
      'tier-3',
      'watch-list',
    ],
  },
  {
    key: 'consumer_protection',
    name: 'Consumer Protection & APR',
    keywords: [
      'consumer',
      'apr',
      'disclosure',
      'fee',
      'tariff',
      'complaint',
      'interest',
      'fccpc',
      'fair lending',
      'dormant',
      'unclaimed',
      'charges',
      'dud cheque',
      'advertisement',
      'airtime',
      'failed',
      'cash-related',
      'cash disbursement',
      'app fraud',
      'push payment',
    ],
  },
  {
    key: 'data_privacy',
    name: 'Data Privacy & NDPA 2023',
    keywords: [
      'data',
      'privacy',
      'ndpa',
      'ndpc',
      'personal data',
      'consent',
      'dpo',
      'controller',
      'cybersecurity',
      'cloud',
      'soc',
      'threat intelligence',
      'csat',
      'data localisation',
    ],
  },
  {
    key: 'payments_rails',
    name: 'Payments & Switching Rails',
    keywords: [
      'contactless',
      'interchange',
      'payment',
      'pos',
      'pssp',
      'switching',
      'rail',
      'efems',
      'nfem',
      'bswitch',
      'settlement',
      'cash',
      'atms',
      'dmb',
      'geo-fencing',
      'geo-tagging',
      'bvn',
      'instant payment',
      'iso 20022',
      'cheque',
      'nicpas',
      'tms',
      'ptsas',
      'agent banking',
      'foreign cards',
    ],
  },
  {
    key: 'digital_lending',
    name: 'Digital Lending & Sub-Brokers',
    keywords: [
      'lending',
      'loan',
      'nano',
      'credit',
      'sub-broker',
      'digital asset',
      'vasp',
      'crypto',
      'arip',
      'custody',
      'cross-border',
      'algorithmic',
      'robo-advisory',
      'virtual asset',
      'stma',
      'movable assets',
    ],
  },
  {
    key: 'corporate_governance',
    name: 'Corporate Governance & CAMA',
    keywords: [
      'governance',
      'cama',
      'director',
      'board',
      'capital adequacy',
      'mpc',
      'sdf',
      'prudential',
      'bullion',
      'balance of payments',
      'inspection agent',
      'bofia',
      'audit',
      'holding companies',
      'ring-fencing',
      'union bank',
      'successors',
      'sustainability',
      'ifrs',
      't+1 settlement',
      'nnmra',
      'non-interest',
    ],
  },
];

export const TOPIC_KEYS: RegulatoryTopicKey[] = TOPIC_TAXONOMY.map((t) => t.key);

export function isRegulatoryTopicKey(value: string | null | undefined): value is RegulatoryTopicKey {
  return !!value && (TOPIC_KEYS as string[]).includes(value);
}

export function getTopicByKey(key: string | null | undefined): RegulatoryTopic | undefined {
  return TOPIC_TAXONOMY.find((t) => t.key === key);
}

/**
 * Fields used to build the classification text. Mirrors the overview route:
 * `${circular_number} ${subject} ${summary} ${executive_summary}`.
 */
export interface TopicClassifiableFields {
  circular_number?: string | null;
  subject?: string | null;
  summary?: string | null;
  executive_summary?: string | null;
}

export function buildTopicClassificationText(c: TopicClassifiableFields): string {
  return `${c.circular_number || ''} ${c.subject || ''} ${c.summary || ''} ${c.executive_summary || ''}`;
}

/**
 * Returns the single best topicKey for the given text.
 *
 * Scoring (identical to the original overview route logic):
 *  - text is lower-cased
 *  - each keyword contained in the text scores 2 if keyword.length > 5, else 1
 *  - the topic with the strictly highest score wins (first wins on ties)
 *  - if no keyword matches, falls back to the LAST taxonomy entry
 *    (corporate_governance) so every circular lands in exactly one bucket.
 */
export function classifyTopic(text: string): RegulatoryTopicKey {
  const lower = (text || '').toLowerCase();
  let bestTopic = TOPIC_TAXONOMY[TOPIC_TAXONOMY.length - 1];
  let maxScore = 0;

  for (const t of TOPIC_TAXONOMY) {
    let score = 0;
    for (const kw of t.keywords) {
      if (lower.includes(kw)) {
        score += kw.length > 5 ? 2 : 1;
      }
    }
    if (score > maxScore) {
      maxScore = score;
      bestTopic = t;
    }
  }

  return bestTopic.key;
}
