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
} from 'lucide-react';
import { RegulatorCode } from '@/shared/types';

export interface CircularUploadDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onIngestSuccess: (result: any) => void;
}

export function CircularUploadDrawer({
  isOpen,
  onClose,
  onIngestSuccess,
}: CircularUploadDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [regulator, setRegulator] = useState<RegulatorCode>('CBN');
  const [referenceCode, setReferenceCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file && !rawText.trim()) {
      setErrorMessage('Please either select a PDF circular file or paste the circular text.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      let res: Response;

      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('regulator', regulator);
        if (referenceCode.trim()) {
          formData.append('referenceCode', referenceCode.trim());
        }

        res = await fetch('/api/radar/circulars/ingest', {
          method: 'POST',
          body: formData,
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading circular document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="h-full w-full max-w-lg border-l border-slate-800 bg-[#090D16] p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-300">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <FileUp className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">
                  Ingest Regulatory Circular
                </h2>
                <p className="text-xs text-slate-400">
                  Upload PDF gazette or paste official directive
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-950/20 p-3.5 text-xs text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Regulator Select */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Issuing Regulatory Body
              </label>
              <select
                value={regulator}
                onChange={(e) => setRegulator(e.target.value as RegulatorCode)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="CBN">Central Bank of Nigeria (CBN)</option>
                <option value="SEC">Securities and Exchange Commission (SEC)</option>
                <option value="ARCON">Advertising Regulatory Council of Nigeria (ARCON)</option>
                <option value="NDPC">Nigeria Data Protection Commission (NDPC)</option>
                <option value="FCCPC">Federal Competition & Consumer Protection Commission (FCCPC)</option>
                <option value="NFIU">Nigerian Financial Intelligence Unit (NFIU)</option>
              </select>
            </div>

            {/* Optional Reference Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Circular Reference Code <span className="text-slate-500 font-normal">(Optional, parsed automatically if omitted)</span>
              </label>
              <input
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value)}
                placeholder="e.g. BPS/DIR/GEN/CIR/05/011"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* File Upload Box */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Official PDF Document
              </label>
              <div className="relative rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/40 p-6 text-center hover:border-cyan-500/60 transition-colors">
                <input
                  type="file"
                  accept="application/pdf,text/plain"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Upload className="mx-auto h-8 w-8 text-slate-500 mb-2" />
                {file ? (
                  <div className="text-xs text-cyan-300 font-semibold truncate">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-300 font-medium">
                      Click to choose or drag & drop circular PDF
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      PDF, Gazette scans up to 25MB
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative my-4 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <span className="relative bg-[#090D16] px-2 text-[11px] font-semibold text-slate-500 uppercase">
                Or Paste Direct Text
              </span>
            </div>

            {/* Raw Text Textarea */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Circular Transcript / Text Content
              </label>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste full text of circular directive here..."
                rows={5}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-900/30 hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Executing Layout Parsing & Checksum...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Ingest & Process Circular</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="border-t border-slate-800 pt-4 text-center text-[11px] text-slate-500">
          Enforces SHA-256 seal into CAMA/BOFIA 6-year immutable audit ledger.
        </div>
      </div>
    </div>
  );
}
