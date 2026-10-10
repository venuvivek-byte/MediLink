import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface HeroBannerProps {
  displayName?: string;
}

export function HeroBanner({ displayName }: HeroBannerProps) {
  return (
    <section
      aria-label="Welcome banner"
      className="rounded-3xl border border-slate-200/80 bg-white shadow-sm overflow-hidden relative"
      data-purpose="hero-nature-banner"
    >
      <div className="relative w-full min-h-[280px] sm:min-h-[300px] lg:min-h-[330px] flex items-center p-6 sm:p-10 lg:p-12">
        {/* Serene Watercolor Landscape Vector Background */}
        <div className="absolute inset-0 pointer-events-none z-0">
          <svg
            className="w-full h-full object-cover"
            fill="none"
            preserveAspectRatio="xMidYMid slice"
            viewBox="0 0 1200 400"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="skyGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#fdfbf7" />
                <stop offset="60%" stopColor="#eef6f3" />
                <stop offset="100%" stopColor="#d9ece5" />
              </linearGradient>
              <linearGradient id="mountainFar" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#bed8cf" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#9fc7ba" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="mountainMid" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#73a998" />
                <stop offset="100%" stopColor="#498674" />
              </linearGradient>
              <linearGradient id="lakeWater" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="#c1e3dc" />
                <stop offset="50%" stopColor="#a7d8cf" />
                <stop offset="100%" stopColor="#cbebe5" />
              </linearGradient>
              <linearGradient id="sunGlow" x1="0%" x2="0%" y1="0%" y2="100%">
                <stop offset="0%" stopColor="#fed7aa" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {/* Sky */}
            <rect fill="url(#skyGrad)" height="400" width="1200" />
            {/* Soft Morning Sun */}
            <circle cx="860" cy="110" fill="url(#sunGlow)" r="42" />
            <circle cx="860" cy="110" fill="#fde68a" fillOpacity="0.55" r="30" />
            {/* Far Mountains */}
            <path
              d="M480 250 C 620 160, 750 180, 920 220 L1200 240 L1200 400 L480 400 Z"
              fill="url(#mountainFar)"
            />
            {/* Middle Lake / Water Horizon */}
            <path
              d="M520 248 C 720 248, 980 242, 1200 250 L1200 320 L520 320 Z"
              fill="url(#lakeWater)"
              opacity="0.9"
            />
            {/* Mid Ridge Hills with Trees */}
            <path
              d="M680 400 L680 280 C 730 250, 820 220, 940 255 C 1020 220, 1120 230, 1200 210 L1200 400 Z"
              fill="url(#mountainMid)"
              opacity="0.95"
            />
            {/* Foreground Gentle Shoreline & Lush Foliage */}
            <path
              d="M540 400 C 620 360, 760 310, 950 330 C 1040 340, 1120 310, 1200 330 L1200 400 Z"
              fill="#3b7362"
            />
            <path
              d="M620 400 C 720 370, 840 345, 1020 360 C 1110 368, 1160 355, 1200 365 L1200 400 Z"
              fill="#2d5e4f"
            />
            {/* Stylized Tree Silhouettes */}
            <g fill="#245143" opacity="0.95">
              <path d="M1120 260 C1115 240, 1130 210, 1145 210 C1160 210, 1175 240, 1170 260 Z" />
              <path
                d="M1130 270 C1120 230, 1140 190, 1155 190 C1170 190, 1190 230,1180 270 Z"
                fill="#2e6453"
              />
              <path
                d="M1060 300 C1050 265, 1070 230, 1085 230 C1100 230, 1120 265, 1110 300 Z"
                fill="#37725f"
              />
              <path d="M1030 320 C1025 285, 1045 255, 1060 255 C1075 255, 1090 285, 1085 320 Z" />
              <circle cx="1180" cy="310" fill="#285a4a" r="45" />
              <circle cx="1150" cy="335" fill="#37725f" r="38" />
              <circle cx="1200" cy="360" fill="#20483b" r="50" />
            </g>
            {/* Subtle Lake Reflection Lines */}
            <line
              opacity="0.4"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeWidth="2"
              x1="720"
              x2="840"
              y1="265"
              y2="265"
            />
            <line
              opacity="0.3"
              stroke="#ffffff"
              strokeLinecap="round"
              strokeWidth="2"
              x1="780"
              x2="890"
              y1="275"
              y2="275"
            />
          </svg>
        </div>

        {/* Hero Content (Text & CTA) */}
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-serif font-medium text-slate-900 leading-[1.18] tracking-tight mb-3">
            A clearer picture of your health journey
          </h1>
          <p className="text-base text-slate-600 mb-6 sm:mb-8 font-normal max-w-md">
            {displayName ? `Welcome back, ${displayName}.` : "Welcome back."}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/documents"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-vault-800 hover:bg-vault-900 text-white rounded-full font-medium text-sm transition-all duration-200 shadow-md shadow-emerald-950/15 hover:shadow-lg active:scale-95 group"
            >
              <span>Upload your records</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
