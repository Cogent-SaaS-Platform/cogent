'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';

export interface UserProfileData {
  id?: string;
  email: string;
  fullName: string;
  jobTitle: string;
  department: string;
  avatarUrl?: string | null;
  role?: string;
}

export function useUserProfile() {
  const { user, isLoaded: isClerkLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize immediately from localStorage to avoid layout shifts or flash of wrong role
  const [jobTitle, setJobTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('cogent_user_role');
      if (stored) return stored;
    }
    return 'CSO';
  });

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.user) {
          const u = json.user;
          const title = u.jobTitle || 'CSO';
          setProfile({
            id: u.id,
            email: u.email || user?.primaryEmailAddress?.emailAddress || '',
            fullName: u.fullName || user?.fullName || '',
            jobTitle: title,
            department: u.department || 'EXECUTIVE_LEADERSHIP',
            avatarUrl: u.avatarUrl,
            role: u.role || 'OWNER',
          });
          setJobTitle(title);
          if (typeof window !== 'undefined') {
            localStorage.setItem('cogent_user_role', title);
            localStorage.setItem('cogent_user_dept', u.department || 'EXECUTIVE_LEADERSHIP');
          }
        }
      }
    } catch {
      // Graceful fallback to cached state
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isClerkLoaded) {
      fetchProfile();
    }
  }, [isClerkLoaded, fetchProfile]);

  const updateProfile = async (updates: Partial<UserProfileData>) => {
    try {
      if (updates.jobTitle && typeof window !== 'undefined') {
        localStorage.setItem('cogent_user_role', updates.jobTitle);
        setJobTitle(updates.jobTitle);
      }
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          await fetchProfile();
          return true;
        }
      }
    } catch {
      // Handled
    }
    return false;
  };

  // Derive a clean, uppercase badge (e.g. "CSO", "CCO", "MLRO", etc.)
  const roleBadge = (() => {
    if (!jobTitle) return 'CSO';
    const trimmed = jobTitle.trim();
    if (trimmed.length <= 5) return trimmed.toUpperCase();
    const initials = trimmed
      .split(/[\s/&-]+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 4)
      .toUpperCase();
    return initials || 'CSO';
  })();

  return {
    profile,
    jobTitle,
    roleBadge,
    isLoading,
    refreshProfile: fetchProfile,
    updateProfile,
  };
}
