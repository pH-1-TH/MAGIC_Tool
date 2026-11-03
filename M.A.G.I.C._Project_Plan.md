# Project Plan: M.A.G.I.C. Engineering Tools Suite

**Project Manager:** @boss
**Technical Lead:** @owl
**Development Team:** @code, @art, @ink, @bug
**Status:** Phase 2 (Expansion & Standardization)

---

## 1. Executive Summary
The M.A.G.I.C. (Mechanical And Guests In Ceilings) Engineering Tools suite is a multi-disciplinary web-based application designed for precision engineering calculations. The goal is to reach a "Professional Grade" status with 23 fully functional modules, robust reporting features, and localized compliance.

## 2. Current Module Status Audit
We currently have **18 modules** identified in the UI, with **10** having high-level functional logic and **8** existing as stubs/placeholders.

| ID | Module Name | Discipline | Status | Logic Standard |
|----|-------------|------------|--------|----------------|
| 1 | System Analyzer | Mechanical | Functional | Psychrometrics (Forward) |
| 2 | Room Load Analyzer | Mechanical | Functional | Psychrometrics (Reverse) |
| 3 | Multi-Stage Analyzer | Mechanical | Functional | Dynamic Process Modeling |
| 4 | Duct Sizer | Mechanical | Functional | Darcy-Weisbach / Haaland |
| 5 | Pipe Sizer | Mechanical | Functional | Darcy-Weisbach / Colebrook |
| 6 | Cooling Tower Make-up| Mechanical | Functional | CTI / Evaporation-Drift-Blowdown |
| 7 | Chiller ROI | Mechanical | Functional | LCCA / Financial |
| 8 | Fuel Tank | Mechanical | Stub | Generator Fuel Consumption |
| 9 | Electrical Load Est. | Electrical | Functional | kW/kVA Pivot Analysis |
| 10 | Wiring & Breaker | Electrical | Functional | EIT 2001-64 / IEC |
| 11 | Transformer Sizer | Electrical | Functional | MEA/PEA Transformer Specs |
| 12 | Motor Selector | Electrical | Stub | Induction Motor Sizing |
| 13 | Short Circuit | Electrical | Stub | Point-to-Point Analysis |
| 14 | Water Demand | Plumbing | Stub | Hunter’s Curve / WSFU |
| 15 | Storm Drainage | Plumbing | Stub | Rainfall Runoff (Rational Method) |
| 16 | Retention Pond | Plumbing | Stub | Differential Runoff Volume |
| 17 | Sprinkler Calculator | Fire Pro | Stub | NFPA 13 Hydraulic |
| 18 | Warehouse Sprinkler | Fire Pro | Stub | ESFR / CMSA Selection |

**Missing 5 Modules (Targeting 23):**
19. **Acoustic Analysis:** Room sound level attenuation and NC curves.
20. **Expansion Tank Sizing:** Thermal expansion calculations for hydronic loops.
21. **Air Terminal Selector:** Diffuser and grille throw/velocity calculations.
22. **Pump Head Calculator:** Systematic static + friction loss summation.
23. **Commissioning Checklist:** Professional verification steps for MEP systems.

---

## 3. Multi-Phase Roadmap

### Phase 1: Core Logic & Formula Verification (HVAC Focus)
*   **Verification:** @owl to verify Psychrometric logic against ASHRAE RP-1485.
*   **Expansion:** Implement **Fuel Tank** logic (Consumption vs. Autonomy hours).
*   **Standardization:** Ensure all Mechanical tools support SI/IP toggle with 100% consistency.
*   **QA:** @bug to check for divide-by-zero errors in flow estimators.

