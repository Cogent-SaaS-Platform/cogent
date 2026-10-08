'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SignIn } from '@clerk/nextjs';
import { AuthShowcasePanel } from '@/shared/ui/AuthShowcasePanel';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  AlertCircle,
} from 'lucide-react';

export default function SignInPage() {
  const router = useRouter();
  const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  // Demo Sandbox State (Used when user prefers instant demo access or Clerk is unconfigured)
  const [showDemoForm, setShowDemoForm] = useState(false);
  const [demoEmail, setDemoEmail] = useState('compliance.officer@apexfintech.ng');
  const [demoPassword, setDemoPassword] = useState('DemoPassword2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      router.push('/overview');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row antialiased selection:bg-[#2A4BFF] selection:text-white">
      {/* ───────────────────────────────────────────────────────────────────
          LEFT HALF: AUTH FORM (Faithful reproduction of ui_ref/sign.JPG)
          ─────────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 bg-white">
        {/* Brand Header matching sign.JPG */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-[#2A4BFF] flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-white text-base leading-none">C</span>
            </div>
            <span className="font-bold text-xl tracking-tight text-[#0B0F1A]">COGENT</span>
          </Link>

          <div className="flex items-center gap-2">
            {isClerkConfigured && (
              <button
                type="button"
                onClick={() => setShowDemoForm(!showDemoForm)}
                className="text-[11px] font-semibold text-[#2A4BFF] hover:underline cursor-pointer"
              >
                {showDemoForm ? 'Use Clerk Sign In' : 'One-Click Demo'}
              </button>
            )}
            <span className="text-[11px] font-mono text-[#8D99AE] bg-[#F5F6FA] border border-[#DDE3EE] px-2.5 py-1 rounded-full">
              NDPA 2023 Compliant
            </span>
          </div>
        </div>

        {/* Center Auth Card */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          {isClerkConfigured && !showDemoForm ? (
            <div className="space-y-4">
              <div className="space-y-1 mb-4">
                <h1 className="text-3xl font-extrabold text-[#0B0F1A] tracking-tight">
                  Log in to your Account
                </h1>
                <p className="text-xs text-[#4B5565]">
                  Welcome back! Select method to log in:
                </p>
              </div>

              <SignIn
                routing="path"
                path="/sign-in"
                signUpUrl="/sign-up"
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
                  Log in to your Account
                </h1>
                <p className="text-xs text-[#4B5565]">
                  Welcome back! Select method to log in:
                </p>
              </div>

              {/* Social Login Buttons Row matching sign.JPG */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/overview')}
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
                  onClick={() => router.push('/overview')}
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
                  or continue with email
                </span>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleDemoSubmit} className="space-y-4">
                <div>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8D99AE] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={demoEmail}
                      onChange={(e) => setDemoEmail(e.target.value)}
                      placeholder="Email"
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
                      value={demoPassword}
                      onChange={(e) => setDemoPassword(e.target.value)}
                      placeholder="Password"
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

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2A4BFF] focus:ring-[#2A4BFF] border-[#DDE3EE]"
                    />
                    <span className="text-[#0B0F1A] font-medium text-xs">Remember me</span>
                  </label>

                  <span className="text-[#2A4BFF] hover:underline font-semibold text-xs cursor-pointer">
                    Forgot Password?
                  </span>
                </div>

                {/* Primary Button matching sign.JPG */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white text-xs font-bold shadow-md shadow-[#2A4BFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Log In</span>
                  )}
                </button>
              </form>

              {/* Bottom Sign-Up Link */}
              <div className="text-center text-xs text-[#4B5565] pt-2">
                <span>Don&apos;t have an account? </span>
                <Link
                  href="/sign-up"
                  className="text-[#2A4BFF] hover:underline font-bold"
                >
                  Create an account
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
            CBN · NDPC · ARCON Active
          </span>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────
          RIGHT HALF: ELECTRIC COBALT SHOWCASE PANEL (ui_ref/sign.JPG)
          ─────────────────────────────────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 hidden lg:block">
        <AuthShowcasePanel
          title="Connect with every regulator."
          subtitle="Everything you need in an easily customizable regulatory intelligence dashboard."
          activeDotIndex={0}
        />
      </div>
    </div>
  );
}
