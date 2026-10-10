export function WellnessAffirmationCard() {
  return (
    <section
      className="bg-gradient-to-b from-[#eaf4f0] to-[#f4f9f6] border border-emerald-100 rounded-2xl p-6 text-center flex flex-col items-center justify-center shadow-sm"
      data-purpose="wellness-affirmation-card"
      aria-label="Daily wellness reflection"
    >
      {/* Plant Leaf Vector Art */}
      <div className="w-20 h-20 mb-3 flex items-center justify-center relative">
        <svg
          className="w-16 h-16"
          fill="none"
          viewBox="0 0 80 80"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Gentle Soil Mound */}
          <ellipse cx="40" cy="68" fill="#b9ded4" opacity="0.6" rx="28" ry="7" />
          {/* Stem */}
          <path d="M40 68 V32" stroke="#256e58" strokeLinecap="round" strokeWidth="3" />
          {/* Bottom Left Leaf */}
          <path
            d="M39 52 C26 50 20 38 24 32 C32 30 38 42 39 52 Z"
            fill="#32886f"
            opacity="0.9"
          />
          {/* Bottom Right Leaf */}
          <path
            d="M41 46 C54 44 60 32 56 26 C48 24 42 36 41 46 Z"
            fill="#449e83"
          />
          {/* Top Center Leaf */}
          <path
            d="M40 33 C33 22 36 12 40 10 C44 12 47 22 40 33 Z"
            fill="#206954"
          />
          {/* Inner Veins */}
          <path
            d="M40 30 C39 24 40 15 40 10"
            opacity="0.5"
            stroke="#bcf0df"
            strokeLinecap="round"
            strokeWidth="1.2"
          />
        </svg>
      </div>
      <h4 className="text-base font-serif font-medium text-slate-900 leading-snug">
        Small steps make<br />a healthier tomorrow
      </h4>
      <p className="text-xs text-slate-500 mt-2">
        Keep your records up to date.
      </p>
    </section>
  );
}
