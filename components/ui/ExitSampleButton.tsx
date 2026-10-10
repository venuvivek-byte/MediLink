"use client";

import { useSignOut } from "@/components/layout/ShellContext";

/** Ends the read-only sample session and returns to the landing page. */
export function ExitSampleButton() {
  const signOut = useSignOut();
  return (
    <button type="button" onClick={signOut} className="font-semibold underline underline-offset-2 cursor-pointer">
      Exit sample
    </button>
  );
}
