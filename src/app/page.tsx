'use client';

import React, { useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

import { useAuth } from '@clerk/nextjs';
import { AuthShowcasePanel } from '@/shared/ui/AuthShowcasePanel';
import { AuthTabSwitcher } from '@/shared/ui/AuthTabSwitcher';
import { LogIn, UserPlus } from 'lucide-react';

function RootGatewayRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams?.get('mode');
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      router.replace('/overview');
    } else if (modeParam === 'signup') {
      router.replace('/sign-up');
    } else {
      router.replace('/sign-in');
    }
  }, [isLoaded, isSignedIn, modeParam, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row antialiased selection:bg-[#2A4BFF] selection:text-white">
      {/* LEFT HALF: AUTH REDIRECT GATEWAY */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 lg:p-16 xl:p-20 bg-white">
        {/* Brand Header */}
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
            NDPA 2023 Compliant
          </span>
        </div>

        {/* Center Auth Card with Real Redirect Buttons */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          {/* Segmented Tab Switcher with Real Links */}
          <AuthTabSwitcher activeTab={modeParam === 'signup' ? 'sign-up' : 'sign-in'} />

          <div className="space-y-6">
            <div className="space-y-1 mb-4">
              <h1 className="text-3xl font-extrabold text-[#0B0F1A] tracking-tight">
                {modeParam === 'signup' ? 'Create your Account' : 'Log in to your Account'}
              </h1>
              <p className="text-xs text-[#4B5565]">
                {modeParam === 'signup'
                  ? 'Register your financial institution for sovereign compliance:'
                  : 'Welcome back! Select method to log in:'}
              </p>
            </div>

            {/* Direct Redirect Action Buttons */}
            <div className="space-y-3 pt-2">
              <Link
                href="/sign-in"
                className="w-full py-3 rounded-xl bg-[#2A4BFF] hover:bg-[#1E3AE5] text-white text-xs font-bold shadow-md shadow-[#2A4BFF]/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Log In to Existing Account</span>
              </Link>

              <Link
                href="/sign-up"
                className="w-full py-3 rounded-xl bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] text-[#0B0F1A] text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-[#2A4BFF]" />
                <span>Create New Account</span>
              </Link>
            </div>

            <div className="text-center text-xs text-[#4B5565] pt-2">
              {modeParam === 'signup' ? (
                <>
                  <span>Already have an account? </span>
                  <Link href="/sign-in" className="text-[#2A4BFF] hover:underline font-bold">
                    Log in
                  </Link>
                </>
              ) : (
                <>
                  <span>Don&apos;t have an account? </span>
                  <Link href="/sign-up" className="text-[#2A4BFF] hover:underline font-bold">
                    Create an account
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Institutional Micro-Footer */}
        <div className="text-[11px] text-[#8D99AE] flex items-center justify-between pt-4 border-t border-[#F1F5F9]">
          <span>© 2026 Cogent Regulatory Systems</span>
          <span className="flex items-center gap-1 text-[#10B981]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
            Sovereign Enclave Ready · CBN · NDPC · ARCON Active
          </span>
        </div>
      </div>

      {/* RIGHT HALF: ELECTRIC COBALT SHOWCASE PANEL */}
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

export default function RootPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <RootGatewayRedirectContent />
    </Suspense>
  );
}
