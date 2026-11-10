// ============================================================================
// Mechanical & HVAC Modules 6–9: Cooling Tower Make-up, Chiller ROI, Fuel Tank & Data Center PUE Estimator
// File: js/modules/mechanical/plant-tools.js
// ============================================================================

let currentCtSys = 'SI';

function setCtSystem(sys) {
    if (sys === currentCtSys) return;

    const btnSI = document.getElementById('btn_ct_sys_SI');
    const btnIP = document.getElementById('btn_ct_sys_IP');

    if (sys === 'IP') {
        btnSI.className = "px-3 py-1 text-xs font-bold rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors";
        btnIP.className = "px-3 py-1 text-xs font-bold rounded shadow-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 transition-colors";
    } else {
        btnIP.className = "px-3 py-1 text-xs font-bold rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors";
        btnSI.className = "px-3 py-1 text-xs font-bold rounded shadow-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 transition-colors";
    }

    const qUnitEl = document.getElementById('ct_q_unit');
    const qEl = document.getElementById('ct_q');
    let qVal = parseFloat(qEl.value) || 0;
    let q_kW = qUnitEl.value === 'MW' ? qVal * 1000 : (qUnitEl.value === 'TR' ? qVal * 3.51685 : qVal);

    const dtUnitEl = document.getElementById('ct_dt_unit');
    const dtEl = document.getElementById('ct_dt');
    let dtVal = parseFloat(dtEl.value) || 0;
    let dt_C = dtUnitEl.value === 'F' ? dtVal * (5 / 9) : dtVal;

    const calcCapUnitEl = document.getElementById('ct_calc_cap_unit');
    const calcCapEl = document.getElementById('ct_calc_cap');
    let cCapVal = parseFloat(calcCapEl.value) || 0;
    let cCap_kW = calcCapUnitEl.value === 'TR' ? cCapVal * 3.51685 : cCapVal;

    if (sys === 'IP') {
        qUnitEl.value = 'TR';
        if (!document.getElementById('ct_use_calc').checked) qEl.value = (q_kW / 3.51685).toFixed(1);
        dtUnitEl.value = 'F';
        dtEl.value = (dt_C * 1.8).toFixed(1);
        calcCapUnitEl.value = 'TR';
        calcCapEl.value = (cCap_kW / 3.51685).toFixed(1);
    } else {
        qUnitEl.value = 'kW';
        if (!document.getElementById('ct_use_calc').checked) qEl.value = q_kW.toFixed(0);
        dtUnitEl.value = 'C';
        dtEl.value = dt_C.toFixed(1);
        calcCapUnitEl.value = 'kW';
        calcCapEl.value = cCap_kW.toFixed(0);
    }

    currentCtSys = sys;
    if (document.getElementById('ct_use_calc').checked) {
        runCtCalc();
    } else {
        updateCoolingTower();
    }
}

function toggleCtCalc() {
    const isChecked = document.getElementById('ct_use_calc').checked;
    const panel = document.getElementById('ct_calc_panel');
    const qInput = document.getElementById('ct_q');
    const qUnit = document.getElementById('ct_q_unit');

    if (isChecked) {
        panel.classList.remove('hidden');
        qInput.readOnly = true;
        qInput.classList.add('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed', 'border-transparent');
        qUnit.disabled = true;
        runCtCalc();
    } else {
        panel.classList.add('hidden');
        qInput.readOnly = false;
        qInput.classList.remove('bg-slate-100', 'dark:bg-slate-900', 'text-slate-500', 'cursor-not-allowed', 'border-transparent');
        qUnit.disabled = false;
    }
}

function runCtCalc() {
    if (!document.getElementById('ct_use_calc').checked) return;

    const cap = parseFloat(document.getElementById('ct_calc_cap').value) || 0;
    const unit = document.getElementById('ct_calc_cap_unit').value;
    const cop = parseFloat(document.getElementById('ct_calc_cop').value) || 1;

    let cap_kW = cap;
    if (unit === 'TR') cap_kW = cap * 3.51685;

    let safeCop = cop <= 0 ? 1 : cop;

    let q_rej_kw = cap_kW * (1 + (1 / safeCop));

    const qUnitEl = document.getElementById('ct_q_unit');
    if (currentCtSys === 'IP') {
        qUnitEl.value = 'TR';
        document.getElementById('ct_q').value = (q_rej_kw / 3.51685).toFixed(1);
    } else {
        qUnitEl.value = 'kW';
        document.getElementById('ct_q').value = q_rej_kw.toFixed(1);
    }

    updateCoolingTower();
}