### Phase 2: Electrical & Plumbing Compliance Audit
*   **Logic:** Implement **Short Circuit** (Point-to-Point) and **Motor Starter** logic.
*   **Plumbing:** Develop **Water Demand** (Hunter's Curve) and **Storm Drainage** (EIT/IPC).
*   **Research:** @owl to define the 'Rainfall Intensity-Duration-Frequency (IDF)' standard for the Storm module.
*   **Integration:** Link Transformer Sizer results to Wiring & Breaker as a suggested source.

### Phase 3: Advanced UI/UX & Documentation
*   **Visualization:** Upgrade Psychrometric and Log-Log charts with interactive tooltips and point data overlays.
*   **Documentation:** Populating all 'i' icon modals with LaTeX formulas and standard citations.
*   **Visual Polish:** @art to refine dark mode contrast and ensure professional iconography for the new 5 modules.

### Phase 4: Export & Reporting Features
*   **Reporting:** Integrate **jsPDF** to generate "Certificate of Calculation" reports for each module.
*   **Excel:** Extend SheetJS integration to all sizers (Duct/Pipe/Wiring).
*   **Branding:** Add company logo and project header inputs (Project Name, Engineer, Date).

### Phase 5: Final QA & Knowledge Base Completion
*   **Stress Testing:** Full audit of the 23-module interactions.
*   **Knowledge Logging:** Final update to all `Knowledge_[name].md` files documenting the final mathematical models.
*   **Delivery:** Final code freeze and production deployment.

---

## 4. Specific Delegations to @owl (Researcher)
1.  **Acoustics:** Define the NC (Noise Criteria) calculation method for HVAC terminal units.
2.  **Expansion Tanks:** Provide the standard formula for ASME vs. Non-ASME thermal expansion vessels.
3.  **Storm Drainage:** Source Rainfall Intensity data (mm/hr) for tropical vs. temperate climates.
4.  **Short Circuit:** Verify the "M-factor" tables for Low Voltage point-to-point fault analysis.

---

**Next Step:** Proceed to **Phase 1: Implementation of Fuel Tank Logic and Psychrometric Audit.**

---

## 5. Phase 3: Modular Multi-File Architecture, SSOT Central Database & Master Report Suite (Completed 2026-11-04)

- **Clean Multi-Discipline Landing Page (`#mainMenuPage`)**:
  - Top Global Project & SSOT Control Bar (`#globalToolbar`) with Project Metadata, Global Unit Badge (`SI`/`IP`), Electrical Standard Badge (`EIT`/`IEC`), `⚙️ Global Settings`, `🔗 SSOT Data Hub`, `📂 Import`, `💾 Export Project`, and `📑 Master Report`.
  - Discipline Filter Tabs (`All (20)`, `Mechanical & HVAC (8)`, `Electrical (6)`, `Plumbing & Sanitary (3)`, `Fire Protection (3)`) + Instant Search Bar (`#landingSearchInput`).
  - Live SSOT Output Badges (`#landing_badge_<moduleId>`) on all 20 module cards.
- **Modular File Structure (`css/` & `js/`)**:
  - `css/magic-theme.css` — Centralized theme tokens, dark/light styling, and `@media print` rules.
  - `js/core/magic-db.js` — Central Single Source of Truth (SSOT) Engineering Database (`window.MagicDB`).
  - `js/core/magic-store.js` — Cross-Module Reactive State Store & 1-click SSOT Sync Definitions (`window.MagicStore`).
  - `js/core/magic-settings.js` — Global Settings & Per-Module Local Override Manager (`window.MagicSettings`).
  - `js/core/magic-ui.js` — View Switcher, Engineering Reference Modal (`showInfo`), Theme & Sound Controller.
  - `js/core/magic-charts.js` — Unified Interactive High-DPI Canvas Chart Engine.
  - `js/core/magic-registry.js` — Plug-in Module Registry & Automatic Module Toolbar / Local Settings Injector (`window.MagicRegistry`).
  - `js/core/magic-io.js` — Project `.magic.json` Import/Export, Individual Module Separation Report, and Multi-Discipline Master Report Builder (`window.MagicIO`).
  - `js/core/magic-init.js` — Application Bootstrap & Lifecycle Controller.
  - `js/modules/mechanical/psychro-analyzers.js` — System Analyzer, Room Load Analyzer, Multi-Stage Analyzer.
  - `js/modules/mechanical/duct-pipe-sizers.js` — Duct Sizer & Hydraulic Pipe Sizer.
  - `js/modules/mechanical/plant-tools.js` — Cooling Tower Make-up, Chiller ROI, Generator Fuel Tank Sizer.
  - `js/modules/electrical/load-transformer.js` — Electrical Load Estimator & Transformer Sizer.
  - `js/modules/electrical/wiring-motor-sc.js` — Wiring & Breaker Sizer, Motor Selector, Short Circuit, Starter Simulator.
  - `js/modules/plumbing/plumbing-tools.js` — Water Demand & Tank Sizer, Storm Drainage, Retention Pond.
  - `js/modules/fire/fire-tools.js` — Sprinkler Hydraulic Calculator, Warehouse ESFR, Fire Water Consumption.
