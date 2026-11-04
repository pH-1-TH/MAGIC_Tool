// ============================================================================
// Electrical Engineering Modules 10, 12, 13 & 14:
// Wiring & Breaker Sizer, Motor & Starter Selector, Short Circuit, Starter Simulator
// File: js/modules/electrical/wiring-motor-sc.js
// ============================================================================

// Motor Step Catalog Helpers (uses motorStepCatalog from magic-db.js)
function applyMotorCatalogStep(target, val) {
    if (val === 'custom') {
        const badgeId = target === 'wire' ? 'wire_motor_badge' : (target === 'motor' ? 'motor_step_badge' : 'sim_motor_badge');
        const badge = document.getElementById(badgeId);
        if (badge) badge.innerText = 'Custom Load';
        return;
    }
    const kwVal = parseFloat(val);
    const step = motorStepCatalog.find(m => Math.abs(m.kw - kwVal) < 0.01);
    if (!step) return;

    if (target === 'wire') {
        const unitEl = document.getElementById('wire_load_unit');
        const loadEl = document.getElementById('wire_load');
        if (unitEl && (unitEl.value === 'A' || unitEl.value === 'kVA')) {
            unitEl.value = 'kW';
        }
        if (loadEl) {
            loadEl.value = (unitEl && unitEl.value === 'HP') ? step.hp : step.kw;
        }
        const badge = document.getElementById('wire_motor_badge');
        if (badge) badge.innerText = `${step.kw} kW (${step.hp} HP)`;
        calcWiring();
    } else if (target === 'motor') {
        const unitEl = document.getElementById('motor_power_unit');
        const loadEl = document.getElementById('motor_power');
        const effEl = document.getElementById('motor_eff');
        const pfEl = document.getElementById('motor_pf');
        if (loadEl) loadEl.value = (unitEl && unitEl.value === 'HP') ? step.hp : step.kw;
        if (effEl) effEl.value = step.eff.toFixed(2);
        if (pfEl) pfEl.value = step.pf.toFixed(2);
        const badge = document.getElementById('motor_step_badge');
        if (badge) badge.innerText = `${step.kw} kW (${step.hp} HP)`;
        calcMotor();
    } else if (target === 'sim') {
        const loadEl = document.getElementById('sim_motor_kw');
        if (loadEl) loadEl.value = step.kw;
        const badge = document.getElementById('sim_motor_badge');
        if (badge) badge.innerText = `${step.kw} kW (${step.hp} HP)`;
        calcStarter();
    }
}

function syncMotorCatalogFromInput(target) {
    let val = 0, unit = 'kW', selId = '', badgeId = '';
    if (target === 'wire') {
        val = parseFloat(document.getElementById('wire_load')?.value) || 0;
        unit = document.getElementById('wire_load_unit')?.value || 'kW';
        selId = 'wire_motor_catalog';
        badgeId = 'wire_motor_badge';
    } else if (target === 'motor') {
        val = parseFloat(document.getElementById('motor_power')?.value) || 0;
        unit = document.getElementById('motor_power_unit')?.value || 'kW';
        selId = 'motor_step_catalog';
        badgeId = 'motor_step_badge';
    } else if (target === 'sim') {
        val = parseFloat(document.getElementById('sim_motor_kw')?.value) || 0;
        unit = 'kW';
        selId = 'sim_motor_catalog';
        badgeId = 'sim_motor_badge';
    }
    const sel = document.getElementById(selId);
    const badge = document.getElementById(badgeId);
    if (!sel) return;

    let match = null;
    if (unit === 'kW') {
        match = motorStepCatalog.find(m => Math.abs(m.kw - val) < 0.01);
    } else if (unit === 'HP') {
        match = motorStepCatalog.find(m => Math.abs(m.hp - val) < 0.05);
    }
    if (match) {
        sel.value = String(match.kw);
        if (badge) badge.innerText = `${match.kw} kW (${match.hp} HP)`;
    } else {
        sel.value = 'custom';
        if (badge) badge.innerText = unit === 'kW' ? `${val} kW (Custom)` : (unit === 'HP' ? `${val} HP (${(val * 0.746).toFixed(2)} kW)` : `Custom (${val} ${unit})`);
    }
}

// Copper Conductor Ampacity Table
// pvc_g2 / pvc_g5 / xlpe_g2 / xlpe_g5: EIT 2001-64 (Thailand) at 40°C Ref Ambient (Tables 5-20, 5-23, 5-27, 5-29)

// Standard Low-Voltage Busway Ratings per IEC 61439-6 / UL 857
const busDuctRatings = [
    { rating: 250,  r: 0.125, x: 0.045, width: 125, height: 100, weightKgM: 9.5,  icwKa: 30 },
    { rating: 400,  r: 0.080, x: 0.035, width: 135, height: 100, weightKgM: 12.0, icwKa: 40 },
    { rating: 630,  r: 0.052, x: 0.026, width: 155, height: 100, weightKgM: 16.5, icwKa: 50 },
    { rating: 800,  r: 0.040, x: 0.020, width: 175, height: 100, weightKgM: 19.8, icwKa: 65 },
    { rating: 1000, r: 0.030, x: 0.016, width: 195, height: 100, weightKgM: 24.2, icwKa: 65 },
    { rating: 1250, r: 0.024, x: 0.013, width: 220, height: 100, weightKgM: 29.5, icwKa: 80 },
    { rating: 1600, r: 0.018, x: 0.010, width: 260, height: 100, weightKgM: 37.0, icwKa: 80 },
    { rating: 2000, r: 0.014, x: 0.008, width: 310, height: 100, weightKgM: 46.5, icwKa: 100 },
    { rating: 2500, r: 0.011, x: 0.006, width: 370, height: 100, weightKgM: 58.0, icwKa: 100 },
    { rating: 3200, r: 0.008, x: 0.005, width: 440, height: 100, weightKgM: 74.0, icwKa: 120 },
    { rating: 4000, r: 0.006, x: 0.004, width: 520, height: 100, weightKgM: 92.0, icwKa: 120 },
    { rating: 5000, r: 0.005, x: 0.003, width: 620, height: 100, weightKgM: 115.0, icwKa: 150 }
];

