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


// ============================================================================
// Motor Control Center (MCC) Cabinet & Single Line Diagram (SLD) Engine
// Compliant with EIT Standard 2001-64 (ข้อ 6.3/6.4), NEC 430 & IEC 60947 / 61439
// ============================================================================

const MCC_STORAGE_KEY = 'magic_mcc_branches_v1';
const standardContactors = [9, 12, 18, 25, 32, 40, 50, 65, 80, 95, 115, 150, 185, 225, 265, 330, 400, 500];
const standardBusbars = [160, 250, 400, 630, 800, 1000, 1250, 1600, 2000, 2500, 3200];

const DEFAULT_MCC_BRANCHES = [
    { id: 'mcc_1', tag: 'CHWP-01A', description: 'Primary Chilled Water Pump (Duty)', kw: 30, hp: 40.2, volt: 400, phase: 3, pf: 0.86, eff: 0.93, starter: 'VFD', isStandby: false, cableType: 'XLPE', dist: 25, raceway: 'IMC' },
    { id: 'mcc_2', tag: 'CHWP-01B', description: 'Primary Chilled Water Pump (Standby)', kw: 30, hp: 40.2, volt: 400, phase: 3, pf: 0.86, eff: 0.93, starter: 'VFD', isStandby: true, cableType: 'XLPE', dist: 25, raceway: 'IMC' },
    { id: 'mcc_3', tag: 'CDWP-01A', description: 'Condenser Water Pump (Duty)', kw: 22, hp: 29.5, volt: 400, phase: 3, pf: 0.87, eff: 0.92, starter: 'SD', isStandby: false, cableType: 'XLPE', dist: 30, raceway: 'IMC' },
    { id: 'mcc_4', tag: 'CDWP-01B', description: 'Condenser Water Pump (Standby)', kw: 22, hp: 29.5, volt: 400, phase: 3, pf: 0.87, eff: 0.92, starter: 'SD', isStandby: true, cableType: 'XLPE', dist: 30, raceway: 'IMC' },
    { id: 'mcc_5', tag: 'CT-01', description: 'Cooling Tower Fan', kw: 11, hp: 14.7, volt: 400, phase: 3, pf: 0.85, eff: 0.90, starter: 'VFD', isStandby: false, cableType: 'XLPE', dist: 35, raceway: 'IMC' },
    { id: 'mcc_6', tag: 'AHU-01', description: 'Lobby AHU Supply Fan', kw: 7.5, hp: 10.0, volt: 400, phase: 3, pf: 0.85, eff: 0.89, starter: 'VFD', isStandby: false, cableType: 'XLPE', dist: 40, raceway: 'IMC' },
    { id: 'mcc_7', tag: 'EF-01', description: 'Plant Room Exhaust Fan', kw: 2.2, hp: 3.0, volt: 400, phase: 3, pf: 0.84, eff: 0.86, starter: 'DOL', isStandby: false, cableType: 'XLPE', dist: 15, raceway: 'IMC' },
    { id: 'BP-01', tag: 'BP-01', description: 'Domestic Water Booster Pump', kw: 5.5, hp: 7.4, volt: 400, phase: 3, pf: 0.85, eff: 0.88, starter: 'VFD', isStandby: false, cableType: 'XLPE', dist: 20, raceway: 'IMC' }
];

let mccBranches = [];

function loadMccBranches() {
    try {
        const raw = localStorage.getItem(MCC_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
                mccBranches = parsed;
                return;
            }
        }
    } catch (e) {}
    mccBranches = JSON.parse(JSON.stringify(DEFAULT_MCC_BRANCHES));
    saveMccBranches();
}

function saveMccBranches() {
    try {
        localStorage.setItem(MCC_STORAGE_KEY, JSON.stringify(mccBranches));
    } catch (e) {}
}

function getBreakerAf(at) {
    if (at <= 50) return '50 AF';
    if (at <= 100) return '100 AF';
    if (at <= 125) return '125 AF';
    if (at <= 250) return '250 AF';
    if (at <= 400) return '400 AF';
    if (at <= 630) return '630 AF';
    if (at <= 800) return '800 AF';
    if (at <= 1250) return '1250 AF';
    if (at <= 1600) return '1600 AF';
    return '2500 AF (ACB)';
}

function getGroundWireSize(phaseSize) {
    if (phaseSize <= 16) return phaseSize;
    if (phaseSize <= 35) return 16;
    return Math.max(16, Math.ceil(phaseSize / 2));
}

function switchMotorMode(mode) {
    const isMcc = mode === 'mcc';
    const singleView = document.getElementById('motor_view_single');
    const mccView = document.getElementById('motor_view_mcc');
    const btnSingle = document.getElementById('motor_tab_btn_single');
    const btnMcc = document.getElementById('motor_tab_btn_mcc');

    if (singleView) singleView.classList.toggle('hidden', isMcc);
    if (mccView) mccView.classList.toggle('hidden', !isMcc);

    if (btnSingle) {
        btnSingle.className = isMcc
            ? 'px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer'
            : 'px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 flex items-center gap-2 cursor-pointer';
    }
    if (btnMcc) {
        btnMcc.className = isMcc
            ? 'px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 border border-slate-200 dark:border-slate-600 flex items-center gap-2 cursor-pointer'
            : 'px-4 py-2 rounded-lg text-xs font-bold transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 cursor-pointer';
    }

    if (isMcc) {
        calcMcc();
    } else {
        calcMotor();
    }
}

