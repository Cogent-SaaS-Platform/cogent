'use client';

import React, { useState } from 'react';
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
  Sparkles,
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
  const [activeTab, setActiveTab] = useState<SettingsTab>('billings');

  // Personal User Details State (My Details)
  const [userFirstName, setUserFirstName] = useState('Folake');
  const [userLastName, setUserLastName] = useState('Adeyemi');
  const [userEmail, setUserEmail] = useState('f.adeyemi@apexfintech.ng');
  const [userRole, setUserRole] = useState('Chief Compliance Officer (CCO)');
  const [userTimezone, setUserTimezone] = useState('Africa/Lagos (WAT, UTC+1)');
  const [personalDetailsSaved, setPersonalDetailsSaved] = useState(false);

  // Institution Profile State (RC Number is strictly OPTIONAL per requirements)
  const [institutionName, setInstitutionName] = useState('Apex FinTech Nigeria Limited');
  const [rcNumber, setRcNumber] = useState('');
  const [institutionSize, setInstitutionSize] = useState('51-200');
  const [primaryDomain, setPrimaryDomain] = useState('apexfintech.ng');
  const [selectedRegulators, setSelectedRegulators] = useState<string[]>([
    'CBN',
    'NDPC',
    'ARCON',
    'FCCPC',
  ]);
  const [licenseType, setLicenseType] = useState('PAYMENT_SOLUTION_SERVICES_PSSP');
  const [licenseNumber, setLicenseNumber] = useState('CBN/PSSP/LIC/2026/014');
  const [registeredAddress, setRegisteredAddress] = useState(
    'Plot 14 Admiralty Way, Lekki Phase 1, Lagos, Nigeria'
  );
  const [profileSaved, setProfileSaved] = useState(false);

  // Password / Security State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);

  // Billing Form State matching settingg.webp
  const [cardholderName, setCardholderName] = useState('Mayad Ahmed');
  const [cardExpiry, setCardExpiry] = useState('02 / 2028');
  const [cardNumber, setCardNumber] = useState('8269 9620 9292 2538');
  const [cardCvv, setCardCvv] = useState('••••');
  const [invoiceEmailType, setInvoiceEmailType] = useState<'existing' | 'custom'>('existing');
  const [customInvoiceEmail, setCustomInvoiceEmail] = useState('');
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>(['INV-2026-003']);

  // Team RBAC State with "OTHER" custom role/department write-in
  const [teamMembers, setTeamMembers] = useState([
    {
      id: '1',
      name: 'Folake Adeyemi, Esq.',
      email: 'f.adeyemi@apexfintech.ng',
      role: 'OWNER',
      department: 'COMPLIANCE_LEGAL',
      status: 'Active',
    },
    {
      id: '2',
      name: 'Ibrahim Danladi',
      email: 'i.danladi@apexfintech.ng',
      role: 'ADMIN',
      department: 'OPERATIONS',
      status: 'Active',
    },
    {
      id: '3',
      name: 'Chinedu Okeke',
      email: 'c.okeke@apexfintech.ng',
      role: 'MEMBER',
      department: 'ENGINEERING_TECH',
      status: 'Active',
    },
    {
      id: '4',
      name: 'Ngozi Eze',
      email: 'n.eze@apexfintech.ng',
      role: 'OTHER',
      department: 'Internal Supervisory Sandbox',
      status: 'Active',
    },
  ]);

  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('MEMBER');
  const [newMemberDept, setNewMemberDept] = useState('COMPLIANCE_LEGAL');
  const [customDeptInput, setCustomDeptInput] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleSavePersonal = (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalDetailsSaved(true);
    setTimeout(() => setPersonalDetailsSaved(false), 3000);
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
                    <span className="text-[10px] font-semibold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
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
                    placeholder="e.g. apexfintech.ng"
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
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
                    <Laptop className="w-5 h-5 text-[#2A4BFF]" />
                    <div>
                      <span className="text-xs font-bold text-[#0B0F1A] block">
                        Windows 11 · Chrome (Lagos, Nigeria)
                      </span>
                      <span className="text-[10px] text-[#8D99AE]">
                        Current session · IP: 102.89.44.12
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-[#059669]">Active Now</span>
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
                      placeholder="analyst@apexfintech.ng"
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
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EEF2FF] text-[#2A4BFF] border border-[#C7D2FE]">
                          {member.role}
                        </span>
                      </td>
                      <td className="p-3.5 font-medium text-[#0B0F1A]">
                        {member.department.replace(/_/g, ' ')}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
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
            {/* Prominent Pending Phase 2 Billing Implementation Notice */}
            <div className="p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-4 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#92400E] uppercase tracking-wide">
                    Waiting for Billing to be Implemented
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                    PHASE 2 ROADMAP
                  </span>
                </div>
                <p className="text-xs text-[#78350F] leading-relaxed">
                  Feature gating and automated payment gateways (Paystack / Flutterwave / Stripe)
                  have not been activated yet. All enterprise regulatory intelligence features
                  (Pillars 1–6) remain unlocked and unrestricted for institutional testing. This notice
                  ensures billing implementation will be executed when payment gateway phase begins.
                </p>
              </div>
            </div>

            {/* Payment Method Section matching settingg.webp */}
            <div className="space-y-1">
              <h2 className="text-base font-bold text-[#0B0F1A]">Payment Method</h2>
              <p className="text-xs text-[#4B5565]">
                Update your billing details and address.
              </p>
            </div>

            {/* Card Details Grid matching settingg.webp */}
            <div className="bg-white border border-[#DDE3EE] rounded-2xl p-7 space-y-6 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-xs font-bold text-[#0B0F1A]">Card Details</h3>
                  <p className="text-[11px] text-[#4B5565] mt-0.5">
                    Update your billing details and address.
                  </p>
                  <button
                    type="button"
                    className="mt-4 flex items-center gap-1.5 text-xs font-bold text-[#4B5565] hover:text-[#0B0F1A] bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add another card</span>
                  </button>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#4B5565] mb-1.5">
                      Name on your Card
                    </label>
                    <input
                      type="text"
                      value={cardholderName}
                      onChange={(e) => setCardholderName(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#DDE3EE] rounded-xl text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] shadow-2xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5565] mb-1.5">
                      Expiry
                    </label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#DDE3EE] rounded-xl text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] shadow-2xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-[#4B5565] mb-1.5">
                      Card Number
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 flex items-center gap-1">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#EB001B] opacity-90" />
                        <div className="w-3.5 h-3.5 rounded-full bg-[#F79E1B] -ml-2 opacity-90" />
                      </div>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2 bg-white border border-[#DDE3EE] rounded-xl text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] shadow-2xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#4B5565] mb-1.5">
                      CVV
                    </label>
                    <input
                      type="password"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-3.5 py-2 bg-white border border-[#DDE3EE] rounded-xl text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF] shadow-2xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Email Subsection matching settingg.webp */}
              <div className="pt-6 border-t border-[#DDE3EE] flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="w-full md:w-1/3">
                  <h3 className="text-xs font-bold text-[#0B0F1A]">Contact email</h3>
                  <p className="text-[11px] text-[#4B5565] mt-0.5">
                    Where should invoices be sent?
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
                        Send to the existing email
                      </span>
                      <span className="text-[11px] text-[#4B5565] font-mono">
                        mayadahmed@ofspace.co
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
                        Add another email address
                      </span>
                      {invoiceEmailType === 'custom' && (
                        <input
                          type="email"
                          value={customInvoiceEmail}
                          onChange={(e) => setCustomInvoiceEmail(e.target.value)}
                          placeholder="billing-alerts@apexfintech.ng"
                          className="mt-2 w-full max-w-sm px-3.5 py-1.5 bg-white border border-[#DDE3EE] rounded-lg text-xs text-[#0B0F1A] focus:outline-none focus:border-[#2A4BFF]"
                        />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Billing History Section matching settingg.webp */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[#0B0F1A]">Billing History</h2>
                  <p className="text-xs text-[#4B5565]">
                    See the transaction you made
                  </p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 text-xs font-bold text-[#4B5565] hover:text-[#0B0F1A] bg-white border border-[#DDE3EE] hover:bg-[#F9FAFC] px-3.5 py-1.5 rounded-xl transition-all shadow-2xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download VAT Invoices</span>
                </button>
              </div>

              {/* Table matching settingg.webp */}
              <div className="bg-white border border-[#DDE3EE] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F9FAFC] text-[#4B5565] border-b border-[#DDE3EE] font-semibold">
                      <th className="p-3.5 w-12 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.length === 3}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInvoices([
                                'INV-2026-004',
                                'INV-2026-003',
                                'INV-2026-002',
                              ]);
                            } else {
                              setSelectedInvoices([]);
                            }
                          }}
                          className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                        />
                      </th>
                      <th className="p-3.5">Invoice</th>
                      <th className="p-3.5">Date</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Tracking &amp; Address</th>
                      <th className="p-3.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8EDF5]">
                    <tr className="hover:bg-[#F9FAFC] transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes('INV-2026-004')}
                          onChange={() => toggleInvoiceSelection('INV-2026-004')}
                          className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                        />
                      </td>
                      <td className="p-3.5 font-semibold text-[#0B0F1A]">Account Sale</td>
                      <td className="p-3.5 text-[#4B5565]">Apr 14, 2004</td>
                      <td className="p-3.5 font-bold font-mono text-[#0B0F1A]">$3,050</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                          Pending
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[#2A4BFF] font-semibold block text-[11px]">
                          LM580405575CN
                        </span>
                        <span className="text-[10px] text-[#4B5565]">313 Main Road, Sunderland</span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          className="p-1 text-[#94A3B8] hover:text-[#0B0F1A] cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#F9FAFC] transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes('INV-2026-003')}
                          onChange={() => toggleInvoiceSelection('INV-2026-003')}
                          className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                        />
                      </td>
                      <td className="p-3.5 font-semibold text-[#0B0F1A]">Account Sale</td>
                      <td className="p-3.5 text-[#4B5565]">Jun 24, 2008</td>
                      <td className="p-3.5 font-bold font-mono text-[#0B0F1A]">$1,050</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          Cancelled
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[#2A4BFF] font-semibold block text-[11px]">
                          AZ938540353US
                        </span>
                        <span className="text-[10px] text-[#4B5565]">
                          96 Grange Road, Peterborough
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          className="p-1 text-[#94A3B8] hover:text-[#0B0F1A] cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    <tr className="hover:bg-[#F9FAFC] transition-colors">
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.includes('INV-2026-002')}
                          onChange={() => toggleInvoiceSelection('INV-2026-002')}
                          className="rounded text-[#2A4BFF] focus:ring-[#2A4BFF]"
                        />
                      </td>
                      <td className="p-3.5 font-semibold text-[#0B0F1A]">Netflix Subscription</td>
                      <td className="p-3.5 text-[#4B5565]">Feb 28, 2004</td>
                      <td className="p-3.5 font-bold font-mono text-[#0B0F1A]">$800</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                          Refund
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="font-mono text-[#2A4BFF] font-semibold block text-[11px]">
                          3S331605504US
                        </span>
                        <span className="text-[10px] text-[#4B5565]">
                          2 New Street, Harrogate
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          type="button"
                          className="p-1 text-[#94A3B8] hover:text-[#0B0F1A] cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────────────────
            TAB 6: PLAN (Faithful reproduction of ui_ref/pricing.jpg + Phase 2 Message)
            ─────────────────────────────────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Prominent Pending Phase 2 Billing Implementation Notice */}
            <div className="p-5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex items-start gap-4 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#92400E] uppercase tracking-wide">
                    Waiting for Billing to be Implemented
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
                    PHASE 2 ROADMAP
                  </span>
                </div>
                <p className="text-xs text-[#78350F] leading-relaxed">
                  Notice: Subscription feature gating and automated billing have not been implemented yet.
                  All enterprise compliance modules, statutory analyzers, and board dossier tools are currently
                  unrestricted for institutional testing. This placeholder acts as a direct reference so you can
                  seamlessly hook up your Stripe/Paystack billing webhooks when ready.
                </p>
              </div>
            </div>

            {/* Pricing Section matching pricing.jpg */}
            <div className="text-center max-w-xl mx-auto space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#DDE3EE] shadow-2xs text-xs font-semibold text-[#0B0F1A]">
                <span>⚡</span>
                <span>Our Pricing Plan</span>
              </div>
              <h2 className="text-3xl font-extrabold text-[#0B0F1A] tracking-tight">
                Get started for free
              </h2>
              <p className="text-xs text-[#4B5565]">
                Unlock instant, world-class regulatory intelligence and compliance governance.
              </p>
            </div>

            {/* 3 Pricing Cards Grid matching pricing.jpg */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch pt-2">
              {/* Card 1: Starter */}
              <div className="rounded-3xl bg-[#F9FAFC] border border-[#E2E8F0] p-7 flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#0B0F1A]">Starter</h3>
                    <p className="text-xs text-[#4B5565] mt-1.5 leading-relaxed">
                      Your writing partner. Unlock instant, world-class Voice to Text with a simple
                      monthly free.
                    </p>
                  </div>

                  <div className="pt-2">
                    <span className="text-2xl font-black text-[#0B0F1A]">Free Plan</span>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#ECEFF3] hover:bg-[#E2E8F0] text-[#0B0F1A] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Laptop className="w-3.5 h-3.5" />
                    <span>Download for Windows</span>
                  </button>

                  <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                      GET STARTED WITH
                    </span>

                    <ul className="space-y-2.5 text-xs text-[#0B0F1A] font-medium">
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>1,000 free words</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Speak ai Engine</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>5 Custom Dictionary values</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>10 Language translations</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Content optimization tools</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 2: Pro Plan (Elevated white card with soft shadow matching pricing.jpg) */}
              <div className="rounded-3xl bg-white border border-[#DDE3EE] p-7 flex flex-col justify-between space-y-6 shadow-xl relative -translate-y-1">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#0B0F1A]">Pro Plan</h3>
                    <p className="text-xs text-[#4B5565] mt-1.5 leading-relaxed">
                      Your writing partner. Unlock instant, world-class Voice to Text with a simple
                      monthly fee.
                    </p>
                  </div>

                  <div className="pt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#0B0F1A]">$8.00</span>
                    <span className="text-xs font-semibold text-[#64748B]">/Month</span>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#0B0F1A] hover:bg-[#1E293B] text-white shadow-lg transition-all cursor-pointer"
                  >
                    Go Pro Plan
                  </button>

                  <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                      EVERYTHING IN STARTER
                    </span>

                    <ul className="space-y-2.5 text-xs text-[#0B0F1A] font-medium">
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Unlimited words</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Speak ai Engine</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Avalon model</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>800 Custom Dictionary values</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Tune with Custom Instructions</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Real-time language translation</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Card 3: Team Plan */}
              <div className="rounded-3xl bg-[#F9FAFC] border border-[#E2E8F0] p-7 flex flex-col justify-between space-y-6 shadow-xs">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-[#0B0F1A]">Team Plan</h3>
                    <p className="text-xs text-[#4B5565] mt-1.5 leading-relaxed">
                      Your team writing partner. Unlock instant, world-class Voice to Text with a simple
                      monthly fee.
                    </p>
                  </div>

                  <div className="pt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-black text-[#0B0F1A]">$12.00</span>
                    <span className="text-xs font-semibold text-[#64748B]">/Month</span>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-[#ECEFF3] hover:bg-[#E2E8F0] text-[#0B0F1A] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#64748B] block">
                      EVERYTHING IN PRO
                    </span>

                    <ul className="space-y-2.5 text-xs text-[#0B0F1A] font-medium">
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Avalon model</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Centralized team billing</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Team wide settings</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Enforce privacy mode org-wide</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Real-time Feedback System</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="w-4 h-4 rounded-full bg-[#0B0F1A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>Advanced Analytics Tools</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
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
