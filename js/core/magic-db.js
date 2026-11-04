// ============================================================================
// M.A.G.I.C. Single Source of Truth (SSOT) Central Engineering Database
// File: js/core/magic-db.js
// ============================================================================

const Patm = 101.325; // Standard Atmospheric Pressure (kPa)

// 1. Thailand 77 Provinces Climate & IDF Database + Localization Helpers
// ASHRAE / TMD (Thai Meteorological Department) 0.4% Summer Cooling Design DB (°C), Coincident WB (°C), Elevation (m), and Base Rainfall Intensity (mm/h)
const thailandProvinces = [
    { name: "Bangkok", intensity: 120, C: 0.95, oaDbC: 35.5, oaWbC: 28.0, elevationM: 4 },
    { name: "Samut Prakan", intensity: 120, C: 0.95, oaDbC: 35.0, oaWbC: 28.2, elevationM: 3 },
    { name: "Nonthaburi", intensity: 120, C: 0.95, oaDbC: 35.8, oaWbC: 28.0, elevationM: 5 },
    { name: "Pathum Thani", intensity: 120, C: 0.95, oaDbC: 36.0, oaWbC: 27.8, elevationM: 6 },
    { name: "Ayutthaya", intensity: 110, C: 0.90, oaDbC: 36.5, oaWbC: 27.5, elevationM: 10 },
    { name: "Ang Thong", intensity: 100, C: 0.90, oaDbC: 36.8, oaWbC: 27.4, elevationM: 12 },
    { name: "Lop Buri", intensity: 100, C: 0.85, oaDbC: 37.2, oaWbC: 27.2, elevationM: 25 },
    { name: "Sing Buri", intensity: 100, C: 0.85, oaDbC: 37.0, oaWbC: 27.3, elevationM: 17 },
    { name: "Chai Nat", intensity: 100, C: 0.85, oaDbC: 37.2, oaWbC: 27.2, elevationM: 20 },
    { name: "Saraburi", intensity: 110, C: 0.90, oaDbC: 36.8, oaWbC: 27.2, elevationM: 35 },
    { name: "Chon Buri", intensity: 130, C: 0.95, oaDbC: 34.5, oaWbC: 28.2, elevationM: 15 },
    { name: "Rayong", intensity: 140, C: 0.95, oaDbC: 34.2, oaWbC: 28.4, elevationM: 10 },
    { name: "Chanthaburi", intensity: 150, C: 0.95, oaDbC: 33.8, oaWbC: 28.2, elevationM: 12 },
    { name: "Trat", intensity: 160, C: 0.95, oaDbC: 33.5, oaWbC: 28.5, elevationM: 8 },
    { name: "Chachoengsao", intensity: 120, C: 0.90, oaDbC: 35.5, oaWbC: 27.8, elevationM: 8 },
    { name: "Prachin Buri", intensity: 120, C: 0.90, oaDbC: 36.2, oaWbC: 27.5, elevationM: 20 },
    { name: "Nakhon Nayok", intensity: 120, C: 0.90, oaDbC: 36.0, oaWbC: 27.5, elevationM: 25 },
    { name: "Sa Kaeo", intensity: 110, C: 0.85, oaDbC: 36.5, oaWbC: 27.3, elevationM: 45 },
    { name: "Ratchaburi", intensity: 110, C: 0.85, oaDbC: 36.2, oaWbC: 27.4, elevationM: 15 },
    { name: "Kanchanaburi", intensity: 100, C: 0.85, oaDbC: 37.8, oaWbC: 26.8, elevationM: 30 },
    { name: "Suphan Buri", intensity: 100, C: 0.85, oaDbC: 37.0, oaWbC: 27.2, elevationM: 12 },
    { name: "Nakhon Pathom", intensity: 115, C: 0.90, oaDbC: 36.0, oaWbC: 27.6, elevationM: 8 },
    { name: "Samut Sakhon", intensity: 120, C: 0.95, oaDbC: 35.0, oaWbC: 28.2, elevationM: 3 },
    { name: "Samut Songkhram", intensity: 120, C: 0.95, oaDbC: 34.8, oaWbC: 28.2, elevationM: 3 },
    { name: "Phetchaburi", intensity: 120, C: 0.90, oaDbC: 35.0, oaWbC: 27.8, elevationM: 10 },
    { name: "Prachuap Khiri Khan", intensity: 130, C: 0.90, oaDbC: 34.5, oaWbC: 27.8, elevationM: 12 },
    { name: "Chiang Mai", intensity: 100, C: 0.80, oaDbC: 36.5, oaWbC: 25.0, elevationM: 310 },
    { name: "Lamphun", intensity: 95, C: 0.80, oaDbC: 36.8, oaWbC: 25.2, elevationM: 290 },
    { name: "Lampang", intensity: 95, C: 0.80, oaDbC: 37.5, oaWbC: 25.5, elevationM: 240 },
    { name: "Uttaradit", intensity: 100, C: 0.80, oaDbC: 37.8, oaWbC: 26.2, elevationM: 65 },
    { name: "Phrae", intensity: 90, C: 0.80, oaDbC: 37.2, oaWbC: 25.6, elevationM: 160 },
    { name: "Nan", intensity: 100, C: 0.80, oaDbC: 36.8, oaWbC: 25.5, elevationM: 200 },
    { name: "Phayao", intensity: 95, C: 0.80, oaDbC: 36.0, oaWbC: 24.8, elevationM: 390 },
    { name: "Chiang Rai", intensity: 110, C: 0.80, oaDbC: 35.8, oaWbC: 24.5, elevationM: 395 },
    { name: "Mae Hong Son", intensity: 110, C: 0.80, oaDbC: 37.0, oaWbC: 25.0, elevationM: 270 },
    { name: "Nakhon Sawan", intensity: 100, C: 0.85, oaDbC: 37.8, oaWbC: 27.0, elevationM: 35 },
    { name: "Uthai Thani", intensity: 100, C: 0.85, oaDbC: 37.5, oaWbC: 27.0, elevationM: 25 },
    { name: "Kamphaeng Phet", intensity: 100, C: 0.85, oaDbC: 37.5, oaWbC: 26.8, elevationM: 75 },
    { name: "Tak", intensity: 100, C: 0.80, oaDbC: 38.0, oaWbC: 26.2, elevationM: 115 },
    { name: "Sukhothai", intensity: 100, C: 0.85, oaDbC: 37.8, oaWbC: 26.6, elevationM: 50 },
    { name: "Phitsanulok", intensity: 110, C: 0.85, oaDbC: 37.2, oaWbC: 26.8, elevationM: 45 },
    { name: "Phichit", intensity: 100, C: 0.85, oaDbC: 37.2, oaWbC: 27.0, elevationM: 40 },
    { name: "Phetchabun", intensity: 100, C: 0.85, oaDbC: 36.8, oaWbC: 26.2, elevationM: 115 },
    { name: "Nakhon Ratchasima", intensity: 100, C: 0.85, oaDbC: 36.5, oaWbC: 26.2, elevationM: 185 },
    { name: "Buri Ram", intensity: 90, C: 0.80, oaDbC: 36.5, oaWbC: 26.4, elevationM: 160 },
    { name: "Surin", intensity: 90, C: 0.80, oaDbC: 36.5, oaWbC: 26.5, elevationM: 145 },
    { name: "Si Sa Ket", intensity: 100, C: 0.80, oaDbC: 36.8, oaWbC: 26.6, elevationM: 130 },
    { name: "Ubon Ratchathani", intensity: 110, C: 0.80, oaDbC: 36.8, oaWbC: 26.8, elevationM: 125 },
    { name: "Yasothon", intensity: 100, C: 0.80, oaDbC: 36.8, oaWbC: 26.5, elevationM: 135 },
    { name: "Chaiyaphum", intensity: 95, C: 0.80, oaDbC: 36.8, oaWbC: 26.2, elevationM: 185 },
    { name: "Amnat Charoen", intensity: 100, C: 0.80, oaDbC: 36.5, oaWbC: 26.6, elevationM: 145 },
    { name: "Bueng Kan", intensity: 120, C: 0.80, oaDbC: 36.0, oaWbC: 26.8, elevationM: 160 },
    { name: "Nong Bua Lam Phu", intensity: 95, C: 0.80, oaDbC: 36.8, oaWbC: 26.2, elevationM: 210 },
    { name: "Khon Kaen", intensity: 100, C: 0.85, oaDbC: 37.0, oaWbC: 26.2, elevationM: 165 },
    { name: "Udon Thani", intensity: 100, C: 0.85, oaDbC: 37.0, oaWbC: 26.4, elevationM: 175 },
    { name: "Loei", intensity: 100, C: 0.80, oaDbC: 36.2, oaWbC: 25.5, elevationM: 250 },
    { name: "Nong Khai", intensity: 110, C: 0.80, oaDbC: 36.5, oaWbC: 26.5, elevationM: 165 },
    { name: "Maha Sarakham", intensity: 90, C: 0.80, oaDbC: 37.0, oaWbC: 26.4, elevationM: 150 },
    { name: "Roi Et", intensity: 95, C: 0.80, oaDbC: 36.8, oaWbC: 26.5, elevationM: 145 },
    { name: "Kalasin", intensity: 95, C: 0.80, oaDbC: 36.8, oaWbC: 26.5, elevationM: 150 },
    { name: "Sakon Nakhon", intensity: 110, C: 0.80, oaDbC: 36.2, oaWbC: 26.4, elevationM: 170 },
    { name: "Nakhon Phanom", intensity: 120, C: 0.80, oaDbC: 36.0, oaWbC: 26.6, elevationM: 145 },
    { name: "Mukdahan", intensity: 110, C: 0.80, oaDbC: 36.5, oaWbC: 26.6, elevationM: 140 },
    { name: "Nakhon Si Thammarat", intensity: 150, C: 0.95, oaDbC: 34.2, oaWbC: 28.0, elevationM: 10 },
    { name: "Krabi", intensity: 160, C: 0.95, oaDbC: 33.8, oaWbC: 28.2, elevationM: 12 },
    { name: "Phang Nga", intensity: 170, C: 0.95, oaDbC: 33.5, oaWbC: 28.2, elevationM: 15 },
    { name: "Phuket", intensity: 170, C: 0.95, oaDbC: 33.5, oaWbC: 28.4, elevationM: 10 },
    { name: "Surat Thani", intensity: 150, C: 0.95, oaDbC: 34.5, oaWbC: 28.0, elevationM: 10 },
    { name: "Ranong", intensity: 180, C: 0.95, oaDbC: 33.2, oaWbC: 28.2, elevationM: 15 },
    { name: "Chumphon", intensity: 150, C: 0.95, oaDbC: 34.2, oaWbC: 28.0, elevationM: 12 },
    { name: "Songkhla", intensity: 140, C: 0.95, oaDbC: 34.0, oaWbC: 28.0, elevationM: 8 },
    { name: "Satun", intensity: 150, C: 0.95, oaDbC: 33.8, oaWbC: 28.2, elevationM: 8 },
    { name: "Trang", intensity: 160, C: 0.95, oaDbC: 34.2, oaWbC: 28.0, elevationM: 15 },
    { name: "Phatthalung", intensity: 140, C: 0.95, oaDbC: 34.2, oaWbC: 27.8, elevationM: 12 },
    { name: "Pattani", intensity: 140, C: 0.95, oaDbC: 34.2, oaWbC: 28.0, elevationM: 6 },
    { name: "Yala", intensity: 140, C: 0.95, oaDbC: 34.5, oaWbC: 27.6, elevationM: 35 },
    { name: "Narathiwat", intensity: 150, C: 0.95, oaDbC: 33.8, oaWbC: 28.2, elevationM: 8 }
];