// Master MCC Calculation
function calcMcc() {
    if (!mccBranches || mccBranches.length === 0) {
        loadMccBranches();
    }

    const volt = parseFloat(document.getElementById('mcc_volt')?.value) || 400;
    const defaultCable = document.getElementById('mcc_cable_type')?.value || 'XLPE';
    const defaultRaceway = document.getElementById('mcc_raceway')?.value || 'IMC';
    const is3Ph = volt > 300;

    // 1. Calculate each branch parameters
    mccBranches.forEach((b, idx) => {
        b.kw = parseFloat(b.kw) || 0.37;
        b.hp = +(b.kw / 0.746).toFixed(1);
        b.volt = volt;
        b.eff = parseFloat(b.eff) || (b.kw >= 15 ? 0.92 : (b.kw >= 5.5 ? 0.88 : 0.85));
        b.pf = parseFloat(b.pf) || (b.kw >= 15 ? 0.86 : 0.85);
        b.cableType = b.cableType || defaultCable;
        b.raceway = b.raceway || defaultRaceway;
        b.dist = parseFloat(b.dist) || 25;

        // FLC Calculation
        const denom = (is3Ph ? Math.sqrt(3) : 1) * volt * b.eff * b.pf;
        b.flc = denom > 0 ? (b.kw * 1000) / denom : 0;

        // Multiplier per Starter (EIT 2001-64 ข้อ 6.3)
        let mult = 2.5; // DOL: 250% (EIT 6.3.2)
        if (b.starter === 'SD') mult = 1.75; // Star-Delta: 175-200% (EIT 6.3.3)
        if (b.starter === 'SS') mult = 1.50; // Soft Starter: 150%
        if (b.starter === 'VFD') mult = 1.30; // VFD: 125-130%

        const targetBrk = b.flc * mult;
        b.breakerAt = standardBreakers.find(x => x >= targetBrk) || Math.ceil(targetBrk);
        b.breakerAf = getBreakerAf(b.breakerAt);

        // Contactor & Overload sizing
        if (b.starter === 'SD') {
            const mainDeltaFlc = b.flc * 0.58;
            const starFlc = b.flc * 0.33;
            const kmMain = standardContactors.find(c => c >= mainDeltaFlc) || Math.ceil(mainDeltaFlc);
            const kmStar = standardContactors.find(c => c >= starFlc) || Math.ceil(starFlc);
            b.contactorStr = `M/Δ: ${kmMain}A, Y: ${kmStar}A`;
            b.overloadStr = `${(b.flc * 0.52).toFixed(1)} - ${(b.flc * 0.67).toFixed(1)} A (Set 0.58×)`;
        } else if (b.starter === 'VFD') {
            const vfdAmp = Math.ceil(b.flc * 1.1);
            b.contactorStr = `Drive: ${vfdAmp}A`;
            b.overloadStr = `Electronic (1.0× FLC)`;
        } else if (b.starter === 'SS') {
            const ssAmp = standardContactors.find(c => c >= b.flc) || Math.ceil(b.flc);
            b.contactorStr = `SS/Bypass: ${ssAmp}A`;
            b.overloadStr = `${(b.flc * 0.9).toFixed(1)} - ${(b.flc * 1.15).toFixed(1)} A`;
        } else {
            // DOL
            const km = standardContactors.find(c => c >= b.flc) || Math.ceil(b.flc);
            b.contactorStr = `KM: ${km}A (AC-3)`;
            b.overloadStr = `${(b.flc * 0.9).toFixed(1)} - ${(b.flc * 1.15).toFixed(1)} A`;
        }

        // Branch Cable Sizing (1.25x FLC min)
        const lookupKey = `${(b.cableType || 'XLPE').toLowerCase()}_g2`;
        const wireRow = ampacityTable.find(r => r[lookupKey] >= b.flc * 1.25) || ampacityTable[ampacityTable.length - 1];
        const gSize = getGroundWireSize(wireRow.size);
        b.cableSize = wireRow.size;
        b.groundSize = gSize;
        b.cable = `4×${wireRow.size} mm² + G-${gSize}`;

        // Voltage Drop
        const vd = (is3Ph ? Math.sqrt(3) : 2) * b.flc * b.dist * (wireRow.r * b.pf + wireRow.x * 0.5) / 1000;
        b.vdPct = volt > 0 ? (vd / volt) * 100 : 0;
    });

    // 2. Main Incoming Breaker Sizing (EIT Standard 2001-64 ข้อ 6.3/6.4 & NEC 430.62)
    const activeBranches = mccBranches.filter(b => !b.isStandby);
    const standbyBranches = mccBranches.filter(b => b.isStandby);

    let largestActive = null;
    let otherFlcSum = 0;
    let mainCalcCurrent = 0;
    let mainBreakerAt = 100;
    let mainBreakerAf = '125 AF';
    let busbarCalcCurrent = 0;
    let mainBusbarRating = 250;
    let busbarIcw = 35;

    if (activeBranches.length > 0) {
        // Find largest motor by branch breaker rating (and highest FLC)
        const sortedActive = activeBranches.slice().sort((a, b) => (b.breakerAt - a.breakerAt) || (b.flc - a.flc));
        largestActive = sortedActive[0];

        // Sum FLC of all other active motors
        otherFlcSum = sortedActive.slice(1).reduce((sum, b) => sum + b.flc, 0);

        // Main Feeder Breaker Rule: I_main = I_branch(largest) + sum(I_flc of other active)
        mainCalcCurrent = largestActive.breakerAt + otherFlcSum;
        mainBreakerAt = standardBreakers.find(b => b >= mainCalcCurrent) || Math.ceil(mainCalcCurrent);
        mainBreakerAf = getBreakerAf(mainBreakerAt);

        // Main Busbar Rule: I_busbar = 1.25 * I_flc(largest) + sum(I_flc of other active)
        busbarCalcCurrent = (1.25 * largestActive.flc) + otherFlcSum;
        mainBusbarRating = standardBusbars.find(b => b >= busbarCalcCurrent) || 3200;
        busbarIcw = mainBusbarRating <= 400 ? 35 : (mainBusbarRating <= 1000 ? 50 : 65);
    } else if (mccBranches.length > 0) {
        // Fallback if all are standby
        const b = mccBranches[0];
        mainCalcCurrent = b.breakerAt;
        mainBreakerAt = standardBreakers.find(x => x >= mainCalcCurrent) || 100;
        mainBreakerAf = getBreakerAf(mainBreakerAt);
        busbarCalcCurrent = b.flc * 1.25;
        mainBusbarRating = standardBusbars.find(x => x >= busbarCalcCurrent) || 250;
        busbarIcw = 35;
    }

    // 3. Load & Demand Totals
    const totalKw = mccBranches.reduce((s, b) => s + b.kw, 0);
    const activeKw = activeBranches.reduce((s, b) => s + b.kw, 0);
    const standbyKw = standbyBranches.reduce((s, b) => s + b.kw, 0);
    const totalKva = totalKw / 0.85;
    const peakOperatingFlc = activeBranches.reduce((s, b) => s + b.flc, 0);

    // 4. Update KPI DOM Elements
    const mbEl = document.getElementById('mcc_main_breaker');
    const mbAfEl = document.getElementById('mcc_main_breaker_af');
    const mbCalcEl = document.getElementById('mcc_main_breaker_calc');
    const bbEl = document.getElementById('mcc_busbar_rating');
    const bbIcwEl = document.getElementById('mcc_busbar_icw');
    const bbCalcEl = document.getElementById('mcc_busbar_calc');
    const kwEl = document.getElementById('mcc_total_connected_kw');
    const kvaEl = document.getElementById('mcc_total_connected_kva');
    const bdEl = document.getElementById('mcc_motors_breakdown');
    const opFlcEl = document.getElementById('mcc_operating_flc');
    const opKwEl = document.getElementById('mcc_operating_kw');
    const sbKwEl = document.getElementById('mcc_standby_kw');
    const badgeCount = document.getElementById('mcc_badge_count');
    const totalCountBadge = document.getElementById('mcc_total_count_badge');

    if (mbEl) mbEl.innerText = `${mainBreakerAt} A (AT)`;
    if (mbAfEl) mbAfEl.innerText = `${mainBreakerAf} • 50 kA (Icu @ ${volt}V)`;
    if (mbCalcEl) {
        if (largestActive) {
            mbCalcEl.innerText = `EIT 2001-64: ${largestActive.tag} Brk (${largestActive.breakerAt}A) + Σ Other (${otherFlcSum.toFixed(1)}A) = ${mainCalcCurrent.toFixed(1)}A`;
        } else {
            mbCalcEl.innerText = `No active motors defined`;
        }
    }

    if (bbEl) bbEl.innerText = `${mainBusbarRating} A Cu Busbar`;
    if (bbIcwEl) bbIcwEl.innerText = `Icw: ${busbarIcw} kA (1s) • Form 3b/4b`;
    if (bbCalcEl) {
        if (largestActive) {
            bbCalcEl.innerText = `Busbar: 1.25 × ${largestActive.flc.toFixed(1)}A + ${otherFlcSum.toFixed(1)}A = ${busbarCalcCurrent.toFixed(1)}A`;
        }
    }

    if (kwEl) kwEl.innerText = `${totalKw.toFixed(1)} kW`;
    if (kvaEl) kvaEl.innerText = `${totalKva.toFixed(1)} kVA (Connected)`;
    if (bdEl) bdEl.innerText = `${activeBranches.length} Duty • ${standbyBranches.length} Standby Feeders`;

    if (opFlcEl) opFlcEl.innerText = `${peakOperatingFlc.toFixed(1)} A`;
    if (opKwEl) opKwEl.innerText = `${activeKw.toFixed(1)} kW Active Operating Demand`;
    if (sbKwEl) sbKwEl.innerText = `${standbyKw.toFixed(1)} kW Standby Excluded from Peak`;

    if (badgeCount) badgeCount.innerText = `${mccBranches.length} Motors`;
    if (totalCountBadge) totalCountBadge.innerText = `${mccBranches.length} Motors`;

    saveMccBranches();
    renderMccTable();
    renderMccSld({
        mainBreakerAt,
        mainBreakerAf,
        mainBusbarRating,
        busbarIcw,
        volt,
        largestActiveTag: largestActive ? largestActive.tag : ''
    });

    // Publish to MagicStore SSOT Hub
    if (window.MagicStore) {
        window.MagicStore.publish({
            mccMainBreakerAt: mainBreakerAt,
            mccBusbarAmp: mainBusbarRating,
            mccTotalKw: totalKw,
            mccActiveFlc: peakOperatingFlc,
            mccMotorCount: mccBranches.length
        }, 'mccPage');
    }
}