function selectRaceway(type) {
    const sel = document.getElementById('wire_raceway_type');
    if (sel) sel.value = type;
    onRacewayDropdownChanged();
}

function onRacewayDropdownChanged() {
    const type = document.getElementById('wire_raceway_type')?.value || 'IMC';
    const installSel = document.getElementById('wire_install');
    if (installSel) {
        if (type === 'Tray') {
            installSel.value = 'G5';
        } else if (type === 'IMC' || type === 'Wireway') {
            installSel.value = 'G2';
        }
    }
    calcWiring();
}

// Wiring & Breaker Sizer (uses ampacityTable & standardBreakers from magic-db.js)
function populateWiringTable() {
    const tbody = document.getElementById('wire_table_body');
    if (!tbody) return;
    const std = document.getElementById('wire_std')?.value || 'EIT';
    const prefix = std === 'IEC' ? 'iec_' : '';
    const titleEl = document.getElementById('wire_table_title');
    const badgeEl = document.getElementById('wire_table_std_badge');
    if (titleEl) {
        titleEl.innerText = 'Reference Ampacity Table (Copper)';
    }
    if (badgeEl) {
        const stdRef = std === 'IEC'
            ? 'IEC 60364-5-52 Tables B.52.2–B.52.5 (Ref 30°C Air)'
            : 'EIT 2001-64 Tables 5-20 / 5-23 / 5-27 / 5-29 (Ref 40°C Air)';
        badgeEl.className = 'std-hover-wrap';
        badgeEl.innerHTML = '<span class="std-icon-trigger" aria-label="Ampacity Table Standard">ⓘ</span>' +
            '<span class="std-hover-card std-hover-card--bottom std-hover-card--right">' +
            '<span class="block text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">Ampacity Reference</span>' +
            '<span class="block text-xs font-extrabold text-white mb-1">' + stdRef + '</span>' +
            '<span class="block text-[11px] text-slate-300">G2: Enclosed in conduit or wireway in air • G5: Single-layer on perforated/unperforated cable tray.</span>' +
            '</span>';
    }
    tbody.innerHTML = ampacityTable.map(row => `
    <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
        <td class="p-2 font-bold text-slate-700 dark:text-slate-300">${row.size}</td>
        <td class="p-2 text-center text-slate-500">${row[prefix + 'pvc_g2'] || '-'}</td>
        <td class="p-2 text-center text-slate-500">${row[prefix + 'pvc_g5'] || '-'}</td>
        <td class="p-2 text-center text-slate-500">${row[prefix + 'xlpe_g2'] || '-'}</td>
        <td class="p-2 text-center text-slate-500">${row[prefix + 'xlpe_g5'] || '-'}</td>
    </tr>
`).join('');
}

