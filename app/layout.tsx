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
    default: "MyHealthVault",
    template: "%s | MyHealthVault",
  },
  description:
    "Patient-controlled medical records: organise documents, medications and lab results, and share them securely with clinicians.",
  // Private health application: never index any page.
  robots: { index: false, follow: false },
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
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to
          <body> before hydration. This ignores only <body>'s own attributes;
          everything inside it is still checked. */}
      <body className="min-h-full flex flex-col bg-background text-foreground" suppressHydrationWarning>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-3 focus:py-2 focus:rounded-md focus:bg-primary focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
