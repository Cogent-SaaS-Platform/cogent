'use client';

import React from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';

export interface ClerkAvatarProps {
  type?: 'user' | 'organization';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackName?: string;
  className?: string;
}

const SIZE_MAP = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

function MarbleFallback({
  type,
  size,
  displayName,
  className,
}: {
  type: 'user' | 'organization';
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  displayName: string;
  className: string;
}) {
  const dimensionClass = SIZE_MAP[size];
  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full overflow-hidden shrink-0 shadow-2xs select-none ${dimensionClass} ${className}`}
      title={displayName}
      style={{
        background: 'linear-gradient(135deg, #6C47FF 0%, #8E6BFF 50%, #2A4BFF 100%)',
      }}
    >
      {/* SVG subtle marble texture overlay */}
      <svg
        className="absolute inset-0 w-full h-full opacity-40 mix-blend-overlay pointer-events-none"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <radialGradient id="marbleNoise1" cx="30%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#6C47FF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#2A4BFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="marbleNoise2" cx="80%" cy="75%" r="60%">
          <stop offset="0%" stopColor="#4318FF" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#0B0F1A" stopOpacity="0" />
        </radialGradient>
        <rect width="100" height="100" fill="url(#marbleNoise1)" />
        <rect width="100" height="100" fill="url(#marbleNoise2)" />
      </svg>

      {/* Silhouette icon matching Clerk's default user/org silhouette */}
      {type === 'user' ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="none"
          className="relative z-10 w-[60%] h-[60%] text-white drop-shadow-xs"
        >
          {/* Crisp User Silhouette */}
          <circle cx="12" cy="7.5" r="4" fill="#FFFFFF" />
          <path
            d="M4 19.5C4 15.3579 7.35786 12 11.5 12H12.5C16.6421 12 20 15.3579 20 19.5V20.5H4V19.5Z"
            fill="#FFFFFF"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="none"
          className="relative z-10 w-[55%] h-[55%] text-white drop-shadow-xs"
        >
          {/* Crisp Organization / Institution Silhouette */}
          <path
            d="M3 21H21V19H19V5C19 3.89543 18.1046 3 17 3H7C5.89543 3 5 3.89543 5 5V19H3V21ZM7 5H17V19H15V15H9V19H7V5ZM11 7H13V9H11V7ZM11 11H13V13H11V11Z"
            fill="#FFFFFF"
          />
        </svg>
      )}
    </div>
  );
}

function LiveUserAvatar({
  size,
  fallbackName,
  className,
}: {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackName?: string;
  className: string;
}) {
  const { user, isLoaded } = useUser();
  const dimensionClass = SIZE_MAP[size];
  const displayName = user?.fullName || fallbackName || 'Compliance Officer';

  if (isLoaded && user?.imageUrl) {
    return (
      <img
        src={user.imageUrl}
        alt={displayName}
        className={`${dimensionClass} rounded-full object-cover ring-1 ring-[#DDE3EE] shadow-2xs ${className}`}
      />
    );
  }

  return <MarbleFallback type="user" size={size} displayName={displayName} className={className} />;
}

function LiveOrgAvatar({
  size,
  fallbackName,
  className,
}: {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fallbackName?: string;
  className: string;
}) {
  const { organization, isLoaded } = useOrganization();
  const dimensionClass = SIZE_MAP[size];
  const displayName = organization?.name || fallbackName || 'Institution';

  if (isLoaded && organization?.imageUrl) {
    return (
      <img
        src={organization.imageUrl}
        alt={displayName}
        className={`${dimensionClass} rounded-full object-cover ring-1 ring-[#DDE3EE] shadow-2xs ${className}`}
      />
    );
  }

  return <MarbleFallback type="organization" size={size} displayName={displayName} className={className} />;
}

/**
 * Reusable Avatar component that reflects the Clerk Customization Dashboard:
 * Background: Marble gradient with #6C47FF and #2A4BFF accents
 * Foreground: Crisp White Silhouette or Initials
 *
 * If Clerk is configured and signed in, reads user.imageUrl or organization.imageUrl directly.
 * Otherwise, generates an authentic marble SVG avatar matching the Clerk Customization preset.
 */
export function ClerkAvatar({
  type = 'user',
  size = 'md',
  fallbackName,
  className = '',
}: ClerkAvatarProps) {
  const isConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (isConfigured) {
    if (type === 'user') {
      return <LiveUserAvatar size={size} fallbackName={fallbackName} className={className} />;
    }
    return <LiveOrgAvatar size={size} fallbackName={fallbackName} className={className} />;
  }

  const displayName = fallbackName || (type === 'user' ? 'Compliance Officer' : 'Institution');
  return <MarbleFallback type={type} size={size} displayName={displayName} className={className} />;
}

export function UserAvatar(props: Omit<ClerkAvatarProps, 'type'>) {
  return <ClerkAvatar type="user" {...props} />;
}

export function OrgAvatar(props: Omit<ClerkAvatarProps, 'type'>) {
  return <ClerkAvatar type="organization" {...props} />;
}