function updateCoolingTower() {
    const Q_input = parseFloat(document.getElementById('ct_q').value) || 0;
    const Q_unit = document.getElementById('ct_q_unit').value;
    let Q_kW = Q_input;
    if (Q_unit === 'MW') Q_kW = Q_input * 1000;
    else if (Q_unit === 'TR') Q_kW = Q_input * 3.51685;

    const dt_input = parseFloat(document.getElementById('ct_dt').value) || 0.1;
    const dt_unit = document.getElementById('ct_dt_unit').value;
    let dt_C = dt_unit === 'F' ? dt_input * (5 / 9) : dt_input;
    if (dt_C === 0) dt_C = 0.1;

    const coc = parseFloat(document.getElementById('ct_coc').value) || 1.1;
    const safeCOC = coc <= 1 ? 1.01 : coc;

    const driftPct = parseFloat(document.getElementById('ct_drift').value) || 0.005;
    const hrs = parseFloat(document.getElementById('ct_hrs').value) || 24;
    const days = parseFloat(document.getElementById('ct_days').value) || 365;

    // Circulation Flow m3/h (Q = m * Cp * dT) => m = Q / (4.184 * dT) kg/s
    const m_dot_kgs = Q_kW / (4.184 * dt_C);
    const C_m3h = m_dot_kgs * 3.6;

    // Evaporation (E = 0.0018 * C * dT)
    const E_m3h = 0.0018 * C_m3h * dt_C;

    // Drift (D = C * driftPct / 100)
    const D_m3h = C_m3h * (driftPct / 100);

    // Blowdown (B = E / (COC - 1) - D)
    let B_m3h = (E_m3h / (safeCOC - 1)) - D_m3h;
    if (B_m3h < 0) B_m3h = 0; // Prevent negative blowdown if drift is exceptionally high

    const M_m3h = E_m3h + D_m3h + B_m3h;

    const M_m3d = M_m3h * hrs;
    const M_m3y = M_m3d * days;

    document.getElementById('ct_C').innerText = C_m3h.toFixed(1);
    document.getElementById('ct_E_h').innerHTML = `${E_m3h.toFixed(2)} <span class="text-sm font-normal text-slate-500">m³/h</span>`;
    document.getElementById('ct_E_d').innerText = (E_m3h * hrs).toFixed(1);

    document.getElementById('ct_D_h').innerHTML = `${D_m3h.toFixed(3)} <span class="text-sm font-normal text-slate-500">m³/h</span>`;
    document.getElementById('ct_D_d').innerText = (D_m3h * hrs).toFixed(2);

    document.getElementById('ct_B_h').innerHTML = `${B_m3h.toFixed(2)} <span class="text-sm font-normal text-slate-500">m³/h</span>`;
    document.getElementById('ct_B_d').innerText = (B_m3h * hrs).toFixed(1);

    let E_pct = M_m3h > 0 ? (E_m3h / M_m3h) * 100 : 0;
    let D_pct = M_m3h > 0 ? (D_m3h / M_m3h) * 100 : 0;
    let B_pct = M_m3h > 0 ? (B_m3h / M_m3h) * 100 : 0;

    document.getElementById('ct_E_pct').innerText = `${E_pct.toFixed(1)}%`;
    document.getElementById('ct_D_pct').innerText = `${D_pct.toFixed(1)}%`;
    document.getElementById('ct_B_pct').innerText = `${B_pct.toFixed(1)}%`;

    document.getElementById('ct_M_d').innerText = M_m3d.toFixed(1);
    document.getElementById('ct_M_y').innerText = M_m3y.toLocaleString('en-US', { maximumFractionDigits: 0 });

    // Generate Summary Table and Chart Data for different COCs
    const cocArray = [1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];
    let tableHtml = '';
    let chartData = [];

    cocArray.forEach(c => {
        let simB = Math.max(0, (E_m3h / (c - 1)) - D_m3h);
        let simM = E_m3h + D_m3h + simB;
        let simMd = simM * hrs;
        let simMy = simMd * days;

        chartData.push({ x: c, y: simMy, md: simMd, bd: simB * hrs });

        let isSelected = Math.abs(c - safeCOC) < 0.08;
        let rowClass = isSelected
            ? 'bg-indigo-50 dark:bg-indigo-900/40 font-bold text-indigo-700 dark:text-indigo-300'
            : 'hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition-colors';

        tableHtml += `
        <tr onclick="setCtCoc(${c})" onmouseenter="hoverCtCoc(${c})" onmouseleave="hoverCtCoc(null)"
            title="Click to set COC to ${c.toFixed(1)}"
            class="cursor-pointer border-b border-slate-100 dark:border-slate-700/50 ${rowClass}">
            <td class="p-2.5 border-r border-slate-100 dark:border-slate-700/50 text-center font-mono">${c.toFixed(1)}</td>
            <td class="p-2.5 text-right font-mono">${simMd.toFixed(1)}</td>
            <td class="p-2.5 text-right font-mono">${simMy.toLocaleString('en-US', { maximumFractionDigits: 0 })}</td>
        </tr>
    `;
    });
    document.getElementById('ct_summaryTable').innerHTML = tableHtml;

    // Persist state for smooth curve & interactive hover
    window._ctChartState = {
        E_m3h, D_m3h, hrs, days,
        currentCoc: safeCOC,
        currentMd: M_m3d,
        currentMy: M_m3y,
        data: chartData,
        hoverCoc: window._ctChartState?.hoverCoc ?? null
    };

    // Draw Smooth COC Graph
    drawCtChart('ctChart', chartData, safeCOC, M_m3y);
}




