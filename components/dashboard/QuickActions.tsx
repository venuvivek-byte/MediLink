import Link from "next/link";
import { Clock, Share2, ShieldAlert, Upload } from "lucide-react";

export function QuickActions() {
  return (
    <section
      aria-label="Quick actions"
      className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-3"
      data-purpose="quick-actions-panel"
    >
      <h3 className="text-sm font-semibold text-slate-900 mb-2">Quick actions</h3>

      {/* Action 1: Upload Record (Primary Highlight) */}
      <Link
        href="/documents"
        className="block w-full text-left p-3.5 rounded-xl bg-vault-800 hover:bg-vault-900 text-white transition-all shadow-sm group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
            <Upload className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight">Upload record</div>
            <div className="text-[11px] text-emerald-200 mt-0.5">Prescription, lab PDF, or scan</div>
          </div>
        </div>
      </Link>

      {/* Action 2: Share with a Clinician */}
      <Link
        href="/share"
        className="block w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40 text-slate-800 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight text-slate-900">Share with a clinician</div>
            <div className="text-[11px] text-slate-500 mt-0.5">PIN-protected, 24h expiring link</div>
          </div>
        </div>
      </Link>

      {/* Action 3: Emergency Card */}
      <Link
        href="/emergency"
        className="block w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50/40 text-slate-800 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight text-slate-900">Emergency card</div>
            <div className="text-[11px] text-slate-500 mt-0.5">QR access for paramedics & EMT</div>
          </div>
        </div>
      </Link>

      {/* Action 4: Full timeline */}
      <Link
        href="/timeline"
        className="block w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 text-slate-800 transition-all group"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" aria-hidden="true" />
          </div>
          <div>
            <div className="font-semibold text-sm leading-tight text-slate-900">Full timeline</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Filter by date and provider</div>
          </div>
        </div>
      </Link>
    </section>
  );
}
