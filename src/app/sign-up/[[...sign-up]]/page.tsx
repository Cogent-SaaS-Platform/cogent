import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#090D16] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header / Brand */}
      <div className="mb-8 text-center relative z-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <span className="font-bold text-white text-base">C</span>
          </div>
          <span className="font-extrabold text-2xl tracking-wider text-white">
            COGENT
          </span>
        </div>
        <p className="text-xs uppercase tracking-widest text-cyan-400 font-semibold mb-1">
          Regulatory Intelligence & Compliance OS
        </p>
        <p className="text-sm text-slate-400">
          Register your financial institution or fintech organization
        </p>
      </div>

      {/* Clerk SignUp Component */}
      <div className="relative z-10">
        <SignUp
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-slate-900/90 border border-slate-800 backdrop-blur-xl shadow-2xl rounded-2xl',
              headerTitle: 'text-slate-100',
              headerSubtitle: 'text-slate-400',
              formButtonPrimary:
                'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 transition-all',
              formFieldInput:
                'bg-slate-950 border-slate-800 text-slate-100 focus:border-cyan-500 focus:ring-cyan-500/20',
              formFieldLabel: 'text-slate-300',
              footerActionLink: 'text-cyan-400 hover:text-cyan-300 font-medium',
              dividerLine: 'bg-slate-800',
              dividerText: 'text-slate-500',
              socialButtonsBlockButton:
                'border-slate-800 hover:bg-slate-800/80 text-slate-200 transition-all',
            },
          }}
        />
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500 relative z-10">
        <span>Protected by Row-Level Security & NDPA 2023 Compliant Enclaves</span>
      </div>
    </div>
  );
}