function calcWiring() {
    const load = parseFloat(document.getElementById('wire_load').value) || 0;
    const unit = document.getElementById('wire_load_unit').value;
    const phase = parseInt(document.getElementById('wire_phase').value);
    const volt = parseFloat(document.getElementById('wire_volt').value) || 400;
    const pf = parseFloat(document.getElementById('wire_pf').value) || 0.85;
    const std = document.getElementById('wire_std')?.value || 'EIT';
    const type = document.getElementById('wire_type').value;
    let install = document.getElementById('wire_install')?.value || 'G2';
    const raceway = document.getElementById('wire_raceway_type')?.value || 'IMC';
    const length = parseFloat(document.getElementById('wire_len').value) || 0;
    const ambTemp = parseInt(document.getElementById('wire_temp_amb').value) || 40;
    const nCircuits = Math.max(1, parseInt(document.getElementById('wire_grouping').value) || 1);

    // Automatically synchronize installation method to selected raceway
    if (raceway === 'Tray' && install !== 'G5') {
        install = 'G5';
        const installSel = document.getElementById('wire_install');
        if (installSel) installSel.value = 'G5';
    } else if ((raceway === 'IMC' || raceway === 'Wireway') && install === 'G5') {
        install = 'G2';
        const installSel = document.getElementById('wire_install');
        if (installSel) installSel.value = 'G2';
    }

    // 1. Calculate Load Amps
    let amps = 0;
    if (unit === 'A') {
        amps = load;
        document.getElementById('wire_calc_note').innerText = "Direct Input Amps";
    } else if (unit === 'kW') {
        if (phase === 1) {
            amps = (load * 1000) / (volt * pf);
            document.getElementById('wire_calc_note').innerText = "I = (kW × 1000) / (V × PF)";
        } else {
            amps = (load * 1000) / (Math.sqrt(3) * volt * pf);
            document.getElementById('wire_calc_note').innerText = "I = (kW × 1000) / (√3 × V × PF)";
        }
    } else if (unit === 'HP') {
        const kwFromHp = load * 0.746;
        if (phase === 1) {
            amps = (kwFromHp * 1000) / (volt * pf);
            document.getElementById('wire_calc_note').innerText = `I = (${load} HP × 746) / (V × PF)`;
        } else {
            amps = (kwFromHp * 1000) / (Math.sqrt(3) * volt * pf);
            document.getElementById('wire_calc_note').innerText = `I = (${load} HP × 746) / (√3 × V × PF)`;
        }
    } else if (unit === 'kVA') {
        if (phase === 1) {
            amps = (load * 1000) / volt;
            document.getElementById('wire_calc_note').innerText = "I = (kVA × 1000) / V";
        } else {
            amps = (load * 1000) / (Math.sqrt(3) * volt);
            document.getElementById('wire_calc_note').innerText = "I = (kVA × 1000) / (√3 × V)";
        }
    }

    const resAmpsEl = document.getElementById('wire_res_amps');
    if (resAmpsEl) resAmpsEl.innerHTML = `${amps.toFixed(2)} <span class="text-xl font-normal text-slate-500">A</span>`;

    // 2. Ambient Temperature Correction Factor (Ca) & Grouping Derating Factor (Cg)
    // EIT 2001-64 Table 5-43 (Reference Ambient = 40°C in Air): Ca = sqrt((Tmax - Tamb) / (Tmax - 40))
    // IEC 60364-5-52 Table B.52.14 (Reference Ambient = 30°C in Air): Ca = sqrt((Tmax - Tamb) / (Tmax - 30))
    const caTables = {
        EIT: {
            PVC:  { 25: 1.22, 30: 1.15, 35: 1.08, 40: 1.00, 45: 0.91, 50: 0.82, 55: 0.71, 60: 0.58 },
            XLPE: { 25: 1.14, 30: 1.10, 35: 1.05, 40: 1.00, 45: 0.95, 50: 0.89, 55: 0.84, 60: 0.77 }
        },
        IEC: {
            PVC:  { 25: 1.06, 30: 1.00, 35: 0.94, 40: 0.87, 45: 0.79, 50: 0.71, 55: 0.61, 60: 0.50 },
            XLPE: { 25: 1.04, 30: 1.00, 35: 0.96, 40: 0.91, 45: 0.87, 50: 0.82, 55: 0.76, 60: 0.71 }
        }
    };
    const Ca = (caTables[std] && caTables[std][type] && caTables[std][type][ambTemp]) || 1.00;

    // Grouping Derating Factor (Cg) per EIT 2001-64 Table 5-8 / Table 5-44 & IEC 60364-5-52 Table B.52.17
    // G2: Enclosed in conduit/wireway or bunched in air (Item 1)
    // G5: Single layer on perforated cable tray / ladder (Item 4)
    const cgTables = {
        G2: [
            { n: 1, factor: 1.00 },
            { n: 2, factor: 0.80 },
            { n: 3, factor: 0.70 },
            { n: 4, factor: 0.65 },
            { n: 5, factor: 0.60 },
            { n: 6, factor: 0.57 },
            { n: 7, factor: 0.54 },
            { n: 8, factor: 0.52 },
            { n: 9, factor: 0.50 },
            { n: 11, factor: 0.48 },
            { n: 15, factor: 0.45 },
            { n: 19, factor: 0.41 },
            { n: 999, factor: 0.38 }
        ],
        G5: [
            { n: 1, factor: 1.00 },
            { n: 2, factor: 0.88 },
            { n: 3, factor: 0.82 },
            { n: 5, factor: 0.78 },
            { n: 8, factor: 0.76 },
            { n: 999, factor: 0.73 }
        ]
    };
    const activeCgList = cgTables[install] || cgTables.G2;
    const Cg = (activeCgList.find(row => nCircuits <= row.n) || activeCgList[activeCgList.length - 1]).factor;
    const totalDf = Ca * Cg;

    const dfEl = document.getElementById('wire_res_total_df');
    if (dfEl) dfEl.innerText = totalDf.toFixed(3).replace(/0$/, '');
    const dfDetailEl = document.getElementById('wire_res_df_detail');
    if (dfDetailEl) dfDetailEl.innerText = `Ca: ${Ca.toFixed(2)} (${ambTemp}°C) × Cg: ${Cg.toFixed(2)} (${nCircuits} cct)`;

    // 3. Breaker selection (1.25x load for continuous duty per EIT)
    const targetBreaker = amps * 1.25;
    let breakerAT = standardBreakers.find(b => b >= targetBreaker) || Math.ceil(targetBreaker / 100) * 100;
    const resBreakerEl = document.getElementById('wire_res_breaker');
    if (resBreakerEl) resBreakerEl.innerHTML = `${breakerAT} <span class="text-xl font-normal text-slate-500">A</span>`;

    // 4. Cable selection (Iz' >= In where Iz' = nRuns * Iz * Ca * Cg)
    const prefix = std === 'IEC' ? 'iec_' : '';
    const lookupKey = `${prefix}${type.toLowerCase()}_${install.toLowerCase()}`;
    const requiredTotalIz = breakerAT / totalDf;

    let nRuns = 1;
    let recommendedRow = ampacityTable.find(row => row[lookupKey] >= requiredTotalIz);
    if (!recommendedRow) {
        // Use parallel runs (prefer practical cable sizes <= 300 mm² per run)
        const maxPracticalRow = ampacityTable.find(r => r.size === 300) || ampacityTable[ampacityTable.length - 1];
        nRuns = Math.max(2, Math.ceil(requiredTotalIz / maxPracticalRow[lookupKey]));
        const reqPerRun = requiredTotalIz / nRuns;
        recommendedRow = ampacityTable.find(row => row[lookupKey] >= reqPerRun) || ampacityTable[ampacityTable.length - 1];
    }

    if (recommendedRow) {
        const sizePrefix = nRuns > 1 ? `${nRuns} × ` : '';
        const baseIzTotal = recommendedRow[lookupKey] * nRuns;
        const actualIzPrime = baseIzTotal * totalDf;

        // Voltage Drop (accounting for parallel runs: current per run = amps / nRuns)
        const phi = Math.acos(Math.min(1, Math.max(0, pf)));
        const sinPhi = Math.sin(phi);
        const ampsPerRun = amps / nRuns;
        let vd = 0;
        if (phase === 3) vd = (Math.sqrt(3) * ampsPerRun * (recommendedRow.r * pf + recommendedRow.x * sinPhi) * length) / 1000;
        else vd = (2 * ampsPerRun * (recommendedRow.r * pf + recommendedRow.x * sinPhi) * length) / 1000;

        const vdPct = volt > 0 ? (vd / volt) * 100 : 0;

        // 5. Raceway & Bus Duct Sizing
        const od = recommendedRow.od || (2.1 * Math.sqrt(recommendedRow.size));
        const nCondPerRun = phase === 3 ? 4 : 2; // 3P+N or 1P+N
        const totalWiresPerRun = nCondPerRun + 1; // +1 for Ground/PE
        const singleRunCableArea = (Math.PI * Math.pow(od, 2) / 4) * totalWiresPerRun;
        const totalAllRunsCableArea = singleRunCableArea * nRuns;

        const bundleBadge = document.getElementById('wire_res_cable_area_badge');
        if (bundleBadge) {
            bundleBadge.innerText = `Cable OD: Ø${od.toFixed(1)} mm • Bundle Area: ${totalAllRunsCableArea.toFixed(0)} mm² (${nRuns * totalWiresPerRun} cores)`;
        }

        // 5.1 IMC Conduit Sizing (EIT 40% fill limit)
        const imcTable = [
            { inch: '1/2"',   mm: 15,  dn: 'DN15',  area: 240 },
            { inch: '3/4"',   mm: 20,  dn: 'DN20',  area: 415 },
            { inch: '1"',     mm: 25,  dn: 'DN25',  area: 674 },
            { inch: '1-1/4"', mm: 32,  dn: 'DN32',  area: 1167 },
            { inch: '1-1/2"', mm: 40,  dn: 'DN40',  area: 1590 },
            { inch: '2"',     mm: 50,  dn: 'DN50',  area: 2616 },
            { inch: '2-1/2"', mm: 65,  dn: 'DN65',  area: 3739 },
            { inch: '3"',     mm: 80,  dn: 'DN80',  area: 5728 },
            { inch: '3-1/2"', mm: 90,  dn: 'DN90',  area: 7460 },
            { inch: '4"',     mm: 100, dn: 'DN100', area: 9800 },
            { inch: '5"',     mm: 125, dn: 'DN125', area: 15300 },
            { inch: '6"',     mm: 150, dn: 'DN150', area: 22100 }
        ];
        let imcConduitCount = nRuns;
        let selectedIMC = imcTable.find(c => (c.area * 0.4) >= singleRunCableArea) || imcTable[imcTable.length - 1];
        const imcPrefix = imcConduitCount > 1 ? `${imcConduitCount} × ` : '';
        const imcFillPct = (singleRunCableArea / selectedIMC.area) * 100;
        const imcEl = document.getElementById('wire_res_imc');
        const imcMmEl = document.getElementById('wire_res_imc_mm');
        const imcFillEl = document.getElementById('wire_res_imc_fill');
        if (imcEl) imcEl.innerText = `${imcPrefix}Ø${selectedIMC.mm} mm (${selectedIMC.inch})`;
        if (imcMmEl) imcMmEl.innerText = `${selectedIMC.dn} • ID Area: ${selectedIMC.area.toLocaleString()} mm²`;
        if (imcFillEl) imcFillEl.innerText = `Actual Fill: ${imcFillPct.toFixed(1)}% (≤ 40% Max)`;

        // 5.2 Wireway Sizing (EIT 20% cross-sectional fill limit)
        const wwSizes = [
            { mmLabel: '50 × 75 mm',   inLabel: '2"×3"',  area: 3750 },
            { mmLabel: '50 × 100 mm',  inLabel: '2"×4"',  area: 5000 },
            { mmLabel: '75 × 100 mm',  inLabel: '3"×4"',  area: 7500 },
            { mmLabel: '100 × 100 mm', inLabel: '4"×4"',  area: 10000 },
            { mmLabel: '100 × 150 mm', inLabel: '4"×6"',  area: 15000 },
            { mmLabel: '100 × 200 mm', inLabel: '4"×8"',  area: 20000 },
            { mmLabel: '150 × 150 mm', inLabel: '6"×6"',  area: 22500 },
            { mmLabel: '150 × 200 mm', inLabel: '6"×8"',  area: 30000 },
            { mmLabel: '150 × 300 mm', inLabel: '6"×12"', area: 45000 },
            { mmLabel: '200 × 200 mm', inLabel: '8"×8"',  area: 40000 },
            { mmLabel: '200 × 300 mm', inLabel: '8"×12"', area: 60000 }
        ];
        const selectedWW = wwSizes.find(w => (w.area * 0.2) >= totalAllRunsCableArea) || wwSizes[wwSizes.length - 1];
        const wwFillPct = (totalAllRunsCableArea / selectedWW.area) * 100;
        const wwEl = document.getElementById('wire_res_ww');
        const wwMmEl = document.getElementById('wire_res_ww_mm');
        const wwFillEl = document.getElementById('wire_res_ww_fill');
        if (wwEl) wwEl.innerText = `${selectedWW.mmLabel} (${selectedWW.inLabel})`;
        if (wwMmEl) wwMmEl.innerText = `Area: ${selectedWW.area.toLocaleString()} mm² (20% Cap: ${(selectedWW.area * 0.2).toLocaleString()} mm²)`;
        if (wwFillEl) wwFillEl.innerText = `Actual Fill: ${wwFillPct.toFixed(1)}% (≤ 20% Max)`;

        // 5.3 Cable Tray Sizing (Single-Layer Spacing)
        const trayTable = [
            { w: 100, h: 50,  inW: '4"',  inH: '2"' },
            { w: 150, h: 75,  inW: '6"',  inH: '3"' },
            { w: 200, h: 100, inW: '8"',  inH: '4"' },
            { w: 300, h: 100, inW: '12"', inH: '4"' },
            { w: 400, h: 100, inW: '16"', inH: '4"' },
            { w: 500, h: 100, inW: '20"', inH: '4"' },
            { w: 600, h: 100, inW: '24"', inH: '4"' },
            { w: 800, h: 100, inW: '32"', inH: '4"' }
        ];
        const reqWidth = od * totalWiresPerRun * nRuns * 1.25;
        const selectedTray = trayTable.find(t => t.w >= reqWidth) || trayTable[trayTable.length - 1];
        const trayEl = document.getElementById('wire_res_tray');
        const trayMmEl = document.getElementById('wire_res_tray_mm');
        const trayFillEl = document.getElementById('wire_res_tray_fill');
        if (trayEl) trayEl.innerText = `${selectedTray.w} × ${selectedTray.h} mm (${selectedTray.inW}×${selectedTray.inH})`;
        if (trayMmEl) trayMmEl.innerText = `Req. Span: ${reqWidth.toFixed(0)} mm • Area: ${(selectedTray.w * selectedTray.h).toLocaleString()} mm²`;
        if (trayFillEl) trayFillEl.innerText = `Single-Layer (${((reqWidth / selectedTray.w) * 100).toFixed(0)}% Width Used)`;

        // 5.4 Bus Duct Sizing (Sandwich Type per IEC 61439-6 / UL 857)
        const selectedBD = busDuctRatings.find(bd => bd.rating >= breakerAT) || busDuctRatings[busDuctRatings.length - 1];
        const vdBd = (Math.sqrt(3) * amps * (selectedBD.r * pf + selectedBD.x * sinPhi) * length) / 1000;
        const vdBdPct = volt > 0 ? (vdBd / volt) * 100 : 0;

        const bdEl = document.getElementById('wire_res_busduct');
        const bdDetEl = document.getElementById('wire_res_busduct_detail');
        const bdAdvEl = document.getElementById('wire_res_busduct_adv');
        if (bdEl) bdEl.innerText = `${selectedBD.rating} A`;
        if (bdDetEl) bdDetEl.innerText = `${selectedBD.width} × ${selectedBD.height} mm • ${selectedBD.weightKgM} kg/m`;
        if (bdAdvEl) bdAdvEl.innerText = `Icw: ${selectedBD.icwKa} kA • VD: ${vdBdPct.toFixed(2)}%`;

        // 5.5 Highlight Selected Raceway Card
        const cards = [
            { id: 'wire_card_imc', badgeId: 'wire_badge_imc', key: 'IMC' },
            { id: 'wire_card_ww', badgeId: 'wire_badge_ww', key: 'Wireway' },
            { id: 'wire_card_tray', badgeId: 'wire_badge_tray', key: 'Tray' },
            { id: 'wire_card_busduct', badgeId: 'wire_badge_busduct', key: 'BusDuct' }
        ];
        cards.forEach(c => {
            const el = document.getElementById(c.id);
            const b = document.getElementById(c.badgeId);
            const isActive = c.key === raceway;
            if (el) {
                if (isActive) {
                    el.className = 'p-3.5 rounded-xl border transition-all cursor-pointer ring-2 ring-orange-500 bg-orange-50/20 dark:bg-orange-950/30 border-orange-400 dark:border-orange-500 shadow-md flex flex-col justify-between';
                } else {
                    el.className = 'p-3.5 rounded-xl border transition-all cursor-pointer bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:shadow-md flex flex-col justify-between';
                }
            }
            if (b) {
                b.classList.toggle('hidden', !isActive);
            }
        });

        // 5.6 High Current Advisory Banner (≥ 630 A)
        const advEl = document.getElementById('wire_busduct_advisory');
        const advTextEl = document.getElementById('wire_busduct_advisory_text');
        if (advEl) {
            if (amps >= 630 && raceway !== 'BusDuct') {
                advEl.classList.remove('hidden');
                if (advTextEl) {
                    advTextEl.innerText = `Design load current is ${amps.toFixed(1)} A (Breaker: ${breakerAT} A), requiring ${nRuns} × ${recommendedRow.size} mm² parallel cables in conduits/trays. In modern MEP engineering, a Compact Sandwich Bus Duct (${selectedBD.rating} A) is strongly recommended over multiple parallel cable runs for lower voltage drop, lower fire load, and compact shaft riser layout.`;
                }
            } else {
                advEl.classList.add('hidden');
            }
        }

        // 6. Recommendation Box (Switches between Cable and Bus Duct based on selected raceway)
        const recTitleEl = document.getElementById('wire_rec_title');
        const resSizeEl = document.getElementById('wire_res_size');
        const resDescEl = document.getElementById('wire_res_desc');
        const resMaxIzEl = document.getElementById('wire_res_max_iz');
        const resBaseIzEl = document.getElementById('wire_res_base_iz');
        const resTotalDfEl = document.getElementById('wire_res_total_df');
        const resDfDetailEl = document.getElementById('wire_res_df_detail');
        const resVdEl = document.getElementById('wire_res_vd');

        if (raceway === 'BusDuct') {
            if (recTitleEl) recTitleEl.innerText = 'RECOMMENDED BUS DUCT / BUSWAY SPECIFICATION';
            if (resSizeEl) resSizeEl.innerHTML = `${selectedBD.rating} <span class="text-2xl font-bold text-slate-400">A Busway</span>`;
            if (resMaxIzEl) resMaxIzEl.innerText = `${selectedBD.rating} A`;
            if (resBaseIzEl) resBaseIzEl.innerText = `Continuous Feeder Rating (In)`;
            if (resTotalDfEl) resTotalDfEl.innerText = `Sandwich`;
            if (resDfDetailEl) resDfDetailEl.innerText = `IEC 61439-6 / UL 857`;
            if (resVdEl) resVdEl.innerHTML = `${vdBdPct.toFixed(2)} <span class="text-xl font-normal text-slate-500">%</span>`;
            if (resDescEl) {
                resDescEl.innerText = `Compact Sandwich Type Busway (IEC 61439-6 / UL 857) rated at ${selectedBD.rating} A, coordinated with upstream breaker ${breakerAT} A (AT) for design current ${amps.toFixed(1)} A. Conductors: 99.99% ETP Pure Copper (3P 4W + 50% Integral Earth Housing). Cross-section: ${selectedBD.width} × ${selectedBD.height} mm (${selectedBD.weightKgM} kg/m). Short-circuit withstand Icw = ${selectedBD.icwKa} kA (1s). Low reactance voltage drop: ${vdBdPct.toFixed(2)}% (${vdBd.toFixed(2)} V @ ${length} m). Space saving: up to 65% shaft width reduction vs parallel cables.`;
            }
        } else {
            const racewayNames = { IMC: 'IMC Conduit', Wireway: 'Steel Wireway', Tray: 'Cable Tray / Ladder' };
            if (recTitleEl) recTitleEl.innerText = `RECOMMENDED CABLE SIZE (${racewayNames[raceway] || 'Cable'})`;
            if (resSizeEl) resSizeEl.innerHTML = `${sizePrefix}${recommendedRow.size} <span class="text-2xl font-bold text-slate-400">mm²</span>`;
            if (resMaxIzEl) resMaxIzEl.innerText = `${actualIzPrime.toFixed(1)} A`;
            if (resBaseIzEl) resBaseIzEl.innerText = `Base Iz: ${baseIzTotal.toFixed(0)} A (${std} ${std === 'IEC' ? '30°C' : '40°C'})`;
            if (resTotalDfEl) resTotalDfEl.innerText = totalDf.toFixed(3).replace(/0$/, '');
            if (resDfDetailEl) resDfDetailEl.innerText = `Ca: ${Ca.toFixed(2)} (${ambTemp}°C) × Cg: ${Cg.toFixed(2)} (${nCircuits} cct)`;
            if (resVdEl) resVdEl.innerHTML = `${vdPct.toFixed(2)} <span class="text-xl font-normal text-slate-500">%</span>`;

            let racewayNote = '';
            if (raceway === 'IMC') {
                racewayNote = `Installed in ${imcPrefix}Ø${selectedIMC.mm} mm (${selectedIMC.inch}) IMC Conduit (${selectedIMC.dn}, ID Area: ${selectedIMC.area.toLocaleString()} mm², fill: ${imcFillPct.toFixed(1)}% ≤ 40% Max).`;
            } else if (raceway === 'Wireway') {
                racewayNote = `Enclosed in ${selectedWW.mmLabel} (${selectedWW.inLabel}) Steel Wireway (Area: ${selectedWW.area.toLocaleString()} mm², fill: ${wwFillPct.toFixed(1)}% ≤ 20% Max).`;
            } else if (raceway === 'Tray') {
                racewayNote = `Single-layer spaced on ${selectedTray.w} × ${selectedTray.h} mm (${selectedTray.inW}×${selectedTray.inH}) Cable Tray / Ladder (Span: ${reqWidth.toFixed(0)} mm, ${((reqWidth / selectedTray.w) * 100).toFixed(0)}% width used).`;
            }

            if (resDescEl) {
                resDescEl.innerText = `Breaker ${breakerAT} A (AT) protected by ${sizePrefix}${recommendedRow.size} mm² Cu/${type} (${install}). Derating: Cf = ${totalDf.toFixed(3)} (Ca = ${Ca.toFixed(2)} @ ${ambTemp}°C, Cg = ${Cg.toFixed(2)} for ${nCircuits} circuit${nCircuits > 1 ? 's' : ''}). Derated Ampacity Iz' = ${actualIzPrime.toFixed(1)} A ≥ ${breakerAT} A. Voltage Drop: ${vdPct.toFixed(2)}% (${vd.toFixed(2)} V @ ${length} m). ${racewayNote}`;
            }
        }
    }
}


