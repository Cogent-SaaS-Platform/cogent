'use client';

import React, { useState, useEffect } from 'react';
import {
  DriftReportViewModel,
  LiveAssetRecord,
} from '@/modules/marketing-shield/driftWatcherService';
import {
  Activity,
  Globe,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  FileText,
} from 'lucide-react';

interface DriftWatcherTabProps {
  currentScanId?: string;
  originalApprovedText?: string;
}

export const DriftWatcherTab: React.FC<DriftWatcherTabProps> = ({
  currentScanId,
  originalApprovedText,
}) => {
  const [liveUrl, setLiveUrl] = useState<string>('https://example.com/promotions/high-yield-savings');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [report, setReport] = useState<DriftReportViewModel | null>(null);
  const [trackedAssets, setTrackedAssets] = useState<LiveAssetRecord[]>([]);
  const [loadingAssets, setLoadingAssets] = useState<boolean>(false);
  const [directTextMode, setDirectTextMode] = useState<boolean>(false);
  const [directText, setDirectText] = useState<string>('');

  const fetchTrackedAssets = async () => {
    setLoadingAssets(true);
    try {
      const res = await fetch('/api/marketing/drift/assets');
      const json = await res.json();
      if (json.success && json.data?.assets) {
        setTrackedAssets(json.data.assets);
      }
    } catch (err) {
      console.error('Failed to load tracked assets:', err);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    fetchTrackedAssets();
  }, []);

  const handleVerify = async (e?: React.FormEvent, targetUrl?: string) => {
    if (e) e.preventDefault();
    const urlToVerify = targetUrl || liveUrl;
    if (!urlToVerify) return;

    setIsVerifying(true);
    setReport(null);

    try {
      const res = await fetch('/api/marketing/drift/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liveUrl: urlToVerify,
          scanId: currentScanId,
          directLiveText: directTextMode && directText ? directText : undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);
        await fetchTrackedAssets();
      } else {
        alert(json.error || 'Failed to verify live asset drift');
      }
    } catch (err: any) {
      alert('Error during drift verification: ' + err.message);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-xl">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Post-Publish Drift & Finfluencer Watcher</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Detect unauthorized copy modifications, missing mandatory disclosures, and rate changes on live URLs.
          </p>
        </div>

        <button
          onClick={() => setDirectTextMode(!directTextMode)}
          className="text-xs text-slate-400 hover:text-cyan-300 transition-colors underline"
        >
          {directTextMode ? '← Switch to Live URL Fetch' : 'Simulate Drift with Custom Text'}
        </button>
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => handleVerify(e)} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            <span>Live Asset URL (Landing page, Social ad, Finfluencer post)</span>
          </label>
          <div className="flex gap-3">
            <input
              type="url"
              value={liveUrl}
              onChange={(e) => setLiveUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              required
            />
            <button
              type="submit"
              disabled={isVerifying}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 text-xs font-semibold shadow-lg shadow-cyan-950/50 transition-all disabled:opacity-50"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Verifying Drift...</span>
                </>
              ) : (
                <>
                  <Activity className="h-3.5 w-3.5" />
                  <span>Verify Live Asset</span>
                </>
              )}
            </button>
          </div>
        </div>

        {directTextMode && (
          <div className="pt-2 border-t border-slate-900">
            <label className="block text-xs font-medium text-amber-400 mb-1">
              Simulated Live Text (Test drift without live external server):
            </label>
            <textarea
              rows={3}
              value={directText}
              onChange={(e) => setDirectText(e.target.value)}
              placeholder="Paste live copy (e.g. omitting 'Licensed by CBN' or adding 'guaranteed returns')..."
              className="w-full rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
        )}
      </form>

      {/* Verification Report Display */}
      {report && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 space-y-6">
          {/* Status Header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              {report.driftStatus === 'SYNCED' ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-emerald-300 font-bold text-sm">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  <span>LIVE ASSET SYNCED — NO DRIFT DETECTED</span>
                </div>
              ) : report.driftStatus === 'DRIFT_DETECTED' ? (
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-3.5 py-2 text-red-300 font-bold text-sm">
                  <ShieldAlert className="h-5 w-5 text-red-400" />
                  <span>CRITICAL ASSET DRIFT DETECTED</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-amber-300 font-bold text-sm">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span>VERIFICATION WARNING / FETCH ERROR</span>
                </div>
              )}
            </div>

            <div className="text-right text-xs text-slate-400">
              <div>Checked: {new Date(report.lastCheckedAt).toLocaleTimeString()} WAT</div>
              <div className="text-[11px] text-slate-500 font-mono">Severity Floor: {report.driftSeverity}</div>
            </div>
          </div>

          {/* Cryptographic Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1.5 font-mono text-xs">
              <span className="text-[11px] text-slate-400 block font-sans font-semibold">
                Approved Baseline Hash (SHA-256):
              </span>
              <div className="text-emerald-400 break-all bg-slate-950 p-2 rounded border border-slate-800">
                {report.originalHash}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-1.5 font-mono text-xs">
              <span className="text-[11px] text-slate-400 block font-sans font-semibold">
                Live Published Text Hash (SHA-256):
              </span>
              <div
                className={`break-all bg-slate-950 p-2 rounded border ${
                  report.isDrifted
                    ? 'border-red-500/40 text-red-400'
                    : 'border-slate-800 text-emerald-400'
                }`}
              >
                {report.liveHash}
              </div>
            </div>
          </div>

          {/* Findings List */}
          {report.findings.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Drift Findings & Omissions ({report.findings.length})
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {report.findings.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-red-500/20 bg-red-950/15 p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                        <span>{f.findingType.replace(/_/g, ' ')}</span>
                      </span>
                      <span className="rounded bg-red-950 border border-red-500/40 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        {f.severity}
                      </span>
                    </div>

                    <p className="text-slate-200 font-medium">{f.description}</p>
                    <p className="text-slate-400 text-[11px]">{f.regulatoryRisk}</p>

                    <div className="pt-2 border-t border-red-500/10 text-[11px] text-cyan-300 font-mono">
                      Statutory Reference: {f.statutoryCitation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live text excerpt preview */}
          {report.liveTextExcerpt && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-1 text-xs">
              <span className="text-[11px] font-semibold text-slate-400">Live Text Sample:</span>
              <p className="text-slate-300 italic line-clamp-3">&ldquo;{report.liveTextExcerpt}...&rdquo;</p>
            </div>
          )}
        </div>
      )}

      {/* Tracked Assets Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>Tracked Live Assets Portfolio ({trackedAssets.length})</span>
          </h4>
          <button
            onClick={fetchTrackedAssets}
            className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
        </div>

        {loadingAssets ? (
          <div className="text-center py-6 text-xs text-slate-500">Loading tracked assets...</div>
        ) : trackedAssets.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-600 border border-dashed border-slate-800 rounded-xl">
            No live assets tracked yet. Verify a URL above to register it in continuous monitoring.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <th className="pb-2 font-semibold">Live URL</th>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 font-semibold">Drift Status</th>
                  <th className="pb-2 font-semibold">Last Checked</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900">
                {trackedAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 font-mono text-[11px] text-slate-200 max-w-xs truncate">
                      {asset.liveUrl}
                    </td>
                    <td className="py-2.5 text-slate-400">{asset.channel}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          asset.driftStatus === 'SYNCED'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-red-950 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {asset.driftStatus}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 text-[11px]">
                      {new Date(asset.lastCheckedAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => handleVerify(undefined, asset.liveUrl)}
                        className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 underline mr-3"
                      >
                        Re-check
                      </button>
                      <a
                        href={asset.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-500 hover:text-slate-300 inline-block align-middle"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
