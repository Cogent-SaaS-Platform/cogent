import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cogent | Enterprise RegTech & Compliance Cockpit",
  description: "AI-powered regulatory intelligence and compliance governance platform for Nigerian financial institutions.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#F5F6FA] text-[#0B0F1A]`}
    >
      <body className="min-h-full flex flex-col bg-[#F5F6FA] text-[#0B0F1A]">{children}</body>
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
