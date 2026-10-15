import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cogent | Enterprise RegTech & Compliance Cockpit",
  description: "AI-powered regulatory intelligence and compliance governance platform for Nigerian financial institutions.",
  icons: {
    icon: [
      { url: '/icon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icon.png' },
    ],
    shortcut: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isClerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  const htmlContent = (
    <html
      lang="en"
      className="h-full antialiased bg-[#F5F6FA] text-[#0B0F1A]"
    >
      <body className="min-h-full flex flex-col bg-[#F5F6FA] text-[#0B0F1A] font-sans">{children}</body>
    </html>
  );

  if (!isClerkConfigured) {
    return htmlContent;
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#2A4BFF',
          colorPrimaryForeground: '#FFFFFF',
          colorBackground: '#FFFFFF',
          colorForeground: '#0B0F1A',
          colorMutedForeground: '#4B5565',
          colorMuted: '#F5F6FA',
          colorDanger: '#EF4444',
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          borderRadius: '0.75rem',
        },
      }}
    >
      {htmlContent}
    </ClerkProvider>
  );
}
