'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingState, OnboardingStepInfo } from '../types';
import { Step1InstitutionDetails } from './Step1InstitutionDetails';
import { Step2RoleAndMandate } from './Step2RoleAndMandate';
import { Step3RegulatoryScope } from './Step3RegulatoryScope';
import { Step4PaymentRailsScope } from './Step4PaymentRailsScope';
import { Step5InviteTeam } from './Step5InviteTeam';
import { RotateCcw, X, Check, Shield } from 'lucide-react';

const STEPS: OnboardingStepInfo[] = [
  {
    step: 1,
    title: 'Company details',
    subtitle: 'Basic information about your organization',
  },
  {
    step: 2,
    title: 'Your role',
    subtitle: 'How you\'ll manage the workspace',
  },
  {
    step: 3,
    title: 'Workspace preferences',
    subtitle: 'Regulatory scope and institutional licenses',
  },
  {
    step: 4,
    title: 'Team structure',
    subtitle: 'Payment rails and operational scope',
  },
  {
    step: 5,
    title: 'Invite team members',
    subtitle: 'Bring others into the workspace',
  },
];

const INITIAL_STATE: OnboardingState = {
  companyName: '',
  companySize: '11-50',
  rcNumber: '',
  companyWebsite: '',
  industryCategory: 'Technology',
  department: 'COMPLIANCE_LEGAL',
  customDepartment: '',
  jobTitle: '',
  complianceObjectives: ['PRE_VET_MARKETING', 'MONITOR_CIRCULARS', 'GAP_MATRIX', 'AUDIT_DEFENSE'],
  primaryRegulators: ['CBN', 'ARCON', 'FCCPC'],
  licenseType: 'PAYMENT_SOLUTION_SERVICES_PSSP',
  licenseNumber: '',
  operatingEnvironment: 'LIVE_PRODUCTION',
  paymentRails: ['NIBSS_NIP', 'PAYSTACK', 'INTERSWITCH_WEBPAY'],
  productCategories: ['DIGITAL_NANO_LOAN', 'SAVINGS_DEPOSIT'],
  invitedMembers: [
    {
      id: 'member_1',
      email: '',
      role: 'ADMIN',
      department: 'COMPLIANCE_LEGAL',
    },
  ],
};