// Motor & Starter Selector
function calcMotor() {
    if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('motor');
    const pVal = parseFloat(document.getElementById('motor_power').value) || 0;
    const pUnit = document.getElementById('motor_power_unit').value;
    const volt = parseFloat(document.getElementById('motor_volt').value);
    const eff = parseFloat(document.getElementById('motor_eff').value) || 0.85;
    const pf = parseFloat(document.getElementById('motor_pf').value) || 0.85;
    const starter = document.getElementById('motor_starter').value;
    const cableType = document.getElementById('motor_cable_type').value;
    const dist = parseFloat(document.getElementById('motor_dist').value) || 0;

    let kw = pVal;
    if (pUnit === 'HP') kw = pVal * 0.746;

    const is3Ph = volt > 300;
    let flc = 0;
    if (is3Ph) {
        flc = (kw * 1000) / (Math.sqrt(3) * volt * eff * pf);
    } else {
        flc = (kw * 1000) / (volt * eff * pf);
    }

    let breakerMult = 2.5;
    if (starter === 'SD') breakerMult = 1.5;
    if (starter === 'VFD' || starter === 'SS') breakerMult = 1.25;

    const breakerAT = standardBreakers.find(b => b >= flc * breakerMult) || Math.ceil(flc * breakerMult);

    // Basic Cable Sizing for Motor (1.25x FLC min)
    const lookupKey = `${cableType.toLowerCase()}_g2`;
    let wireRow = ampacityTable.find(r => r[lookupKey] >= flc * 1.25) || ampacityTable[ampacityTable.length - 1];

    document.getElementById('motor_res_flc').innerText = `${flc.toFixed(1)} A`;
    document.getElementById('motor_res_breaker').innerText = `${breakerAT} A`;
    document.getElementById('motor_res_cable').innerText = `${wireRow.size} mm²`;

    // VD
    const vd = (is3Ph ? Math.sqrt(3) : 2) * flc * dist * (wireRow.r * pf + wireRow.x * 0.5) / 1000;
    const vdPct = (vd / volt) * 100;
    document.getElementById('motor_res_vd').innerText = `${vdPct.toFixed(1)} %`;

    document.getElementById('motor_res_contactor').innerText = `${Math.ceil(flc)} A`;
    document.getElementById('motor_res_overload').innerText = `${(flc * 0.9).toFixed(1)} - ${(flc * 1.1).toFixed(1)} A`;
    document.getElementById('motor_res_istart').innerText = `${(flc * 6).toFixed(0)} A`;
}