let stormBaseIntensity = 100;

function populateProvinceDropdowns() {
    const stormProv = document.getElementById('storm_province');
    const pondProv = document.getElementById('pond_province');
    const options = `<option value="">Select Thailand Province...</option>` +
        thailandProvinces.map(p => `<option value="${p.name}">${p.name}</option>`).join('');

    if (stormProv) stormProv.innerHTML = options;
    if (pondProv) pondProv.innerHTML = options;
}

function applyProvData(provName, type) {
    const prov = thailandProvinces.find(p => p.name === provName);
    if (!prov) return;

    if (type === 'storm') {
        stormBaseIntensity = prov.intensity;
        applyStormInterval();
    } else if (type === 'pond') {
        // Provincial rainfall intensity is used to determine volume requirement
        // For simplified retention, we assume Intensity * Duration logic
        document.getElementById('pond_diff').value = (prov.intensity / 2).toFixed(0);
        calcPond();
    }
}

function applyStormInterval() {
    const interval = document.getElementById('storm_interval').value;
    const multipliers = { "5": 1.0, "10": 1.2, "25": 1.4, "50": 1.6, "100": 1.8 };
    const m = multipliers[interval] || 1.0;
    document.getElementById('storm_intensity').value = (stormBaseIntensity * m).toFixed(0);
    calcStorm();
}


