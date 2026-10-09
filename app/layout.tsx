import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lost in Transit — Your Health, Your Control",
    template: "%s | Lost in Transit",
  },
  description:
    "Patient-controlled health record platform. Upload medical documents, track medications, view lab trends, and share records securely with clinicians.",
  keywords: [
    "health records",
    "medical documents",
    "patient portal",
    "medication tracking",
    "lab results",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background">
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
