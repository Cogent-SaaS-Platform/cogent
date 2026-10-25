'use client';

import React, { useState } from 'react';
import {
  Upload,
  X,
  FileText,
  FileUp,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { RegulatorCode } from '@/shared/types';

export interface CircularUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (result: unknown) => void;
}

export function CircularUploadDrawer({
  isOpen,
  onClose,
  onIngestSuccess,
}: CircularUploadDrawerProps) {
  const [inputMode, setInputMode] = useState<'url' | 'pdf' | 'text'>('url');
  const [portalUrl, setPortalUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [subject, setSubject] = useState('');
  const [regulator, setRegulator] = useState<RegulatorCode>('CBN');
  const [referenceCode, setReferenceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (inputMode === 'url' && !portalUrl.trim()) {
      setErrorMessage('Please provide a valid regulatory portal, framework, or article URL.');
      return;
    }
    if (inputMode === 'pdf' && !file) {
      setErrorMessage('Please select a PDF circular file to upload.');
      return;
    }
    if (inputMode === 'text' && !rawText.trim()) {
      setErrorMessage('Please paste the verbatim circular or framework text.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let res: Response;

      if (inputMode === 'pdf' && file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('regulator', regulator);
        if (referenceCode.trim()) formData.append('referenceCode', referenceCode.trim());
        if (subject.trim()) formData.append('subject', subject.trim());

        res = await fetch('/api/radar/circulars/ingest', {
          method: 'POST',
          body: formData,
        });
      } else if (inputMode === 'url') {
        res = await fetch('/api/radar/circulars/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: portalUrl.trim(),
            regulator,
            referenceCode: referenceCode.trim() || undefined,
            subject: subject.trim() || undefined,
          }),
        });
      } else {
        res = await fetch('/api/radar/circulars/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText,
            fileName: `${regulator.toLowerCase()}_circular.txt`,
            regulator,
            referenceCode: referenceCode.trim() || undefined,
            subject: subject.trim() || undefined,
          }),
        });
      }

      const json = await res.json();
      if (res.status === 409 || json.deduplicated) {
        onIngestSuccess(json.data);
        onClose();
        return;
      }
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to ingest circular');
      }

      onIngestSuccess(json.data);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error uploading circular document';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="h-full w-full max-w-lg border-l border-slate-200 bg-white p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Ingest Regulatory Directive
                </h2>
                <p className="text-xs text-slate-500">
                  Web Frameworks, Gazette PDFs, Articles & Text Transcripts
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 flex items-start gap-2.5 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Mode Switcher Tabs */}
          <div className="mb-4 grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setInputMode('url')}
              className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                inputMode === 'url'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Web URL / Portal
            </button>
            <button
              type="button"
              onClick={() => setInputMode('pdf')}
              className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                inputMode === 'pdf'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload PDF
            </button>
            <button
              type="button"
              onClick={() => setInputMode('text')}
              className={`rounded-md py-1.5 text-xs font-semibold transition-colors ${
                inputMode === 'text'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Paste Text
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Regulator Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuing Regulatory Body
              </label>
              <select
                value={regulator}
                onChange={(e) => setRegulator(e.target.value as RegulatorCode)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-slate-400 focus:outline-hidden"
              >
                <option value="CBN">Central Bank of Nigeria (CBN)</option>
                <option value="SEC">Securities and Exchange Commission (SEC)</option>
                <option value="NDPC">Nigeria Data Protection Commission (NDPC)</option>
                <option value="FCCPC">Federal Competition & Consumer Protection Commission (FCCPC)</option>
                <option value="NFIU">Nigerian Financial Intelligence Unit (NFIU)</option>
                <option value="NDIC">Nigeria Deposit Insurance Corporation (NDIC)</option>
                <option value="ARCON">Advertising Regulatory Council of Nigeria (ARCON)</option>
              </select>
            </div>

            {/* Optional Reference Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference Code <span className="text-slate-400 font-normal">(Optional, parsed automatically if omitted)</span>
              </label>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="e.g. PSM/DIR/CON/CWS/08/014"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-hidden font-mono"
              />
            </div>

            {/* Subject / Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Document Title / Subject <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Regulatory Framework for Payments System Operations"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-hidden"
              />
            </div>

            {/* Mode 1: Web URL */}
            {inputMode === 'url' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Live Regulatory Portal or Framework Link
                </label>
                <input
                  type="url"
                  value={portalUrl}
                  onChange={(e) => setPortalUrl(e.target.value)}
                  placeholder="https://www.cbn.gov.ng/PaymentsSystem/ or article URL"
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-hidden font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Cogent captures HTML portals, articles, and legal advisories through Anycast DNS and decomposes them into statutory obligations.
                </p>
              </div>
            )}

            {/* Mode 2: PDF Upload */}
            {inputMode === 'pdf' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Official PDF Document
                </label>
                <div className="relative rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 p-6 text-center hover:border-slate-400 transition-colors">
                  <input
                    type="file"
                    accept="application/pdf,text/plain"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                  {file ? (
                    <div className="text-xs text-slate-900 font-semibold truncate font-mono">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-800 font-semibold">
                        Click to browse or drag & drop circular PDF
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Official Nigerian Gazette scans up to 25MB
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Mode 3: Text Paste */}
            {inputMode === 'text' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Directive Transcript / Verbatim Text
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Paste verbatim text of circular directive or framework here..."
                  rows={6}
                  className="w-full rounded-md border border-slate-200 bg-white p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-hidden font-mono"
                />
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2 px-3 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
                    <span>Executing Layout Parsing & Checksum...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Ingest into Compliance Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="border-t border-[#DDE3EE] pt-4 text-center text-[11px] text-[#8D99AE] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
          <span>Generates SHA-256 seal for CAMA/BOFIA 6-year immutable audit ledger.</span>
        </div>
      </div>
    </div>
  );
}
