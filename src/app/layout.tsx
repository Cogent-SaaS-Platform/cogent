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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#090D16] text-slate-100`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );

  if (!isClerkConfigured) {
    return htmlContent;
  }

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: '#06b6d4', // cyan-500
          colorBackground: '#0b1120', // slate-950
          borderRadius: '0.75rem',
        },
      }}
    >
      {htmlContent}
    </ClerkProvider>
  );
}
