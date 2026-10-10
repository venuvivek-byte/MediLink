"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  FileText,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppMode } from "@/lib/config/schema";
import { startDemoSessionAction } from "../actions";
import { TrySampleButton } from "./TrySampleButton";

interface LandingContentProps {
  mode: AppMode;
  /** Shows "Try sample" (read-only bundled patient) when it has been generated. */
  sampleAvailable: boolean;
  notice?: string;
}

export function LandingContent({ mode, notice, sampleAvailable }: LandingContentProps) {
  const [isPending, startTransition] = useTransition();

  const handleGetStarted = () => {
    startTransition(async () => {
      if (mode === "demo") {
        await startDemoSessionAction();
      } else {
        await createClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      }
    });
  };

  return (
    <div className="bg-slate-50 text-slate-800">
      {notice && (
        <div className="max-w-3xl mx-auto px-6 pt-6">
          <p role="alert" className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium text-center">
            {notice}
          </p>
        </div>
      )}
      {/* ─── SECTION 1: ABOUT / THE PROBLEM ───────────────────────────────── */}
      <section id="about-section" className="scroll-mt-8 py-20 sm:py-28 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-vault-800 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100 inline-block">
            The Patient-Centric Health Vault
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-medium text-slate-900 tracking-tight leading-tight">
            Healthcare is fragmented.<br className="hidden sm:inline" />
            Your records shouldn&apos;t be.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal pt-2">
            Every time you visit a new doctor, diagnostic lab, or clinic, your medical story starts over.
            Prescriptions hide in messaging apps, lab PDFs get buried in emails, and discharge notes sit in paper folders.
            MediLink unifies all your documents into one reviewable, permanent health timeline owned completely by you.
          </p>
        </div>

        {/* The 3 Guiding Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-vault-800 flex items-center justify-center mb-5">
              <FileText className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Unified Medical Timeline</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Consolidate documents from every hospital, lab, and pharmacy into one organized chronological history.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-5">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">100% Patient Ownership</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Your health data is private. Share access on your own terms with 24h expiring links and revoke whenever you want.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-7 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-5">
              <AlertTriangle className="w-6 h-6" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Safety Double-Checks</h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Rule-based intelligence automatically highlights potential duplicate medications and repeat lab tests across prescribers.
            </p>
          </div>
        </div>
      </section>



      {/* ─── SECTION 3: HOW IT WORKS ──────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-slate-200/80 px-6 sm:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-16 space-y-2">
            <span className="text-xs font-semibold text-vault-800 uppercase tracking-wider">Simple Workflow</span>
            <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900">How MediLink Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
              <span className="text-4xl font-bold font-serif text-slate-300">01</span>
              <h3 className="text-lg font-semibold text-slate-900 mt-3">Upload your records</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Drag and drop any prescription PDF, lab report, or scan. We securely store files in your private encrypted vault.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
              <span className="text-4xl font-bold font-serif text-slate-300">02</span>
              <h3 className="text-lg font-semibold text-slate-900 mt-3">Confirm extractions</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Review medications and lab values side-by-side with original scans. Nothing enters your permanent timeline without your review.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-8 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all">
              <span className="text-4xl font-bold font-serif text-slate-300">03</span>
              <h3 className="text-lg font-semibold text-slate-900 mt-3">Share on your terms</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Generate PIN-protected links for doctors, carry your emergency QR card, and track who views your records in the audit log.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: CLINICAL TRANSPARENCY & DISCLAIMER ────────────────── */}
      <section className="py-20 bg-[#0a3528] text-white px-6 sm:px-12 border-y border-[#0e4837]">
        <div className="max-w-4xl mx-auto space-y-5 text-center">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium leading-snug">
            We organize records. We never replace your doctor.
          </h2>
          <p className="text-sm sm:text-base text-emerald-100/85 leading-relaxed max-w-2xl mx-auto font-normal">
            MediLink is strictly an organization and access tool. It does <strong>not</strong> diagnose, prescribe,
            interpret lab results, or provide automated clinical recommendations. All flagged duplicates and repeated
            tests are simple heuristic alerts for you to discuss with a licensed physician or pharmacist.
          </p>
        </div>
      </section>

      {/* ─── SECTION 5: CALL TO ACTION BANNER (NO LOGIN FORM) ─────────────── */}
      <section className="py-24 px-6 sm:px-12 max-w-3xl mx-auto text-center space-y-6">
        <h2 className="text-3xl sm:text-4xl font-serif font-medium text-slate-900">
          Ready to take control of your health records?
        </h2>
        <p className="text-slate-600 max-w-lg mx-auto text-sm sm:text-base">
          All your medical records in one secure place. Simple, private, and 100% patient-owned.
        </p>
        <div className="flex flex-wrap items-start justify-center gap-3 sm:gap-4">
          <button
            type="button"
            disabled={isPending}
            onClick={handleGetStarted}
            className="inline-flex items-center gap-3 px-9 py-4 bg-[#0a3528] hover:bg-[#06241b] text-white rounded-full font-medium text-base sm:text-lg transition-all duration-200 shadow-xl shadow-black/20 hover:shadow-2xl hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group"
          >
            {isPending ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Connecting with Google…</span>
              </>
            ) : (
              <>
                <span>Get started</span>
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </>
            )}
          </button>
          {sampleAvailable && <TrySampleButton className="bg-white border-slate-300 shadow-black/10" />}
        </div>
        {sampleAvailable && (
          <p className="text-xs text-slate-500">
            &ldquo;Try sample&rdquo; opens a read-only example patient. No sign-in, nothing is saved.
          </p>
        )}
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6 sm:px-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 group hover:opacity-85 transition-opacity">
            <div className="w-6 h-6 rounded-lg bg-vault-800 text-white flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="font-bold text-slate-800 text-sm">MediLink</span>
            <span>— Personal Health Records Vault</span>
          </Link>

          <div className="flex items-center gap-6">
            <a href="#about-section" className="hover:text-slate-800 transition-colors">About</a>
          </div>

          <p>© {new Date().getFullYear()} MediLink. Patient-controlled records.</p>
        </div>
      </footer>
    </div>
  );
}
