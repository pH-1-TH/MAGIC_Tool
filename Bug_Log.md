# Audit Report - HVAC ProTools Suite

## 1. Navigation & Page IDs
- **Status**: Passed (mostly)
- **Details**: All 19 navigation buttons in the Main Menu correctly target existing IDs using the switchView engine. No broken links detected.
- **Missing Apps**: The project logs mention 23 apps, but only 19 are present in the UI.

## 2. Functional Audit
- **Status**: Partially Failed
- **Placeholders**: 11 out of 19 modules are currenty placeholders (Mechanical: 5, Electrical: 2, Plumbing: 2, Fire: 2). They lack input fields and logic.
- **Broken Info Modal**: 
    - The showInfo('fuel') call in the Fuel Tank Calculator fails because the 'fuel' data object is missing in the JavaScript.
    - Information for 'duct' and 'fire' exists in the code but no buttons are provided on their respective pages to access them.
- **Dark Mode Persistence**: The theme choice is saved to localStorage but is NOT retrieved on page load. The site always defaults to light mode on refresh.

## 3. Syntax & Library Integrity
- **Status**: Passed
- **Tailwind**: Correcty included via Play CDN.
- **SheetJS**: Correcty included; Excel export for Load Schedule is functional.
- **JavaScript**: No syntax errors found in the merged script. window.onload correctly hooks into all available calculation modules.

## 4. Recommendations for @code
- Implement the missing logic for the 11 placeholder modules.
- Add the 'fuel' data to the showInfo engine.
- Add info buttons to the Duct Sizer and Fire Pump pages.
- Add an initialization script to check localStorage for the 'theme' key and apply the 'dark' class if necessary.

---

# Post-Audit Final Fixes (2026-04-26)

| Date | Agent | Bug Description | Status | Fix Details |
|------|-------|-----------------|--------|-------------|
| 2026-04-26 | bug | Structural corruption and duplicated sections | Fixed | Performed full file restoration, removed redundant HTML, and unified navigation engine. |
| 2026-04-26 | bug | Sub-apps not working (IDs missing) | Fixed | Re-inserted all missing HTML page containers and initialized calculation logic. |
| 2026-04-26 | bug | Fuel Tank Calculator broken (placeholder only) | Fixed | Implemented full UI and updateFuel() logic. |
| 2026-04-26 | bug | Info Modal and showInfo() missing | Fixed | Restored modal HTML and JavaScript reference engine. |
| 2026-04-26 | bug | App views 'staging' (multiple visible at once) | Fixed | Refactored switchView to handle all 20+ unique module IDs. |
| 2026-04-26 | bug | Dark Mode Persistence failing | Fixed | Added theme check to window.onload to retrieve choice from localStorage. |
| 2026-11-03 | Antigravity | Default theme starting in Light Mode instead of Dark Mode | Fixed | Set `<html class="dark">` by default, added pre-render `localStorage` theme script, and synced toggle icons on load. |
| 2026-11-03 | Antigravity | NFPA 13 Area/Density Graph drawing vertical lines instead of sloped curves | Fixed | Rebuilt `drawNfpaChart()` per NFPA 13 Fig. 19.3.3.1.1 with sloped curves, dual SI/IP axes, minor/major gridlines, interactive point picking, and high-DPI canvas scaling. |
| 2026-11-03 | Antigravity | 9 modules missing Main Menu button & inconsistent navigation/headers | Fixed | Standardized top navigation bar across all 20 modules with prominent Main Menu button, Discipline Badge, Breadcrumb, Quick Tool Switcher dropdown, header methodology badges, and Hunter's Curve / Storm / Pond / Starter charts & tables. |
| 2026-11-03 | Antigravity | COC Impact Summary curve (`#ctChart`) jagged, stretched, and lacking hover data | Fixed | Rebuilt `drawCtChart()` with 220-point continuous hyperbolic curve interpolation, high-DPI responsive scaling, gradient fill, theoretical minimum asymptote, clickable/hoverable table rows, and interactive hover crosshairs + floating data tooltip (also added hover tooltips to ROI, WSFU, NFPA 13, and Fire Water charts). |
| 2026-11-03 | Antigravity | Psychrometric charts static (no point dragging or hover parameter readout) | Fixed | Upgraded `drawChart()` with high-DPI rendering, real-time point drag-and-drop across System Analyzer (`#psyChart`), Room Load Analyzer (`#load_psyChart`), and Multi-Stage Analyzer (`#ms_psyChart`), Wet Bulb (`Twb`) solver, and live hover crosshairs + 8-parameter floating tooltip. |
| 2026-11-03 | Antigravity | Pipe & Duct Log-Log Nomograms showing `Re=2300` step kink, non-standard `DN19` label, and missing reference diameter curves | Fixed | Removed artificial laminar-turbulent step discontinuity in `calcFlowProps()` / `solveFluidDiameter()`, added full family of standard commercial pipe (`DN15–DN600`) and spiral duct (`Ø80–Ø1600 mm`) curves, plotted both Exact and Standard Commercial operating points + Max Velocity limit line, and added drag-and-drop + hover parameter tooltips in `drawLogLogNomogram()`. |
| 2026-11-03 | Antigravity | Wiring & Breaker Sizer (`#wiringPage`): missing SI (`mm`/`mm²`) raceway values (`#wire_res_imc_mm`, `#wire_res_ww_mm` stuck at `--`), double-derating of EIT 40°C ampacity tables with IEC 30°C $C_a$ factors, missing XLPE 1.5–10 mm² & >120 mm² ampacities, and missing Motor Step Catalog selector | Fixed | Added 28-step IEC/EIT Motor Step Catalog (`0.37–400 kW` / `0.5–550 HP`) across Wiring, Motor Sizer, and Starter Simulator; populated SI `mm`, `mm × mm`, `mm²` area, and % fill for IMC Conduit, Wireway, and Cable Tray; separated EIT 2001-64 (Ref 40°C, Table 5-43) and IEC 60364-5-52 (Ref 30°C, Table B.52.14) $C_a$ and $C_g$ (Group 2 vs Group 5) derating tables; expanded copper ampacity table up to `500 mm²` with automatic parallel runs. |

