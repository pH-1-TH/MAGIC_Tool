# HVAC ProTools - Engineering Technical Reference

## #Ref_Standard (Regulatory & Industry Compliance)
- **HVAC:** ASHRAE Fundamentals 2021 (Psychrometrics & Load Analysis).
- **Electrical:** EIT Standard 2001-64 (Thailand), IEC 60364 (Wiring & Protection).
- **Plumbing:** AWA Hunter's Curve (Water Demand), EIT Thailand (Drainage & Storm).
- **Fire Protection:** NFPA 13 (Sprinkler Selection), NFPA 20 (Fire Pumps).

## #Ref_Formula (Engineering Equations)
- **Psychrometrics:** Magnus-Tetens Approximation for Saturation Vapor Pressure.
- **Hydraulics:** Darcy-Weisbach Equation for Pipe Friction ($\Delta P/L = f \cdot \frac{\rho V^2}{2 D}$) with Laminar ($f = 64/\text{Re}$ for $\text{Re} \le 2000$), smoothstep Transitional ($2000 < \text{Re} < 4000$), and Haaland Turbulent ($\text{Re} \ge 4000$) friction factor regimes, plus Crane TP-410 $K$-factor minor losses ($\Delta P_{\text{fittings}} = \sum K \cdot \frac{\rho V^2}{2}$, $L_{\text{eq}} = \frac{K \cdot D}{f}$).
- **Storm Runoff:** Rational Method ($Q = CiA / 3.6$) for localized Thailand drainage.
- **Electrical:** $I = P / (\sqrt{3} \cdot V \cdot PF)$ for 3-Phase calculation.
- **Fire Flow:** $Q = K \cdot \sqrt{P}$ for sprinkler head discharge.

## #Ref_Table (Lookup Coefficients)
- **Rainfall:** Thailand Provincial Intensity Coefficients (77 Provinces).
- **Cables:** EIT Copper Ampacity Tables (Conduit vs. Air).
- **Raceways:** EIT 40% Conduit Fill Ratios.
- **Hazard:** NFPA 13 Area/Density Selection Points.

---

## Project Activity Log
| Date | Time | Distributor | Doer | Authorized/Reviewer | Action | Note/Remarks |
|------|------|-------------|------|---------------------|--------|--------------|
| 2026-04-26 | 12:15 | Peep | Gemini CLI | User | Project Initialization | Started HVAC Useful Tools website project. |
| 2026-04-26 | 21:30 | Peep | Gemini CLI | User | Folder Reorganization | Migrated to modular agent/project architecture. |
- **Fire Water Reserve (NFPA 13/14/20/22):** $Q_{\text{total}} = Q_{\text{sprinkler}} \cdot (1 + m_{\text{hyd}}) + Q_{\text{hose}} + Q_{\text{standpipe}}$; $V_{\text{tank}} = Q_{\text{total}} \cdot t_{\text{duration}} \cdot (1 + m_{\text{dead}})$.
| 2026-11-03 | 22:58 | Antigravity | Antigravity | User | Added Fire Water Consumption Page | Implemented `fireWaterPage` and `calcFireWater()` per NFPA 13 Table 19.3.3.1.2, NFPA 14, NFPA 20, and NFPA 22. |

| 2026-11-03 | 23:48 | Antigravity | Antigravity | User | Motor Step Catalog, SI Raceways & EIT/IEC Derating | Added standard IEC 60034-1 / EIT motor step catalog (`0.37–400 kW` / `0.5–550 HP`), SI `mm` / `mm²` raceway sizing (IMC, Wireway, Cable Tray), and verified EIT 2001-64 (Ref 40°C) & IEC 60364-5-52 (Ref 30°C) derating coefficients ($C_a$, $C_g$) and conductor sizes up to `500 mm²` with auto-parallel runs. |
| 2026-11-04 | 00:15 | Antigravity | Antigravity | User | Phase 3 Multi-File Architecture, SSOT Database, Global/Local Settings & Master Report Engine | Restructured monolithic `index.html` (11,582 lines → 6,174 lines) into external stylesheet `css/magic-theme.css`, 8 core architectural engines (`js/core/magic-db.js`, `magic-store.js`, `magic-settings.js`, `magic-ui.js`, `magic-charts.js`, `magic-registry.js`, `magic-io.js`, `magic-init.js`), and 7 discipline calculation files (`js/modules/mechanical/*`, `electrical/*`, `plumbing/*`, `fire/*`). Added Multi-Discipline Landing Page filter/search, SSOT Data Hub, Global & Local Settings overrides, `.magic.json` project Import/Export, Separation Report, and Master Report Builder. |
| 2026-11-10 | 21:15 | Antigravity | Antigravity | User | Multi-Fluid Hydraulic Pipe Sizer, Manual Commercial DN Selector & Fittings System Loss Calculator | Upgraded `#pipeSizerPage` and `duct-pipe-sizers.js` with manual commercial pipe size selection (`AUTO` or `DN15–DN600` via dropdown or 1-click comparison table), 13 working fluids (`PIPE_FLUID_CATALOG`: Water 10/20/60°C, PG25, EG30, Diesel No. 2, Biodiesel B5/B20, ISO VG 32/46 Oils, Thermal Oil, Custom $\rho,\mu,c_p$), Laminar/Transitional/Haaland `calcDarcyFrictionFactor()`, and an interactive Pipe Fittings, Valves & Overall System Friction Loss panel (`PIPE_FITTING_CATALOG`, $K$-factor, $L_{\text{eq}}$, equipment $\Delta P$, safety margin, and hydraulic/pump shaft power). |
