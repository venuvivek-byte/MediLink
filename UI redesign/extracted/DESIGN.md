---
name: Clinical Vault & Health Registry
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3e4944'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6e7a74'
  outline-variant: '#bdc9c2'
  surface-tint: '#006c53'
  primary: '#005f49'
  on-primary: '#ffffff'
  primary-container: '#0d7a5f'
  on-primary-container: '#a8ffdf'
  inverse-primary: '#7cd8b8'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#005886'
  on-tertiary: '#ffffff'
  tertiary-container: '#0071ac'
  on-tertiary-container: '#e1efff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#98f4d3'
  primary-fixed-dim: '#7cd8b8'
  on-primary-fixed: '#002117'
  on-primary-fixed-variant: '#00513e'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#cce5ff'
  tertiary-fixed-dim: '#93ccff'
  on-tertiary-fixed: '#001d31'
  on-tertiary-fixed-variant: '#004b73'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 2.25rem
    fontWeight: '700'
    lineHeight: 2.75rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: 2.25rem
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.625rem
    letterSpacing: -0.01em
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.0625rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.005em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: 1.5rem
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: 1.25rem
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.03em
  metric-display:
    fontFamily: Plus Jakarta Sans
    fontSize: 1.875rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a clinical-grade, patient-empowered medical vault experience. The aesthetic balances institutional rigor with serene, domestic clarity. Because users interact with sensitive diagnostic records, medication histories, and clinical summaries under varying states of cognitive load or stress, the interface projects absolute privacy, calm authority, and precision.

The design movement combines **Minimalism** with subtle **Tonal Layering** and fine **Ghost Contours**. Rather than loud gradients or heavy drop shadows, the system establishes structure through crisp borders, generous breathing room, structured metadata grids, and high-legibility typographic hierarchies. Contrast ratios strictly target WCAG AAA conformance (7:1+ for core text, 4.5:1+ for graphical icons and critical data boundaries), ensuring total reliability in diverse lighting environments such as hospital bedsides or outdoor clinics.

## Colors

The palette grounds the interface in deep naval slates while offering soothing clinical emerald and teal for positive confirmation and primary interactions.

- **Primary (`#0D7A5F`)**: A deep clinical emerald. Formulated to provide effortless 7:1+ AAA contrast on pure white and off-white tinted surfaces for buttons, primary navigational markers, and validated medical statuses.
- **Secondary (`#1E293B`)**: Deepest slate/navy. Used for key headlines, essential quantitative readouts (lab metrics, dosage numbers), and primary framing borders.
- **Tertiary (`#0284C7`)**: Precision clinical cyan/sky. Reserved for lab test biomarkers, trend indicators, and auxiliary medical context tags.
- **Neutral (`#64748B`)**: Balanced cool slate. Dictates secondary copy, metadata captions, inactive icons, and structural divider outlines.
- **Alert States**:
  - **Clinical Warning / Reconciliation**: Amber foundation (`#B45309`) with delicate warm background (`#FFFBEB`) and border (`#FDE68A`) for flag notices such as duplicate medications and missing dosages.
  - **Critical Alert / Contraindication**: Deep rose (`#BE123C`) on light crimson (`#FFF1F2`) for severe allergies and urgent clinical flags.
  - **Background Surfaces**: Soft slate canvas (`#F8FAFC`) with pure clinical white containers (`#FFFFFF`) and hairline slate borders (`#E2E8F0`).

## Typography

The design system relies on **Plus Jakarta Sans** across all roles. It offers crisp optical geometric construction balanced with open apertures, ensuring maximum legibility across complex medical terminology, numerical dosages, and dense clinical timelines.

- **Headlines & Titles**: Rendered in 600 or 700 weights with tight tracking (`-0.01em` to `-0.02em`) to ground patient identification headers and section modules with authority.
- **Body Text**: Tuned to open leading (1.5x) to maintain effortless scannability across clinical notes, pharmacy directions, and doctor comments.
- **Labels & Micro-indicators**: Micro-labels use medium or semibold weights with slight positive letter spacing (`0.01em` to `0.03em`) to retain character recognition at small scales (11px–12px) without degrading accessibility.
- **Numerical Metrics**: Dedicated `metric-display` styles ensure lab numbers, vital values, and record counters are instantly recognizable.

## Layout & Spacing