// Short Circuit Calculator
function calcSC() {
    const isc_src = parseFloat(document.getElementById('sc_isc_source').value) || 0;
    const volt = parseFloat(document.getElementById('sc_volt').value) || 400;
    const size = parseFloat(document.getElementById('sc_wire_size').value);
    const runs = parseInt(document.getElementById('sc_runs').value) || 1;
    const dist = parseFloat(document.getElementById('sc_dist').value) || 0;
    const material = document.getElementById('sc_material').value;
    const raceway = document.getElementById('sc_raceway').value;

    const cTable = {
        CU: {
            STEEL: { 1.5: 222, 2.5: 367, 4: 580, 6: 864, 10: 1403, 16: 2125, 25: 3121, 35: 4125, 50: 5410, 70: 7210, 95: 9110, 120: 11000, 150: 13000, 185: 15500, 240: 19131, 300: 22000, 400: 27000 },
            PVC: { 1.5: 250, 2.5: 415, 4: 650, 6: 980, 10: 1600, 16: 2450, 25: 3650, 35: 4850, 50: 6450, 70: 8650, 95: 11500, 120: 14000, 150: 17000, 185: 21000, 240: 25410, 300: 29000, 400: 35000 }
        },
        AL: {
            STEEL: { 1.5: 130, 2.5: 220, 4: 350, 6: 520, 10: 850, 16: 1300, 25: 1900, 35: 2550, 50: 3400, 70: 4500, 95: 5800, 120: 7000, 150: 8500, 185: 10500, 240: 13551, 300: 15500, 400: 19500 },
            PVC: { 1.5: 150, 2.5: 255, 4: 400, 6: 600, 10: 980, 16: 1500, 25: 2250, 35: 3000, 50: 4000, 70: 5400, 95: 7200, 120: 8900, 150: 11000, 185: 13500, 240: 18551, 300: 21500, 400: 26500 }
        }
    };

    let C = cTable[material][raceway][size] || (size * 100);
    const f = (1.732 * dist * (isc_src * 1000)) / (C * runs * volt);
    const M = 1 / (1 + f);
    const isc_pt = isc_src * M;

    document.getElementById('sc_res_isc').innerText = `${isc_pt.toFixed(2)} kA`;
    document.getElementById('sc_res_m').innerText = M.toFixed(4);
    document.getElementById('sc_val_c').innerText = C;
    document.getElementById('sc_val_f').innerText = f.toFixed(4);
    document.getElementById('sc_val_ipeak').innerText = (isc_pt * 2.1).toFixed(1);
}


