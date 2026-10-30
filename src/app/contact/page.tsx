'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar, Footer } from '@/modules/marketing-site';
import { ArrowRight, Mail, Phone, MapPin, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    institutionType: 'FinTech',
    primaryConcern: 'Marketing Shield (Ad Pre-Vetting)',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased selection:bg-slate-900 selection:text-white">
      <Navbar />

      <main className="flex-1">
        {/* Page Hero */}
        <section className="pt-16 pb-20 md:pt-24 md:pb-28 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1 rounded bg-slate-50 border border-slate-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="font-mono text-xs text-slate-700 tracking-tight">
                  INSTITUTIONAL ENGAGEMENT · SUPERVISORY ADVISORY DESK
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
                Initiate Institutional Pilot or Speak with Supervisory Counsel
              </h1>

              <p className="mt-6 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                Connect directly with our regulatory intelligence desk in Lagos or Abuja. 
                Fast-track your 7-day institutional evaluation with dedicated onboarding support.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form & Office Grid */}
        <section className="py-20 bg-slate-50/50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              {/* Left Column: Inquiry Form */}
              <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-10 shadow-xs">
                {submitted ? (
                  <div className="py-12 text-center space-y-4 animate-in fade-in duration-300">
                    <div className="w-12 h-12 bg-emerald-50 rounded-full border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      Inquiry Received
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                      Our institutional regulatory onboarding team has received your details. 
                      A compliance officer will reach out within 2 hours to configure your workspace.
                    </p>
                    <div className="pt-4">
                      <Link
                        href="/sign-up"
                        className="inline-flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs px-5 py-2.5 transition-colors"
                      >
                        <span>Start Instant 7-Day Pilot Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                        Institutional Pilot Onboarding &amp; Consultation
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        Fill in your details below for personalized workspace provisioning and SLA support.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="e.g. Oluwaseun Adeleke"
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Institutional Work Email
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="name@institution.com"
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Institution Class
                        </label>
                        <select
                          value={formData.institutionType}
                          onChange={(e) => setFormData({ ...formData, institutionType: e.target.value })}
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                        >
                          <option value="Commercial Bank">Commercial Bank</option>
                          <option value="National MFB">National Microfinance Bank</option>
                          <option value="FinTech">High-Growth FinTech / Neo-Bank</option>
                          <option value="PSSP">Payment Solution Service Provider (PSSP)</option>
                          <option value="Digital Lender">Digital Consumer Lender</option>
                          <option value="Legal Advisory">Regulatory Law / Advisory Practice</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Primary Supervisory Concern
                        </label>
                        <select
                          value={formData.primaryConcern}
                          onChange={(e) => setFormData({ ...formData, primaryConcern: e.target.value })}
                          className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                        >
                          <option value="Marketing Shield">Advertising Fines &amp; ARCON Vetting (Marketing Shield)</option>
                          <option value="Horizon Radar">Midnight Circular Scrambles (Horizon Radar)</option>
                          <option value="Gap Matrix">Impending Bank Examination / Policy Gaps (5-W Matrix)</option>
                          <option value="Full Suite">Full Autonomous Operating System Evaluation</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Specific Regulatory Requirements or Timeline
                      </label>
                      <textarea
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Tell us about your upcoming audit, campaign rollout, or specific regulatory frameworks under review..."
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg font-medium text-xs py-3 shadow-xs transition-colors"
                    >
                      <span>Submit Institutional Pilot Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Guaranteed 2-Hour SLA for Licensed Entities
                      </span>
                      <span className="font-mono">NDPA 2023 COMPLIANT</span>
                    </div>
                  </form>
                )}
              </div>

              {/* Right Column: Office Locations & Rapid Access */}
              <div className="lg:col-span-5 space-y-6">
                {/* Instant Pilot Box */}
                <div className="p-6 rounded-xl bg-slate-900 text-white space-y-4">
                  <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-slate-800 text-xs font-mono text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>SELF-SERVE PILOT ACTIVE</span>
                  </div>
                  <h3 className="text-base font-bold text-white">
                    Want to test without a meeting?
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    You can start a 7-day institutional pilot right now. Sign up with Google OAuth 
                    (@gmail.com supported) and land immediately in your live workspace.
                  </p>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 bg-white text-slate-900 hover:bg-slate-100 rounded-lg font-medium text-xs px-4 py-2.5 transition-colors"
                  >
                    <span>Start 7-Day Pilot Instantly</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Office Details */}
                <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Institutional Presence &amp; Desks
                  </span>

                  <div className="space-y-4 text-xs">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900">Lagos Executive Headquarters</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Victoria Island, Lagos State, Nigeria
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900">Abuja Regulatory Affairs Bureau</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          Central Business District (CBD), Abuja FCT, Nigeria
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-slate-900">Regulatory Advisory Inquiries</div>
                        <div className="font-mono text-slate-600 text-[11px] mt-0.5">
                          advisory@stem-cogent.com
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