function updateROI() {
    const cap = parseFloat(document.getElementById('roi_cap').value) || 0;
    const capUnit = document.getElementById('roi_cap_unit').value;
    const hrs = parseFloat(document.getElementById('roi_hrs').value) || 0;
    const rate = parseFloat(document.getElementById('roi_rate').value) || 0;
    const currency = document.getElementById('roi_currency').value || '$';

    const copA = parseFloat(document.getElementById('roi_copA').value) || 1;
    const costA_kWr = parseFloat(document.getElementById('roi_costA').value) || 0;

    const copB = parseFloat(document.getElementById('roi_copB').value) || 1;
    const costB_kWr = parseFloat(document.getElementById('roi_costB').value) || 0;

    let kWr = capUnit === 'TR' ? cap * 3.51685 : cap;
    let displayCap = `${cap} ${capUnit}`;

    let capexA = kWr * costA_kWr;
    let capexB = kWr * costB_kWr;

    let kw_A = kWr / copA;
    let kw_B = kWr / copB;

    let opA = kw_A * hrs * rate;
    let opB = kw_B * hrs * rate;

    let savings = opA - opB;
    let premium = capexB - capexA;
    let roi = premium > 0 && savings > 0 ? (premium / savings).toFixed(1) : '-';

    // Update Tables
    document.getElementById('roi_res_capA').innerText = displayCap;
    document.getElementById('roi_res_capB').innerText = displayCap;
    document.getElementById('roi_res_copA').innerText = copA.toFixed(2);
    document.getElementById('roi_res_copB').innerText = copB.toFixed(2);
    document.getElementById('roi_res_costA').innerText = `${currency}${costA_kWr}/kWr`;
    document.getElementById('roi_res_costB').innerText = `${currency}${costB_kWr}/kWr`;

    document.getElementById('roi_res_capexA').innerText = `${currency}${capexA.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    document.getElementById('roi_res_capexB').innerText = `${currency}${capexB.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

    document.getElementById('roi_res_opA').innerText = `${currency}${opA.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    document.getElementById('roi_res_opB').innerText = `${currency}${opB.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

    document.getElementById('roi_res_savings').innerText = `${currency}${savings > 0 ? savings.toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}`;

    document.getElementById('roi_display_value').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg> ${roi} Yrs`;

    // Environmental Impact (Assume approx 0.4 kg CO2 per kWh)
    let kwhSaved = (kw_A - kw_B) * hrs;
    if (kwhSaved < 0) kwhSaved = 0;
    let energyPct = kw_A > 0 ? ((kw_A - kw_B) / kw_A) * 100 : 0;
    let co2_saved_tons = (kwhSaved * 0.4) / 1000;
    let cars = co2_saved_tons / 4.6; // ~4.6 tons per passenger vehicle per year
    let trees = co2_saved_tons * 40; // ~40 trees offset 1 ton

    document.getElementById('roi_env_pct').innerText = `${energyPct.toFixed(1)}%`;
    document.getElementById('roi_env_kwh').innerText = `${kwhSaved.toLocaleString('en-US', { maximumFractionDigits: 0 })} kWh/yr`;
    document.getElementById('roi_env_co2').innerText = `${co2_saved_tons.toFixed(1)} Tons`;
    document.getElementById('roi_env_cars').innerText = `${Math.round(cars)} Vehicles`;
    document.getElementById('roi_env_trees').innerText = `${Math.round(trees)} Trees`;

    drawRoiChart('roiChart', capexA, capexB, opA, opB, currency);
}




function updateFuel() {
    const rate = parseFloat(document.getElementById('fuel_rate').value) || 0;
    const time = parseFloat(document.getElementById('fuel_time').value) || 0;
    const margin = parseFloat(document.getElementById('fuel_margin').value) || 0;

    const totalVol = rate * time * (1 + margin / 100);

    document.getElementById('res_fuel_vol').innerText = `${totalVol.toFixed(0)} Liters`;
    document.getElementById('res_fuel_m3').innerText = `${(totalVol / 1000).toFixed(2)} m³`;

    const selectedSize = parseFloat(document.getElementById('fuel_tank_size')?.value) || 1000;
    const numTanks = Math.ceil(totalVol / selectedSize);
    const tankResEl = document.getElementById('res_fuel_tanks');
    if (tankResEl) {
        tankResEl.innerText = `${numTanks} Tank(s)`;
    }
}



const _origUpdateCoolingTower = updateCoolingTower;
updateCoolingTower = function() {
    _origUpdateCoolingTower();
    if (window.MagicStore) {
        const md = parseFloat(document.getElementById('ct_M_d')?.innerText) || 0;
        const q = parseFloat(document.getElementById('ct_q')?.value) || 0;
        window.MagicStore.publish({
            ctHeatRejectionKw: q,
            ctMakeupM3Day: md
        }, 'ctPage');
    }
};

const _origUpdateROI = updateROI;
updateROI = function() {
    _origUpdateROI();
    if (window.MagicStore) {
        const pb = parseFloat(document.getElementById('roi_payback')?.innerText) || 0;
        window.MagicStore.publish({ roiPaybackYears: pb }, 'roiPage');
    }
};

const _origUpdateFuel = updateFuel;
updateFuel = function() {
    _origUpdateFuel();
    if (window.MagicStore) {
        const vol = parseFloat(document.getElementById('res_fuel_vol')?.innerText) || 0;
        window.MagicStore.publish({ fuelTotalLiters: vol }, 'fuelTankPage');
    }
};

// ============================================================================
// MODULE 9: DATA CENTER PUE ESTIMATOR (ASHRAE TC 9.9 / ISO/IEC 30134-2)
// ============================================================================

const PUE_COOLING_PRESETS = {
    AIR_STD: {
        name: 'Air-Cooled Chiller + CRAC / CRAH',
        cop: 3.20,
        pumpFanPct: 10.0,
        econPct: 0.0,
        upsLossPct: 5.5,
        pduLossPct: 2.5,
        auxPct: 1.5
    },
    WATER_CENT: {
        name: 'Water-Cooled Centrifugal Chiller + CRAH (VFD)',
        cop: 5.80,
        pumpFanPct: 8.5,
        econPct: 10.0,
        upsLossPct: 4.5,
        pduLossPct: 2.0,
        auxPct: 1.0
    },
    MAG_ECON: {
        name: 'Magnetic Bearing Chiller + Waterside Economizer',
        cop: 6.80,
        pumpFanPct: 6.5,
        econPct: 30.0,
        upsLossPct: 3.5,
        pduLossPct: 1.8,
        auxPct: 0.8
    },
    DLC_HYBRID: {
        name: 'Direct-to-Chip Liquid Cooling (DLC) + Rear Door Hx',
        cop: 9.50,
        pumpFanPct: 3.5,
        econPct: 55.0,
        upsLossPct: 3.0,
        pduLossPct: 1.5,
        auxPct: 0.6
    },
    CUSTOM: {
        name: 'Custom Cooling & Electrical Parameters'
    }
};

function applyPuePreset(presetKey) {
    const preset = PUE_COOLING_PRESETS[presetKey];
    const archSelect = document.getElementById('pue_arch_preset');
    if (archSelect && archSelect.value !== presetKey) {
        archSelect.value = presetKey;
    }
    if (!preset || presetKey === 'CUSTOM') {
        updatePUE();
        return;
    }

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
    };

    setVal('pue_cop', preset.cop);
    const kwTrEl = document.getElementById('pue_kw_tr');
    if (kwTrEl && preset.cop > 0) kwTrEl.value = (3.51685 / preset.cop).toFixed(3);
    setVal('pue_pump_fan_pct', preset.pumpFanPct);
    setVal('pue_econ_pct', preset.econPct);
    setVal('pue_ups_loss_pct', preset.upsLossPct);
    setVal('pue_pdu_loss_pct', preset.pduLossPct);
    setVal('pue_aux_pct', preset.auxPct);

    updatePUE();
}

function syncPueCopAndKwTr(source) {
    const copEl = document.getElementById('pue_cop');
    const kwTrEl = document.getElementById('pue_kw_tr');
    const archEl = document.getElementById('pue_arch_preset');
    if (!copEl || !kwTrEl) return;

    if (archEl) archEl.value = 'CUSTOM';

    if (source === 'cop') {
        const cop = parseFloat(copEl.value) || 0;
        if (cop > 0) {
            kwTrEl.value = (3.51685 / cop).toFixed(3);
        }
    } else if (source === 'kwtr') {
        const kwTr = parseFloat(kwTrEl.value) || 0;
        if (kwTr > 0) {
            copEl.value = (3.51685 / kwTr).toFixed(2);
        }
    }
    updatePUE();
}

function setPueLoadFactor(lfPct) {
    const lfEl = document.getElementById('pue_load_factor');
    const lfSlider = document.getElementById('pue_load_slider');
    if (lfEl) lfEl.value = lfPct;
    if (lfSlider) lfSlider.value = lfPct;
    updatePUE();
}

function syncPueLoadInput(source) {
    const lfEl = document.getElementById('pue_load_factor');
    const lfSlider = document.getElementById('pue_load_slider');
    if (source === 'slider' && lfSlider && lfEl) {
        lfEl.value = lfSlider.value;
    } else if (source === 'number' && lfEl && lfSlider) {
        lfSlider.value = Math.max(10, Math.min(100, parseFloat(lfEl.value) || 50));
    }
    updatePUE();
}

function calcPueAtLoadFactor(lfFrac, params) {
    const safeLf = Math.max(0.05, Math.min(1.0, lfFrac));
    const pItActualKw = params.itRatedKw * safeLf;

    // 1. Electrical Losses (Fixed No-Load Core Loss ~30% + Variable Load Loss ~70%)
    const upsPct = params.upsLossPct / 100;
    const pduPct = params.pduLossPct / 100;
    const pUpsLossKw = params.itRatedKw * upsPct * (0.30 + 0.70 * Math.pow(safeLf, 1.15));
    const pPduLossKw = params.itRatedKw * pduPct * (0.25 + 0.75 * Math.pow(safeLf, 1.25));
    const pLightingAuxKw = params.itRatedKw * (params.auxPct / 100);
    const pElecOverheadKw = pUpsLossKw + pPduLossKw + pLightingAuxKw;

    // 2. Total Indoor Heat Rejection (IT + UPS/PDU/Lighting heat dissipation inside building)
    const qCoolingLoadKw = pItActualKw + (pUpsLossKw * 0.85) + (pPduLossKw * 0.85) + pLightingAuxKw;

    // 3. Chiller Part-Load Performance & Economizer Free-Cooling Relief
    // VFD/Centrifugal chillers often have higher COP at 50-75% load, while very low load (<25%) has auxiliary overhead
    const partLoadCopMultiplier = safeLf < 0.30
        ? (0.82 + 0.60 * safeLf)
        : (1.0 + 0.10 * Math.sin(((safeLf - 0.30) / 0.70) * Math.PI));
    const effectiveChillerCop = Math.max(0.8, params.cop * partLoadCopMultiplier);
    const econFrac = Math.max(0, Math.min(0.90, params.econPct / 100));

    // Mechanical chiller handles (1 - econFrac) of cooling hours; economizer mode uses ~15% of compressor power
    const pChillerCompKw = (qCoolingLoadKw / effectiveChillerCop) * ((1 - econFrac) + econFrac * 0.15);

    // 4. Pumps, Cooling Tower Fans & CRAH/CRAC Fans (Fixed minimum flow/air + VFD affinity law component)
    const pumpFanPct = params.pumpFanPct / 100;
    const pPumpFanKw = params.itRatedKw * pumpFanPct * (0.35 + 0.65 * Math.pow(safeLf, 1.6));

    const pCoolingTotalKw = pChillerCompKw + pPumpFanKw;
    const pTotalFacilityKw = pItActualKw + pCoolingTotalKw + pElecOverheadKw;

    const pPUE = pItActualKw > 0 ? (pItActualKw + pCoolingTotalKw) / pItActualKw : 1.0;
    const mlc = pItActualKw > 0 ? pCoolingTotalKw / pItActualKw : 0;
    const elc = pItActualKw > 0 ? pElecOverheadKw / pItActualKw : 0;
    const pue = pItActualKw > 0 ? pTotalFacilityKw / pItActualKw : 1.0;
    const dciePct = pue > 0 ? (100 / pue) : 0;
    const plantSystemCop = pCoolingTotalKw > 0 ? (qCoolingLoadKw / pCoolingTotalKw) : params.cop;

    return {
        lfPct: safeLf * 100,
        pItActualKw,
        pUpsLossKw,
        pPduLossKw,
        pLightingAuxKw,
        pElecOverheadKw,
        qCoolingLoadKw,
        effectiveChillerCop,
        plantSystemCop,
        pChillerCompKw,
        pPumpFanKw,
        pCoolingTotalKw,
        pTotalFacilityKw,
        pPUE,
        mlc,
        elc,
        pue,
        dciePct
    };
}

function getPueGradeBadge(pue) {
    if (pue <= 1.20) {
        return {
            grade: 'World-Class / Hyperscale',
            tierColor: 'text-emerald-600 dark:text-emerald-400',
            badgeHtml: `<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">🏆 World-Class (≤ 1.20)</span>`
        };
    } else if (pue <= 1.40) {
        return {
            grade: 'High-Efficiency Modern DC',
            tierColor: 'text-teal-600 dark:text-teal-400',
            badgeHtml: `<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30">✦ High-Efficiency (1.21–1.40)</span>`
        };
    } else if (pue <= 1.65) {
        return {
            grade: 'Standard Enterprise DC',
            tierColor: 'text-amber-600 dark:text-amber-400',
            badgeHtml: `<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">⚡ Standard Enterprise (1.41–1.65)</span>`
        };
    }
    return {
        grade: 'Legacy / Retrofit Candidate',
        tierColor: 'text-rose-600 dark:text-rose-400',
        badgeHtml: `<span class="px-2.5 py-1 rounded-full text-xs font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30">⚠️ Legacy Facility (&gt; 1.65)</span>`
    };
}

