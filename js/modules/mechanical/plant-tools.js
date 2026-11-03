// ============================================================================
// Mechanical & HVAC Modules 6–8: Cooling Tower Make-up, Chiller ROI & Fuel Tank
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
