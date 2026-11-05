'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Link as LinkIcon, FileText, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface AttachAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAttach: (data: {
    assetUrl: string | null;
    assetType: 'IMAGE' | 'PDF' | 'URL';
    base64Data?: string;
    mimeType?: string;
  }) => void;
}

export const AttachAssetModal: React.FC<AttachAssetModalProps> = ({
  isOpen,
  onClose,
  onAttach,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('File size must be under 10MB');
      return;
    }

    setSelectedFile(file);
    setErrorMsg('');
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleConfirm = () => {
    if (activeTab === 'url') {
      if (!urlInput.trim() || !urlInput.startsWith('http')) {
        setErrorMsg('Please enter a valid HTTP/HTTPS URL');
        return;
      }
      onAttach({
        assetUrl: urlInput.trim(),
        assetType: 'URL',
      });
      onClose();
      return;
    }

    if (!selectedFile) {
      setErrorMsg('Please select an ad creative image or PDF');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      const isImg = selectedFile.type.startsWith('image/');
      onAttach({
        assetUrl: previewUrl,
        assetType: isImg ? 'IMAGE' : 'PDF',
        base64Data,
        mimeType: selectedFile.type,
      });
      onClose();
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 bg-slate-50">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Upload className="h-4 w-4 text-slate-700" />
            <span>Attach Campaign Asset for Audit</span>
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sub-Tabs: Upload vs URL */}
          <div className="grid grid-cols-2 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Upload Creative Flyer / PDF
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`py-1.5 rounded-md transition-all cursor-pointer ${
                activeTab === 'url' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Webpage URL
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg p-6 text-center cursor-pointer transition-colors bg-slate-50 hover:bg-slate-100/50"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {previewUrl ? (
                  <div className="space-y-2">
                    <img src={previewUrl} alt="Ad Creative Preview" className="max-h-40 mx-auto rounded object-contain border border-slate-200" />
                    <p className="text-xs text-slate-600 font-medium">{selectedFile?.name}</p>
                    <p className="text-[11px] text-slate-400">Click to replace file</p>
                  </div>
                ) : selectedFile ? (
                  <div className="space-y-1">
                    <FileText className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-800 font-medium">{selectedFile.name}</p>
                    <p className="text-[11px] text-slate-400">{(selectedFile.size / 1024).toFixed(0)} KB • Click to replace</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <ImageIcon className="h-8 w-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">Drop flyer image or click to browse</p>
                    <p className="text-[11px] text-slate-400">Supports PNG, JPG, or PDF up to 10MB</p>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-slate-500">
                ARCON visual prominence auditing will inspect font sizes, contrast, and statutory risk disclosures inside the image.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Public Promotional Landing Page URL *
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.ng/flash-loan"
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Cogent will fetch the public copy and audit claims against Nigerian financial promotion standards.
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-xs cursor-pointer"
            >
              Attach Asset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
