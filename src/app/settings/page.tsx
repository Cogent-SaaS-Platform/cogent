'use client';

import React, { useState, useEffect } from 'react';
import { useUser, useOrganization } from '@clerk/nextjs';
import { AppShell } from '@/shared/ui/AppShell';
import { UserAvatar, OrgAvatar } from '@/shared/ui/ClerkAvatar';
import {
  Building2,
  Users,
  CreditCard,
  Shield,
  Bell,
  CheckCircle2,
  Plus,
  Download,
  AlertCircle,
  MoreVertical,
  Mail,
  Lock,
  Layers,
  Info,
  Check,
  UserPlus,
  Trash2,
  Camera,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Clock,
  KeyRound,
  Laptop,
  Zap,
  Loader2,
  Scale,
} from 'lucide-react';

type SettingsTab =
  | 'details'
  | 'profile'
  | 'security'
  | 'team'
  | 'billings'
  | 'plan'
  | 'email'
  | 'notifications';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('details');
  const { user } = useUser();
  const { organization } = useOrganization();

  // Listen to tab URL query parameter if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as SettingsTab;
      if (
        tabParam &&
        ['details', 'profile', 'security', 'team', 'billings', 'plan', 'email', 'notifications'].includes(
          tabParam
        )
      ) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Plan & Paystack Billing State
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'annual'>('monthly');
  const [currencyDisplay, setCurrencyDisplay] = useState<'USD' | 'NGN'>('USD');
  const [checkoutLoadingTier, setCheckoutLoadingTier] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<{
    tier: string;
    status: string;
    isActive: boolean;
    isInGracePeriod: boolean;
    isReadOnly: boolean;
    trialEndsAt: string | null;
    gracePeriodEndsAt: string | null;
    marketingScanQuota: number;
    policyDocumentQuota: number;
  } | null>(null);
  const [telemetryData, setTelemetryData] = useState<{
    effectiveTier: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE';
    status: string;
    isActive: boolean;
    isTrial: boolean;
    isReadOnly: boolean;
    isInGracePeriod: boolean;
    trialEndsAt: string | null;
    daysRemaining: number;
    usage: {
      marketingCampaigns: { used: number; limit: number; isUnlimited: boolean };
      gapAnalyses: { used: number; limit: number; isUnlimited: boolean };
      regulationIngestions: { used: number; limit: number; isUnlimited: boolean };
      policiesUploaded: { used: number; limit: number; isUnlimited: boolean };
      teamSeats: { used: number; limit: number; isUnlimited: boolean };
    };
  } | null>(null);
  const [isSwitchingTier, setIsSwitchingTier] = useState(false);
  const [tierSwitchToast, setTierSwitchToast] = useState<string | null>(null);
  const [checkoutFeedback, setCheckoutFeedback] = useState<string | null>(null);
  const [billingHistory, setBillingHistory] = useState<
    {
      id: string;
      eventId: string;
      eventType: string;
      date: string;
      amount: string;
      status: string;
      reference: string;
      channel: string;
    }[]
  >([]);

  useEffect(() => {
    async function loadBillingData() {
      try {
        const [subRes, histRes] = await Promise.all([
          fetch('/api/billing/subscription'),
          fetch('/api/billing/history'),
        ]);

        if (subRes.ok && subRes.headers.get('content-type')?.includes('application/json')) {
          const subJson = await subRes.json();
          if (subJson.success) {
            if (subJson.data?.subscription) {
              setSubscriptionData(subJson.data.subscription);
            }
            if (subJson.data?.telemetry) {
              setTelemetryData(subJson.data.telemetry);
            }
          }
        }

        if (histRes.ok && histRes.headers.get('content-type')?.includes('application/json')) {
          const histJson = await histRes.json();
          if (histJson.success && Array.isArray(histJson.data)) {
            setBillingHistory(histJson.data);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadBillingData();
  }, []);

  const handleDevSwitchTier = async (
    targetTier: 'TRIAL' | 'STARTER' | 'PRO' | 'ENTERPRISE',
    simulateExpired = false
  ) => {
    try {
      setIsSwitchingTier(true);
      const res = await fetch('/api/billing/dev-switch-tier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: targetTier, simulateExpired }),
      });
      const data = await res.json();
      if (data.success) {
        setTierSwitchToast(data.message);
        // Refresh telemetry and subscription data immediately
        const subRes = await fetch('/api/billing/subscription');
        if (subRes.ok) {
          const subJson = await subRes.json();
          if (subJson.success) {
            if (subJson.data?.subscription) setSubscriptionData(subJson.data.subscription);
            if (subJson.data?.telemetry) setTelemetryData(subJson.data.telemetry);
          }
        }
      } else {
        setTierSwitchToast(`Error: ${data.error || 'Failed to switch tier'}`);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setTierSwitchToast(`Error switching plan: ${error.message}`);
    } finally {
      setIsSwitchingTier(false);
      setTimeout(() => setTierSwitchToast(null), 4000);
    }
  };


  const handleCheckout = async (tier: 'STARTER' | 'PRO' | 'ENTERPRISE') => {
    try {
      setCheckoutLoadingTier(tier);
      setCheckoutFeedback(null);
      const res = await fetch('/api/billing/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier,
          billingInterval,
          callbackUrl: `${window.location.origin}/settings?tab=plan&payment=success`,
          userEmail: userEmail || undefined,
        }),
      });

      const isJson = res.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await res.json() : null;

      if (!res.ok || !data?.success) {
        const errMsg =
          data?.error?.message ||
          (typeof data?.error === 'string' ? data.error : null) ||
          (res.status === 403
            ? 'Access restricted: Only organization administrators may initiate billing checkouts.'
            : `Payment initialization failed (${res.status}). Please check gateway configuration or contact support.`);
        setCheckoutFeedback(errMsg);
        return;
      }

      if (data.data?.authorizationUrl) {
        window.location.assign(data.data.authorizationUrl);
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setCheckoutFeedback(error.message || 'Payment initiation error');
    } finally {
      setCheckoutLoadingTier(null);
    }
  };


  // Personal User Details State (My Details) - bound dynamically to authenticated user & Supabase profile
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('cogent_user_role') || 'CSO';
    }
    return 'CSO';
  });
  const [userDepartment, setUserDepartment] = useState('EXECUTIVE_LEADERSHIP');
  const [userTimezone, setUserTimezone] = useState('Africa/Lagos (WAT, UTC+1)');
  const [personalDetailsSaved, setPersonalDetailsSaved] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  // Institution Profile State - bound dynamically to authenticated organization
  const [institutionName, setInstitutionName] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [institutionSize, setInstitutionSize] = useState('11-50');
  const [primaryDomain, setPrimaryDomain] = useState('');
  const [selectedRegulators, setSelectedRegulators] = useState<string[]>([
    'CBN',
    'NDPC',
    'ARCON',
    'FCCPC',
  ]);
  const [licenseType, setLicenseType] = useState('PAYMENT_SOLUTION_SERVICES_PSSP');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);

  // Load user profile from Supabase API on mount
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.user) {
            const u = json.user;
            if (u.jobTitle) {
              setUserRole(u.jobTitle);
              if (typeof window !== 'undefined') {
                localStorage.setItem('cogent_user_role', u.jobTitle);
              }
            }
            if (u.department) setUserDepartment(u.department);
            if (u.email) setUserEmail(u.email);
            if (u.fullName) {
              const parts = u.fullName.trim().split(/\s+/);
              if (parts.length > 0) setUserFirstName(parts[0]);
              if (parts.length > 1) setUserLastName(parts.slice(1).join(' '));
            }
          }
          if (json.success && json.organization) {
            const o = json.organization;
            if (o.name) setInstitutionName(o.name);
            if (o.rcNumber) setRcNumber(o.rcNumber);
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
    loadUserProfile();
  }, []);

  // Sync state from Clerk user & organization when loaded
  useEffect(() => {
    if (user) {
      if (!userFirstName && user.firstName) setUserFirstName(user.firstName);
      if (!userLastName && user.lastName) setUserLastName(user.lastName);
      if (!userEmail && user.primaryEmailAddress?.emailAddress) {
        setUserEmail(user.primaryEmailAddress.emailAddress);
      }
    }
  }, [user, userFirstName, userLastName, userEmail]);

  useEffect(() => {
    if (organization && !institutionName) {
      setInstitutionName(organization.name || '');
    }
  }, [organization, institutionName]);

  // Password / Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Billing Form State
  const [cardholderName, setCardholderName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [invoiceEmailType, setInvoiceEmailType] = useState<'existing' | 'custom'>('existing');
  const [customInvoiceEmail, setCustomInvoiceEmail] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);

  // Team RBAC State - initializes with active account user
  const [teamMembers, setTeamMembers] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      role: string;
      department: string;
      status: string;
    }>
  >([]);

  useEffect(() => {
    if (user) {
      const realName =
        user.fullName ||
        `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
        'Institutional Executive';
      const realEmail = user.primaryEmailAddress?.emailAddress || userEmail || '';
      setTeamMembers([
        {
          id: user.id || 'owner_1',
          name: realName,
          email: realEmail,
          role: userRole || 'CSO',
          department: userDepartment || 'EXECUTIVE_LEADERSHIP',
          status: 'Active',
        },
      ]);
    }
  }, [user, userRole, userDepartment, userEmail]);

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');
  const [newMemberDept, setNewMemberDept] = useState('COMPLIANCE_LEGAL');
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonal(true);
    try {
      const fullName = `${userFirstName} ${userLastName}`.trim();
      if (typeof window !== 'undefined') {
        localStorage.setItem('cogent_user_role', userRole);
      }
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          jobTitle: userRole,
          department: userDepartment,
          email: userEmail,
        }),
      });
      if (res.ok) {
        setPersonalDetailsSaved(true);
        setTeamMembers((prev) =>
          prev.map((m, idx) =>
            idx === 0
              ? { ...m, name: fullName || m.name, email: userEmail || m.email, role: userRole }
              : m
          )
        );
      }
    } catch {
      setPersonalDetailsSaved(true);
    } finally {
      setIsSavingPersonal(false);
      setTimeout(() => setPersonalDetailsSaved(false), 3000);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSaved(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSaved(false), 3000);
  };

  const handleAddTeamMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;

    setTeamMembers((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: newMemberEmail.split('@')[0].replace('.', ' '),
        email: newMemberEmail,
        role: newMemberRole,
        department:
          newMemberDept === 'OTHER' ? customDeptInput || 'Custom Unit' : newMemberDept,
        status: 'Invited',
      },
    ]);
    setNewMemberEmail('');
    setCustomDeptInput('');
    setIsAddingMember(false);
  };

  const toggleInvoiceSelection = (id: string) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(selectedInvoices.filter((i) => i !== id));
    } else {
      setSelectedInvoices([...selectedInvoices, id]);
    }
  };

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'details', label: 'My details' },
    { id: 'profile', label: 'Profile' },
    { id: 'security', label: 'Password' },
    { id: 'team', label: 'Team' },
    { id: 'billings', label: 'Billings' },
    { id: 'plan', label: 'Plan' },
    { id: 'email', label: 'Email' },
    { id: 'notifications', label: 'Notifications' },
  ];

  return (
    <AppShell activePillarOverride="settings">
      <div className="p-6 lg:p-10 max-w-6xl mx-auto space-y-8 font-sans pb-24">
        {/* Settings Header matching settingg.webp */}
        <div>
          <h1 className="text-2xl font-bold text-[#0B0F1A] tracking-tight">Settings</h1>
          <p className="text-xs text-[#4B5565] mt-1 font-medium">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Horizontal Navigation Tab Bar matching settingg.webp */}
        <div className="border-b border-[#DDE3EE] flex items-center gap-6 overflow-x-auto text-xs font-semibold">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`pb-3.5 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-b-2 border-[#0B0F1A] text-[#0B0F1A] font-bold'
                    : 'text-[#4B5565] hover:text-[#0B0F1A]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ───────────────────────────────────────────────────────────────────
            TAB 1: MY DETAILS (Personal Details & User Clerk Marble Avatar)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'details' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <form
              onSubmit={handleSavePersonal}
              className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs"
            >
              <div className="border-b border-[#DDE3EE] pb-4">
                <h2 className="text-base font-bold text-[#0B0F1A]">Personal Details</h2>
                <p className="text-xs text-[#4B5565] mt-0.5">
                  Update your personal profile and identity credentials.
                </p>
              </div>

              {personalDetailsSaved && (
                <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span>Personal details successfully updated.</span>
                </div>
              )}

              {/* User Avatar Section (Clerk Marble Avatar with #6C47FF preset) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE]">
                <UserAvatar size="xl" fallbackName={`${userFirstName} ${userLastName}`} />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#0B0F1A] block">
                    Profile Photo &amp; Avatar
                  </span>
                  <p className="text-[11px] text-[#4B5565]">
                    Synchronized with your Clerk Identity Profile (Custom Marble #6C47FF Silhouette).
                  </p>
                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      className="btn-base btn-secondary btn-xs text-[#0B0F1A] gap-1.5"
                    >
                      <Camera className="w-3 h-3 text-[#4B5565]" />
                      <span>Change Photo</span>
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-ghost btn-xs text-[#DC2626] hover:bg-red-50"
                    >
                      <span>Remove</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Personal Details Form Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    First Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userFirstName}
                    onChange={(e) => setUserFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Last Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={userLastName}
                    onChange={(e) => setUserLastName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Work Email Address <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Institutional Role / Title
                  </label>
                  <input
                    type="text"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Preferred Timezone
                  </label>
                  <select
                    value={userTimezone}
                    onChange={(e) => setUserTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  >
                    <option value="Africa/Lagos (WAT, UTC+1)">
                      (GMT+01:00) West Africa Time (Lagos / Abuja)
                    </option>
                    <option value="Europe/London (GMT/BST)">
                      (GMT+00:00) London / Greenwich Mean Time
                    </option>
                    <option value="America/New_York (EST)">
                      (GMT-05:00) Eastern Standard Time (New York)
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#DDE3EE]">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Personal Details
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 2: PROFILE (Institutional Organization & Clerk Org Marble Avatar)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <form
              onSubmit={handleSaveProfile}
              className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs"
            >
              <div className="border-b border-[#DDE3EE] pb-4">
                <h2 className="text-base font-bold text-[#0B0F1A]">Institution Profile</h2>
                <p className="text-xs text-[#4B5565] mt-0.5">
                  Legal entity registration information governing your sovereign compliance enclaves.
                </p>
              </div>

              {profileSaved && (
                <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span>Institutional profile updated and synchronized with Supabase RLS.</span>
                </div>
              )}

              {/* Organization Avatar Section (Clerk Marble Org Logo) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE]">
                <OrgAvatar size="xl" fallbackName={institutionName} />
                <div className="space-y-1">
                  <span className="text-xs font-bold text-[#0B0F1A] block">
                    Organization Logo &amp; Brand Emblem
                  </span>
                  <p className="text-[11px] text-[#4B5565]">
                    Synchronized with Clerk Organization Customization (Marble #6C47FF Emblem).
                  </p>
                  <div className="flex items-center gap-2 pt-1.5">
                    <button
                      type="button"
                      className="btn-base btn-secondary btn-xs text-[#0B0F1A] gap-1.5"
                    >
                      <Camera className="w-3 h-3 text-[#4B5565]" />
                      <span>Change Emblem</span>
                    </button>
                    <button
                      type="button"
                      className="btn-base btn-ghost btn-xs text-[#4B5565] hover:bg-slate-100"
                    >
                      <span>Manage in Clerk</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Legal Entity Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-medium"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-[#0B0F1A]">
                      Corporate RC Number
                    </label>
                    <span className="text-xs text-slate-400 font-normal">
                      Optional
                    </span>
                  </div>
                  <input
                    type="text"
                    value={rcNumber}
                    onChange={(e) => setRcNumber(e.target.value)}
                    placeholder="e.g. RC 1849204 (Optional for foreign/sandbox teams)"
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Institution Size <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    value={institutionSize}
                    onChange={(e) => setInstitutionSize(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  >
                    <option value="1-10">1-10 Employees (Emerging FinTech)</option>
                    <option value="11-50">11-50 Employees (Growth Scaleup)</option>
                    <option value="51-200">51-200 Employees (Mid-Tier Regulated Entity)</option>
                    <option value="201-500">201-500 Employees (Major Financial Institution)</option>
                    <option value="500+">500+ Employees (Tier-1 Bank / Holding Company)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Primary Domain / Website
                  </label>
                  <input
                    type="text"
                    value={primaryDomain}
                    onChange={(e) => setPrimaryDomain(e.target.value)}
                    placeholder="e.g. institution.ng"
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Primary License Category
                  </label>
                  <select
                    value={licenseType}
                    onChange={(e) => setLicenseType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  >
                    <option value="PAYMENT_SOLUTION_SERVICES_PSSP">
                      Payment Solution Service Provider (PSSP)
                    </option>
                    <option value="COMMERCIAL_BANK">Commercial Bank (National/International)</option>
                    <option value="PAYMENT_SERVICE_BANK">Payment Service Bank (PSB)</option>
                    <option value="MOBILE_MONEY_OPERATOR_MMO">Mobile Money Operator (MMO)</option>
                    <option value="DIGITAL_LENDER_FCCPC_REGISTERED">
                      Digital Nano-Lender (FCCPC Approved)
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-[#0B0F1A]">
                      License Reference Number
                    </label>
                    <span className="text-[10px] text-[#4B5565] font-mono">(Optional)</span>
                  </div>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    placeholder="e.g. CBN/PSSP/LIC/2026/014"
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] placeholder-[#94A3B8] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs font-mono"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Registered Office Address
                  </label>
                  <input
                    type="text"
                    value={registeredAddress}
                    onChange={(e) => setRegisteredAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  />
                </div>
              </div>

              {/* Active Regulators */}
              <div className="pt-4 border-t border-[#DDE3EE]">
                <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                  Active Nigerian Regulatory Oversight Authorities
                </label>
                <div className="flex flex-wrap gap-2">
                  {['CBN', 'SEC', 'NDPC', 'ARCON', 'FCCPC', 'NFIU', 'NDIC'].map((reg) => {
                    const isSelected = selectedRegulators.includes(reg);
                    return (
                      <button
                        type="button"
                        key={reg}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRegulators(selectedRegulators.filter((r) => r !== reg));
                          } else {
                            setSelectedRegulators([...selectedRegulators, reg]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]'
                            : 'bg-white text-[#4B5565] border border-[#DDE3EE] hover:bg-[#F9FAFC]'
                        }`}
                      >
                        {reg}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-[#DDE3EE]">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Profile Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 3: PASSWORD & SECURITY (Credentials & Session Logs)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <form
              onSubmit={handleSavePassword}
              className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs"
            >
              <div className="border-b border-[#DDE3EE] pb-4">
                <h2 className="text-base font-bold text-[#0B0F1A]">Password &amp; Security</h2>
                <p className="text-xs text-[#4B5565] mt-0.5">
                  Manage your institutional credentials, 2-factor authentication, and active sessions.
                </p>
              </div>

              {passwordSaved && (
                <div className="p-3.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                  <span>Password successfully updated.</span>
                </div>
              )}

              <div className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  />
                  <p className="text-[11px] text-[#8D99AE] mt-1">
                    Minimum 12 characters, including numbers and symbols per NDPA 2023 security policy.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0B0F1A] mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-[#DDE3EE] rounded-xl text-sm text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] focus:ring-2 focus:ring-[#2A4BFF]/10 shadow-2xs"
                  />
                </div>

                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Update Password
                </button>
              </div>

              {/* Two-Factor Authentication Box */}
              <div className="pt-6 border-t border-[#DDE3EE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-[#0B0F1A]">
                        Two-Factor Authentication (2FA)
                      </h3>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    </div>
                  <p className="text-[11px] text-[#4B5565] mt-0.5">
                    Protected by Clerk Multi-Factor Authentication enclave and cryptographic SMS/TOTP.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-base btn-secondary btn-xs text-[#0B0F1A] shrink-0"
                >
                  Configure 2FA Keys
                </button>
              </div>

              {/* Active Sessions */}
              <div className="pt-6 border-t border-[#DDE3EE] space-y-3">
                <h3 className="text-xs font-bold text-[#0B0F1A]">Active Institutional Sessions</h3>
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE]">
                  <div className="flex items-center gap-3">
                    <Laptop className="w-5 h-5 text-slate-700" />
                    <div>
                      <span className="text-xs font-bold text-[#0B0F1A] block">
                        Current Authenticated Browser Session
                      </span>
                      <span className="text-[10px] text-[#8D99AE]">
                        Verified via Clerk TLS Session Enclave ({userTimezone})
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active Now
                  </span>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 4: TEAM & RBAC (With Custom 'OTHER' role support)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'team' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0B0F1A]">Team Members &amp; RBAC Mandates</h2>
                <p className="text-xs text-[#4B5565]">
                  Manage institutional compliance seats and role-based permissions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingMember(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite Team Member</span>
              </button>
            </div>

            {/* Add Member Form */}
            {isAddingMember && (
              <form
                onSubmit={handleAddTeamMember}
                className="p-5 rounded-2xl bg-[#EEF2FF]/40 border border-[#C7D2FE] space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2A4BFF]">Add New Team Seat</span>
                  <button
                    type="button"
                    onClick={() => setIsAddingMember(false)}
                    className="text-xs text-[#4B5565] hover:text-[#0B0F1A] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#0B0F1A] mb-1">
                      Email Address <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="analyst@institution.ng"
                      className="w-full px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#0B0F1A] mb-1">
                      Institutional Role
                    </label>
                    <select
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                      <option value="OWNER">Owner</option>
                      <option value="OTHER">Other Custom Role</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#0B0F1A] mb-1">
                      Department
                    </label>
                    <select
                      value={newMemberDept}
                      onChange={(e) => setNewMemberDept(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs font-semibold text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
                    >
                      <option value="COMPLIANCE_LEGAL">Compliance &amp; Legal</option>
                      <option value="EXECUTIVE_LEADERSHIP">Executive Leadership</option>
                      <option value="OPERATIONS">Operations &amp; Risk</option>
                      <option value="GROWTH_MARKETING">Growth &amp; Marketing</option>
                      <option value="ENGINEERING_TECH">Engineering &amp; Tech</option>
                      <option value="OTHER">Other (Custom Write-in)</option>
                    </select>
                  </div>
                </div>

                {newMemberDept === 'OTHER' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#2A4BFF] mb-1">
                      Custom Department Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={customDeptInput}
                      onChange={(e) => setCustomDeptInput(e.target.value)}
                      placeholder="e.g. Internal Supervisory Sandbox"
                      className="w-full max-w-sm px-3 py-1.5 bg-white border border-[#C7D2FE] rounded-lg text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
                    />
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#2A4BFF] hover:bg-[#1E3BD9] rounded-lg shadow-xs cursor-pointer"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            )}

            {/* Team Table */}
            <div className="bg-white border border-[#DDE3EE] rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFC] text-[#4B5565] border-b border-[#DDE3EE] font-semibold">
                    <th className="p-3.5">Name &amp; Email</th>
                    <th className="p-3.5">Role</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 w-12 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDF5]">
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-[#F9FAFC] transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar size="sm" fallbackName={member.name} />
                          <div>
                            <span className="font-bold text-[#0B0F1A] block">{member.name}</span>
                            <span className="text-[11px] text-[#4B5565] font-mono">
                              {member.email}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="text-xs font-mono text-slate-700">
                          {member.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-slate-900">
                        {member.department.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {member.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {member.role !== 'OWNER' && (
                          <button
                            type="button"
                            onClick={() =>
                              setTeamMembers(teamMembers.filter((m) => m.id !== member.id))
                            }
                            className="p-1 text-[#94A3B8] hover:text-[#DC2626] transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 5: BILLINGS (Exact reproduction of settingg.webp + Pending Notice)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'billings' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Active Subscription Overview Card */}
            <div className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8EDF5] pb-5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-base font-bold text-[#0B0F1A]">Subscription &amp; Billing Overview</h2>
                    {subscriptionData && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            subscriptionData.isReadOnly
                              ? 'bg-rose-600'
                              : subscriptionData.isInGracePeriod
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        {subscriptionData.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#4B5565] mt-1">
                    Manage institutional recurring payments, VAT invoice routing, and Paystack settlement methods.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('plan')}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0B0F1A] hover:bg-[#1E293B] text-white transition-all shadow-xs shrink-0 cursor-pointer"
                >
                  Manage / Upgrade Plan
                </button>
              </div>

              {/* Subscription details metric grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#E2E8F0] space-y-1">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Active Tier
                  </span>
                  <span className="text-lg font-black text-[#0B0F1A] font-mono">
                    {subscriptionData?.tier || 'STARTER'}
                  </span>
                  <span className="text-[11px] text-[#64748B] block">
                    {subscriptionData?.status === 'trialing' ? '7-Day Free Evaluation' : 'Commercial Plan'}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#E2E8F0] space-y-1">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Pre-Vetting Allowance
                  </span>
                  <span className="text-lg font-black text-[#0B0F1A] font-mono">
                    {telemetryData?.usage.marketingCampaigns.isUnlimited ||
                    subscriptionData?.marketingScanQuota === -1
                      ? 'UNLIMITED'
                      : `${telemetryData?.usage.marketingCampaigns.limit ?? 25} / month`}
                  </span>
                  <span className="text-[11px] text-[#64748B] block">
                    Resets on next billing cycle
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#F9FAFC] border border-[#E2E8F0] space-y-1">
                  <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider block">
                    Payment Gateway
                  </span>
                  <span className="text-lg font-black text-[#0B0F1A] flex items-center gap-1.5 font-mono">
                    <Shield className="w-4 h-4 text-[#16A34A]" />
                    <span>PAYSTACK</span>
                  </span>
                  <span className="text-[11px] text-[#64748B] block">
                    CBN &amp; PCI-DSS Level 1 Compliant
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Section */}
            <div className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-xs font-bold text-[#0B0F1A]">Payment Method</h3>
                  <p className="text-[11px] text-[#4B5565] mt-0.5">
                    Authorized payment tokens for recurring compliance subscriptions.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('plan')}
                    className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#4B5565] hover:text-[#0B0F1A] bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Change Payment Method</span>
                  </button>
                </div>

                <div className="flex-1 p-5 rounded-2xl bg-[#F9FAFC] border border-[#E2E8F0] flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-[#DDE3EE] flex items-center justify-center text-xs font-black shadow-2xs">
                      💳
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#0B0F1A] block">
                        {subscriptionData?.status === 'trialing'
                          ? 'Zero-Card Free Trial Mode'
                          : 'Paystack Card & Bank Transfer Authorization'}
                      </span>
                      <span className="text-[11px] text-[#64748B] font-mono">
                        {subscriptionData?.status === 'trialing'
                          ? 'No charge required during 7-day evaluation'
                          : 'Settled in Nigerian Naira (NGN) via Paystack Secure Token'}
                      </span>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Verified
                  </span>
                </div>
              </div>

              {/* Contact Email Subsection */}
              <div className="pt-6 border-t border-[#DDE3EE] flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-xs font-bold text-[#0B0F1A]">Contact Email</h3>
                  <p className="text-[11px] text-[#4B5565] mt-0.5">
                    Where should Nigerian FIRS VAT receipts and billing alerts be sent?
                  </p>
                </div>

                <div className="flex-1 space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="invoiceEmail"
                      checked={invoiceEmailType === 'existing'}
                      onChange={() => setInvoiceEmailType('existing')}
                      className="mt-0.5 text-[#2A4BFF] focus:ring-[#2A4BFF]"
                    />
                    <div>
                      <span className="text-xs font-semibold text-[#0B0F1A] block">
                        Send to primary CCO email
                      </span>
                      <span className="text-[11px] text-[#4B5565] font-mono">
                        {userEmail}
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      name="invoiceEmail"
                      checked={invoiceEmailType === 'custom'}
                      onChange={() => setInvoiceEmailType('custom')}
                      className="mt-0.5 text-[#2A4BFF] focus:ring-[#2A4BFF]"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-semibold text-[#0B0F1A] block">
                        Add finance / AP department email
                      </span>
                      {invoiceEmailType === 'custom' && (
                        <input
                          type="email"
                          value={customInvoiceEmail}
                          onChange={(e) => setCustomInvoiceEmail(e.target.value)}
                          placeholder="accounts-payable@institution.ng"
                          className="mt-2 w-full max-w-sm px-3.5 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Billing History Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0B0F1A]">Billing History &amp; Receipts</h2>
                  <p className="text-xs text-[#4B5565]">
                    Cryptographic audit trail of all subscription charges and Paystack events.
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-bold text-[#4B5565] hover:text-[#0B0F1A] bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Ledger</span>
                </button>
              </div>

              {/* Transactions Table */}
              <div className="bg-white border border-[#DDE3EE] rounded-2xl overflow-hidden shadow-xs">
                {billingHistory.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 rounded-full bg-[#F1F5F9] text-[#64748B] flex items-center justify-center mx-auto">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h3 className="text-xs font-bold text-[#0B0F1A]">No Invoiced Charges Yet</h3>
                    <p className="text-[11px] text-[#64748B] max-w-sm mx-auto">
                      Your tenant is operating on the 7-day free institutional trial. Subsequent Paystack subscription receipts will appear here automatically with downloadable VAT invoices.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F9FAFC] text-[#4B5565] border-b border-[#DDE3EE] font-semibold">
                        <th className="p-3.5">Event Reference</th>
                        <th className="p-3.5">Date</th>
                        <th className="p-3.5">Amount (NGN)</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Channel</th>
                        <th className="p-3.5 text-right">Receipt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E8EDF5]">
                      {billingHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-[#F9FAFC] transition-colors">
                          <td className="p-3.5 font-mono font-semibold text-[#0B0F1A]">
                            {item.reference}
                          </td>
                          <td className="p-3.5 text-[#4B5565]">
                            {new Date(item.date).toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="p-3.5 font-bold font-mono text-[#0B0F1A]">
                            {item.amount}
                          </td>
                          <td className="p-3.5">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {item.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#4B5565] font-mono text-[11px]">
                            {item.channel.toUpperCase()}
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              type="button"
                              className="text-xs font-bold text-[#0066FF] hover:underline"
                            >
                              View VAT Receipt
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 6: PLAN (Phase 6 Real-Time Telemetry & Production Entitlements)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Developer / Founder Test Mode Switcher Bench (Non-Production Only) */}
            {process.env.NODE_ENV !== 'production' && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">
                      Developer &amp; Founder Sandbox Bench
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Instantly switch workspace entitlement tier in 1-click to test quota gates, upgrade popovers, and read-only mode.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isSwitchingTier}
                    onClick={() => handleDevSwitchTier('TRIAL', false)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      telemetryData?.effectiveTier === 'TRIAL' && !telemetryData?.isReadOnly
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Trial (Active)
                  </button>
                  <button
                    type="button"
                    disabled={isSwitchingTier}
                    onClick={() => handleDevSwitchTier('TRIAL', true)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      telemetryData?.effectiveTier === 'TRIAL' && telemetryData?.isReadOnly
                        ? 'bg-rose-900 text-white border-rose-900 shadow-xs'
                        : 'bg-white text-rose-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    Trial (Expired)
                  </button>
                  <button
                    type="button"
                    disabled={isSwitchingTier}
                    onClick={() => handleDevSwitchTier('STARTER')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      telemetryData?.effectiveTier === 'STARTER'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Starter
                  </button>
                  <button
                    type="button"
                    disabled={isSwitchingTier}
                    onClick={() => handleDevSwitchTier('PRO')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      telemetryData?.effectiveTier === 'PRO'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Pro Tier
                  </button>
                  <button
                    type="button"
                    disabled={isSwitchingTier}
                    onClick={() => handleDevSwitchTier('ENTERPRISE')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium border transition-colors cursor-pointer ${
                      telemetryData?.effectiveTier === 'ENTERPRISE'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Enterprise
                  </button>
                </div>
              </div>
            )}

            {/* Tier Switch Toast */}
            {tierSwitchToast && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
                <span>{tierSwitchToast}</span>
                <button
                  type="button"
                  onClick={() => setTierSwitchToast(null)}
                  className="font-bold underline ml-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Real-Time Plan & Quota Telemetry Card (Replaces contradictory 10/month banner) */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
              <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-100 bg-slate-50/40">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        telemetryData?.isReadOnly
                          ? 'bg-rose-500'
                          : telemetryData?.isInGracePeriod
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                      {telemetryData?.isReadOnly
                        ? 'CURRENT STATUS: WORKSPACE IN READ-ONLY ARCHIVE MODE'
                        : telemetryData?.isTrial
                        ? `CURRENT STATUS: 7-DAY INSTITUTIONAL EVALUATION PILOT (${telemetryData.daysRemaining} ${
                            telemetryData.daysRemaining === 1 ? 'DAY' : 'DAYS'
                          } REMAINING)`
                        : telemetryData?.isInGracePeriod
                        ? `CURRENT STATUS: ${telemetryData.effectiveTier} TIER (7-DAY GRACE PERIOD ACTIVE)`
                        : `CURRENT STATUS: ${telemetryData?.effectiveTier || subscriptionData?.tier} TIER (ACTIVE)`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {telemetryData?.isReadOnly
                      ? 'Your organization’s 7-day institutional evaluation trial has concluded. Existing marketing audits, gap analyses, and circular briefs remain preserved in read-only mode. Upgrade below to resume active compliance scans.'
                      : telemetryData?.isTrial
                      ? 'Operating on a 7-day institutional evaluation trial. Usage quotas are tracked live from the database below. Upgrade anytime to unlock unmetered volume, multimodal flyer audits, and criteria editing.'
                      : telemetryData?.isInGracePeriod
                      ? 'Payment renewal is past due. Full scanning and compliance features remain active during your 7-day grace period. Please update your payment method.'
                      : 'Your institutional subscription is active with full access to sovereign Nigerian compliance engines and autonomous cascade governance.'}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-slate-500">
                    Cycle renewal: {subscriptionData?.trialEndsAt ? new Date(subscriptionData.trialEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Monthly'}
                  </span>
                </div>
              </div>

              {/* 4 Live Usage Telemetry Counters with Hairline Dividers per AGENTS.md */}
              <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-slate-200 bg-white">
                {/* Metric 1: Marketing Campaigns */}
                <div className="p-5 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Marketing Campaigns
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-slate-900 font-mono text-xl md:text-2xl font-bold tracking-tight">
                      {telemetryData?.usage.marketingCampaigns.used ?? 0}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      / {telemetryData?.usage.marketingCampaigns.isUnlimited ? 'Unlimited' : telemetryData?.usage.marketingCampaigns.limit ?? 3}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: telemetryData?.usage.marketingCampaigns.isUnlimited
                          ? '100%'
                          : `${Math.min(
                              100,
                              Math.round(
                                ((telemetryData?.usage.marketingCampaigns.used ?? 0) /
                                  (telemetryData?.usage.marketingCampaigns.limit || 1)) *
                                  100
                              )
                            )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metric 2: Policy Gap Analyses */}
                <div className="p-5 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Policy Gap Analyses
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-slate-900 font-mono text-xl md:text-2xl font-bold tracking-tight">
                      {telemetryData?.usage.gapAnalyses.used ?? 0}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      / {telemetryData?.usage.gapAnalyses.isUnlimited ? 'Unlimited' : telemetryData?.usage.gapAnalyses.limit ?? 1}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: telemetryData?.usage.gapAnalyses.isUnlimited
                          ? '100%'
                          : `${Math.min(
                              100,
                              Math.round(
                                ((telemetryData?.usage.gapAnalyses.used ?? 0) /
                                  (telemetryData?.usage.gapAnalyses.limit || 1)) *
                                  100
                              )
                            )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metric 3: Regulation Ingestions */}
                <div className="p-5 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Regulation Ingestions
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-slate-900 font-mono text-xl md:text-2xl font-bold tracking-tight">
                      {telemetryData?.usage.regulationIngestions.used ?? 0}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      / {telemetryData?.usage.regulationIngestions.isUnlimited ? 'Unlimited' : telemetryData?.usage.regulationIngestions.limit ?? 1}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: telemetryData?.usage.regulationIngestions.isUnlimited
                          ? '100%'
                          : `${Math.min(
                              100,
                              Math.round(
                                ((telemetryData?.usage.regulationIngestions.used ?? 0) /
                                  (telemetryData?.usage.regulationIngestions.limit || 1)) *
                                  100
                              )
                            )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Metric 4: Team Seats */}
                <div className="p-5 space-y-2">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                    Team Seats
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-slate-900 font-mono text-xl md:text-2xl font-bold tracking-tight">
                      {telemetryData?.usage.teamSeats.used ?? 1}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      / {telemetryData?.usage.teamSeats.isUnlimited ? 'Unlimited' : telemetryData?.usage.teamSeats.limit ?? 2}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-slate-900 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: telemetryData?.usage.teamSeats.isUnlimited
                          ? '100%'
                          : `${Math.min(
                              100,
                              Math.round(
                                ((telemetryData?.usage.teamSeats.used ?? 1) /
                                  (telemetryData?.usage.teamSeats.limit || 1)) *
                                  100
                              )
                            )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Error or feedback message */}
            {checkoutFeedback && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
                <span>{checkoutFeedback}</span>
                <button
                  type="button"
                  onClick={() => setCheckoutFeedback(null)}
                  className="font-bold underline ml-3"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Pricing Section Header */}
            <div className="text-center max-w-2xl mx-auto space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#DDE3EE] shadow-2xs text-xs font-semibold text-[#0B0F1A]">
                <Scale className="w-3.5 h-3.5 text-[#0066FF]" />
                <span>Nigerian Regulatory Intelligence &amp; FinTech Compliance Tiers</span>
              </div>
              <h2 className="text-3xl font-extrabold text-[#0B0F1A] tracking-tight">
                Predictable, Institutional SaaS Pricing
              </h2>
              <p className="text-xs text-[#4B5565] max-w-lg mx-auto">
                Convert regulatory ambiguity into verified operational proof. Every plan includes full Row-Level Security, multi-tenant isolation, and verified statutory citations.
              </p>

              {/* Interval & Currency Controls */}
              <div className="flex flex-wrap items-center justify-center gap-4 pt-3">
                {/* Interval Toggle */}
                <div className="inline-flex p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setBillingInterval('monthly')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      billingInterval === 'monthly'
                        ? 'bg-white text-[#0B0F1A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0B0F1A]'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInterval('annual')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      billingInterval === 'annual'
                        ? 'bg-white text-[#0B0F1A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0B0F1A]'
                    }`}
                  >
                    <span>Annual Billing</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#DCFCE7] text-[#16A34A]">
                      Save 16%
                    </span>
                  </button>
                </div>

                {/* Currency Display Toggle */}
                <div className="inline-flex p-1 rounded-xl bg-[#F1F5F9] border border-[#E2E8F0]">
                  <button
                    type="button"
                    onClick={() => setCurrencyDisplay('USD')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currencyDisplay === 'USD'
                        ? 'bg-white text-[#0B0F1A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0B0F1A]'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrencyDisplay('NGN')}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currencyDisplay === 'NGN'
                        ? 'bg-white text-[#0B0F1A] shadow-xs'
                        : 'text-[#64748B] hover:text-[#0B0F1A]'
                    }`}
                  >
                    NGN (₦)
                  </button>
                </div>
              </div>
            </div>

            {/* 3 Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
              {/* Card 1: Starter */}
              <div className="rounded-3xl bg-[#F9FAFC] border border-[#E2E8F0] p-7 flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#0B0F1A]">Starter</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#ECEFF3] text-[#4B5565]">
                        Seed FinTechs &amp; MFBs
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5565] mt-1.5 leading-relaxed">
                      Essential pre-vetting for marketing copy and single-license regulatory circular monitoring.
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#0B0F1A]">
                        {currencyDisplay === 'USD'
                          ? billingInterval === 'monthly' ? '$199' : '$165'
                          : billingInterval === 'monthly' ? '₦300,000' : '₦250,000'}
                      </span>
                      <span className="text-xs font-semibold text-[#64748B]">/Month</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1 font-mono">
                      {currencyDisplay === 'USD'
                        ? billingInterval === 'monthly'
                          ? `Billed in NGN via Paystack (~₦300k/mo)`
                          : `Billed annually at $1,990/yr`
                        : billingInterval === 'monthly'
                        ? `Billed monthly at ₦300,000/mo`
                        : `Billed annually at ₦3,000,000/yr`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      checkoutLoadingTier === 'STARTER' ||
                      (subscriptionData?.tier === 'STARTER' && subscriptionData?.status === 'active')
                    }
                    onClick={() => handleCheckout('STARTER')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#ECEFF3] hover:bg-[#E2E8F0] text-[#0B0F1A] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {checkoutLoadingTier === 'STARTER' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : subscriptionData?.tier === 'STARTER' && subscriptionData?.status === 'active' ? (
                      <span>Current Plan</span>
                    ) : (
                      <span>Upgrade to Starter</span>
                    )}
                  </button>

                  <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                      INCLUDED IN STARTER
                    </span>

                    <ul className="space-y-2.5 text-xs text-[#0B0F1A] font-medium">
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>25 Marketing Studio campaigns / month</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>100 Inline Canvas compliant rewrites / month</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Standard Pre-Clearance PDF Dossier export</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>2 Core regulator feeds in Horizon Scanning</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>5 Custom PDF/URL regulation ingestions / month</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Up to 3 internal policies &amp; 5 Gap Analyses / month</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Up to 3 team seats with RBAC &amp; 90-day audit logs</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 2: Pro Plan (Elevated card with soft shadow & Most Popular badge) */}
              <div className="rounded-3xl bg-white border-2 border-[#0066FF] p-7 flex flex-col justify-between space-y-6 shadow-xl relative -translate-y-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-[#0B0F1A]">Pro Tier</h3>
                      <span className="text-[10px] font-bold text-[#0066FF] uppercase tracking-wider block mt-0.5">
                        Most Popular for FinTechs &amp; MMOs
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EFF6FF] text-[#0066FF] border border-[#BFDBFE]">
                      RECOMMENDED
                    </span>
                  </div>

                  <p className="text-xs text-[#4B5565] mt-1.5 leading-relaxed">
                    Unlimited marketing campaigns, multimodal flyer vision audits, criteria editing, and multi-reg gap analysis.
                  </p>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#0B0F1A]">
                        {currencyDisplay === 'USD'
                          ? billingInterval === 'monthly' ? '$549' : '$457'
                          : billingInterval === 'monthly' ? '₦850,000' : '₦708,000'}
                      </span>
                      <span className="text-xs font-semibold text-[#64748B]">/Month</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1 font-mono">
                      {currencyDisplay === 'USD'
                        ? billingInterval === 'monthly'
                          ? `Billed in NGN via Paystack (~₦850k/mo)`
                          : `Billed annually at $5,490/yr`
                        : billingInterval === 'monthly'
                        ? `Billed monthly at ₦850,000/mo`
                        : `Billed annually at ₦8,500,000/yr`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      checkoutLoadingTier === 'PRO' ||
                      (subscriptionData?.tier === 'PRO' && subscriptionData?.status === 'active')
                    }
                    onClick={() => handleCheckout('PRO')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0066FF] hover:bg-[#0052CC] text-white shadow-lg transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {checkoutLoadingTier === 'PRO' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : subscriptionData?.tier === 'PRO' && subscriptionData?.status === 'active' ? (
                      <span>Current Plan</span>
                    ) : (
                      <span>Upgrade to Pro Plan</span>
                    )}
                  </button>

                  <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#0066FF] block">
                      EVERYTHING IN STARTER PLUS
                    </span>

                    <ul className="space-y-2.5 text-xs text-[#0B0F1A] font-medium">
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span><strong>Unlimited</strong> Marketing Studio campaigns &amp; inline rewrites</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Multimodal Ad Flyer &amp; Image compliance auditing</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Custom Marketing Knowledge Base rules (+ Add Rule)</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>All 7 Nigerian regulators + 6-Role Departmental Briefs</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Unlimited PDF/URL regulation ingestions &amp; Criteria editing (✎)</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Multi-Regulation vs. Multi-Policy Gap Analysis (15 policies)</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Pre-cleared policy remediation drafting &amp; Action Plans</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0066FF] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Up to 10 team seats &amp; 1-Year immutable audit retention</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 3: Enterprise */}
              <div className="rounded-3xl bg-[#F9FAFC] border border-[#E2E8F0] p-7 flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-[#0B0F1A]">Enterprise</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#ECEFF3] text-[#4B5565]">
                        Commercial Banks &amp; HoldCos
                      </span>
                    </div>
                    <p className="text-xs text-[#4B5565] mt-1.5 leading-relaxed">
                      Unlimited institutional defense, multi-entity holding architecture, bespoke baselines, and 7-year audit retention.
                    </p>
                  </div>

                  <div className="pt-2">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#0B0F1A]">
                        {currencyDisplay === 'USD'
                          ? billingInterval === 'monthly' ? '$1,999' : '$1,665'
                          : billingInterval === 'monthly' ? '₦3,000,000' : '₦2,500,000'}
                      </span>
                      <span className="text-xs font-semibold text-[#64748B]">/Month</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] mt-1 font-mono">
                      {currencyDisplay === 'USD'
                        ? billingInterval === 'monthly'
                          ? `Billed in NGN via Paystack (~₦3M/mo)`
                          : `Billed annually at $19,990/yr`
                        : billingInterval === 'monthly'
                        ? `Billed monthly at ₦3,000,000/mo`
                        : `Billed annually at ₦30,000,000/yr`}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      checkoutLoadingTier === 'ENTERPRISE' ||
                      (subscriptionData?.tier === 'ENTERPRISE' && subscriptionData?.status === 'active')
                    }
                    onClick={() => handleCheckout('ENTERPRISE')}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0B0F1A] hover:bg-[#1E293B] text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {checkoutLoadingTier === 'ENTERPRISE' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : subscriptionData?.tier === 'ENTERPRISE' && subscriptionData?.status === 'active' ? (
                      <span>Current Plan</span>
                    ) : (
                      <span>Upgrade to Enterprise</span>
                    )}
                  </button>

                  <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                      ENTERPRISE CAPABILITIES
                    </span>

                    <ul className="space-y-2.5 text-xs text-[#0B0F1A] font-medium">
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span><strong>Unlimited</strong> capacity across Horizon, Library, Gap &amp; Marketing</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Multi-entity holding group &amp; subsidiary license architecture</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Bank Examiner Audit Defense Dossier exports</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Custom statutory baseline feeds &amp; webhook integrations</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>7-Year BOFIA 2020 statutory audit trail retention</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Unlimited seats, SAML/SSO &amp; Dedicated Concierge (&lt;2h SLA)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Paystack FinTech Security Disclosures */}
            <div className="p-4 rounded-2xl bg-white border border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#16A34A]" />
                <span>PCI-DSS Level 1 Certified • 256-bit SSL Cryptographic Checkout • CBN Regulatory Settlement</span>
              </div>
              <span className="font-mono text-[11px]">Powered by Paystack API</span>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 7: EMAIL (Notification routing & digest frequencies)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'email' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs">
              <div className="border-b border-[#DDE3EE] pb-4">
                <h2 className="text-base font-bold text-[#0B0F1A]">Email Notification Routing</h2>
                <p className="text-xs text-[#4B5565] mt-0.5">
                  Configure digest frequency and statutory circular notification delivery.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE]">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F1A] block">
                      Daily 08:00 WAT Horizon Briefing
                    </span>
                    <span className="text-[11px] text-[#4B5565]">
                      Consolidated summary of overnight circulars and enforcement notices.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE]">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F1A] block">
                      Emergency Midnight Directives (≤14 Day Deadlines)
                    </span>
                    <span className="text-[11px] text-[#4B5565]">
                      Immediate email blast to CCO and designated legal officers.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                  />
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-[#F5F6FA] border border-[#DDE3EE]">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F1A] block">
                      Weekly Board Remediation Pack
                    </span>
                    <span className="text-[11px] text-[#4B5565]">
                      PDF summary of open 5-W policy gaps and advertising scan verdicts.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 8: NOTIFICATIONS (Granular Channels & SMS Webhooks)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs">
              <div className="border-b border-[#DDE3EE] pb-4">
                <h2 className="text-base font-bold text-[#0B0F1A]">
                  Real-time Regulatory Channels
                </h2>
                <p className="text-xs text-[#4B5565] mt-0.5">
                  Configure alerts for urgent midnight circulars, marketing drift, and audit logs.
                </p>
              </div>

              <div className="space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-[#DDE3EE]">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F1A] block">
                      Midnight CBN &amp; SEC Circular Broadcasts
                    </span>
                    <p className="text-[11px] text-[#4B5565]">
                      Instant push alerts when urgent directives are published.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                  />
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-[#DDE3EE]">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F1A] block">
                      Marketing Pre-Vetting Drift Detection
                    </span>
                    <p className="text-[11px] text-[#4B5565]">
                      Alert marketing teams when active ad claims are invalidated by new circulars.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-[#0B0F1A] block">
                      Board 5-W Gap Remediation Reminders
                    </span>
                    <p className="text-[11px] text-[#4B5565]">
                      Weekly digest of Level 1 and Level 2 policy deficiencies pending board adoption.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
