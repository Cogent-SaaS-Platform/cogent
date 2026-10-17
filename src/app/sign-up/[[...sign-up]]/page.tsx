'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { SignUp } from '@clerk/nextjs';
import { AuthShowcasePanel } from '@/shared/ui/AuthShowcasePanel';
import { AuthTabSwitcher } from '@/shared/ui/AuthTabSwitcher';

import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  // Fallback state (Used only when Clerk environment keys are unconfigured)
  const [institutionName, setInstitutionName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push('/onboarding');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row antialiased selection:bg-[#2A4BFF] selection:text-white">
      {/* ───────────────────────────────────────────────────────────────────
          LEFT HALF: REGISTRATION FORM (Faithful reproduction of ui_ref/sign.JPG)
          ─────────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 bg-white">
        {/* Brand Header matching sign.JPG */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Image
              src="/icon.png"
              alt="Cogent"
              width={32}
              height={32}
              className="w-8 h-8 rounded-lg shadow-xs group-hover:scale-105 transition-transform object-contain"
              priority
            />
            <span className="font-bold text-xl tracking-tight text-[#0B0F1A]">COGENT</span>
          </Link>

          <span className="text-[11px] font-mono text-[#8D99AE] bg-[#F5F6FA] border border-[#DDE3EE] px-2.5 py-1 rounded-full">
            Institutional Pilot
          </span>
        </div>

        {/* Center Auth Card */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          {/* Segmented Tab Switcher (Log In / Create Account Navigation) */}
          <AuthTabSwitcher activeTab="sign-up" />

          {isClerkConfigured ? (
            <div className="space-y-4">
              <div className="space-y-1 mb-4">
                <h1 className="text-3xl font-extrabold text-[#0B0F1A] tracking-tight">
                  Create your Account
                </h1>
                <p className="text-xs text-[#4B5565]">
                  Register your financial institution for sovereign compliance:
                </p>
              </div>

              <SignUp
                routing="path"
                path="/sign-up"
                signInUrl="/sign-in"
                fallbackRedirectUrl="/onboarding"
                forceRedirectUrl="/onboarding"
                appearance={{
                  elements: {
                    card: 'shadow-none border-none p-0 bg-transparent w-full',
                    rootBox: 'w-full',
                    headerTitle: 'hidden',
                    headerSubtitle: 'hidden',
                    socialButtonsBlockButton:
                      'border-[#DDE3EE] bg-white hover:bg-[#F9FAFC] text-[#0B0F1A] font-semibold text-xs rounded-xl py-2.5 transition-colors shadow-2xs',
                    formButtonPrimary:
                      'bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white font-semibold text-xs rounded-xl py-3 shadow-md shadow-[#2A4BFF]/20 transition-all cursor-pointer',
                    formFieldInput:
                      'bg-white border-[#DDE3EE] text-[#0B0F1A] focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 rounded-xl text-xs placeholder-[#8D99AE] transition-all',
                    formFieldLabel: 'text-[#0B0F1A] text-xs font-semibold',
                    footerActionLink: 'text-[#2A4BFF] hover:underline font-bold text-xs',
                    dividerLine: 'bg-[#DDE3EE]',
                    dividerText: 'text-[#8D99AE] text-xs font-medium uppercase',
                    identityPreviewText: 'text-[#0B0F1A] font-medium text-xs',
                    identityPreviewEditButton: 'text-[#2A4BFF] hover:underline text-xs',
                  },
                }}
              />
            </div>
          ) : (
            /* Custom Form matching sign.JPG down to the pixel */
            <div className="space-y-6">
              <div className="space-y-1.5">
                <h1 className="text-3xl font-extrabold text-[#0B0F1A] tracking-tight">
                  Create your Account
                </h1>
                <p className="text-xs text-[#4B5565]">
                  Register your financial institution for sovereign compliance:
                </p>
              </div>

              {/* Social Login Buttons Row matching sign.JPG */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/onboarding')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] text-xs font-semibold text-[#0B0F1A] shadow-2xs transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/onboarding')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] text-xs font-semibold text-[#0B0F1A] shadow-2xs transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-[#2A4BFF]" />
                  <span>Sandbox SSO</span>
                </button>
              </div>

              {/* Centered Divider matching sign.JPG */}
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#DDE3EE]" />
                </div>
                <span className="relative px-3 bg-white text-[11px] text-[#8D99AE]">
                  or register with email
                </span>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      placeholder="Financial Institution / FinTech Name"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Work Email"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password (12+ characters)"
                      className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-xs text-[#0B0F1A] placeholder-[#8D99AE] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-medium"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8D99AE] hover:text-[#0B0F1A] cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Agreement Checkbox */}
                <div className="flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="terms-demo"
                    required
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded text-[#2A4BFF] focus:ring-[#2A4BFF] border-[#DDE3EE]"
                  />
                  <label htmlFor="terms-demo" className="text-[11px] text-[#4B5565] leading-tight select-none">
                    I agree to the{' '}
                    <span className="text-[#0B0F1A] font-semibold">Institutional Compliance Terms</span>{' '}
                    and data protection governance under NDPA 2023.
                  </label>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white text-xs font-bold shadow-md shadow-[#2A4BFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              {/* Bottom Sign-In Link */}
              <div className="text-center text-xs text-[#4B5565] pt-2">
                <span>Already have an account? </span>
                <Link
                  href="/sign-in"
                  className="text-[#2A4BFF] hover:underline font-bold"
                >
                  Log in
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Institutional Micro-Footer */}
        <div className="text-[11px] text-[#8D99AE] flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
          <span>© 2026 Cogent Regulatory Systems</span>
          <span className="flex items-center gap-1 text-[#10B981]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Sovereign Enclave Ready
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          RIGHT HALF: ELECTRIC COBALT SHOWCASE PANEL (ui_ref/sign.JPG)
          ─────────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 hidden lg:block">
        <AuthShowcasePanel
          title="Connect with every application."
          subtitle="Everything you need in an easily customizable regulatory compliance dashboard."
          activeDotIndex={1}
        />
      </div>
    </div>
  );
}
