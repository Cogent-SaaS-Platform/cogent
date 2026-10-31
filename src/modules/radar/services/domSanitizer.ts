import { logger } from '@/shared/logger';

/**
 * Options for HTML content sanitization and article extraction
 */
export interface DomSanitizationOptions {
  baseUrl?: string;
  minContentLength?: number;
}

/**
 * Enterprise Production DOM Sanitizer & Statutory Content Extractor
 * Eliminates website navigation, header bars, footer links, WordPress/Elementor template artifacts,
 * inline conditional JavaScript expressions, and language switcher menus from scraped regulatory portals.
 */
export class DomSanitizer {
  /**
   * Decodes all standard and numerical HTML entities
   */
  public static decodeHtmlEntities(text: string): string {
    if (!text) return '';

    return text
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&sect;/g, '§')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&hellip;/g, '…')
      .replace(/&copy;/g, '©')
      .replace(/&reg;/g, '®')
      .replace(/&#(\d+);/g, (_, dec) => {
        try {
          return String.fromCharCode(parseInt(dec, 10));
        } catch {
          return '';
        }
      })
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
        try {
          return String.fromCharCode(parseInt(hex, 16));
        } catch {
          return '';
        }
      });
  }

  /**
   * Strips noisy non-content DOM elements, script tags, forms, and template logic
   */
  public static stripNoiseElements(html: string): string {
    if (!html) return '';

    let cleaned = html
      // 1. Strip script, style, noscript, svg, header, footer, nav, form tags
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, ' ')

      // 2. Strip WordPress/Elementor search widgets and forms
      .replace(/<div\b[^>]*class=["'][^"']*\b(?:search-form|search-box|searchform|widget_search)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, ' ')
      
      // 3. Strip language switchers (Weglot, GTranslate, WordPress multilingual)
      .replace(/<div\b[^>]*class=["'][^"']*\b(?:language-switcher|weglot|gtranslate|lang-switch|language-selector|country-selector)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, ' ')
      .replace(/<ul\b[^>]*class=["'][^"']*\b(?:language-switcher|weglot|gtranslate|lang-switch)\b[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, ' ')
      
      // 4. Strip sidebars, widget areas, breadcrumbs, social share bars
      .replace(/<div\b[^>]*class=["'][^"']*\b(?:sidebar|widget-area|secondary|breadcrumbs|yoast-breadcrumbs|social-share|share-buttons|cookie-banner|consent-banner)\b[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, ' ')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')

      // 5. Strip inline conditional JavaScript & WordPress template artifacts (e.g. '40) ? true : false"> SEARCH...')
      .replace(/\d+\)\s*\?\s*true\s*:\s*false["']>[\s\S]*?(?:SEARCH|Search)?/gi, ' ')
      .replace(/\?\s*true\s*:\s*false/gi, ' ')
      .replace(/\{\{[^}]*\}\}/g, ' ')
      .replace(/\[(?:wp_|elementor)[^\]]*\]/gi, ' ');

    return cleaned;
  }

  /**
   * Sanitizes raw titles extracted from regulatory portal HTML or navigation anchors.
   * Strips all template artifacts, conditional JS expressions, search boxes, and language selectors.
   */
  public static cleanTitle(rawTitle: string): string {
    if (!rawTitle) return '';

    let text = this.decodeHtmlEntities(rawTitle);

    // Strip HTML tags
    text = text.replace(/<[^>]+>/g, ' ');

    // Strip WordPress conditional search logic artifacts
    text = text.replace(/\d+\)\s*\?\s*true\s*:\s*false["']>[\s\S]*?(?:SEARCH|Search)?/gi, ' ');
    text = text.replace(/\?\s*true\s*:\s*false/gi, ' ');
    text = text.replace(/\b(?:search\.\.\.|search\s+this\s+site|search|elementor-search)\b/gi, ' ');

    // Strip language switcher artifacts
    text = text.replace(/\b(?:deutsch|english|español|espanol|français|francais|hausa|igbo|yoruba|arabic|chinese|português|select\s+language)\b/gi, ' ');

    // Strip stray template tags
    text = text.replace(/\{\{[^}]*\}\}/g, ' ');
    text = text.replace(/\[(?:wp_|elementor)[^\]]*\]/gi, ' ');

    // Remove stray pipes, bullets, and excessive spaces
    text = text
      .replace(/[|\u2022\u00b7]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Clean leading punctuation
    text = text.replace(/^[:\s–—\-]+/, '').trim();

    return text;
  }

  /**
   * Cleans URL slugs to produce deterministic, human-readable reference codes
   * free of template conditional scripts or web noise.
   */
  public static cleanSlug(rawSlug: string): string {
    if (!rawSlug) return 'CIRCULAR';

    let clean = this.cleanTitle(rawSlug);
    clean = clean.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

    // Avoid generic or noise slugs
    if (clean.length < 3 || /^(true|false|search|elementor)$/i.test(clean)) {
      return `CIRCULAR_${Date.now().toString().slice(-4)}`;
    }

    return clean.slice(0, 35).toUpperCase();
  }

  /**
   * Targets authentic primary article container in HTML documents
   */
  public static extractPrimaryContainer(html: string): string {
    if (!html) return '';

    // Strip scripts/headers first so candidates are evaluated on substantive content
    const sanitizedHtml = this.stripNoiseElements(html);

    // Primary container candidate selectors
    const containerPatterns: RegExp[] = [
      // 1. Standard HTML5 article element
      /<article\b[^>]*>([\s\S]*?)<\/article>/i,

      // 2. WordPress & Elementor primary post content containers
      /<div\b[^>]*class=["'][^"']*\b(?:elementor-widget-theme-post-content|elementor-post__content)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
      /<div\b[^>]*class=["'][^"']*\b(?:entry-content|post-content|single-post-content)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,

      // 3. Main content containers
      /<div\b[^>]*id=["'](?:main-content|content|primary)["'][^>]*>([\s\S]*?)<\/div>/i,
      /<main\b[^>]*>([\s\S]*?)<\/main>/i,

      // 4. General document/article content classes
      /<div\b[^>]*class=["'][^"']*\b(?:document-content|article-body|page-content|content-area)\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of containerPatterns) {
      const match = sanitizedHtml.match(pattern);
      if (match && match[1]) {
        const candidateInner = match[1];
        // Ensure the candidate container has substantive textual content
        const textOnly = candidateInner.replace(/<[^>]+>/g, '').trim();
        if (textOnly.length >= 80) {
          return candidateInner;
        }
      }
    }

    // Fallback: Check body element
    const bodyMatch = sanitizedHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      return bodyMatch[1];
    }

    return sanitizedHtml;
  }

  /**
   * Converts structured HTML tags into clean, human-readable text with paragraph spacing
   */
  public static htmlToCleanText(htmlSnippet: string): string {
    if (!htmlSnippet) return '';

    let text = htmlSnippet
      // Headings -> double newlines
      .replace(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
      // Paragraphs -> double newlines
      .replace(/<p\b[^>]*>([\s\S]*?)<\/p>/gi, '\n\n$1\n\n')
      // List items -> bullet points
      .replace(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
      // Line breaks -> single newline
      .replace(/<br\s*\/?>/gi, '\n')
      // Table rows -> newline
      .replace(/<\/tr>/gi, '\n')
      // Table cells -> spaced
      .replace(/<\/t[dh]>/gi, '  ')
      // Block elements -> double newline
      .replace(/<\/(?:div|section|blockquote)>/gi, '\n\n')
      // Strip remaining tags
      .replace(/<[^>]+>/g, ' ');

    // Decode entities
    text = this.decodeHtmlEntities(text);

    return text;
  }

  /**
   * Filters out remaining navigation, search forms, and language list lines
   */
  public static filterNoiseLines(rawText: string): string {
    if (!rawText) return '';

    const lines = rawText.split(/\r?\n/);
    const cleanLines: string[] = [];

    // Language keywords frequently dumped by multilingual plugins
    const languageKeywords = [
      'deutsch', 'english', 'español', 'espanol', 'français', 'francais',
      'hausa', 'igbo', 'yoruba', 'arabic', 'chinese', 'português'
    ];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      const lower = line.toLowerCase();

      // Check 1: Language switcher line (contains 2 or more language names)
      let langHits = 0;
      for (const lang of languageKeywords) {
        if (new RegExp(`\\b${lang}\\b`, 'i').test(lower)) {
          langHits++;
        }
      }
      if (langHits >= 2 || lower.includes('select language') || lower.includes('powered by gtranslate') || lower.includes('powered by weglot')) {
        continue;
      }

      // Check 2: Search form artifacts
      if (
        lower.startsWith('search...') ||
        lower.startsWith('search this site') ||
        lower.startsWith('search here') ||
        lower === 'search' ||
        lower.includes('? true : false') ||
        lower.includes('elementor-search')
      ) {
        continue;
      }

      // Check 3: Breadcrumb trails
      if (/^(?:home\s*[\/>|»]\s*)+/i.test(line) || /^(?:home\s*\/)+/i.test(line)) {
        continue;
      }

      // Check 4: UI Navigation boilerplate
      if (
        line === 'Skip to content' ||
        line === 'Toggle navigation' ||
        line === 'Main Menu' ||
        line === 'Menu' ||
        line === 'Close menu'
      ) {
        continue;
      }

      // Check 5: Social share prompts
      if (
        lower.startsWith('share this:') ||
        lower.startsWith('follow us on') ||
        lower === 'facebook twitter linkedin whatsapp' ||
        lower === 'share on facebook'
      ) {
        continue;
      }

      // Check 6: Copyright / footer one-liners
      if (/^©\s*\d{4}.*?(?:all rights reserved|securities and exchange commission|central bank of nigeria)/i.test(line)) {
        continue;
      }

      cleanLines.push(line);
    }

    // Reconstruct with paragraph breaks
    return cleanLines.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Main Article Extraction Pipeline
   * Takes raw portal HTML and produces clean, authentic statutory text.
   */
  public static extractArticleContent(html: string, options?: DomSanitizationOptions): string {
    if (!html || typeof html !== 'string') return '';

    // Step 1: Locate targeted primary container
    const containerHtml = this.extractPrimaryContainer(html);

    // Step 2: Strip tag noise and format to text
    const intermediateText = this.htmlToCleanText(containerHtml);

    // Step 3: Filter line-level noise (language switchers, search bars)
    const cleanText = this.filterNoiseLines(intermediateText);

    return cleanText;
  }

  /**
   * Scans HTML for official regulatory PDF attachments
   * Resolves relative paths against baseUrl
   */
  public static extractPdfLinks(html: string, baseUrl?: string): string[] {
    if (!html) return [];

    const pdfLinks: string[] = [];
    const seen = new Set<string>();

    const linkRegex = /<a\b[^>]*href=["']([^"']+\.pdf(?:\?[^"']*)?)["'][^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      let rawHref = match[1].trim();
      if (!rawHref) continue;

      let absoluteUrl = rawHref;
      if (!rawHref.startsWith('http://') && !rawHref.startsWith('https://')) {
        if (baseUrl) {
          try {
            absoluteUrl = new URL(rawHref, baseUrl).toString();
          } catch {
            absoluteUrl = rawHref.startsWith('/') ? `${baseUrl.replace(/\/+$/, '')}${rawHref}` : `${baseUrl}/${rawHref}`;
          }
        }
      }

      if (!seen.has(absoluteUrl.toLowerCase())) {
        seen.add(absoluteUrl.toLowerCase());
        pdfLinks.push(absoluteUrl);
      }
    }

    return pdfLinks;
  }

  /**
   * Extracts layout-preserved text from PDF binary using unpdf
   */
  public static async extractPdfText(buffer: Buffer | Uint8Array): Promise<string> {
    try {
      const { extractText } = await import('unpdf');
      const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
      const uint8 = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
      const { text } = await extractText(uint8);

      const combinedText = Array.isArray(text) ? text.join('\n\n') : (text || '');
      return combinedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    } catch (err) {
      logger.warn({ err: String(err) }, 'Failed extracting PDF text using unpdf');
      return '';
    }
  }
}