The structural framework is built on an adaptable **12-column fluid grid** nested inside an anchored shell:
- **Navigation Shell**: A fixed 260px vertical drawer on desktop containing primary vault categories, user credentials, and emergency shortcuts; transforms into a fixed bottom navigation or collapsible sheet below 1024px.
- **Canvas Division**: Desktop layouts allocate an 8-column main timeline/clinical summary column paired with a 4-column quick-action and vitals side panel.
- **Rhythm**: Multiples of 4px and 8px govern internal component architecture. Card padding relies on `space-lg` (24px) for desktop and `space-md` (16px) for mobile cards.
- **Adaptive Breakpoints**:
  - `Mobile` (< 768px): Single-column reflow, margin `1rem`, horizontal metric scrollers.
  - `Tablet` (768px - 1023px): 6-column adaptive layout, paired 2-up metrics cards, margin `1.5rem`.
  - `Desktop` (≥ 1024px): 12-column layout, fixed navigation spine, margin `2rem`.

## Elevation & Depth

To preserve clinical hygiene and prevent visual distraction, depth is conveyed primarily through **tonal separation** and **delicate hairline borders** rather than thick drop shadows.

- **Canvas Base**: The global workspace uses `#F8FAFC`, establishing contrast behind interactive cards.
- **Level 1 (Cards & Data Tiles)**: `#FFFFFF` surface accompanied by a 1px border of `#E2E8F0` and an ultra-diffused, ambient drop shadow (`box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`).
- **Level 2 (Active States & Popovers)**: `#FFFFFF` surface with an elevated ambient shadow (`box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.04)`) and a subtle `#CBD5E1` border.
- **Level 3 (Modal Sheets & Secure PIN Overlays)**: `#FFFFFF` floating over a high-attenuation backdrop overlay (`rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`).
- **Warning & Callout Panels**: Inset containment with 1px border (`#FDE68A`) and tinted background (`#FFFBEB`) with zero shadow to maintain direct documentary context.

## Shapes

The design system adopts **Level 2 (Rounded)** curvature. This offers approachable human warmth while retaining an organized, systematic posture appropriate for medical records.

- **Standard Elements (Input fields, buttons, list rows)**: `0.5rem` (8px).
- **Cards and Data Vault Modules**: `rounded-lg` at `1rem` (16px) for comfortable containment of dense clinical records.
- **Outer Shell Cards & Large Overlays**: `rounded-xl` at `1.5rem` (24px).
- **Badges, Circular Icon Wells & Status Pills**: Full roundedness (`9999px`) to immediately distinguish contextual tags, record statuses, and icon backgrounds from structural content blocks.

## Components

### Buttons
- **Primary Action (Upload Document, Save Changes)**: Background `#0D7A5F`, text `#FFFFFF`, border none, height 44px, padding `0 1.25rem`, radius 8px (`rounded`). Hover: `#0A634D`. Focus: visible 2px offset ring in `#0D7A5F`.
- **Secondary Action (Share, Export)**: Background `#FFFFFF`, text `#1E293B`, 1px border `#CBD5E1`. Hover: `#F1F5F9`.
- **Emergency / Destructive Button**: Background `#FFF1F2`, text `#BE123C`, 1px border `#FECDD3`. Hover: `#FFE4E6`.

### Cards & Summary Modules
- Built on white backgrounds with 16px corner radiuses and 1px `#E2E8F0` framing.
- Metric cards incorporate a circular icon well (40x40px, background `#E6F4F0`, icon `#0D7A5F`) pinned to the upper right corner, with the numerical data point displayed in `metric-display` scale.

### Chips & Status Badges
- **Patient-Reviewed / Verified**: Full pill radius, padding `0.25rem 0.625rem`. Background `#ECFDF5`, text `#065F46`, 1px border `#A7F3D0`, accompanied by a 12px checkmark or shield icon.
- **Pending Review**: Background `#FFFBEB`, text `#92400E`, 1px border `#FDE68A`.
- **Category Badge (Prescription, Lab Report, Diagnostics)**: Background `#F1F5F9`, text `#475569`, 1px border `#E2E8F0`.

### Form Fields & Inputs
- Height 44px, background `#FFFFFF`, border 1px `#CBD5E1`, border-radius 8px.
- Typographic placeholder `#94A3B8`.
- Focus state: Border color `#0D7A5F` with a soft outer glow ring (`box-shadow: 0 0 0 3px rgba(13, 122, 95, 0.15)`).

### Medical Checkboxes & Toggle Radios
- Checkbox dimensions 20x20px with 4px border-radius. Border 1.5px `#94A3B8`. Checked state fills `#0D7A5F` with a white check glyph.
- Radio buttons: 20x20px round, inner indicator dot centered at 8px diameter in `#0D7A5F`.

### Timelines & Record Rows
- List items feature hover feedback with smooth background transitions to `#F8FAFC`.
- Left-aligned icon anchors (document, flask, prescription) housed in 36x36px soft tinted containers, with clear hierarchical division between the clinical record title (`title-md`) and provider/facility metadata (`body-sm`).