// Render Branches Table
function renderMccTable() {
    const tbody = document.getElementById('mcc_table_body');
    if (!tbody) return;

    if (mccBranches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="13" class="p-8 text-center text-slate-400">No connected motor branches. Click "+ Add Motor Branch" or "Import from Schedule".</td></tr>`;
        return;
    }

    tbody.innerHTML = mccBranches.map((b, idx) => {
        const isStandby = !!b.isStandby;
        const roleBtn = isStandby
            ? `<button onclick="toggleMccStandby('${b.id}')" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition cursor-pointer" title="Click to toggle Duty / Standby">STANDBY</button>`
            : `<button onclick="toggleMccStandby('${b.id}')" class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition cursor-pointer" title="Click to toggle Duty / Standby">DUTY</button>`;

        const starterOpts = ['DOL', 'SD', 'VFD', 'SS'].map(s => `<option value="${s}" ${b.starter === s ? 'selected' : ''}>${s}</option>`).join('');

        return `
        <tr id="mcc_row_${b.id}" class="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
            <td class="p-3 text-center text-slate-400 font-mono">${idx + 1}</td>
            <td class="p-3 font-bold text-slate-900 dark:text-white">
                <input type="text" value="${b.tag}" onchange="updateMccBranch('${b.id}', 'tag', this.value)"
                    class="bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none w-28 text-xs font-bold text-slate-900 dark:text-white">
            </td>
            <td class="p-3">
                <input type="text" value="${b.description || ''}" onchange="updateMccBranch('${b.id}', 'description', this.value)"
                    class="bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none w-44 text-xs text-slate-600 dark:text-slate-300">
            </td>
            <td class="p-3 text-right font-mono font-bold">
                <input type="number" step="0.1" value="${b.kw}" onchange="updateMccBranch('${b.id}', 'kw', this.value)"
                    class="bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none w-16 text-right font-mono text-xs font-bold">
            </td>
            <td class="p-3">
                <select onchange="updateMccBranch('${b.id}', 'starter', this.value)"
                    class="bg-transparent border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 text-xs font-semibold dark:bg-slate-800 cursor-pointer">
                    ${starterOpts}
                </select>
            </td>
            <td class="p-3 text-center">${roleBtn}</td>
            <td class="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">${b.flc.toFixed(1)}</td>
            <td class="p-3 text-right font-mono font-bold text-yellow-600 dark:text-yellow-400">${b.breakerAt}A <span class="text-[10px] text-slate-400 font-normal">(${b.breakerAf})</span></td>
            <td class="p-3 text-right text-[11px] font-semibold text-slate-700 dark:text-slate-300">${b.contactorStr}</td>
            <td class="p-3 text-right text-[11px] font-mono text-slate-600 dark:text-slate-300">${b.overloadStr}</td>
            <td class="p-3 font-mono text-[11px] text-blue-600 dark:text-blue-400">${b.cable}</td>
            <td class="p-3 text-right font-mono font-bold ${b.vdPct > 3 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}">${b.vdPct.toFixed(1)}%</td>
            <td class="p-3 text-center">
                <div class="flex items-center justify-center gap-1.5">
                    <button onclick="duplicateMccBranch('${b.id}')" title="Duplicate branch"
                        class="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </button>
                    <button onclick="deleteMccBranch('${b.id}')" title="Delete branch"
                        class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

// Render Graphical Single Line Diagram (SLD) in SVG
function renderMccSld(meta) {
    const container = document.getElementById('mcc_sld_container');
    if (!container) return;

    if (!mccBranches || mccBranches.length === 0) {
        container.innerHTML = '<div class="p-12 text-center text-slate-500 font-mono">No motors in MCC cabinet.</div>';
        return;
    }

    const branchW = 145;
    const incomerW = 230;
    const rightMargin = 70;
    const totalW = Math.max(960, incomerW + mccBranches.length * branchW + rightMargin);
    const totalH = 550;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} ${totalH}" width="${totalW}" height="${totalH}" class="w-full h-auto select-none font-sans">
    <defs>
        <!-- Background Grid Pattern -->
        <pattern id="mcc_grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.7" opacity="0.4"/>
        </pattern>
        <!-- Gradients -->
        <linearGradient id="busbar_cu" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24"/>
            <stop offset="50%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#b45309"/>
        </linearGradient>
        <linearGradient id="breaker_grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1e293b"/>
            <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
    </defs>

    <!-- Canvas Background -->
    <rect width="${totalW}" height="${totalH}" fill="#0b1120" rx="10"/>
    <rect width="${totalW}" height="${totalH}" fill="url(#mcc_grid)" rx="10"/>

    <!-- ================= INCOMER SECTION ================= -->
    <!-- Incoming Power Feeder Line from MDB / Transformer -->
    <path d="M 90 20 L 90 70" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/>
    <circle cx="90" cy="20" r="4" fill="#f59e0b"/>
    <text x="105" y="32" fill="#94a3b8" font-size="10" font-weight="bold" font-family="monospace">INCOMING SUPPLY</text>
    <text x="105" y="46" fill="#f8fafc" font-size="12" font-weight="black">${meta.volt}V 3φ 4W 50Hz</text>
    <text x="105" y="60" fill="#64748b" font-size="9">From Main Distribution Board (MDB)</text>

    <!-- Multi-Function Meter (MFM) Symbol -->
    <rect x="72" y="72" width="36" height="28" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    <text x="90" y="89" fill="#38bdf8" font-size="9" font-weight="black" text-anchor="middle">MFM</text>
    <path d="M 90 100 L 90 115" stroke="#f59e0b" stroke-width="3"/>

    <!-- Main Incoming Breaker (MCCB) Symbol -->
    <g transform="translate(68, 115)">
        <rect width="44" height="42" rx="4" fill="url(#breaker_grad)" stroke="#eab308" stroke-width="2"/>
        <!-- Breaker Trip Contacts Schematic -->
        <line x1="14" y1="8" x2="14" y2="34" stroke="#eab308" stroke-width="2"/>
        <line x1="22" y1="8" x2="22" y2="34" stroke="#eab308" stroke-width="2"/>
        <line x1="30" y1="8" x2="30" y2="34" stroke="#eab308" stroke-width="2"/>
        <line x1="10" y1="21" x2="34" y2="21" stroke="#ef4444" stroke-width="2.5"/>
    </g>
    <!-- Main Breaker Labels -->
    <rect x="122" y="112" width="125" height="48" rx="4" fill="#1e293b" stroke="#334155" stroke-width="1"/>
    <text x="130" y="126" fill="#eab308" font-size="11" font-weight="black">MAIN MCCB: ${meta.mainBreakerAt}A AT</text>
    <text x="130" y="140" fill="#94a3b8" font-size="9" font-weight="bold">${meta.mainBreakerAf} • Icu 50kA</text>
    <text x="130" y="152" fill="#38bdf8" font-size="8">EIT 2001-64 Coordinated</text>

    <!-- Line from Breaker to Horizontal Main Busbar -->
    <path d="M 90 157 L 90 195" stroke="#f59e0b" stroke-width="3.5"/>

    <!-- ================= HORIZONTAL COPPER BUSBAR SYSTEM ================= -->
    <g transform="translate(0, 0)">
        <!-- L1 Phase -->
        <line x1="70" y1="184" x2="${totalW - 30}" y2="184" stroke="url(#busbar_cu)" stroke-width="3.5" stroke-linecap="round"/>
        <!-- L2 Phase -->
        <line x1="70" y1="190" x2="${totalW - 30}" y2="190" stroke="url(#busbar_cu)" stroke-width="3.5" stroke-linecap="round"/>
        <!-- L3 Phase -->
        <line x1="70" y1="196" x2="${totalW - 30}" y2="196" stroke="url(#busbar_cu)" stroke-width="3.5" stroke-linecap="round"/>
        <!-- Neutral Bar (Sky Blue) -->
        <line x1="70" y1="206" x2="${totalW - 30}" y2="206" stroke="#38bdf8" stroke-width="2" stroke-dasharray="8,4" stroke-linecap="round"/>
        <!-- PE Earth Bar (Emerald Green) -->
        <line x1="70" y1="214" x2="${totalW - 30}" y2="214" stroke="#10b981" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Busbar Details Badge -->
        <rect x="${totalW - 275}" y="155" width="235" height="24" rx="4" fill="#1e293b" stroke="#d97706" stroke-width="1"/>
        <text x="${totalW - 265}" y="171" fill="#fbbf24" font-size="10" font-weight="black">MAIN Cu BUSBAR: ${meta.mainBusbarRating}A (Icw ${meta.busbarIcw}kA 1s)</text>

        <!-- Busbar Labels on Left -->
        <text x="35" y="193" fill="#fbbf24" font-size="9" font-weight="bold">L1,L2,L3</text>
        <text x="50" y="209" fill="#38bdf8" font-size="8" font-weight="bold">N</text>
        <text x="45" y="217" fill="#10b981" font-size="8" font-weight="bold">PE</text>
    </g>

    <!-- ================= VERTICAL BRANCH FEEDERS ================= -->`;

    mccBranches.forEach((b, i) => {
        const x = incomerW + i * branchW + branchW / 2;
        const isStandby = !!b.isStandby;

        // Colors per status
        const motorColor = isStandby ? '#f59e0b' : '#3b82f6';
        const badgeBg = isStandby ? '#78350f' : '#065f46';
        const badgeText = isStandby ? '#fde68a' : '#6ee7b7';
        const roleLabel = isStandby ? 'STANDBY' : 'DUTY';

        // Starter Graphic Layout inside Cubicle (y = 295 to 395)
        let starterSvg = '';
        if (b.starter === 'DOL') {
            starterSvg = `
                <!-- DOL: Contactor + Overload -->
                <rect x="${x - 48}" y="295" width="96" height="96" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
                <text x="${x}" y="310" fill="#94a3b8" font-size="9" font-weight="bold" text-anchor="middle">DOL STARTER</text>
                <!-- KM Contactor Contacts -->
                <line x1="${x - 16}" y1="318" x2="${x - 16}" y2="338" stroke="#38bdf8" stroke-width="2"/>
                <line x1="${x}" y1="318" x2="${x}" y2="338" stroke="#38bdf8" stroke-width="2"/>
                <line x1="${x + 16}" y1="318" x2="${x + 16}" y2="338" stroke="#38bdf8" stroke-width="2"/>
                <circle cx="${x - 16}" cy="318" r="2.5" fill="#38bdf8"/>
                <circle cx="${x}" cy="318" r="2.5" fill="#38bdf8"/>
                <circle cx="${x + 16}" cy="318" r="2.5" fill="#38bdf8"/>
                <text x="${x}" y="348" fill="#38bdf8" font-size="8" text-anchor="middle">Contactor KM</text>
                <!-- TOR Bimetal Heater -->
                <path d="M ${x - 12} 356 Q ${x - 6} 364 ${x} 356 Q ${x + 6} 348 ${x + 12} 356" fill="none" stroke="#f97316" stroke-width="2"/>
                <text x="${x}" y="372" fill="#f97316" font-size="8" text-anchor="middle">TOR Overload</text>
                <text x="${x}" y="384" fill="#cbd5e1" font-size="7.5" text-anchor="middle">${b.flc.toFixed(1)}A FLC</text>
            `;
        } else if (b.starter === 'SD') {
            starterSvg = `
                <!-- Star-Delta (Y-Δ) -->
                <rect x="${x - 48}" y="295" width="96" height="96" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.2"/>
                <text x="${x}" y="310" fill="#eab308" font-size="9" font-weight="bold" text-anchor="middle">STAR-DELTA (Y-Δ)</text>
                <!-- 3 Contactors Block -->
                <rect x="${x - 38}" y="318" width="76" height="30" rx="3" fill="#1e293b" stroke="#eab308" stroke-width="1"/>
                <text x="${x}" y="331" fill="#eab308" font-size="8" font-weight="bold" text-anchor="middle">KM1 (Main) • KM2 (Δ)</text>
                <text x="${x}" y="342" fill="#94a3b8" font-size="7.5" text-anchor="middle">KM3 (Star) + Timer</text>
                <!-- TOR -->
                <path d="M ${x - 12} 358 Q ${x - 6} 366 ${x} 358 Q ${x + 6} 350 ${x + 12} 358" fill="none" stroke="#f97316" stroke-width="2"/>
                <text x="${x}" y="373" fill="#f97316" font-size="8" text-anchor="middle">TOR (0.58× FLC)</text>
                <text x="${x}" y="384" fill="#cbd5e1" font-size="7.5" text-anchor="middle">${(b.flc * 0.58).toFixed(1)}A In-Delta</text>
            `;
        } else if (b.starter === 'VFD') {
            starterSvg = `
                <!-- Variable Frequency Drive -->
                <rect x="${x - 48}" y="295" width="96" height="96" rx="6" fill="#0f172a" stroke="#0ea5e9" stroke-width="1.5"/>
                <rect x="${x - 44}" y="299" width="88" height="15" rx="3" fill="#0369a1"/>
                <text x="${x}" y="310" fill="#ffffff" font-size="8.5" font-weight="black" text-anchor="middle">VFD INVERTER</text>
                <!-- Converter AC-DC-AC Symbol -->
                <rect x="${x - 30}" y="322" width="60" height="34" rx="4" fill="#1e293b" stroke="#38bdf8" stroke-width="1"/>
                <text x="${x - 14}" y="342" fill="#38bdf8" font-size="12" font-weight="bold">~</text>
                <text x="${x - 3}" y="342" fill="#94a3b8" font-size="11">═</text>
                <text x="${x + 9}" y="342" fill="#38bdf8" font-size="12" font-weight="bold">~</text>
                <text x="${x}" y="371" fill="#38bdf8" font-size="8" font-weight="bold" text-anchor="middle">0 - 50 Hz PWM</text>
                <text x="${x}" y="384" fill="#cbd5e1" font-size="7.5" text-anchor="middle">Soft Acceleration</text>
            `;
        } else {
            // Soft Starter
            starterSvg = `
                <!-- Electronic Soft Starter -->
                <rect x="${x - 48}" y="295" width="96" height="96" rx="6" fill="#0f172a" stroke="#a855f7" stroke-width="1.3"/>
                <text x="${x}" y="310" fill="#c084fc" font-size="9" font-weight="bold" text-anchor="middle">SOFT STARTER</text>
                <!-- Thyristors SCR Symbol -->
                <polygon points="${x - 12},324 ${x},336 ${x - 12},348" fill="#a855f7"/>
                <polygon points="${x + 12},348 ${x},336 ${x + 12},324" fill="#a855f7"/>
                <line x1="${x - 18}" y1="336" x2="${x + 18}" y2="336" stroke="#c084fc" stroke-width="1.5"/>
                <text x="${x}" y="362" fill="#c084fc" font-size="8" text-anchor="middle">SCR Voltage Ramp</text>
                <text x="${x}" y="374" fill="#94a3b8" font-size="7.5" text-anchor="middle">Internal Bypass</text>
                <text x="${x}" y="385" fill="#cbd5e1" font-size="7.5" text-anchor="middle">Istart ≤ 3× FLC</text>
            `;
        }

        svg += `
        <!-- Branch #${i + 1}: ${b.tag} -->
        <g class="mcc-branch-group cursor-pointer" onclick="highlightMccRow('${b.id}')">
            <!-- Vertical Cubicle Boundary Outline -->
            <rect x="${x - 64}" y="222" width="128" height="315" rx="8" fill="#131d31" stroke="#1e293b" stroke-width="1" opacity="0.6"/>

            <!-- Dropper Line from Busbar -->
            <line x1="${x}" y1="196" x2="${x}" y2="232" stroke="#f59e0b" stroke-width="2.5"/>
            <circle cx="${x}" cy="196" r="3" fill="#f59e0b"/>

            <!-- Branch Circuit Breaker (MCCB) -->
            <rect x="${x - 18}" y="232" width="36" height="28" rx="3" fill="#1e293b" stroke="#eab308" stroke-width="1.5"/>
            <line x1="${x - 6}" y1="237" x2="${x - 6}" y2="255" stroke="#eab308" stroke-width="1.5"/>
            <line x1="${x + 6}" y1="237" x2="${x + 6}" y2="255" stroke="#eab308" stroke-width="1.5"/>
            <line x1="${x - 10}" y1="246" x2="${x + 10}" y2="246" stroke="#ef4444" stroke-width="2"/>
            
            <!-- Breaker Rating Callout -->
            <rect x="${x - 36}" y="263" width="72" height="16" rx="3" fill="#0f172a" stroke="#334155" stroke-width="0.8"/>
            <text x="${x}" y="274" fill="#fde047" font-size="8.5" font-weight="black" text-anchor="middle">${b.breakerAt}A AT</text>

            <!-- Line to Starter Module -->
            <line x1="${x}" y1="279" x2="${x}" y2="295" stroke="#f59e0b" stroke-width="2"/>

            <!-- Starter Module Box -->
            ${starterSvg}

            <!-- Feeder Cable Line to Motor -->
            <line x1="${x}" y1="391" x2="${x}" y2="445" stroke="#38bdf8" stroke-width="2.5"/>
            
            <!-- Feeder Cable Label -->
            <rect x="${x - 56}" y="407" width="112" height="15" rx="3" fill="#0b1120" stroke="#1e293b" stroke-width="0.8"/>
            <text x="${x}" y="418" fill="#38bdf8" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">${b.cable}</text>

            <!-- Motor Symbol (Circle with M 3~) -->
            <circle cx="${x}" cy="460" r="18" fill="#1e293b" stroke="${motorColor}" stroke-width="2.5"/>
            <text x="${x}" y="465" fill="#ffffff" font-size="13" font-weight="black" text-anchor="middle">M</text>
            <text x="${x + 11}" y="456" fill="#fbbf24" font-size="7" font-weight="bold">3~</text>

            <!-- Motor Tag -->
            <text x="${x}" y="493" fill="#ffffff" font-size="10.5" font-weight="black" text-anchor="middle">${b.tag}</text>

            <!-- Motor Power & FLC -->
            <text x="${x}" y="506" fill="#cbd5e1" font-size="8.5" font-weight="bold" text-anchor="middle">${b.kw} kW • ${b.flc.toFixed(1)}A</text>

            <!-- Duty / Standby Badge -->
            <rect x="${x - 28}" y="513" width="56" height="14" rx="7" fill="${badgeBg}"/>
            <text x="${x}" y="523" fill="${badgeText}" font-size="7.5" font-weight="black" text-anchor="middle">${roleLabel}</text>
        </g>`;
    });

    svg += '</svg>';
    container.innerHTML = svg;
}

// Highlight branch in table when clicking diagram
function highlightMccRow(id) {
    const row = document.getElementById('mcc_row_' + id);
    if (!row) return;
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    row.classList.add('bg-blue-100', 'dark:bg-blue-900/40');
    setTimeout(() => {
        row.classList.remove('bg-blue-100', 'dark:bg-blue-900/40');
    }, 1800);
}

// Add branch via Quick Add row
function addMccBranchFromInputs() {
    const tag = (document.getElementById('mcc_new_tag')?.value || '').trim() || 'M-' + (mccBranches.length + 1);
    const desc = (document.getElementById('mcc_new_desc')?.value || '').trim() || 'Motor Feeder';
    const kw = parseFloat(document.getElementById('mcc_new_kw')?.value) || 15;
    const starter = document.getElementById('mcc_new_starter')?.value || 'SD';
    const isStandby = document.getElementById('mcc_new_standby')?.value === 'true';
    const dist = parseFloat(document.getElementById('mcc_new_dist')?.value) || 30;

    mccBranches.push({
        id: 'mcc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        tag,
        description: desc,
        kw,
        starter,
        isStandby,
        dist,
        cableType: 'XLPE',
        raceway: 'IMC'
    });

    // Reset inputs
    document.getElementById('mcc_new_tag').value = '';
    document.getElementById('mcc_new_desc').value = '';
    calcMcc();
    if (typeof toast === 'function') toast(`Added ${tag} to MCC Cabinet`);
}

function addMccBranchPrompt() {
    const tag = prompt('Enter Motor Equipment Tag:', 'PUMP-' + (mccBranches.length + 1));
    if (!tag) return;
    const kwStr = prompt('Enter Motor Power (kW):', '15');
    if (!kwStr) return;
    const kw = parseFloat(kwStr) || 15;

    mccBranches.push({
        id: 'mcc_' + Date.now().toString(36),
        tag,
        description: 'Auxiliary Motor Feeder',
        kw,
        starter: kw > 11 ? 'SD' : 'DOL',
        isStandby: false,
        dist: 30,
        cableType: 'XLPE',
        raceway: 'IMC'
    });
    calcMcc();
}

function deleteMccBranch(id) {
    const b = mccBranches.find(x => x.id === id);
    if (!b) return;
    if (!confirm(`Delete branch ${b.tag} from MCC?`)) return;
    mccBranches = mccBranches.filter(x => x.id !== id);
    calcMcc();
}

function duplicateMccBranch(id) {
    const b = mccBranches.find(x => x.id === id);
    if (!b) return;
    const copy = JSON.parse(JSON.stringify(b));
    copy.id = 'mcc_' + Date.now().toString(36);
    copy.tag = copy.tag + '-B';
    copy.isStandby = true;
    mccBranches.push(copy);
    calcMcc();
}

function toggleMccStandby(id) {
    const b = mccBranches.find(x => x.id === id);
    if (!b) return;
    b.isStandby = !b.isStandby;
    calcMcc();
}

function updateMccBranch(id, field, val) {
    const b = mccBranches.find(x => x.id === id);
    if (!b) return;
    b[field] = (field === 'kw' || field === 'dist') ? (parseFloat(val) || 0) : val;
    calcMcc();
}

function clearAllMccBranches() {
    if (!confirm('Clear all motor branches from this MCC cabinet?')) return;
    mccBranches = [];
    calcMcc();
}

// Import all motorized equipment from MagicEquipment Global Schedule
function importAllMotorsFromSchedule() {
    if (!window.MagicEquipment) {
        alert('Equipment schedule module not loaded.');
        return;
    }
    const allEq = window.MagicEquipment.getAll();
    if (!allEq || allEq.length === 0) {
        alert('Global Equipment Schedule is currently empty. Add equipment first.');
        return;
    }

    // Filter motorized equipment
    const motorEq = allEq.filter(eq => {
        const kw = Number(eq.powerKw) || 0;
        const disc = eq.discipline;
        const type = (eq.type || '').toLowerCase();
        return kw > 0 || type.includes('pump') || type.includes('fan') || type.includes('ahu') || type.includes('chiller');
    });

    if (motorEq.length === 0) {
        alert('No motorized equipment (kW > 0) found in Global Equipment Schedule.');
        return;
    }

    const imported = [];
    motorEq.forEach(eq => {
        const qty = Math.max(1, Number(eq.qty) || 1);
        const unitKw = Number(eq.powerKw) || 5.5;
        const notes = ((eq.notes || '') + ' ' + (eq.description || '')).toLowerCase();
        const hasStandbyMention = notes.includes('standby') || notes.includes('spare') || notes.includes('duty');

        let starter = eq.starter && eq.starter !== '-' ? eq.starter : (unitKw > 15 ? 'SD' : (unitKw > 5.5 ? 'SD' : 'DOL'));

        if (qty === 2 && hasStandbyMention) {
            // Duty Branch
            imported.push({
                id: 'mcc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                tag: eq.tag + 'A',
                description: (eq.description || eq.type) + ' (Duty)',
                kw: unitKw,
                volt: eq.voltage || 400,
                pf: eq.pf || 0.85,
                eff: eq.eff || 0.90,
                starter: starter,
                isStandby: false,
                dist: 30,
                cableType: 'XLPE',
                raceway: 'IMC',
                eqRef: eq.id
            });
            // Standby Branch
            imported.push({
                id: 'mcc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                tag: eq.tag + 'B',
                description: (eq.description || eq.type) + ' (Standby)',
                kw: unitKw,
                volt: eq.voltage || 400,
                pf: eq.pf || 0.85,
                eff: eq.eff || 0.90,
                starter: starter,
                isStandby: true,
                dist: 30,
                cableType: 'XLPE',
                raceway: 'IMC',
                eqRef: eq.id
            });
        } else {
            for (let q = 1; q <= qty; q++) {
                imported.push({
                    id: 'mcc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
                    tag: qty > 1 ? `${eq.tag}-${q}` : eq.tag,
                    description: eq.description || eq.type,
                    kw: unitKw,
                    volt: eq.voltage || 400,
                    pf: eq.pf || 0.85,
                    eff: eq.eff || 0.90,
                    starter: starter,
                    isStandby: false,
                    dist: 30,
                    cableType: 'XLPE',
                    raceway: 'IMC',
                    eqRef: eq.id
                });
            }
        }
    });

    mccBranches = imported;
    calcMcc();
    switchMotorMode('mcc');
    if (typeof toast === 'function') toast(`Imported ${imported.length} motor branches from Global Schedule!`);
}

// Add single equipment into MCC from picker
function addMccBranchFromEquipment(eq) {
    if (!eq) return;
    const qty = Math.max(1, Number(eq.qty) || 1);
    const unitKw = Number(eq.powerKw) || 5.5;
    const notes = ((eq.notes || '') + ' ' + (eq.description || '')).toLowerCase();
    const hasStandbyMention = notes.includes('standby') || notes.includes('spare') || notes.includes('duty');
    let starter = eq.starter && eq.starter !== '-' ? eq.starter : (unitKw > 15 ? 'SD' : (unitKw > 5.5 ? 'SD' : 'DOL'));

    if (qty === 2 && hasStandbyMention) {
        mccBranches.push({
            id: 'mcc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            tag: eq.tag + 'A',
            description: (eq.description || eq.type) + ' (Duty)',
            kw: unitKw,
            volt: eq.voltage || 400,
            pf: eq.pf || 0.85,
            eff: eq.eff || 0.90,
            starter: starter,
            isStandby: false,
            dist: 30,
            cableType: 'XLPE',
            raceway: 'IMC',
            eqRef: eq.id
        });
        mccBranches.push({
            id: 'mcc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            tag: eq.tag + 'B',
            description: (eq.description || eq.type) + ' (Standby)',
            kw: unitKw,
            volt: eq.voltage || 400,
            pf: eq.pf || 0.85,
            eff: eq.eff || 0.90,
            starter: starter,
            isStandby: true,
            dist: 30,
            cableType: 'XLPE',
            raceway: 'IMC',
            eqRef: eq.id
        });
    } else {
        mccBranches.push({
            id: 'mcc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
            tag: eq.tag,
            description: eq.description || eq.type,
            kw: unitKw,
            volt: eq.voltage || 400,
            pf: eq.pf || 0.85,
            eff: eq.eff || 0.90,
            starter: starter,
            isStandby: false,
            dist: 30,
            cableType: 'XLPE',
            raceway: 'IMC',
            eqRef: eq.id
        });
    }

    calcMcc();
    switchMotorMode('mcc');
}

// Export SLD as SVG file
function exportMccSldSvg() {
    const container = document.getElementById('mcc_sld_container');
    if (!container) return;
    const svgEl = container.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const mccName = (document.getElementById('mcc_name')?.value || 'MCC').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = url;
    a.download = `${mccName}_Single_Line_Diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof toast === 'function') toast('MCC Single Line Diagram SVG downloaded!');
}

// Auto-initialize MCC on script load
if (typeof window !== 'undefined') {
    window.switchMotorMode = switchMotorMode;
    window.calcMcc = calcMcc;
    window.renderMccTable = renderMccTable;
    window.renderMccSld = renderMccSld;
    window.highlightMccRow = highlightMccRow;
    window.addMccBranchFromInputs = addMccBranchFromInputs;
    window.addMccBranchPrompt = addMccBranchPrompt;
    window.deleteMccBranch = deleteMccBranch;
    window.duplicateMccBranch = duplicateMccBranch;
    window.toggleMccStandby = toggleMccStandby;
    window.updateMccBranch = updateMccBranch;
    window.clearAllMccBranches = clearAllMccBranches;
    window.importAllMotorsFromSchedule = importAllMotorsFromSchedule;
    window.addMccBranchFromEquipment = addMccBranchFromEquipment;
    window.exportMccSldSvg = exportMccSldSvg;

    setTimeout(() => {
        loadMccBranches();
        if (document.getElementById('mcc_table_body')) {
            calcMcc();
        }
    }, 250);
}