// Starter Type Simulator
function calcStarter() {
    if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('sim');
    const kw = parseFloat(document.getElementById('sim_motor_kw').value) || 15;
    const v = parseFloat(document.getElementById('sim_motor_v').value) || 400;
    const type = document.getElementById('sim_starter_type').value;
    const ss_v_pct = parseFloat(document.getElementById('sim_ss_v').value) || 40;

    if (type === 'SS') {
        document.getElementById('sim_ss_container').classList.remove('hidden');
    } else {
        document.getElementById('sim_ss_container').classList.add('hidden');
    }

    // Approximate DOL Values (Assuming 85% PF and 88% EFF)
    const flc = (kw * 1000) / (Math.sqrt(3) * v * 0.85 * 0.88);
    const istart_dol_line = flc * 6; // Typical 6x FLC for DOL
    const istart_dol_ph = istart_dol_line / Math.sqrt(3);
    const v_line_dol = v;
    const v_ph_dol = v; // In Delta, Phase V = Line V
    const torque_dol = 100;

    let v_ph, v_line, i_ph, i_line, torque;

    if (type === 'DOL') {
        v_line = v_line_dol;
        v_ph = v_ph_dol;
        i_line = istart_dol_line;
        i_ph = istart_dol_ph;
        torque = torque_dol;
    } else if (type === 'SD') {
        v_line = v_line_dol;
        v_ph = v_line_dol / Math.sqrt(3);
        i_line = istart_dol_line / 3;
        i_ph = i_line; // In star connection, I_line = I_phase
        torque = 33.3;
    } else if (type === 'SS') {
        const k = ss_v_pct / 100;
        v_line = v_line_dol * k;
        v_ph = v_ph_dol * k;
        i_line = istart_dol_line * k;
        i_ph = istart_dol_ph * k;
        torque = torque_dol * (k * k);
    }

    document.getElementById('sim_res_vph').innerText = `${v_ph.toFixed(0)} V`;
    document.getElementById('sim_res_vline').innerText = `${v_line.toFixed(0)} V`;
    document.getElementById('sim_res_iph').innerText = `${i_ph.toFixed(0)} A`;
    document.getElementById('sim_res_iline').innerText = `${i_line.toFixed(0)} A`;
    document.getElementById('sim_res_torque').innerText = `${torque.toFixed(0)} %`;

    const cmpBody = document.getElementById('sim_compare_body');
    if (cmpBody) {
        const ssRatio = ss_v_pct / 100;
        const rows = [
            { m: 'Direct On-Line (DOL)', v: `${v.toFixed(0)} V (100%)`, i: `${istart_dol_line.toFixed(0)} A (6.0× FLC)`, t: '100% (Full)', active: type === 'DOL' },
            { m: 'Star-Delta (Y-Δ)', v: `${(v / Math.sqrt(3)).toFixed(0)} V (58%)`, i: `${(istart_dol_line / 3).toFixed(0)} A (2.0× FLC)`, t: '33% (1/3 DOL)', active: type === 'SD' },
            { m: `Soft Starter (${ss_v_pct}% V)`, v: `${(v * ssRatio).toFixed(0)} V (${ss_v_pct}%)`, i: `${(istart_dol_line * ssRatio).toFixed(0)} A (${(6 * ssRatio).toFixed(1)}× FLC)`, t: `${(ssRatio * ssRatio * 100).toFixed(0)}%`, active: type === 'SS' }
        ];
        cmpBody.innerHTML = rows.map(r => `
            <tr class="${r.active ? 'bg-emerald-500/10 font-bold text-emerald-500' : ''}">
                <td class="p-2.5">${r.m}</td>
                <td class="p-2.5 text-center font-mono">${r.v}</td>
                <td class="p-2.5 text-center font-mono">${r.i}</td>
                <td class="p-2.5 text-center font-mono">${r.t}</td>
            </tr>
        `).join('');
    }
}