| 2026-11-04 | Antigravity | Monolithic 11,582-line `index.html`, code redundancy across 20 modules, lack of cross-module SSOT parameter sharing, missing `showInfo` modal engine, and `i_dol` reference bug in `calcStarter()` comparison table | Fixed | Split CSS & JS into 16 modular files (`css/magic-theme.css`, `js/core/*`, `js/modules/*`), implemented `MagicDB` + `MagicStore` SSOT reactive bus, `MagicRegistry` plug-in toolbar injector, `MagicSettings` Global/Local override engine, `MagicIO` `.magic.json` Import/Export + Separation/Master Report generator, and fixed `i_dol` → `istart_dol_line` in `calcStarter()`. |
| 2026-11-04 | Antigravity | `magic-registry.js` line 279 `renderStdHoverIcon()` reading `kb.std` and `kb.equations` instead of `MagicDB.knowledgeBase` keys `kb.standard` and `kb.formulas` (causing governing equations to not appear in hover cards), invalid `<div>` inside `<button>` DOM nesting on landing cards, card hover z-index clipping, and static non-discipline-aware Local Settings bar | Fixed | Fixed `renderStdHoverIcon()` to read `kb.standard || kb.std` and `kb.formulas || kb.equations` with HTML escaping, replaced inner `<div>` elements with `<span class="block ...">`, added `relative hover:z-30` to landing cards, and upgraded Local Settings (`buildDisciplineLocalControls()`) into a discipline-aware floating popover + 4-Tab Global Settings modal. |
| 2026-11-04 | Antigravity | Global Settings Page (`#globalSettingsPage`): Section 3 Climate values (`OA DB`, `OA WB`, `Elevation`) not updating when selecting a province, only 8 fallback provinces showing instead of all 77 provinces, and Section 4 Per-Module Override Matrix displaying `undefined` for module names | Fixed | Expanded `MagicDB.thailandProvinces` (all 77 provinces) with ASHRAE/TMD `oaDbC`, `oaWbC`, and `elevationM` data; fixed `populateGlobalLocationOptions()` to read `MagicDB.thailandProvinces`; added `onGlobalProvinceChange(this.value)` to auto-populate `gs_oaDbC`, `gs_oaWbC`, `gs_elevationM`, and `#gsp_prov_idf_badge`; and fixed `renderOverridesMatrix()` to read `mod.title || mod.name`. |
