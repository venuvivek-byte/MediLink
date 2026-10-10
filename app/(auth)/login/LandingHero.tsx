"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ArrowDown, ArrowRight, Heart, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AppMode } from "@/lib/config/schema";
import { startDemoSessionAction } from "../actions";

interface LandingHeroProps {
  mode: AppMode;
}

export function LandingHero({ mode }: LandingHeroProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleGetStarted = () => {
    setError(null);
    startTransition(async () => {
      if (mode === "demo") {
        await startDemoSessionAction();
      } else {
        const { error: oauthError } = await createClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (oauthError) {
          setError("Could not start Google sign-in. Please try again.");
        }
      }
    });
  };

  const handleScrollToContent = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("about-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      aria-label="Welcome to MediLink"
      className="relative min-h-screen w-full flex flex-col justify-between overflow-hidden bg-[#e8f2ec]"
    >
      {/* High-Resolution Clean Background Photo */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-login.png"
          alt="MediLink — Your health. One secure place."
          fill
          priority
          sizes="100vw"
          className="object-cover object-[75%_center] sm:object-[68%_center] md:object-[60%_center] lg:object-center"
        />
        {/* Soft natural gradient on the left so typography always has optimal contrast with zero photo collision */}
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent sm:from-white/85 sm:via-white/35 sm:to-transparent lg:from-white/75 lg:via-white/20 lg:to-transparent" />
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 flex items-center justify-between px-6 sm:px-12 lg:px-16 py-6 sm:py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-vault-800 flex items-center justify-center text-white shadow-md shadow-emerald-950/20">
            <Heart className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[#063326] leading-tight block">
              MediLink
            </span>
          </div>
        </div>

        <nav className="flex items-center gap-4 sm:gap-7 text-sm font-semibold">
          <a
            href="#about-section"
            onClick={handleScrollToContent}
            className="text-[#0e3b2e] hover:text-vault-800 transition-colors hidden sm:inline-block"
          >
            About
          </a>
          <a
            href="#features-section"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-[#0e3b2e] hover:text-vault-800 transition-colors hidden sm:inline-block"
          >
            Features
          </a>
          <button
            type="button"
            disabled={isPending}
            onClick={handleGetStarted}
            className="px-5 py-2.5 rounded-full bg-white/90 hover:bg-white text-[#063326] text-xs sm:text-sm font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer backdrop-blur-xs border border-white/70"
          >
            {isPending ? "Connecting…" : mode === "demo" ? "Explore Demo" : "Sign In"}
          </button>
        </nav>
      </header>

      {/* Main Hero Content Area (Left-Aligned, exactly matching the original design) */}
      <div className="relative z-20 px-6 sm:px-12 lg:px-16 pb-12 sm:pb-16 max-w-2xl my-auto">
        <div className="space-y-4 sm:space-y-5">
          <h1 className="text-4xl sm:text-5xl lg:text-[56px] xl:text-[62px] font-bold tracking-tight text-[#063326] leading-[1.08]">
            Your health.<br />
            One secure place.
          </h1>

          <p className="text-base sm:text-lg text-[#1e3d34] max-w-md font-normal leading-relaxed">
            Every prescription, report, and medical visit. Organized, accessible, and always within reach.
          </p>

          {/* Single "Get started" button placed at left below */}
          <div className="pt-2 sm:pt-4">
            <button
              type="button"
              disabled={isPending}
              onClick={handleGetStarted}
              className="inline-flex items-center gap-3 px-8 sm:px-9 py-4 bg-[#0a3528] hover:bg-[#051f17] text-white rounded-full font-medium text-base sm:text-lg transition-all duration-200 shadow-xl shadow-emerald-950/20 hover:shadow-2xl hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed group"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Connecting with Google…</span>
                </>
              ) : (
                <>
                  <span>Get started</span>
                  <ArrowRight
                    className="w-5 h-5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </>
              )}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-destructive pt-2">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Scroll Indicator */}
      <div className="relative z-20 pb-5 text-center">
        <a
          href="#about-section"
          onClick={handleScrollToContent}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/75 hover:bg-white/95 backdrop-blur-md text-xs font-semibold text-[#063326] transition-all shadow-xs border border-white/80 group"
        >
          <span>Scroll down to explore</span>
          <ArrowDown className="w-3.5 h-3.5 animate-bounce group-hover:translate-y-0.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
