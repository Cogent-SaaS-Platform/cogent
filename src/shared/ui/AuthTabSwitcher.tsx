'use client';

import React from 'react';
import Link from 'next/link';

export interface AuthTabSwitcherProps {
  activeTab: 'sign-in' | 'sign-up';
  className?: string;
}

/**
 * Segmented Tab Switcher matching ui_ref/sign.JPG and auth.JPG down to the pixel.
 * Ensures the buttons are not inert state toggles, but active router navigation links
 * redirecting users directly between our dedicated `/sign-in` (Login) and `/sign-up` (Create Account) pages.
 */
export function AuthTabSwitcher({ activeTab, className = '' }: AuthTabSwitcherProps) {
  const isSignIn = activeTab === 'sign-in';

  return (
    <nav
      aria-label="Authentication navigation"
      className={`flex p-1 bg-[#F5F6FA] border border-[#DDE3EE] rounded-xl mb-6 shadow-2xs ${className}`}
    >
      {/* Log In Button / Link */}
      {isSignIn ? (
        <span
          aria-current="page"
          className="flex-1 py-2 text-xs font-bold rounded-lg text-center bg-white text-[#0B0F1A] shadow-xs select-none transition-all cursor-default"
        >
          Log In
        </span>
      ) : (
        <Link
          href="/sign-in"
          className="flex-1 py-2 text-xs font-bold rounded-lg text-center text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-white/60 transition-all cursor-pointer"
        >
          Log In
        </Link>
      )}

      {/* Create Account Button / Link */}
      {!isSignIn ? (
        <span
          aria-current="page"
          className="flex-1 py-2 text-xs font-bold rounded-lg text-center bg-white text-[#0B0F1A] shadow-xs select-none transition-all cursor-default"
        >
          Create Account
        </span>
      ) : (
        <Link
          href="/sign-up"
          className="flex-1 py-2 text-xs font-bold rounded-lg text-center text-[#8D99AE] hover:text-[#0B0F1A] hover:bg-white/60 transition-all cursor-pointer"
        >
          Create Account
        </Link>
      )}
    </nav>
  );
}
