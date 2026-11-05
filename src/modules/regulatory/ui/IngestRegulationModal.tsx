'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Globe,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { RegulatoryInstrumentPresentation } from '../types';

interface IngestRegulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (instrument: RegulatoryInstrumentPresentation) => void;
}

type IngestTab = 'pdf' | 'url';

export function IngestRegulationModal({
  isOpen,
  onClose,
  onSuccess,
}: IngestRegulationModalProps) {
  const [activeTab, setActiveTab] = useState<IngestTab>('pdf');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const steps = [
    '1. Extracting Document Text & Stripping Non-Statutory Artifacts',
    '2. Synthesizing Statutory Overview, Scope & Key Requirements',
    '3. Decomposing Sections & Extracting Verbatim Obligations',
    '4. Generating Testable Assessment Criteria & Relational Mapping',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Only PDF documents are supported for regulatory gazette ingestion.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMessage('Only PDF documents are supported for regulatory gazette ingestion.');
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (activeTab === 'pdf' && !selectedFile) {
      setErrorMessage('Please select a PDF document to ingest.');
      return;
    }

    if (activeTab === 'url' && !urlInput.trim()) {
      setErrorMessage('Please provide a valid regulatory gazette or directive URL.');
      return;
    }

    setIsSubmitting(true);
    setProgressStep(1);

    // Progress simulation steps while server extracts
    const timer1 = setTimeout(() => setProgressStep(2), 2500);
    const timer2 = setTimeout(() => setProgressStep(3), 5500);
    const timer3 = setTimeout(() => setProgressStep(4), 8500);

    try {
      let res: Response;

      if (activeTab === 'pdf') {
        const formData = new FormData();
        formData.append('file', selectedFile!);
        formData.append('sourceType', 'PDF');

        res = await fetch('/api/library/ingest', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/library/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: urlInput.trim(),
            sourceType: 'WEB_URL',
          }),
        });
      }

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Statutory ingestion failed. Please verify the document source.');
      }

      setProgressStep(4);
      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(data.instrument);
      }, 600);
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      setIsSubmitting(false);
      setProgressStep(0);
      setErrorMessage(err.message || 'An unexpected error occurred during statutory ingestion.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-slate-700" />
              <h2 className="text-sm font-bold text-slate-900">
                Ingest Statutory Regulation
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Autonomous extraction into decomposed sections, prescriptive obligations, and testable criteria.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ingestion Mode Tabs */}
        <div className="px-5 pt-4 border-b border-slate-200 flex gap-6">
          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) {
                setActiveTab('pdf');
                setErrorMessage(null);
              }
            }}
            disabled={isSubmitting}
            className={`pb-3 text-xs font-semibold inline-flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'pdf'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>PDF Gazette Upload</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isSubmitting) {
                setActiveTab('url');
                setErrorMessage(null);
              }
            }}
            disabled={isSubmitting}
            className={`pb-3 text-xs font-semibold inline-flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'url'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Regulator Web URL</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isSubmitting ? (
            /* Real-Time Processing Pipeline Animation */
            <div className="py-6 space-y-6">
              <div className="text-center space-y-2">
                <Loader2 className="w-8 h-8 animate-spin text-slate-900 mx-auto" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Autonomous Statutory Decomposition Pipeline
                </h3>
                <p className="text-[11px] text-slate-500">
                  Synthesizing legal requirements with zero mock data.
                </p>
              </div>

              {/* Progress Steps */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                {steps.map((label, idx) => {
                  const stepNum = idx + 1;
                  const isDone = progressStep > stepNum;
                  const isCurrent = progressStep === stepNum;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 text-xs transition-opacity ${
                        isDone || isCurrent ? 'opacity-100' : 'opacity-40'
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : isCurrent ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-900 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                      )}
                      <span
                        className={`font-medium ${
                          isCurrent ? 'text-slate-900 font-bold' : isDone ? 'text-slate-700' : 'text-slate-500'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Input Controls */
            <>
              {activeTab === 'pdf' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-slate-500 rounded-xl p-8 text-center cursor-pointer transition-colors space-y-3 bg-slate-50/50"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedFile ? selectedFile.name : 'Click to select or drag & drop official PDF gazette'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedFile
                        ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB · Ready for statutory parsing`
                        : 'Supports official acts, circulars, frameworks, and subordinate guidelines'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Regulator Official URL
                  </label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://cbn.gov.ng/documents/circulars/2024/contactless.pdf"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <p className="text-[11px] text-slate-500">
                    URL content is cleaned through an HTML sanitizer: headers, footers, customer reviews, and navigation scripts are stripped.
                  </p>
                </div>
              )}

              {/* Notice */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/70 text-[11px] text-slate-600 space-y-1">
                <span className="font-semibold text-slate-800">RegTech Ingestion Guarantee:</span>
                <p>
                  Decomposes the instrument into verifiable compliance duties, verbatim statutory references, and audit-ready test criteria.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={activeTab === 'pdf' ? !selectedFile : !urlInput.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
                >
                  <span>Begin Autonomous Ingestion</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