// 2. Electrical Load Estimator Equipment Factor Database
const eqData = {
    "Split Type": [{ name: "Standard", factor: 1.50 }],
    "Package Air Cooled": [{ name: "Standard", factor: 1.40 }],
    "Package Water Cooled": [{ name: "Standard", factor: 1.00 }],
    "Water Cooled Chiller": [
        { name: "4.1 Reciprocating (<= 50 Ton)", factor: 1.00 },
        { name: "4.1 Reciprocating (> 50 Ton)", factor: 0.95 },
        { name: "4.2 Screw Type", factor: 0.75 },
        { name: "4.3 Centrifugal (<= 250 Ton)", factor: 0.75 },
        { name: "4.3 Centrifugal (251-500 Ton)", factor: 0.70 },
        { name: "4.3 Centrifugal (> 500 Ton)", factor: 0.67 }
    ],
    "Air Cooled Chiller": [
        { name: "5.1 Reciprocating (<= 50 Ton)", factor: 1.40 },
        { name: "5.1 Reciprocating (> 50 Ton)", factor: 1.30 },
        { name: "5.2 Screw/Centrifugal (<= 250 Ton)", factor: 1.40 },
        { name: "5.2 Screw/Centrifugal (> 250 Ton)", factor: 1.20 }
    ],
    "Chilled Water Pump": [
        { name: "Head <= 150 kPa (50ft)", factor: 0.04 },
        { name: "Head 180-300 kPa (60-100ft)", factor: 0.08 },
        { name: "Head 330-450 kPa (110-150ft)", factor: 0.11 }
    ],
    "Condenser Water Pump": [
        { name: "Head <= 150 kPa (50ft)", factor: 0.05 },
        { name: "Head 180-300 kPa (60-100ft)", factor: 0.10 },
        { name: "Head 330-450 kPa (110-150ft)", factor: 0.14 }
    ],
    "Fan Coil Unit": [{ name: "Standard", factor: 0.03 }],
    "Air Handling Unit": [{ name: "Standard", factor: 0.15 }],
    "Cooling Tower": [{ name: "Standard", factor: 0.03 }],
    "Other": [{ name: "Custom", factor: 1.00 }]
};


