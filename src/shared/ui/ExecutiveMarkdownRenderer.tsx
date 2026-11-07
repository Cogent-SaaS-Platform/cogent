'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  AlertTriangle,
  Info,
  ShieldAlert,
  CheckCircle,
  Scale,
  BookOpen,
} from 'lucide-react';

interface ExecutiveMarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Enterprise-grade Markdown Renderer tailored for Executive Regulatory Briefings,
 * Legal Opinions, and Supervisory Audit Defense Dossiers.
 * Parses headers, callout alert cards, bold legal terms, statutory pill codes,
 * copyable policy clause blocks, bullet lists, and tables without external heavy dependencies.
 */
export function ExecutiveMarkdownRenderer({
  content,
  className = '',
}: ExecutiveMarkdownRendererProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyCode = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  if (!content) return null;

  // Split lines into blocks
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let codeBlockCounter = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 1. Code blocks (e.g. ```text or ```sql or ```markdown)
    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      const blockText = codeLines.join('\n');
      const currentBlockIdx = codeBlockCounter++;

      elements.push(
        <div
          key={`code-${currentBlockIdx}-${i}`}
          className="my-3.5 rounded-lg border border-slate-300 bg-slate-900 overflow-hidden shadow-xs"
        >
          <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-950/80 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
            <span className="uppercase tracking-wider font-semibold text-slate-300 flex items-center gap-1.5">
              <Scale className="w-3 h-3 text-emerald-400" />
              {lang || 'Statutory Policy Clause'}
            </span>
            <button
              type="button"
              onClick={() => handleCopyCode(blockText, currentBlockIdx)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Copy to clipboard"
            >
              {copiedIndex === currentBlockIdx ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-sans text-[10px]">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span className="font-sans text-[10px]">Copy Clause</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3.5 text-xs font-mono text-emerald-300/90 leading-relaxed overflow-x-auto whitespace-pre-wrap">
            {blockText}
          </pre>
        </div>
      );
      continue;
    }

    // 2. Alert / Callout blocks (e.g. > [!CRITICAL], > [!WARNING], > [!NOTE], > [!TIP] or > blockquote)
    if (line.trim().startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }

      const rawQuote = quoteLines.join('\n').trim();
      let alertType: 'CRITICAL' | 'WARNING' | 'NOTE' | 'TIP' | 'STANDARD' = 'STANDARD';
      let alertContent = rawQuote;

      if (rawQuote.startsWith('[!CRITICAL]')) {
        alertType = 'CRITICAL';
        alertContent = rawQuote.replace(/^\[!CRITICAL\]\s?/, '');
      } else if (rawQuote.startsWith('[!WARNING]')) {
        alertType = 'WARNING';
        alertContent = rawQuote.replace(/^\[!WARNING\]\s?/, '');
      } else if (rawQuote.startsWith('[!NOTE]')) {
        alertType = 'NOTE';
        alertContent = rawQuote.replace(/^\[!NOTE\]\s?/, '');
      } else if (rawQuote.startsWith('[!TIP]')) {
        alertType = 'TIP';
        alertContent = rawQuote.replace(/^\[!TIP\]\s?/, '');
      }

      if (alertType === 'CRITICAL') {
        elements.push(
          <div
            key={`alert-${i}`}
            className="my-3 p-3.5 rounded-lg bg-rose-50/80 border border-rose-200 text-rose-950 flex items-start gap-3 shadow-2xs"
          >
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-700 block">
                Supervisory Sanction Exposure
              </span>
              <div className="font-sans text-rose-900">
                {renderInlineFormatting(alertContent)}
              </div>
            </div>
          </div>
        );
      } else if (alertType === 'WARNING') {
        elements.push(
          <div
            key={`alert-${i}`}
            className="my-3 p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-950 flex items-start gap-3 shadow-2xs"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block">
                Regulatory Examination Vulnerability
              </span>
              <div className="font-sans text-amber-900">
                {renderInlineFormatting(alertContent)}
              </div>
            </div>
          </div>
        );
      } else if (alertType === 'NOTE') {
        elements.push(
          <div
            key={`alert-${i}`}
            className="my-3 p-3.5 rounded-lg bg-indigo-50/80 border border-indigo-200 text-indigo-950 flex items-start gap-3 shadow-2xs"
          >
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-700 block">
                Statutory Context &amp; Legislative Intent
              </span>
              <div className="font-sans text-indigo-900">
                {renderInlineFormatting(alertContent)}
              </div>
            </div>
          </div>
        );
      } else if (alertType === 'TIP') {
        elements.push(
          <div
            key={`alert-${i}`}
            className="my-3 p-3.5 rounded-lg bg-emerald-50/80 border border-emerald-200 text-emerald-950 flex items-start gap-3 shadow-2xs"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700 block">
                Strategic Compliance Recommendation
              </span>
              <div className="font-sans text-emerald-900">
                {renderInlineFormatting(alertContent)}
              </div>
            </div>
          </div>
        );
      } else {
        elements.push(
          <blockquote
            key={`quote-${i}`}
            className="my-3 pl-3.5 border-l-2 border-slate-300 text-slate-700 italic text-xs leading-relaxed"
          >
            {renderInlineFormatting(alertContent)}
          </blockquote>
        );
      }
      continue;
    }

    // 3. Headings
    if (line.startsWith('# ')) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-base font-bold text-slate-900 tracking-tight mt-5 mb-2 pb-1.5 border-b border-slate-200"
        >
          {renderInlineFormatting(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-sm font-bold text-slate-900 tracking-tight mt-4 mb-2 flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          <span>{renderInlineFormatting(line.slice(3))}</span>
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-3 mb-1.5 text-slate-700"
        >
          {renderInlineFormatting(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith('#### ')) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-xs font-semibold text-slate-800 mt-2 mb-1"
        >
          {renderInlineFormatting(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // 4. Horizontal dividers
    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-slate-200" />);
      i++;
      continue;
    }

    // 5. Tables (| col1 | col2 |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableRows.push(lines[i].trim());
        i++;
      }

      if (tableRows.length > 0) {
        const headerRow = tableRows[0];
        const isSeparator = tableRows.length > 1 && tableRows[1].includes('---');
        const dataRows = isSeparator ? tableRows.slice(2) : tableRows.slice(1);

        const parseCells = (row: string) =>
          row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

        const headers = parseCells(headerRow);

        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {headers.map((h, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-semibold text-slate-800">
                      {renderInlineFormatting(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {dataRows.map((r, rIdx) => {
                  const cells = parseCells(r);
                  return (
                    <tr key={rIdx} className="hover:bg-slate-50/70 transition-colors">
                      {cells.map((c, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 text-slate-700">
                          {renderInlineFormatting(c)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 6. Unordered Lists (- or *)
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="my-2 space-y-1.5 pl-4 list-disc text-xs text-slate-700 marker:text-slate-400">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 7. Ordered Lists (1. 2. 3.)
    if (/^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="my-2 space-y-1.5 pl-4 list-decimal text-xs text-slate-700 marker:text-slate-500 marker:font-mono">
          {listItems.map((item, lIdx) => (
            <li key={lIdx} className="leading-relaxed">
              {renderInlineFormatting(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 8. Plain paragraph
    if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="my-2 text-xs text-slate-700 leading-relaxed font-sans">
          {renderInlineFormatting(line)}
        </p>
      );
    }
    i++;
  }

  return <div className={`space-y-0.5 font-sans ${className}`}>{elements}</div>;
}

/**
 * Handles bold (**text**), italics (*text*), inline code (`code`), and links ([text](url))
 */
function renderInlineFormatting(text: string): React.ReactNode {
  if (!text) return null;

  // Split tokens by code, bold, links
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if (!part) return null;

    // Inline Code
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const code = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded-sm bg-slate-100 border border-slate-200 font-mono text-[11px] text-slate-800 font-semibold"
        >
          {code}
        </code>
      );
    }

    // Bold
    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="font-semibold text-slate-900">
          {boldText}
        </strong>
      );
    }

    // Italic
    if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
      const italicText = part.slice(1, -1);
      return (
        <em key={index} className="italic text-slate-800">
          {italicText}
        </em>
      );
    }

    // Link [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:text-indigo-800 underline font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