export function OnboardingWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateState = (updates: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const handleRestart = () => {
    if (confirm('Are you sure you want to restart onboarding? Form inputs will be reset.')) {
      setState(INITIAL_STATE);
      setCurrentStep(1);
    }
  };

  const handleLeave = () => {
    if (confirm('Leave setup? You can return to onboarding at any time.')) {
      router.push('/overview');
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || 'Failed to complete workspace onboarding');
      }

      router.push('/overview');
    } catch (err: any) {
      console.error('Onboarding failed:', err);
      alert(err?.message || 'Onboarding failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6FA] text-[#0B0F1A] flex flex-col justify-between font-sans selection:bg-[#2A4BFF] selection:text-white">
      {/* Top Navigation Bar matching onb.webp */}
      <header className="bg-white border-b border-[#DDE3EE] px-8 py-4.5 flex items-center justify-between shadow-2xs">
        {/* Left: Brand Monogram + Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2A4BFF] text-white flex items-center justify-center font-black text-sm tracking-tight shadow-xs">
              <Shield className="w-4 h-4 fill-white" />
            </div>
            <span className="font-extrabold text-base tracking-tight text-[#0B0F1A]">
              Cogent
            </span>
          </div>

          <div className="h-4 w-px bg-[#DDE3EE]" />

          <span className="text-xs font-semibold text-[#4B5565]">
            Create workspace
          </span>
        </div>

        {/* Right: Restart & Leave Buttons */}
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleRestart}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4B5565] hover:text-[#0B0F1A] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </button>
          <button
            type="button"
            onClick={handleLeave}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#4B5565] hover:text-[#0B0F1A] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main Content Card Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 flex items-center justify-center">
        <div className="bg-white border border-[#DDE3EE] rounded-3xl shadow-xl w-full overflow-hidden flex flex-col md:flex-row min-h-[640px]">
          {/* Left Stepper Column matching onb.webp */}
          <div className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-[#DDE3EE] p-8 lg:p-10 bg-[#FAFAFC] flex flex-col justify-between">
            <div className="space-y-8">
              {STEPS.map((s, idx) => {
                const isActive = currentStep === s.step;
                const isCompleted = currentStep > s.step;
                const isLast = idx === STEPS.length - 1;

                return (
                  <div key={s.step} className="relative flex items-start gap-4 group">
                    {/* Vertical Connecting Line */}
                    {!isLast && (
                      <div
                        className={`absolute left-3.5 top-8 bottom-0 w-px -mb-8 transition-colors ${
                          isCompleted ? 'bg-[#059669]' : 'bg-[#DDE3EE]'
                        }`}
                      />
                    )}

                    {/* Step Number Circle */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isCompleted) setCurrentStep(s.step);
                      }}
                      disabled={!isCompleted && !isActive}
                      className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                        isActive
                          ? 'bg-[#0B0F1A] text-white shadow-xs'
                          : isCompleted
                          ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                          : 'border border-[#DDE3EE] bg-white text-[#94A3B8]'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <span>{s.step}</span>
                      )}
                    </button>

                    {/* Step Text */}
                    <div className="flex-1 pt-0.5">
                      <span
                        className={`text-xs block font-bold transition-colors ${
                          isActive
                            ? 'text-[#0B0F1A]'
                            : isCompleted
                            ? 'text-[#0B0F1A]'
                            : 'text-[#94A3B8]'
                        }`}
                      >
                        {s.title}
                      </span>
                      <span className="text-[11px] text-[#4B5565] line-clamp-1 block mt-0.5 leading-normal">
                        {s.subtitle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stepper Footer Note */}
            <div className="pt-6 border-t border-[#DDE3EE] mt-8">
              <span className="text-[11px] text-[#4B5565] block font-mono">
                Step {currentStep} of 5 &bull; {Math.round((currentStep / 5) * 100)}% Complete
              </span>
              <div className="w-full bg-[#E8EDF5] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#2A4BFF] h-full rounded-full transition-all duration-300"
                  style={{ width: `${(currentStep / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Form Body Column matching onb.webp */}
          <div className="flex-1 p-8 lg:p-12 flex flex-col justify-center bg-white">
            <div className="max-w-xl w-full mx-auto">
              {currentStep === 1 && (
                <Step1InstitutionDetails
                  state={state}
                  onChange={updateState}
                  onNext={() => setCurrentStep(2)}
                />
              )}

              {currentStep === 2 && (
                <Step2RoleAndMandate
                  state={state}
                  onChange={updateState}
                  onNext={() => setCurrentStep(3)}
                  onBack={() => setCurrentStep(1)}
                />
              )}

              {currentStep === 3 && (
                <Step3RegulatoryScope
                  state={state}
                  onChange={updateState}
                  onNext={() => setCurrentStep(4)}
                  onBack={() => setCurrentStep(2)}
                />
              )}

              {currentStep === 4 && (
                <Step4PaymentRailsScope
                  state={state}
                  onChange={updateState}
                  onNext={() => setCurrentStep(5)}
                  onBack={() => setCurrentStep(3)}
                />
              )}

              {currentStep === 5 && (
                <Step5InviteTeam
                  state={state}
                  onChange={updateState}
                  onFinish={handleFinish}
                  onBack={() => setCurrentStep(4)}
                  isSubmitting={isSubmitting}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Global Bottom Footer matching onb.webp */}
      <footer className="max-w-6xl w-full mx-auto px-8 py-5 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#4B5565] border-t border-[#DDE3EE]/60 gap-3">
        <div className="flex items-center gap-6 font-medium">
          <a href="#" className="hover:text-[#0B0F1A] transition-colors">Help Center</a>
          <a href="#" className="hover:text-[#0B0F1A] transition-colors">System Status</a>
          <a href="#" className="hover:text-[#0B0F1A] transition-colors">Community</a>
          <a href="#" className="hover:text-[#0B0F1A] transition-colors">Contact Support</a>
        </div>
        <div>
          <span>&copy; Cogent 2026 &bull; Sovereign Regulatory Intelligence Architecture</span>
        </div>
      </footer>
    </div>
  );
}