// 3. Standard IEC 60034-1 / EIT Motor Step Catalog (0.37 kW - 400 kW)
// Standard IEC 60034-1 / EIT Motor Step Catalog (kW, HP, typical IE3 eff & PF)
const motorStepCatalog = [
    { kw: 0.37, hp: 0.5, eff: 0.78, pf: 0.75 },
    { kw: 0.55, hp: 0.75, eff: 0.81, pf: 0.77 },
    { kw: 0.75, hp: 1.0, eff: 0.83, pf: 0.79 },
    { kw: 1.1,  hp: 1.5, eff: 0.84, pf: 0.81 },
    { kw: 1.5,  hp: 2.0, eff: 0.85, pf: 0.82 },
    { kw: 2.2,  hp: 3.0, eff: 0.87, pf: 0.83 },
    { kw: 3.0,  hp: 4.0, eff: 0.87, pf: 0.83 },
    { kw: 4.0,  hp: 5.5, eff: 0.88, pf: 0.84 },
    { kw: 5.5,  hp: 7.5, eff: 0.89, pf: 0.85 },
    { kw: 7.5,  hp: 10,  eff: 0.90, pf: 0.85 },
    { kw: 11,   hp: 15,  eff: 0.91, pf: 0.85 },
    { kw: 15,   hp: 20,  eff: 0.92, pf: 0.86 },
    { kw: 18.5, hp: 25,  eff: 0.92, pf: 0.86 },
    { kw: 22,   hp: 30,  eff: 0.93, pf: 0.86 },
    { kw: 30,   hp: 40,  eff: 0.93, pf: 0.86 },
    { kw: 37,   hp: 50,  eff: 0.94, pf: 0.87 },
    { kw: 45,   hp: 60,  eff: 0.94, pf: 0.87 },
    { kw: 55,   hp: 75,  eff: 0.94, pf: 0.87 },
    { kw: 75,   hp: 100, eff: 0.95, pf: 0.88 },
    { kw: 90,   hp: 125, eff: 0.95, pf: 0.88 },
    { kw: 110,  hp: 150, eff: 0.95, pf: 0.88 },
    { kw: 132,  hp: 175, eff: 0.95, pf: 0.88 },
    { kw: 160,  hp: 215, eff: 0.96, pf: 0.89 },
    { kw: 200,  hp: 270, eff: 0.96, pf: 0.89 },
    { kw: 250,  hp: 335, eff: 0.96, pf: 0.89 },
    { kw: 315,  hp: 425, eff: 0.96, pf: 0.90 },
    { kw: 355,  hp: 475, eff: 0.96, pf: 0.90 },
    { kw: 400,  hp: 550, eff: 0.96, pf: 0.90 }
];