function updatePUE() {
    const itCapVal = parseFloat(document.getElementById('pue_it_cap')?.value) || 1000;
    const itCapUnit = document.getElementById('pue_it_unit')?.value || 'kW';
    const itRatedKw = itCapUnit === 'MW' ? itCapVal * 1000 : itCapVal;

    const loadFactorPct = Math.max(10, Math.min(100, parseFloat(document.getElementById('pue_load_factor')?.value) || 75));
    const cop = Math.max(0.8, parseFloat(document.getElementById('pue_cop')?.value) || 5.8);
    const pumpFanPct = Math.max(0, parseFloat(document.getElementById('pue_pump_fan_pct')?.value) || 8.5);
    const econPct = Math.max(0, Math.min(95, parseFloat(document.getElementById('pue_econ_pct')?.value) || 10));
    const upsLossPct = Math.max(0, parseFloat(document.getElementById('pue_ups_loss_pct')?.value) || 4.5);
    const pduLossPct = Math.max(0, parseFloat(document.getElementById('pue_pdu_loss_pct')?.value) || 2.0);
    const auxPct = Math.max(0, parseFloat(document.getElementById('pue_aux_pct')?.value) || 1.0);
    const rate = Math.max(0, parseFloat(document.getElementById('pue_elec_rate')?.value) || 4.0);
    const currency = document.getElementById('pue_currency')?.value || '฿';

    const params = {
        itRatedKw,
        cop,
        pumpFanPct,
        econPct,
        upsLossPct,
        pduLossPct,
        auxPct
    };

    const cur = calcPueAtLoadFactor(loadFactorPct / 100, params);
    const gradeInfo = getPueGradeBadge(cur.pue);

    // Update KPI Cards
    const setTxt = (id, txt) => {
        const el = document.getElementById(id);
        if (el) el.innerText = txt;
    };
    const setHtml = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    setHtml('pue_res_total', `<span class="${gradeInfo.tierColor}">${cur.pue.toFixed(2)}</span>`);
    setHtml('pue_res_grade_badge', gradeInfo.badgeHtml);
    setTxt('pue_res_dcie', `DCiE: ${cur.dciePct.toFixed(1)}% (IT Share of Total Power)`);

    setTxt('pue_res_ppue', cur.pPUE.toFixed(2));
    setTxt('pue_res_mlc_sub', `MLC: ${cur.mlc.toFixed(3)} kW_cool/kW_IT • Sys COP: ${cur.plantSystemCop.toFixed(2)}`);

    setTxt('pue_res_elc', cur.elc.toFixed(3));
    setTxt('pue_res_elc_sub', `UPS: ${cur.pUpsLossKw.toFixed(1)} kW + PDU/Xfmr: ${cur.pPduLossKw.toFixed(1)} kW`);

    setTxt('pue_res_facility_kw', `${cur.pTotalFacilityKw.toFixed(1)} kW`);
    setTxt('pue_res_facility_sub', `IT: ${cur.pItActualKw.toFixed(1)} kW + Overhead: ${(cur.pCoolingTotalKw + cur.pElecOverheadKw).toFixed(1)} kW`);

    // Power Breakdown Bar & Table
    const tot = Math.max(0.1, cur.pTotalFacilityKw);
    const pctIt = (cur.pItActualKw / tot) * 100;
    const pctChiller = (cur.pChillerCompKw / tot) * 100;
    const pctPumpFan = (cur.pPumpFanKw / tot) * 100;
    const pctElec = (cur.pElecOverheadKw / tot) * 100;

    const setBarWidth = (id, pct) => {
        const el = document.getElementById(id);
        if (el) el.style.width = `${Math.max(1, pct).toFixed(1)}%`;
    };
    setBarWidth('pue_bar_it', pctIt);
    setBarWidth('pue_bar_chiller', pctChiller);
    setBarWidth('pue_bar_pump', pctPumpFan);
    setBarWidth('pue_bar_elec', pctElec);

    setTxt('pue_bk_it_kw', `${cur.pItActualKw.toFixed(1)} kW (${pctIt.toFixed(1)}%)`);
    setTxt('pue_bk_chiller_kw', `${cur.pChillerCompKw.toFixed(1)} kW (${pctChiller.toFixed(1)}%)`);
    setTxt('pue_bk_pump_kw', `${cur.pPumpFanKw.toFixed(1)} kW (${pctPumpFan.toFixed(1)}%)`);
    setTxt('pue_bk_elec_kw', `${cur.pElecOverheadKw.toFixed(1)} kW (${pctElec.toFixed(1)}%)`);
    setTxt('pue_bk_heat_rej', `${cur.qCoolingLoadKw.toFixed(1)} kW (${(cur.qCoolingLoadKw / 3.51685).toFixed(1)} RT)`);

    // Annual Energy, Cost & Carbon Summary (8,760 hrs/yr)
    const annualItMwh = (cur.pItActualKw * 8760) / 1000;
    const annualOverheadMwh = ((cur.pCoolingTotalKw + cur.pElecOverheadKw) * 8760) / 1000;
    const annualTotalMwh = (cur.pTotalFacilityKw * 8760) / 1000;
    const annualCost = annualTotalMwh * 1000 * rate;
    const annualOverheadCost = annualOverheadMwh * 1000 * rate;
    const annualCo2Tons = annualTotalMwh * 0.42; // 0.42 tCO2/MWh Thailand grid factor

    setTxt('pue_ann_total_mwh', `${annualTotalMwh.toLocaleString('en-US', { maximumFractionDigits: 0 })} MWh/yr`);
    setTxt('pue_ann_it_vs_ovh', `IT: ${annualItMwh.toLocaleString('en-US', { maximumFractionDigits: 0 })} MWh • Non-IT Overhead: ${annualOverheadMwh.toLocaleString('en-US', { maximumFractionDigits: 0 })} MWh`);
    setTxt('pue_ann_cost', `${currency}${annualCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr`);
    setTxt('pue_ann_ovh_cost', `Overhead Energy Cost: ${currency}${annualOverheadCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}/yr`);
    setTxt('pue_ann_co2', `${annualCo2Tons.toLocaleString('en-US', { maximumFractionDigits: 0 })} tCO₂/yr`);

    // Part-Load Sensitivity Table (25%, 50%, 75%, 100%)
    const lfSteps = [25, 50, 75, 100];
    const tbody = document.getElementById('pue_load_table_body');
    if (tbody) {
        tbody.innerHTML = lfSteps.map(stepPct => {
            const pt = calcPueAtLoadFactor(stepPct / 100, params);
            const isSelected = Math.abs(stepPct - loadFactorPct) < 3;
            const rowClass = isSelected
                ? 'bg-violet-50/90 dark:bg-violet-900/40 font-bold text-violet-700 dark:text-violet-300 ring-1 ring-inset ring-violet-500/40'
                : 'hover:bg-slate-50 dark:hover:bg-slate-700/40';
            return `
                <tr onclick="setPueLoadFactor(${stepPct})" class="cursor-pointer transition-colors ${rowClass}">
                    <td class="px-3 py-2 text-xs font-mono">
                        <span class="font-bold">${stepPct}% Load</span>
                        ${isSelected ? `<span class="ml-1.5 px-1.5 py-0.5 rounded bg-violet-600 text-white text-[9px] font-extrabold uppercase">Active</span>` : ''}
                    </td>
                    <td class="px-3 py-2 text-xs text-right font-mono">${pt.pItActualKw.toFixed(0)} kW</td>
                    <td class="px-3 py-2 text-xs text-right font-mono">${pt.pCoolingTotalKw.toFixed(1)} kW</td>
                    <td class="px-3 py-2 text-xs text-right font-mono">${pt.pElecOverheadKw.toFixed(1)} kW</td>
                    <td class="px-3 py-2 text-xs text-right font-mono">${pt.pTotalFacilityKw.toFixed(1)} kW</td>
                    <td class="px-3 py-2 text-xs text-right font-mono font-bold text-cyan-600 dark:text-cyan-400">${pt.pPUE.toFixed(2)}</td>
                    <td class="px-3 py-2 text-xs text-right font-mono font-extrabold">${pt.pue.toFixed(2)}</td>
                    <td class="px-3 py-2 text-xs text-right font-mono text-emerald-600 dark:text-emerald-400">${pt.dciePct.toFixed(1)}%</td>
                </tr>
            `;
        }).join('');
    }

    // Generate dense curve for canvas chart (10% to 100% IT load factor)
    const curvePoints = [];
    for (let lf = 10; lf <= 100; lf += 2) {
        curvePoints.push(calcPueAtLoadFactor(lf / 100, params));
    }

    if (typeof drawPueChart === 'function') {
        drawPueChart('pueChart', curvePoints, cur);
    }

    if (window.MagicStore) {
        window.MagicStore.publish({
            pueValue: +cur.pue.toFixed(2),
            pueItLoadKw: +cur.pItActualKw.toFixed(1),
            pueTotalFacilityKw: +cur.pTotalFacilityKw.toFixed(1)
        }, 'puePage');
    }
}

