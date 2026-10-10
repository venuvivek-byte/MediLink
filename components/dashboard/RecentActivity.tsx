import Link from "next/link";
import { ArrowUpRight, FileText, FlaskConical, Pill } from "lucide-react";
import type { TimelineEvent } from "@/lib/data/types";
import { formatDate } from "@/lib/format";

export function RecentActivity({ events }: { events: TimelineEvent[] }) {
  return (
    <section
      aria-label="Recent activity"
      className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between h-full"
      data-purpose="recent-records-timeline"
    >
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
            <p className="text-xs text-slate-400">Latest entries synchronized in your timeline</p>
          </div>
          <Link
            href="/timeline"
            className="text-xs font-semibold text-vault-800 hover:text-vault-900 inline-flex items-center gap-1 group"
          >
            View all <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nothing here yet. Upload a document to start your timeline.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 mt-2">
            {events.map((evt) => {
              const Icon =
                evt.eventType === "lab"
                  ? FlaskConical
                  : evt.eventType === "medication"
                  ? Pill
                  : FileText;

              const isReviewed = evt.reviewStatus === "patient_reviewed";

              return (
                <div
                  key={evt.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-slate-50/80 px-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {evt.title}
                      </div>
                      {evt.summary && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {evt.summary}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1 shrink-0 pl-12 sm:pl-0">
                    <div className="text-xs font-medium text-slate-500">
                      {formatDate(evt.eventDate)}
                    </div>
                    {isReviewed ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Patient-reviewed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Needs review
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 mt-4">
        <span>Showing recent {events.length} records</span>
        <Link href="/documents" className="text-slate-600 hover:text-vault-800 font-medium">
          View all records
        </Link>
      </div>
    </section>
  );
}