// 4. EIT 2001-64 / IEC 60364-5-52 Copper Cable Ampacity & Impedance Table + Standard Breakers
const ampacityTable = [
    { size: 1.5, pvc_g2: 15,  pvc_g5: 17,  xlpe_g2: 20,  xlpe_g5: 23,  iec_pvc_g2: 15.5, iec_pvc_g5: 18.5, iec_xlpe_g2: 20,  iec_xlpe_g5: 24,  r: 12.1,   x: 0.110, od: 4.8 },
    { size: 2.5, pvc_g2: 21,  pvc_g5: 23,  xlpe_g2: 28,  xlpe_g5: 32,  iec_pvc_g2: 21,   iec_pvc_g5: 25,   iec_xlpe_g2: 28,  iec_xlpe_g5: 33,  r: 7.41,   x: 0.100, od: 5.3 },
    { size: 4,   pvc_g2: 28,  pvc_g5: 31,  xlpe_g2: 38,  xlpe_g5: 42,  iec_pvc_g2: 28,   iec_pvc_g5: 34,   iec_xlpe_g2: 37,  iec_xlpe_g5: 45,  r: 4.61,   x: 0.090, od: 5.9 },
    { size: 6,   pvc_g2: 36,  pvc_g5: 40,  xlpe_g2: 49,  xlpe_g5: 54,  iec_pvc_g2: 36,   iec_pvc_g5: 43,   iec_xlpe_g2: 48,  iec_xlpe_g5: 58,  r: 3.08,   x: 0.085, od: 6.5 },
    { size: 10,  pvc_g2: 50,  pvc_g5: 55,  xlpe_g2: 67,  xlpe_g5: 75,  iec_pvc_g2: 50,   iec_pvc_g5: 60,   iec_xlpe_g2: 66,  iec_xlpe_g5: 80,  r: 1.83,   x: 0.082, od: 7.6 },
    { size: 16,  pvc_g2: 66,  pvc_g5: 74,  xlpe_g2: 88,  xlpe_g5: 110, iec_pvc_g2: 68,   iec_pvc_g5: 80,   iec_xlpe_g2: 88,  iec_xlpe_g5: 107, r: 1.15,   x: 0.080, od: 8.8 },
    { size: 25,  pvc_g2: 84,  pvc_g5: 99,  xlpe_g2: 114, xlpe_g5: 147, iec_pvc_g2: 89,   iec_pvc_g5: 101,  iec_xlpe_g2: 117, iec_xlpe_g5: 138, r: 0.727,  x: 0.078, od: 11.0 },
    { size: 35,  pvc_g2: 104, pvc_g5: 123, xlpe_g2: 143, xlpe_g5: 183, iec_pvc_g2: 110,  iec_pvc_g5: 126,  iec_xlpe_g2: 144, iec_xlpe_g5: 171, r: 0.524,  x: 0.075, od: 12.3 },
    { size: 50,  pvc_g2: 125, pvc_g5: 158, xlpe_g2: 174, xlpe_g5: 224, iec_pvc_g2: 134,  iec_pvc_g5: 153,  iec_xlpe_g2: 175, iec_xlpe_g5: 209, r: 0.387,  x: 0.072, od: 14.1 },
    { size: 70,  pvc_g2: 160, pvc_g5: 199, xlpe_g2: 222, xlpe_g5: 289, iec_pvc_g2: 171,  iec_pvc_g5: 196,  iec_xlpe_g2: 222, iec_xlpe_g5: 269, r: 0.268,  x: 0.070, od: 16.2 },
    { size: 95,  pvc_g2: 194, pvc_g5: 247, xlpe_g2: 272, xlpe_g5: 354, iec_pvc_g2: 207,  iec_pvc_g5: 238,  iec_xlpe_g2: 269, iec_xlpe_g5: 328, r: 0.193,  x: 0.068, od: 18.8 },
    { size: 120, pvc_g2: 225, pvc_g5: 290, xlpe_g2: 317, xlpe_g5: 413, iec_pvc_g2: 239,  iec_pvc_g5: 276,  iec_xlpe_g2: 312, iec_xlpe_g5: 382, r: 0.153,  x: 0.067, od: 20.8 },
    { size: 150, pvc_g2: 260, pvc_g5: 334, xlpe_g2: 363, xlpe_g5: 476, iec_pvc_g2: 275,  iec_pvc_g5: 319,  iec_xlpe_g2: 358, iec_xlpe_g5: 441, r: 0.124,  x: 0.066, od: 23.0 },
    { size: 185, pvc_g2: 297, pvc_g5: 382, xlpe_g2: 415, xlpe_g5: 545, iec_pvc_g2: 314,  iec_pvc_g5: 364,  iec_xlpe_g2: 408, iec_xlpe_g5: 506, r: 0.0991, x: 0.065, od: 25.6 },
    { size: 240, pvc_g2: 350, pvc_g5: 453, xlpe_g2: 490, xlpe_g5: 644, iec_pvc_g2: 370,  iec_pvc_g5: 430,  iec_xlpe_g2: 481, iec_xlpe_g5: 599, r: 0.0754, x: 0.064, od: 29.2 },
    { size: 300, pvc_g2: 400, pvc_g5: 521, xlpe_g2: 561, xlpe_g5: 743, iec_pvc_g2: 426,  iec_pvc_g5: 497,  iec_xlpe_g2: 553, iec_xlpe_g5: 693, r: 0.0601, x: 0.063, od: 32.6 },
    { size: 400, pvc_g2: 477, pvc_g5: 625, xlpe_g2: 656, xlpe_g5: 868, iec_pvc_g2: 510,  iec_pvc_g5: 597,  iec_xlpe_g2: 646, iec_xlpe_g5: 825, r: 0.0470, x: 0.062, od: 36.8 },
    { size: 500, pvc_g2: 545, pvc_g5: 720, xlpe_g2: 749, xlpe_g5: 990, iec_pvc_g2: 587,  iec_pvc_g5: 689,  iec_xlpe_g2: 738, iec_xlpe_g5: 946, r: 0.0366, x: 0.061, od: 41.2 }
];

