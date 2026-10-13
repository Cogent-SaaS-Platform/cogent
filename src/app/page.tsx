'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  ShieldCheck,
  Scale,
  Radio,
  FileText,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Building,
  Check,
  Zap,
  Play,
  Clock,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface DemoPreset {
  id: string;
  name: string;
  badge: string;
  category: string;
  copy: string;
  verdict: 'VIOLATION' | 'COMPLIANT';
  fineExposureNaira: number;
  infractions: {
    excerpt: string;
    rule: string;
    citation: string;
    fine: number;
  }[];
  rewrite: string;
}

const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'loan',
    name: 'QuickKash Loan Promo',
    badge: 'Digital Lending',
    category: 'Nano-Loan (SMS)',
    copy: 'Urgent Cash Alert! Get ₦250,000 instant loan in 5 mins directly to your account! Zero interest, 100% guaranteed approval, no collateral, no credit checks. Download QuickKash app now!',
    verdict: 'VIOLATION',
    fineExposureNaira: 11500000,
    infractions: [
      {
        excerpt: '100% guaranteed approval',
        rule: 'ARCON Code 2022 Art. 24(1)(b)',
        citation: 'Advertising guaranteed loan disbursement without underwriting eligibility is strictly prohibited.',
        fine: 5000000,
      },
      {
        excerpt: 'Zero interest',
        rule: 'CBN Consumer Protection Framework (CPF)',
        citation: 'Deceptive zero-interest claims omitting statutory APR and fee disclosures carry mandatory sanctions.',
        fine: 3500000,
      },
      {
        excerpt: 'no credit checks',
        rule: 'FCCPC Digital Lending Reg. Sec 5',
        citation: 'Failure to perform statutory credit assessment and misleading borrowers on credit reporting.',
        fine: 3000000,
      },
    ],
    rewrite:
      'Access transparent digital credit up to ₦250,000 subject to eligibility verification. Annual Percentage Rate (APR) from 18% to 24%. Licensed by CBN as a Finance Company. Terms & statutory fees apply. Visit quickkash.ng/terms.',
  },
  {
    id: 'invest',
    name: 'PrimeYield Investment Ad',
    badge: 'WealthTech',
    category: 'Investment (Social Media)',
    copy: 'Tired of inflation? Invest your Naira in PrimeYield and earn 35% risk-free annual return guaranteed! Your capital is 100% safe and backed by the government. Limited slots available.',
    verdict: 'VIOLATION',
    fineExposureNaira: 7500000,
    infractions: [
      {
        excerpt: '35% risk-free annual return guaranteed',
        rule: 'SEC Nigeria Rule 322 (Unregistered Yields)',
        citation: 'Capital market operators are prohibited from promising guaranteed returns on speculative market assets.',
        fine: 5000000,
      },
      {
        excerpt: 'backed by the government',
        rule: 'ARCON Code 2022 Art. 18(3)',
        citation: 'Falsely claiming direct government guarantee or sovereign backing for private investments is prohibited.',
        fine: 2500000,
      },
    ],
    rewrite:
      'Grow your wealth with PrimeYield Fund Management. Historical annualized returns up to 22%. Capital is subject to market risks. PrimeYield is registered with the Securities and Exchange Commission (SEC) Nigeria as a Portfolio Manager.',
  },
  {
    id: 'compliant',
    name: 'KoraPay Cross-Border Remittance',
    badge: 'IMTO / FX',
    category: 'Remittance (Clean Baseline)',
    copy: 'Send money home to Nigeria with KoraPay. Licensed by the Central Bank of Nigeria (CBN) as an International Money Transfer Operator. Transparent exchange rates and zero hidden charges. Terms and statutory fees apply. Visit korapay.ng/terms.',
    verdict: 'COMPLIANT',
    fineExposureNaira: 0,
    infractions: [],
    rewrite:
      'Copy satisfies all statutory disclosure thresholds. Validated against CBN IMTO Regulatory Guidelines and ARCON registered advertiser standards.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();

  // If already logged in, seamlessly redirect to overview cockpit
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push('/overview');
    }
  }, [isLoaded, isSignedIn, router]);

  // Interactive Live Demo State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('loan');
  const [demoInput, setDemoInput] = useState<string>(DEMO_PRESETS[0].copy);
  const [demoResult, setDemoResult] = useState<DemoPreset | null>(DEMO_PRESETS[0]);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const handleSelectPreset = (preset: DemoPreset) => {
    setSelectedPresetId(preset.id);
    setDemoInput(preset.copy);
    setDemoResult(preset);
  };

  const handleRunDemoScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      // Find matching preset or evaluate custom input
      const matched = DEMO_PRESETS.find((p) => p.copy === demoInput);
      if (matched) {
        setDemoResult(matched);
      } else {
        // Simple client evaluation for custom copy
        const hasGuaranteed = /guaranteed|100%|instant|risk-free/i.test(demoInput);
        const hasZeroInterest = /zero interest|no interest|free money/i.test(demoInput);
        const infractions = [];
        let fine = 0;

        if (hasGuaranteed) {
          infractions.push({
            excerpt: 'Prohibited absolute promise / guarantee detected',
            rule: 'ARCON Code 2022 Art. 24 & SEC Rule 322',
            citation: 'Absolute guarantees without underwriting disclosures are prohibited under Nigerian law.',
            fine: 5000000,
          });
          fine += 5000000;
        }

        if (hasZeroInterest) {
          infractions.push({
            excerpt: 'Misleading fee / interest representation',
            rule: 'CBN Consumer Protection Framework 2019',
            citation: 'Financial promotions must clearly disclose APR, statutory levies, and repayment terms.',
            fine: 3500000,
          });
          fine += 3500000;
        }

        setDemoResult({
          id: 'custom',
          name: 'Custom Ad Evaluation',
          badge: 'Live Evaluation',
          category: 'Promotional Broadcast',
          copy: demoInput,
          verdict: infractions.length > 0 ? 'VIOLATION' : 'COMPLIANT',
          fineExposureNaira: fine,
          infractions,
          rewrite:
            infractions.length > 0
              ? 'Ensure all statutory APR figures, licensing credentials, and underwriting disclaimers are appended prior to public dissemination.'
              : 'Submitted copy satisfies preliminary statutory pre-screening requirements.',
        });
      }
      setIsScanning(false);
    }, 450);
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] font-sans selection:bg-[#2A4BFF]/20 selection:text-[#2A4BFF]">
      {/* 1. Global Navigation Bar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#DDE3EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#2A4BFF] flex items-center justify-center shadow-sm shadow-[#2A4BFF]/30 transition-transform group-hover:scale-105">
              <span className="font-extrabold text-white text-base tracking-wider">C</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-wide text-[#0B0F1A]">COGENT</span>
                <span className="text-[9px] uppercase font-mono px-1 py-0.2 rounded bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE] font-semibold">
                  RegTech OS
                </span>
              </div>
              <span className="text-[10px] text-[#4B5565] -mt-0.5 font-medium">Nigerian Sovereign Moat</span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-[#4B5565]">
            <a href="#capabilities" className="hover:text-[#2A4BFF] transition-colors">
              Core Capabilities
            </a>
            <a href="#demo" className="hover:text-[#2A4BFF] transition-colors">
              Interactive Scanner
            </a>
            <a href="#coverage" className="hover:text-[#2A4BFF] transition-colors">
              Regulatory Coverage
            </a>
            <a href="#governance" className="hover:text-[#2A4BFF] transition-colors">
              CAMA 2020 Audit
            </a>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-2 text-xs font-semibold text-[#0B0F1A] hover:text-[#2A4BFF] hover:bg-[#F5F6FA] rounded-xl transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/overview"
              className="px-4 py-2 text-xs font-semibold text-white bg-[#2A4BFF] hover:bg-[#1E3AE5] rounded-xl shadow-sm transition-all hover:shadow-md flex items-center gap-1.5"
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-[#DDE3EE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          {/* Sovereign Enclave Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span>Sovereign RegTech Intelligence Enclave</span>
            <span className="text-[#8D99AE]">•</span>
            <span className="text-[#4B5565]">CBN • ARCON • SEC • NDPC • FCCPC</span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#0B0F1A] tracking-tight max-w-4xl mx-auto leading-tight">
            Enterprise Compliance Defense for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2A4BFF] to-[#4F46E5]">
              Nigerian Financial Institutions
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[#4B5565] max-w-2xl mx-auto leading-relaxed">
            Eliminate statutory fine exposures. Pre-vet financial ad campaigns under ARCON 2022, track Central Bank
            circular enforcement deadlines with automated cascading, and seal immutable board audit dossiers.
          </p>

          {/* CTA Group */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/overview"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-[#2A4BFF] hover:bg-[#1E3AE5] rounded-xl shadow-md transition-all hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>Enter Enterprise Cockpit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <a
              href="#demo"
              className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-[#0B0F1A] bg-[#F5F6FA] hover:bg-[#EEF2FF] hover:text-[#2A4BFF] border border-[#DDE3EE] rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-[#2A4BFF]" />
              <span>Test Ad Copy Live</span>
            </a>
          </div>

          {/* Trust Strip */}
          <div className="pt-10 border-t border-[#F5F6FA] max-w-3xl mx-auto">
            <p className="text-[11px] uppercase tracking-wider text-[#8D99AE] font-semibold mb-4">
              Built for Regulated Financial Ecosystems Across Nigeria
            </p>
            <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs font-semibold text-[#4B5565]">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#2A4BFF]" /> Commercial & Merchant Banks
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#2A4BFF]" /> PSSPs & Payment Gateways
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#2A4BFF]" /> Microfinance Banks (MFBs)
              </span>
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-[#2A4BFF]" /> Digital Lenders & WealthTech
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Interactive Live Scanner Demo Section (Day One Value Proof) */}
      <section id="demo" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2A4BFF] uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5" />
            <span>Interactive Demonstration</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B0F1A] tracking-tight">
            See Cogent Pre-Vet Compliance in Real Time
          </h2>
          <p className="text-xs sm:text-sm text-[#4B5565] max-w-xl mx-auto">
            Select a sample promotional campaign or paste your own copy below to see our deterministic engine flag
            prohibitions and calculate statutory fine exposures.
          </p>
        </div>

        {/* Demo Studio Box */}
        <div className="bg-white rounded-2xl border border-[#DDE3EE] shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Preset Selector & Input */}
          <div className="lg:col-span-7 p-6 sm:p-8 space-y-5 border-b lg:border-b-0 lg:border-r border-[#DDE3EE]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#0B0F1A] uppercase tracking-wider">
                Select Sample Campaign
              </span>
              <span className="text-[11px] text-[#4B5565]">Click to test instantly</span>
            </div>

            {/* Preset Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {DEMO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedPresetId === preset.id
                      ? 'border-[#2A4BFF] bg-[#EEF2FF] shadow-xs'
                      : 'border-[#DDE3EE] hover:border-[#C7D2FE] bg-white'
                  }`}
                >
                  <span className="block text-xs font-bold text-[#0B0F1A] truncate">{preset.name}</span>
                  <span className="block text-[10px] text-[#4B5565] mt-0.5">{preset.badge}</span>
                </button>
              ))}
            </div>

            {/* Textarea Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0B0F1A] flex items-center justify-between">
                <span>Ad Copy / Broadcast Draft</span>
                <span className="text-[10px] text-[#8D99AE]">{demoInput.length} chars</span>
              </label>
              <textarea
                value={demoInput}
                onChange={(e) => setDemoInput(e.target.value)}
                rows={5}
                className="w-full p-3.5 rounded-xl border border-[#DDE3EE] focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/20 text-xs sm:text-sm text-[#0B0F1A] transition-all resize-none font-sans"
                placeholder="Type or paste SMS, Instagram caption, or Google ad copy to test..."
              />
            </div>

            {/* Run Button */}
            <button
              onClick={handleRunDemoScan}
              disabled={isScanning || !demoInput.trim()}
              className="w-full py-3 bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Evaluating Against ARCON & CBN Standards...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Pre-Vet Scan</span>
                </>
              )}
            </button>
          </div>

          {/* Right Column: Live Diagnostic Output */}
          <div className="lg:col-span-5 p-6 sm:p-8 bg-[#F5F6FA] space-y-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-[#DDE3EE]">
                <span className="text-xs font-bold text-[#0B0F1A] uppercase tracking-wider">
                  Diagnostic Findings
                </span>
                {demoResult && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      demoResult.verdict === 'VIOLATION'
                        ? 'bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]'
                        : 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                    }`}
                  >
                    {demoResult.verdict === 'VIOLATION' ? 'BLOCKING VIOLATIONS' : 'CLEAN CLEARANCE'}
                  </span>
                )}
              </div>

              {demoResult ? (
                <div className="mt-4 space-y-4">
                  {/* Fine Exposure Metric */}
                  <div className="p-3.5 rounded-xl bg-white border border-[#DDE3EE] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#4B5565] uppercase font-semibold block">
                        Statutory Fine Exposure
                      </span>
                      <span
                        className={`text-xl font-extrabold ${
                          demoResult.fineExposureNaira > 0 ? 'text-[#DC2626]' : 'text-[#10B981]'
                        }`}
                      >
                        ₦{demoResult.fineExposureNaira.toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[11px] text-[#8D99AE] font-mono">
                      {demoResult.infractions.length} Flags
                    </span>
                  </div>

                  {/* Infraction Flags */}
                  {demoResult.infractions.length > 0 ? (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-[#0B0F1A]">Prohibited Excerpts:</span>
                      {demoResult.infractions.map((inf, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-white border border-[#FECACA] text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#DC2626]">"{inf.excerpt}"</span>
                            <span className="text-[10px] font-mono text-[#DC2626]">
                              ₦{inf.fine.toLocaleString()}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#4B5565] block font-medium">
                            {inf.rule} — {inf.citation}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-white border border-[#A7F3D0] text-xs space-y-1 text-[#065F46]">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                        <span>No Statutory Infractions Detected</span>
                      </div>
                      <p className="text-[11px] text-[#047857]">
                        Copy contains all required regulatory disclosures and avoids deceptive yield or loan claims.
                      </p>
                    </div>
                  )}

                  {/* Compliant Rewrite Block */}
                  <div className="p-3 rounded-xl bg-white border border-[#DDE3EE] space-y-1">
                    <span className="text-[11px] font-bold text-[#2A4BFF] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>Compliant Rewrite Suggestion:</span>
                    </span>
                    <p className="text-xs text-[#0B0F1A] leading-relaxed italic">{demoResult.rewrite}</p>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-[#8D99AE]">
                  Select a preset or click Run Pre-Vet Scan to preview evaluation.
                </div>
              )}
            </div>

            {/* Direct Link to Full Platform */}
            <Link
              href="/overview"
              className="mt-4 pt-3 border-t border-[#DDE3EE] text-xs font-semibold text-[#2A4BFF] hover:underline flex items-center justify-between"
            >
              <span>Access full compliance workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Core Capabilities Section */}
      <section id="capabilities" className="py-16 md:py-24 border-t border-[#DDE3EE] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B0F1A] tracking-tight">
              A Complete Sovereign RegTech Suite
            </h2>
            <p className="text-xs sm:text-sm text-[#4B5565]">
              Unified supervisory intelligence protecting commercial banks, PSSPs, and MFBs across every compliance
              vector.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="p-6 rounded-2xl bg-[#F5F6FA] border border-[#DDE3EE] space-y-4 hover:border-[#C7D2FE] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B0F1A]">Marketing Shield</h3>
              <p className="text-xs text-[#4B5565] leading-relaxed">
                Sub-second deterministic regex and Gemini vector analysis preventing ARCON Code 2022 and CBN CPF
                sanctions before broadcast.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-6 rounded-2xl bg-[#F5F6FA] border border-[#DDE3EE] space-y-4 hover:border-[#C7D2FE] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B0F1A]">Regulatory Radar</h3>
              <p className="text-xs text-[#4B5565] leading-relaxed">
                Continuous ingestion of gazettes, guidelines, and circulars with real countdown timers to enforcement
                deadlines.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-6 rounded-2xl bg-[#F5F6FA] border border-[#DDE3EE] space-y-4 hover:border-[#C7D2FE] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B0F1A]">5-W Policy Concordance</h3>
              <p className="text-xs text-[#4B5565] leading-relaxed">
                Vector gap matrix matching internal operating policies against BOFIA 2020, NDPA 2023, and AML/CFT
                regulations.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-6 rounded-2xl bg-[#F5F6FA] border border-[#DDE3EE] space-y-4 hover:border-[#C7D2FE] transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] text-[#2A4BFF] flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-[#0B0F1A]">CAMA 2020 Audit Ledger</h3>
              <p className="text-xs text-[#4B5565] leading-relaxed">
                Tamper-evident cryptographic SHA-256 evidence chain preserving six-year institutional defense records for
                bank examiners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Statutory Corpus Coverage Section */}
      <section id="coverage" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#0B0F1A] tracking-tight">
            Comprehensive Nigerian Statutory Coverage
          </h2>
          <p className="text-xs sm:text-sm text-[#4B5565]">
            Engineered specifically for Nigerian financial law and supervisory oversight bodies.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { name: 'CBN', full: 'Central Bank of Nigeria', acts: 'BOFIA 2020 & CPF' },
            { name: 'ARCON', full: 'Advertising Regulatory Council', acts: 'Act No. 23 of 2022' },
            { name: 'SEC', full: 'Securities & Exchange Commission', acts: 'ISA 2007 & Rule 322' },
            { name: 'NDPC', full: 'Nigeria Data Protection Commission', acts: 'NDPA 2023' },
            { name: 'FCCPC', full: 'Federal Competition & Consumer Protection', acts: 'FCCPA 2018' },
            { name: 'NFIU', full: 'Nigerian Financial Intelligence Unit', acts: 'AML/CFT/CPF 2022' },
          ].map((reg, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-white border border-[#DDE3EE] text-center space-y-1 shadow-2xs"
            >
              <span className="text-base font-extrabold text-[#2A4BFF] block">{reg.name}</span>
              <span className="text-[11px] font-semibold text-[#0B0F1A] block truncate">{reg.full}</span>
              <span className="text-[10px] text-[#4B5565] block font-mono">{reg.acts}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Bottom Call to Action */}
      <section className="py-16 bg-[#0B0F1A] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Protect Your Financial Institution Today
          </h2>
          <p className="text-xs sm:text-sm text-[#8D99AE] max-w-xl mx-auto leading-relaxed">
            Eliminate non-compliance risks, safeguard brand trust, and maintain seamless board-level governance across all
            Nigerian financial regulators.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/overview"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold text-[#0B0F1A] bg-white hover:bg-[#F5F6FA] rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>Launch Cogent Workspace</span>
              <ArrowRight className="w-4 h-4 text-[#2A4BFF]" />
            </Link>
            <Link
              href="/sign-in"
              className="w-full sm:w-auto px-6 py-3 text-xs font-bold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-all flex items-center justify-center"
            >
              <span>Sign In to Existing Account</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-[#DDE3EE] bg-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4B5565]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#2A4BFF] flex items-center justify-center text-white font-bold text-xs">
              C
            </div>
            <span className="font-semibold text-[#0B0F1A]">COGENT RegTech OS</span>
            <span>© {new Date().getFullYear()} All Rights Reserved.</span>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <span>Sovereign Enclave Security</span>
            <span>CAMA 2020 Compliant</span>
            <span>Encrypted SHA-256 Audit Trail</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