let wasDarkBeforePrint = false;

window.addEventListener('beforeprint', () => {
    wasDarkBeforePrint = document.documentElement.classList.contains('dark');
    if (wasDarkBeforePrint) {
        document.documentElement.classList.remove('dark');
        refreshActiveCharts();
    }
});

window.addEventListener('afterprint', () => {
    if (wasDarkBeforePrint) {
        document.documentElement.classList.add('dark');
        refreshActiveCharts();
    }
});

// SSOT Reactive Store Hooks
const _origCalcWiring = calcWiring;
calcWiring = function() {
    if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('wire');
    _origCalcWiring();
    if (window.MagicStore) {
        const load = parseFloat(document.getElementById('wire_load')?.value) || 0;
        const amps = parseFloat(document.getElementById('wire_res_amps')?.innerText) || 0;
        const brk = parseFloat(document.getElementById('wire_res_breaker')?.innerText) || 0;
        const sz = document.getElementById('wire_res_size')?.innerText || '--';
        window.MagicStore.publish({
            wiringLoadKw: load,
            wiringAmps: amps,
            wiringBreakerAt: brk,
            wiringCableSize: sz.replace(/\s+/g, ' ').trim()
        }, 'wiringPage');
    }
};

const _origCalcMotor = calcMotor;
calcMotor = function() {
    _origCalcMotor();
    if (window.MagicStore) {
        const pVal = parseFloat(document.getElementById('motor_power')?.value) || 0;
        const pUnit = document.getElementById('motor_power_unit')?.value || 'kW';
        const kw = pUnit === 'HP' ? +(pVal * 0.746).toFixed(2) : pVal;
        const flc = parseFloat(document.getElementById('motor_res_flc')?.innerText) || 0;
        const brk = parseFloat(document.getElementById('motor_res_breaker')?.innerText) || 0;
        window.MagicStore.publish({
            motorPowerKw: kw,
            motorFlc: flc,
            motorBreakerAt: brk
        }, 'motorSizerPage');
    }
};

const _origCalcSC = calcSC;
calcSC = function() {
    _origCalcSC();
    if (window.MagicStore) {
        const isc = parseFloat(document.getElementById('sc_res_isc')?.innerText) || 0;
        window.MagicStore.publish({ shortCircuitKa: isc }, 'shortCircuitPage');
    }
};

const _origCalcStarter = calcStarter;
calcStarter = function() {
    _origCalcStarter();
    if (window.MagicStore) {
        const iline = parseFloat(document.getElementById('sim_res_iline')?.innerText) || 0;
        window.MagicStore.publish({ starterLineCurrentA: iline }, 'starterSimulatorPage');
    }
};