const standardBreakers = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500];


// 5. ASPE / IPC Water Supply Fixture Units (WSFU) Lookup Table
const wsfuData = [
    { id: 'wc_v', name: 'WC (Flush Valve)', unit: 10 },
    { id: 'wc_t', name: 'WC (Flush Tank)', unit: 5 },
    { id: 'lav', name: 'Lavatory', unit: 1.5 },
    { id: 'show', name: 'Shower', unit: 2.0 },
    { id: 'ur', name: 'Urinal', unit: 5.0 },
    { id: 'sink', name: 'Kitchen Sink', unit: 2.0 }
];


// 6. Standard Commercial Duct & Pipe Schedules (SI & Imperial)
const standardSpiralDuctsMM = [80, 100, 125, 150, 160, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1120, 1250, 1400, 1600];
const standardCommercialPipes = [
    { dn: 15,  inch: '1/2"',   id_mm: 15.8 },
    { dn: 20,  inch: '3/4"',   id_mm: 20.9 },
    { dn: 25,  inch: '1"',     id_mm: 26.6 },
    { dn: 32,  inch: '1-1/4"', id_mm: 35.1 },
    { dn: 40,  inch: '1-1/2"', id_mm: 40.9 },
    { dn: 50,  inch: '2"',     id_mm: 52.5 },
    { dn: 65,  inch: '2-1/2"', id_mm: 62.7 },
    { dn: 80,  inch: '3"',     id_mm: 77.9 },
    { dn: 100, inch: '4"',     id_mm: 102.3 },
    { dn: 125, inch: '5"',     id_mm: 128.2 },
    { dn: 150, inch: '6"',     id_mm: 154.1 },
    { dn: 200, inch: '8"',     id_mm: 202.7 },
    { dn: 250, inch: '10"',    id_mm: 254.5 },
    { dn: 300, inch: '12"',    id_mm: 304.8 },
    { dn: 350, inch: '14"',    id_mm: 336.6 },
    { dn: 400, inch: '16"',    id_mm: 387.4 },
    { dn: 450, inch: '18"',    id_mm: 438.2 },
    { dn: 500, inch: '20"',    id_mm: 489.0 },
    { dn: 600, inch: '24"',    id_mm: 590.6 }
];

const standardTransformerKvas = [30, 50, 100, 160, 250, 315, 400, 500, 630, 800, 1000, 1250, 1500, 1600, 2000, 2500];
const nfpa20PumpRatingsGPM = [25, 50, 100, 150, 200, 250, 300, 400, 450, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];

// 7. Engineering Knowledge Base for Info Modals & Report Citations
const magicKnowledgeBase = {
    analyzerPage: {
        title: "4-State HVAC System Analyzer (ASHRAE Fundamentals 2021)",
        standard: "ASHRAE RP-1485 / Fundamentals Ch. 1",
        summary: "Forward psychrometric process analysis across Outside Air (State 1), Mixed Air (State 2), Cooling Coil Leaving Air (State 3), and Supply Fan Leaving Air (State 4).",
        formulas: [
            "Pws(T) = 0.61078 × exp(17.27·T / (T + 237.3)) kPa",
            "W = 0.621945 × Pw / (Patm - Pw) kg/kg_da",
            "h = 1.006·Tdb + W·(2501 + 1.86·Tdb) kJ/kg_da",
            "Q_total = m_da·(h_in - h_out), Q_sens = m_da·c_pm·(T_in - T_out)"
        ]
    },
    loadAnalyzerPage: {
        title: "Room Load Psychrometric Analyzer (ASHRAE Handbook)",
        standard: "ASHRAE Fundamentals 2021",
        summary: "Reverse psychrometric determination of required Supply Air flow rate and coil load from Room Sensible Heat (RSH), Room Latent Heat (RLH), and Sensible Heat Ratio (SHR).",
        formulas: [
            "SHR = Q_sens,room / (Q_sens,room + Q_lat,room)",
            "m_sa = Q_sens,room / (c_pa · (T_room - T_sa))"
        ]
    },
    multiStagePage: {
        title: "Multi-Stage Psychrometric Process Analyzer",
        standard: "ASHRAE Psychrometric Modeling",
        summary: "Sequential multi-node thermodynamic solver supporting sensible heating/cooling, cooling & dehumidification with ADP/BF, adiabatic/steam humidification, and airstream mixing.",
        formulas: [
            "h_mix = (1 - f)·h_1 + f·h_2, W_mix = (1 - f)·W_1 + f·W_2"
        ]
    },
    ductSizerPage: {
        title: "Duct Sizer & Log-Log Nomogram (Darcy-Weisbach / Haaland)",
        standard: "ASHRAE Duct Design / SMACNA",
        summary: "Simultaneous friction-loss and velocity-constrained duct sizing using the Darcy-Weisbach equation and explicit Haaland friction factor correlation.",
        formulas: [
            "ΔP / L = f · (ρ·V²) / (2·D_h), D_e = 1.30·(a·b)^0.625 / (a + b)^0.25"
        ]
    },
    pipeSizerPage: {
        title: "Hydraulic Pipe Sizer & Log-Log Nomogram",
        standard: "ASHRAE Hydronics / Darcy-Weisbach",
        summary: "Hydronic pipe sizing with temperature-corrected water density and viscosity, dual SI (DN / mm / Pa/m) and IP (in / GPM / ft/100ft) units, and commercial DN schedule curves.",
        formulas: [
            "m = Q_kW / (c_p · ΔT), ΔP / L = f · (ρ·V²) / (2·D)"
        ]
    },
    ctPage: {
        title: "Cooling Tower Make-up Water Calculator",
        standard: "CTI / ASHRAE HVAC Systems & Equipment",
        summary: "Quantifies Evaporation, Drift, and Blowdown water losses across Cycles of Concentration (COC 1.5 to 10.0).",
        formulas: [
            "E = 0.0018 × C × ΔT_C, B = E / (COC - 1) - D, M = E + D + B"
        ]
    },
    roiPage: {
        title: "Chiller Lifecycle Cost & ROI Analyzer",
        standard: "ASHRAE LCCA / IPLV Financial Model",
        summary: "10-year capital + operating energy cost comparison between Baseline (Chiller A) and High-Efficiency Proposed (Chiller B) options.",
        formulas: [
            "Simple Payback (Yrs) = (Capex_B - Capex_A) / (Opex_A - Opex_B)"
        ]
    },
    eqListPage: {
        title: "Electrical Load Estimator & Equipment Schedule",
        standard: "EIT 2001-64 / IEEE 141",
        summary: "Multi-zone, multi-floor MEP equipment schedule with automatic kW/TR conversion factors and dynamic pivot aggregation.",
        formulas: [
            "P_kW = Capacity × E-Factor, S_kVA = P_kW / PF"
        ]
    },
    wiringPage: {
        title: "Wiring, Breaker & Raceway Sizer",
        standard: "EIT Standard 2001-64 (Ref 40°C) & IEC 60364-5-52 (Ref 30°C)",
        summary: "Selects circuit breakers, copper cables (1.5–500 mm² with auto-parallel runs), and SI/Imperial raceways (IMC 40% fill, Wireway 20% fill, Cable Tray single-layer) with temperature (Ca) and grouping (Cg) derating.",
        formulas: [
            "I_b = P / (√3 · V · cosφ), I_n ≥ 1.25 · I_b, I'_z = n_runs · I_z · C_a · C_g ≥ I_n"
        ]
    },
    transformerPage: {
        title: "Distribution Transformer & Main Breaker Sizer",
        standard: "MEA / PEA / EIT 2001-64",
        summary: "Calculates secondary Full Load Current (FLC), main circuit breaker rating (125% FLC), and bolted 3-phase short-circuit current (Isc) at transformer terminals.",
        formulas: [
            "I_FLC = (S_kVA × 1000) / (√3 · V_sec), I_sc = I_FLC / (%Z / 100)"
        ]
    },
    motorSizerPage: {
        title: "Induction Motor & Starter Selector",
        standard: "EIT 2001-64 / IEC 60947-4-1",
        summary: "Sizes motor branch-circuit breakers, AC-3 contactors, thermal overload relays, and feeder cables for DOL, Star-Delta, VFD, and Soft Starter configurations.",
        formulas: [
            "I_FLC = (P_kW × 1000) / (√3 · V · η · cosφ), I_wire ≥ 1.25 · I_FLC"
        ]
    },
    shortCircuitPage: {
        title: "Low-Voltage Point-to-Point Short Circuit Calculator",
        standard: "IEEE 242 (Buff Book) / Cooper M-Factor Method",
        summary: "Calculates prospective 3-phase symmetrical fault current (Isc) and peak asymmetric fault current at downstream distribution panels.",
        formulas: [
            "f = (1.732 × L × I_sc,source) / (C × N × V_LL), M = 1 / (1 + f), I_sc,point = I_sc,source × M"
        ]
    },
    starterSimulatorPage: {
        title: "Motor Starter Electrical & Mechanical Simulator",
        standard: "IEC 60034 / IEEE 141",
        summary: "Compares winding voltage, line inrush current, and starting torque across Direct On-Line (DOL), Star-Delta (Y-Δ), and Soft Starter methods.",
        formulas: [
            "T_start ∝ V_winding², I_line,YΔ = (1/3) · I_line,DOL"
        ]
    },
    waterDemandPage: {
        title: "Domestic Water Demand & Storage Tank Sizer",
        standard: "ASPE / IPC Hunter's Curve (WSFU)",
        summary: "Converts plumbing fixture counts into Water Supply Fixture Units (WSFU), peak flow demand (Curve A Flush Valve vs Curve B Flush Tank), velocity-sized supply main, and storage volume.",
        formulas: [
            "Q_peak = f(∑ WSFU), V_pipe = 4·Q / (π·D²) ≤ 2.0 m/s"
        ]
    },
    stormPage: {
        title: "Stormwater Roof & Site Drainage Sizer",
        standard: "Rational Method / EIT Thailand Provincial IDF",
        summary: "Calculates peak stormwater runoff (Q = C·I·A) using localized rainfall intensity data across all 77 Thailand provinces and return periods (5 to 100 years).",
        formulas: [
            "Q_m³/h = (C × I_mm/h × A_m²) / 1000"
        ]
    },
    pondPage: {
        title: "Stormwater Retention & Detention Pond Sizer",
        standard: "Pre/Post-Development Rational Hydrograph",
        summary: "Computes required on-site retention volume resulting from increased imperviousness between pre-development and post-development site conditions.",
        formulas: [
            "V_retention = (C_post - C_pre) × (I / 1000) × (T_dur / 60) × A"
        ]
    },
    sprinklerPage: {
        title: "NFPA 13 Sprinkler Hydraulic & Area/Density Calculator",
        standard: "NFPA 13 (Fig. 19.3.3.1.1 & Hazen-Williams)",
        summary: "Calculates single-head discharge (Q = K√P), Hazen-Williams pipe friction loss, and total sprinkler demand from interactive NFPA 13 Area/Density curves.",
        formulas: [
            "q = K · √P, ΔP_psi/ft = 4.52 · Q^1.85 / (C^1.85 · d^4.87)"
        ]
    },
    warehouseSprinklerPage: {
        title: "Warehouse ESFR Sprinkler Selector",
        standard: "NFPA 13 Table 12.1 (Early Suppression Fast Response)",
        summary: "Selects minimum ESFR K-factor, design operating pressure, and number of design heads based on ceiling height, storage height, and commodity classification.",
        formulas: [
            "Q_head = K_ESFR · √P_design"
        ]
    },
    fireWaterPage: {
        title: "Fire Water Consumption & Storage Tank Sizer",
        standard: "NFPA 13 Table 19.3.3.1.2 / NFPA 14 / NFPA 20 / NFPA 22",
        summary: "Computes total fire protection flow rate (Sprinkler + Inside/Outside Hose Stream + Standpipe), selects standard NFPA 20 fire pump rating, and sizes NFPA 22 effective fire water storage tank.",
        formulas: [
            "Q_total = Q_sprinkler·(1 + m_hyd) + Q_hose + Q_standpipe, V_tank = Q_total × t_duration × (1 + m_tank)"
        ]
    },
    fuelTankPage: {
        title: "Emergency Generator Fuel Storage Sizer",
        standard: "NFPA 110 / Diesel Standby Autonomy",
        summary: "Determines total diesel fuel storage volume and number of commercial storage tanks required for standby power autonomy.",
        formulas: [
            "V_fuel = Rate_L/h × t_hours × (1 + Margin)"
        ]
    }
};

window.MagicDB = {
    version: "3.0.0",
    Patm,
    thailandProvinces,
    eqData,
    motorStepCatalog,
    ampacityTable,
    standardBreakers,
    standardTransformerKvas,
    standardSpiralDuctsMM,
    standardCommercialPipes,
    nfpa20PumpRatingsGPM,
    wsfuData,
    knowledgeBase: magicKnowledgeBase
};