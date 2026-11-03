// ============================================================================
// Mechanical & HVAC Modules 1–3: Psychrometric Engine, System Analyzer,
// Room Load Analyzer & Multi-Stage Analyzer
// File: js/modules/mechanical/psychro-analyzers.js
// ============================================================================

function handleTypeChange(stateNum, prefix = '') {
    const type = document.getElementById(`${prefix}inputType${stateNum}`).value;
    const label = document.getElementById(`${prefix}label2_${stateNum}`);
    const input = document.getElementById(`${prefix}val2_${stateNum}`);

    if (type === 'RH') {
        label.innerText = 'Relative Humidity (%)';
        input.step = 1;
    } else if (type === 'Tdp') {
        label.innerText = 'Dew Point (°C)';
        input.step = 0.5;
    } else if (type === 'W') {
        label.innerText = 'Hum. Ratio (kg/kg)';
        input.step = 0.001;
    }

    if (prefix === 'load_') updateLoadAnalyzer();
    else updateAll();
}

function calcWetBulb(Tdb, Tdp, W) {
    if (W <= 0) return Tdp;
    let low = Math.max(-50, Math.min(Tdp, Tdb));
    let high = Tdb;
    for (let i = 0; i < 24; i++) {
        const mid = 0.5 * (low + high);
        const pws_wb = 0.61078 * Math.exp((17.27 * mid) / (mid + 237.3));
        const ws_wb = 0.621945 * (pws_wb / Math.max(0.1, Patm - pws_wb));
        const w_calc = ((2501 - 2.326 * mid) * ws_wb - 1.006 * (Tdb - mid)) / (2501 + 1.86 * Tdb - 4.186 * mid);
        if (w_calc > W) high = mid;
        else low = mid;
    }
    return 0.5 * (low + high);
}

function calcProperties(Tdb, val2, type) {
    const Pws = 0.61078 * Math.exp((17.27 * Tdb) / (Tdb + 237.3));
    let Pw, RH, W, Tdp;

    if (type === 'RH') {
        RH = val2;
        Pw = (RH / 100) * Pws;
    } else if (type === 'Tdp') {
        Tdp = val2;
        Pw = 0.61078 * Math.exp((17.27 * Tdp) / (Tdp + 237.3));
    } else if (type === 'W') {
        W = val2;
        Pw = (W * Patm) / (0.621945 + W);
    }

    if (Pw < 0) Pw = 0;
    if (Pw > Pws) Pw = Pws; // Cap at saturation

    RH = Pws > 0 ? (Pw / Pws) * 100 : 0;
    W = 0.621945 * (Pw / (Patm - Pw));
    const H = 1.006 * Tdb + W * (2501 + 1.846 * Tdb);
    const V = (0.287042 * (Tdb + 273.15) * (1 + 1.6078 * W)) / Patm;

    if (Pw > 0) {
        const alpha = Math.log(Pw / 0.61078);
        Tdp = (237.3 * alpha) / (17.27 - alpha);
    } else {
        Tdp = -273.15;
    }

    const Twb = calcWetBulb(Tdb, Tdp, W);

    return { Tdb, Twb, RH, Pws, Pw, W, H, V, Tdp };
}

function setPsyInputsFromDrag(tdbId, val2Id, typeId, newTdb, newW) {
    const st = calcProperties(newTdb, newW, 'W');
    const tEl = document.getElementById(tdbId);
    const vEl = document.getElementById(val2Id);
    const type = document.getElementById(typeId)?.value || 'RH';
    if (tEl) tEl.value = st.Tdb.toFixed(1);
    if (vEl) {
        if (type === 'RH') vEl.value = st.RH.toFixed(1);
        else if (type === 'Tdp') vEl.value = st.Tdp.toFixed(1);
        else if (type === 'W') vEl.value = st.W.toFixed(5);
    }
}

function projectMixFraction(tdb, w, s1, s2) {
    if (!s1 || !s2) return 0.2;
    const dx = (s2.Tdb - s1.Tdb) / 50;
    const dy = (s2.W - s1.W) / 0.030;
    const len2 = dx * dx + dy * dy;
    if (len2 < 1e-7) return 0.2;
    const px = (tdb - s1.Tdb) / 50;
    const py = (w - s1.W) / 0.030;
    return Math.max(0, Math.min(1, (px * dx + py * dy) / len2));
}

function calculateCapacityVals(sIn, sOut, massFlow) {
    let Qt = massFlow * (sOut.H - sIn.H);

    // Thermodynamically rigorous Sensible Heat using Moist Air Specific Heat
    let W_avg = (sIn.W + sOut.W) / 2;
    let Qs = massFlow * (1.006 + 1.846 * W_avg) * (sOut.Tdb - sIn.Tdb);

    // Check if it is a purely sensible process (constant humidity ratio)
    const deltaW = Math.abs(sOut.W - sIn.W);
    const isSensibleOnly = deltaW < 0.00001;

    if (isSensibleOnly) {
        Qs = Qt; // For purely sensible processes, Total Heat perfectly equals Sensible Heat
    }

    let Ql = Qt - Qs;

    // Determine Mode based on directional mathematical values
    let mode = "Neutral";
    if (Qt < -0.1 || sOut.Tdb < sIn.Tdb - 0.1) mode = "❄️ Cooling";
    else if (Qt > 0.1 || sOut.Tdb > sIn.Tdb + 0.1) mode = "🔥 Heating";

    if (sOut.W < sIn.W - 0.0005) mode += " & Dehum.";
    else if (sOut.W > sIn.W + 0.0005) mode += " & Hum.";

    // Take absolute values for clean UI display without negatives
    Qt = Math.abs(Qt);
    Qs = Math.abs(Qs);
    Ql = Math.abs(Ql);

    // Clean up tiny floating point residuals
    if (Qt < 0.001) Qt = 0;
    if (Qs < 0.001) Qs = 0;
    if (Ql < 0.001) Ql = 0;

    let SHR = 0;
    if (Qt > 0.0001) {
        SHR = Qs / Qt;
        if (SHR > 1) SHR = 1;
    }

    let moistureDiff = Math.abs(massFlow * (sOut.W - sIn.W) * 3600);
    if (moistureDiff < 0.001) moistureDiff = 0;

    let dh_dw_text = "N/A";
    const deltaW_g = Math.abs((sOut.W - sIn.W) * 1000);
    const deltaH = Math.abs(sOut.H - sIn.H);

    if (deltaW_g > 0.0001) {
        dh_dw_text = (deltaH / deltaW_g).toFixed(2);
    } else if (deltaH > 0.0001) {
        dh_dw_text = "∞";
    } else {
        dh_dw_text = "0.00";
    }

    return { Qt, Qs, Ql, SHR, moistureDiff, dh_dw_text, mode };
}

// ============================================================================
// 3. UI GENERATORS (TABLES, CHARTS, AND CAPACITIES)
// ============================================================================

function renderSysCapacities(sIn, sOut, massFlow, prefix) {
    const cap = calculateCapacityVals(sIn, sOut, massFlow);

    const renderCap = (val, textColor) => `
    <div class="flex items-center gap-2">
        <span class="text-xl font-bold ${textColor}">${val}</span>
        <button onclick="copyToClipboard('${val}', this)" class="text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-0 group-hover/card:opacity-100 transition-opacity" title="Copy">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
        </button>
    </div>
`;

    document.getElementById(`${prefix}Qt`).innerHTML = renderCap(cap.Qt.toFixed(2), 'text-slate-800 dark:text-slate-100');
    document.getElementById(`${prefix}Qs`).innerHTML = renderCap(cap.Qs.toFixed(2), 'text-blue-600 dark:text-blue-400');
    document.getElementById(`${prefix}Ql`).innerHTML = renderCap(cap.Ql.toFixed(2), 'text-emerald-600 dark:text-emerald-400');
    document.getElementById(`${prefix}SHR`).innerHTML = renderCap(cap.SHR.toFixed(2), 'text-purple-600 dark:text-purple-400');
    document.getElementById(`${prefix}Moisture`).innerHTML = renderCap(cap.moistureDiff.toFixed(2), 'text-cyan-600 dark:text-cyan-400');
    document.getElementById(`${prefix}DhDw`).innerHTML = renderCap(cap.dh_dw_text, 'text-orange-500 dark:text-orange-400');
    document.getElementById(`${prefix}Mode`).innerText = cap.mode;
}

function updateTable(tbodyId, statesArray) {
    const tbody = document.getElementById(tbodyId);
    const headers = document.getElementById(tbodyId.replace('resultsTable', 'table_header'));

    if (headers) {
        let headerHtml = `<th class="p-3 w-40">Property</th><th class="p-3 w-20">Unit</th>`;
        statesArray.forEach((s, i) => {
            if (s) {
                headerHtml += `<th class="p-3 font-bold border-l border-slate-200 dark:border-slate-700" style="color: ${getMsColor(i)}">Point ${i + 1}</th>`;
            }
        });
        headers.innerHTML = headerHtml;
    }

    const rows = [
        { label: 'Dry Bulb Temp', unit: '°C', k: 'Tdb' },
        { label: 'Wet Bulb Temp', unit: '°C', k: 'Twb' },
        { label: 'Relative Humidity', unit: '%', k: 'RH' },
        { label: 'Dew Point Temp', unit: '°C', k: 'Tdp' },
        { label: 'Humidity Ratio', unit: 'kg/kg', k: 'W', dec: 5 },
        { label: 'Enthalpy', unit: 'kJ/kg', k: 'H' },
        { label: 'Specific Volume', unit: 'm³/kg', k: 'V', dec: 4 },
        { label: 'Vapor Pressure', unit: 'kPa', k: 'Pw', dec: 4 }
    ];

    tbody.innerHTML = rows.map(r => {
        const cells = statesArray.map(st => {
            const val = st ? st[r.k].toFixed(r.dec || 2) : "0.00";
            return `
            <td class="p-3 font-mono border-l border-slate-100 dark:border-slate-700/50">
                <div class="flex items-center justify-between">
                    <span>${val}</span>
                    <button onclick="copyToClipboard('${val}', this)" class="text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover/row:opacity-100 transition-opacity" title="Copy">
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>
            </td>
        `;
        }).join('');

        return `
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 group/row transition-colors">
            <td class="p-3 font-medium text-slate-700 dark:text-slate-300">${r.label}</td>
            <td class="p-3 text-slate-500 dark:text-slate-400 text-xs">${r.unit}</td>
            ${cells}
        </tr>
    `;
    }).join('');
}

// --- Psychrometric Boundaries ---
function getBoundary(prefix) {
    let elShow = document.getElementById(prefix + 'show');
    if (!elShow) return null;
    return {
        show: elShow.checked,
        tMin: parseFloat(document.getElementById(prefix + 'tMin').value) || 0,
        tMax: parseFloat(document.getElementById(prefix + 'tMax').value) || 0,
        humType: document.getElementById(prefix + 'hType').value,
        hMin: parseFloat(document.getElementById(prefix + 'hMin').value) || 0,
        hMax: parseFloat(document.getElementById(prefix + 'hMax').value) || 0
    };
}

function handleBoundTypeChange(prefix, updateFn) {
    let type = document.getElementById(prefix + 'hType').value;
    let minInput = document.getElementById(prefix + 'hMin');
    let maxInput = document.getElementById(prefix + 'hMax');
    if (type === 'RH') {
        minInput.value = 40;
        maxInput.value = 60;
    } else {
        minInput.value = 10;
        maxInput.value = 15;
    }
    updateFn();
}

window._psyChartStates = window._psyChartStates || {};




let state1 = {}, state2 = {}, state3 = {}, state4 = {};

function updateAll() {
    const unit = document.getElementById('flowUnit').value;
    document.querySelectorAll('.unit-label').forEach(el => el.innerText = unit);

    const f1 = parseFloat(document.getElementById('flow1').value) || 0;
    const f2 = parseFloat(document.getElementById('flow2').value) || 0;

    let vFlow1 = unit === 'LPS' ? f1 * 0.001 : unit === 'CFM' ? f1 * 0.000471947 : f1 / 3600;
    let vFlow2 = unit === 'LPS' ? f2 * 0.001 : unit === 'CFM' ? f2 * 0.000471947 : f2 / 3600;

    state1 = calcProperties(
        parseFloat(document.getElementById('t1').value) || 0,
        parseFloat(document.getElementById('val2_1').value) || 0,
        document.getElementById('inputType1').value
    );

    state2 = calcProperties(
        parseFloat(document.getElementById('t2').value) || 0,
        parseFloat(document.getElementById('val2_2').value) || 0,
        document.getElementById('inputType2').value
    );

    let mFlow1 = vFlow1 / state1.V;
    let mFlow2 = vFlow2 / state2.V;
    let mFlow3 = mFlow1 + mFlow2;

    if (mFlow3 > 0) {
        const H3 = (mFlow1 * state1.H + mFlow2 * state2.H) / mFlow3;
        const W3 = (mFlow1 * state1.W + mFlow2 * state2.W) / mFlow3;
        const Tdb3 = (H3 - 2501 * W3) / (1.006 + 1.846 * W3);
        state3 = calcProperties(Tdb3, W3, 'W');
    } else {
        state3 = { ...state1 };
    }

    document.getElementById('sysTotalFlow').innerHTML = `${(f1 + f2).toFixed(1)} <span class="text-sm font-normal text-slate-500 dark:text-slate-400">${unit}</span>`;
    document.getElementById('sysOARatio').innerText = `${((f1 + f2) > 0 ? (f2 / (f1 + f2)) * 100 : 0).toFixed(1)}%`;

    state4 = calcProperties(
        parseFloat(document.getElementById('t4').value) || 0,
        parseFloat(document.getElementById('val2_4').value) || 0,
        document.getElementById('inputType4').value
    );

    updateTable('resultsTable', [state1, state2, state3, state4]);
    renderSysCapacities(state3, state4, mFlow3, 'coil');
    renderSysCapacities(state4, state1, mFlow3, 'room');

    drawChart('psyChart',
        [
            {
                s: state1, c: '#2563eb', l: '1', name: 'Point 1 (Room / Return Air)',
                onDrag: (tdb, w) => { setPsyInputsFromDrag('t1', 'val2_1', 'inputType1', tdb, w); updateAll(); }
            },
            {
                s: state2, c: '#16a34a', l: '2', name: 'Point 2 (Outdoor Air)',
                onDrag: (tdb, w) => { setPsyInputsFromDrag('t2', 'val2_2', 'inputType2', tdb, w); updateAll(); }
            },
            {
                s: state3, c: '#d97706', l: '3', name: 'Point 3 (Mixed Air - Drag to Mix)',
                onDrag: (tdb, w) => {
                    const alpha = projectMixFraction(tdb, w, state1, state2);
                    const totF = (parseFloat(document.getElementById('flow1').value) || 0) + (parseFloat(document.getElementById('flow2').value) || 0) || 1000;
                    document.getElementById('flow2').value = Math.round(totF * alpha);
                    document.getElementById('flow1').value = Math.round(totF * (1 - alpha));
                    updateAll();
                }
            },
            {
                s: state4, c: '#9333ea', l: '4', name: 'Point 4 (Supply Air)',
                onDrag: (tdb, w) => { setPsyInputsFromDrag('t4', 'val2_4', 'inputType4', tdb, w); updateAll(); }
            }
        ],
        [
            { p1: state1, p2: state3, c: '#94a3b8', d: true },
            { p1: state2, p2: state3, c: '#94a3b8', d: true },
            { p1: state3, p2: state4, c: '#a855f7', d: false },
            { p1: state4, p2: state1, c: '#3b82f6', d: true }
        ],
        getBoundary('sys_bound_')
    );
}




let ls1 = {}, ls2 = {}, ls3 = {}, ls4 = {}, ls5 = {};

function toggleLoadMode() {
    const mode = document.getElementById('load_calc_mode').value;
    if (mode === 'flow') {
        document.getElementById('load_flow1_container').classList.remove('hidden');
        document.getElementById('load_flow1_res_container').classList.add('hidden');
        document.getElementById('load_flow2_container').classList.remove('hidden');
        document.getElementById('load_oa_ratio_container').classList.add('hidden');
        document.getElementById('load_target_supply_box').classList.add('hidden');
    } else {
        document.getElementById('load_flow1_container').classList.add('hidden');
        document.getElementById('load_flow1_res_container').classList.remove('hidden');
        document.getElementById('load_flow2_container').classList.add('hidden');
        document.getElementById('load_oa_ratio_container').classList.remove('hidden');
        document.getElementById('load_target_supply_box').classList.remove('hidden');
    }
    updateLoadAnalyzer();
}

function updateLoadAnalyzer() {
    const mode = document.getElementById('load_calc_mode').value;
    const unit = document.getElementById('load_flowUnit').value;
    document.querySelectorAll('.load-unit-label').forEach(el => el.innerText = unit);

    const t1_input = parseFloat(document.getElementById('load_t1').value) || 0;

    ls2 = calcProperties(
        parseFloat(document.getElementById('load_t2').value) || 0,
        parseFloat(document.getElementById('load_val2_2').value) || 0,
        document.getElementById('load_inputType2').value
    );

    const Qs = parseFloat(document.getElementById('load_Qs').value) || 0;
    const Ql = parseFloat(document.getElementById('load_Ql').value) || 0;
    const Q_reheat = parseFloat(document.getElementById('load_Qreheat').value) || 0;

    const Qt = Qs + Ql;
    const SHR = Qt !== 0 ? Qs / Qt : 0;

    document.getElementById('load_Qt_disp').innerText = `${Qt.toFixed(2)} kW`;
    document.getElementById('load_SHR_disp').innerText = SHR.toFixed(2);

    let W1 = 0.010;
    let W5 = W1;
    let mFlow1 = 0, mFlow2 = 0, mFlow3 = 0;
    let vFlow1 = 0, vFlow2 = 0;

    if (mode === 'flow') {
        const f1 = parseFloat(document.getElementById('load_flow1').value) || 0;
        const f2 = parseFloat(document.getElementById('load_flow2').value) || 0;

        vFlow1 = unit === 'LPS' ? f1 * 0.001 : unit === 'CFM' ? f1 * 0.000471947 : f1 / 3600;
        vFlow2 = unit === 'LPS' ? f2 * 0.001 : unit === 'CFM' ? f2 * 0.000471947 : f2 / 3600;

        // Iterative Solver for Reverse Psychrometrics (Rigorous Alignment)
        for (let i = 0; i < 20; i++) {
            ls1 = calcProperties(t1_input, W1, 'W');
            mFlow1 = vFlow1 / ls1.V;
            mFlow2 = vFlow2 / ls2.V;
            mFlow3 = mFlow1 + mFlow2;

            if (mFlow3 > 0) {
                let Cp_room = 1.006 + 1.846 * ((W1 + W5) / 2);
                const T5 = ls1.Tdb - (Qs / (mFlow3 * Cp_room));

                let Cp_heater = 1.006 + 1.846 * W5;
                const T4 = T5 - (Q_reheat / (mFlow3 * Cp_heater));

                ls4 = calcProperties(T4, 100, 'RH');
                W5 = ls4.W;
                ls5 = calcProperties(T5, W5, 'W');

                let H1_target = ls5.H + (Qt / mFlow3);
                W1 = (H1_target - 1.006 * ls1.Tdb) / (2501 + 1.846 * ls1.Tdb);
            } else {
                ls4 = { ...ls1 };
                ls5 = { ...ls1 };
            }
        }
    } else if (mode === 'temp') {
        const target_supply_t = parseFloat(document.getElementById('load_supply_t').value) || 14;
        const oa_ratio_pct = parseFloat(document.getElementById('load_oa_ratio').value) || 0;
        const oa_ratio = Math.max(0, Math.min(100, oa_ratio_pct)) / 100;

        for (let i = 0; i < 20; i++) {
            ls1 = calcProperties(t1_input, W1, 'W');

            let Cp_room = 1.006 + 1.846 * ((W1 + W5) / 2);
            let dT = ls1.Tdb - target_supply_t;

            if (dT > 0.1 && Qs > 0) {
                mFlow3 = Qs / (Cp_room * dT);
                mFlow2 = mFlow3 * oa_ratio;
                mFlow1 = mFlow3 - mFlow2;
            } else {
                mFlow3 = 0; mFlow2 = 0; mFlow1 = 0;
            }

            if (mFlow3 > 0) {
                const T5 = target_supply_t;
                let Cp_heater = 1.006 + 1.846 * W5;
                const T4 = T5 - (Q_reheat / (mFlow3 * Cp_heater));

                ls4 = calcProperties(T4, 100, 'RH');
                W5 = ls4.W;
                ls5 = calcProperties(T5, W5, 'W');

                let H1_target = ls5.H + (Qt / mFlow3);
                W1 = (H1_target - 1.006 * ls1.Tdb) / (2501 + 1.846 * ls1.Tdb);
            } else {
                ls4 = { ...ls1 };
                ls5 = { ...ls1 };
            }
        }

        if (mFlow3 > 0) {
            vFlow1 = mFlow1 * ls1.V;
            vFlow2 = mFlow2 * ls2.V;

            let dispF1 = unit === 'LPS' ? vFlow1 * 1000 : unit === 'CFM' ? vFlow1 / 0.000471947 : vFlow1 * 3600;
            let dispF2 = unit === 'LPS' ? vFlow2 * 1000 : unit === 'CFM' ? vFlow2 / 0.000471947 : vFlow2 * 3600;

            document.getElementById('load_flow1_res').value = dispF1.toFixed(1);
            document.getElementById('load_flow2_res').value = dispF2.toFixed(1);
        } else {
            vFlow1 = 0; vFlow2 = 0;
            document.getElementById('load_flow1_res').value = "0.0";
            document.getElementById('load_flow2_res').value = "0.0";
        }
    }

    ls1 = calcProperties(t1_input, W1, 'W');
    document.getElementById('load_val2_1').value = ls1.RH.toFixed(1);

    if (mFlow3 > 0) {
        const H3 = (mFlow1 * ls1.H + mFlow2 * ls2.H) / mFlow3;
        const W3 = (mFlow1 * ls1.W + mFlow2 * ls2.W) / mFlow3;
        const Tdb3 = (H3 - 2501 * W3) / (1.006 + 1.846 * W3);
        ls3 = calcProperties(Tdb3, W3, 'W');
    } else {
        ls3 = { ...ls1 };
    }

    let vFlowTotal = vFlow1 + vFlow2;
    let dispTotal = unit === 'LPS' ? vFlowTotal * 1000 : unit === 'CFM' ? vFlowTotal / 0.000471947 : vFlowTotal * 3600;

    document.getElementById('load_sysTotalFlow').innerHTML = `${dispTotal.toFixed(1)} <span class="text-sm font-normal text-slate-500 dark:text-slate-400">${unit}</span>`;

    let sysOARatio = vFlowTotal > 0 ? (vFlow2 / vFlowTotal) * 100 : 0;
    document.getElementById('load_sysOARatio').innerText = `${sysOARatio.toFixed(1)}%`;

    updateTable('load_resultsTable', [ls1, ls2, ls3, ls4, ls5]);
    renderSysCapacities(ls3, ls4, mFlow3, 'load_coil');
    renderSysCapacities(ls4, ls5, mFlow3, 'load_reheat');

    drawChart('load_psyChart',
        [
            {
                s: ls1, c: '#2563eb', l: '1', name: 'Point 1 (Room Air)',
                onDrag: (tdb, w) => {
                    document.getElementById('load_t1').value = tdb.toFixed(1);
                    if (mFlow3 > 0 && ls5 && ls5.H !== undefined) {
                        const st1 = calcProperties(tdb, w, 'W');
                        const curQs = parseFloat(document.getElementById('load_Qs').value) || 0;
                        const targetQt = Math.max(curQs, mFlow3 * (st1.H - ls5.H));
                        document.getElementById('load_Ql').value = Math.max(0, targetQt - curQs).toFixed(2);
                    }
                    updateLoadAnalyzer();
                }
            },
            {
                s: ls2, c: '#16a34a', l: '2', name: 'Point 2 (Outdoor Air)',
                onDrag: (tdb, w) => { setPsyInputsFromDrag('load_t2', 'load_val2_2', 'load_inputType2', tdb, w); updateLoadAnalyzer(); }
            },
            {
                s: ls3, c: '#d97706', l: '3', name: 'Point 3 (Mixed Air - Drag OA Ratio)',
                onDrag: (tdb, w) => {
                    const alpha = projectMixFraction(tdb, w, ls1, ls2);
                    if (document.getElementById('load_calc_mode').value === 'flow') {
                        const totF = (parseFloat(document.getElementById('load_flow1').value) || 0) + (parseFloat(document.getElementById('load_flow2').value) || 0) || 1000;
                        document.getElementById('load_flow2').value = Math.round(totF * alpha);
                        document.getElementById('load_flow1').value = Math.round(totF * (1 - alpha));
                    } else {
                        document.getElementById('load_oa_ratio').value = (alpha * 100).toFixed(1);
                    }
                    updateLoadAnalyzer();
                }
            },
            {
                s: ls4, c: '#9333ea', l: '4', name: 'Point 4 (Off-Coil Air)',
                onDrag: (tdb, w) => {
                    if (mFlow3 > 0 && ls5) {
                        const cpH = 1.006 + 1.846 * (ls4.W || 0.008);
                        const newReheat = Math.max(0, mFlow3 * cpH * (ls5.Tdb - tdb));
                        document.getElementById('load_Qreheat').value = newReheat.toFixed(2);
                        updateLoadAnalyzer();
                    }
                }
            },
            {
                s: ls5, c: '#ef4444', l: '5', name: 'Point 5 (Required Supply Air)',
                onDrag: (tdb, w) => {
                    const clampedT5 = Math.min((ls1.Tdb || 24) - 0.5, Math.max(5, tdb));
                    if (document.getElementById('load_calc_mode').value === 'temp') {
                        document.getElementById('load_supply_t').value = clampedT5.toFixed(1);
                    } else if (Qs > 0) {
                        const cpR = 1.006 + 1.846 * ((ls1.W + ls5.W) / 2);
                        const reqM3 = Qs / (cpR * Math.max(0.5, ls1.Tdb - clampedT5));
                        const reqM1 = Math.max(0.01, reqM3 - mFlow2);
                        const reqV1 = reqM1 * ls1.V;
                        const newF1 = unit === 'LPS' ? reqV1 * 1000 : unit === 'CFM' ? reqV1 / 0.000471947 : reqV1 * 3600;
                        document.getElementById('load_flow1').value = Math.round(newF1);
                    }
                    updateLoadAnalyzer();
                }
            }
        ],
        [
            { p1: ls1, p2: ls3, c: '#94a3b8', d: true },
            { p1: ls2, p2: ls3, c: '#94a3b8', d: true },
            { p1: ls3, p2: ls4, c: '#a855f7', d: false },
            { p1: ls4, p2: ls5, c: '#ef4444', d: false },
            { p1: ls5, p2: ls1, c: '#3b82f6', d: true }
        ],
        getBoundary('load_bound_')
    );
}




let ms_nodes = [];
let ms_nextNodeId = 1;

function getMsColor(index) {
    const isDark = document.documentElement.classList.contains('dark');
    const lightColors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#db2777', '#0891b2', '#ea580c', '#4f46e5'];
    const darkColors = ['#60a5fa', '#4ade80', '#fbbf24', '#c084fc', '#f472b6', '#22d3ee', '#fb923c', '#818cf8'];
    return isDark ? darkColors[index % darkColors.length] : lightColors[index % lightColors.length];
}

function initMultiStage() {
    ms_nodes = [];
    ms_nextNodeId = 1;
    pushMsNode('source', 'Return Air', { tdb: 25, propVal: 50 });
    pushMsNode('source', 'Outdoor Air', { tdb: 35, propVal: 60 });
    pushMsNode('mix', 'Mixed Air', { p1: 1, p2: 2, flow1: 800, flow2: 200 });
    pushMsNode('process', 'Process Coil', { p1: 3, flow: '' });
}

function pushMsNode(type, name = '', config = {}) {
    let newIndex = ms_nodes.length + 1;
    let node = { id: ms_nextNodeId++, type: type, name: name || `Point No. ${newIndex}` };

    if (type === 'source') {
        node.tdb = config.tdb !== undefined ? config.tdb : 25;
        node.propType = 'RH';
        node.propVal = config.propVal !== undefined ? config.propVal : 50;
    } else if (type === 'process') {
        node.p1 = config.p1 || (ms_nodes.length > 0 ? ms_nodes[ms_nodes.length - 1].id : null);
        node.tdb = 14;
        node.propType = 'RH';
        node.propVal = 95;
        node.flow = config.flow !== undefined ? config.flow : '';
    } else if (type === 'mix') {
        node.p1 = config.p1 || (ms_nodes.length > 0 ? ms_nodes[ms_nodes.length - 1].id : null);
        node.p2 = config.p2 || null;
        node.flow1 = config.flow1 !== undefined ? config.flow1 : 500;
        node.flow2 = config.flow2 !== undefined ? config.flow2 : 500;
    }

    node.state = null;
    node.mFlow = 0;
    node.vFlow = 0;

    ms_nodes.push(node);
    renderMsInputs();
    syncMsState();
}

function addMsNode() {
    const type = document.getElementById('ms_newType').value;
    pushMsNode(type);
}

function removeMsNode(id) {
    ms_nodes = ms_nodes.filter(n => n.id !== id);

    let toDelete = true;
    while (toDelete) {
        toDelete = false;
        let validIds = ms_nodes.map(n => n.id);
        for (let i = 0; i < ms_nodes.length; i++) {
            let n = ms_nodes[i];
            if ((n.type === 'process' && !validIds.includes(n.p1)) ||
                (n.type === 'mix' && (!validIds.includes(n.p1) || !validIds.includes(n.p2)))) {
                ms_nodes.splice(i, 1);
                toDelete = true;
                break;
            }
        }
    }

    renderMsInputs();
    syncMsState();
}

function renderMsInputs() {
    const container = document.getElementById('ms_nodes_container');
    let html = '';

    ms_nodes.forEach((n, index) => {
        const color = getMsColor(index);
        let inner = '';

        const getParentOptions = (selId) => {
            let opts = `<option value="">Select Point...</option>`;
            ms_nodes.forEach((prevN, prevIdx) => {
                if (prevIdx < index) {
                    opts += `<option value="${prevN.id}" ${selId === prevN.id ? 'selected' : ''}>${prevIdx + 1}: ${prevN.name}</option>`;
                }
            });
            return opts;
        };

        if (n.type === 'source') {
            inner = `
            <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Dry Bulb Temp (°C)</label>
                <input type="number" id="ms_${n.id}_tdb" value="${n.tdb}" step="0.5" class="w-full p-1.5 text-sm rounded" onchange="syncMsState()">
            </div>
            <div>
                <div class="flex justify-between items-end mb-1">
                    <label class="block text-xs font-medium text-slate-700 dark:text-slate-300">Property</label>
                    <select id="ms_${n.id}_propType" class="text-[10px] bg-slate-100 dark:bg-slate-700 rounded p-0.5 outline-none" onchange="syncMsState()">
                        <option value="RH" ${n.propType === 'RH' ? 'selected' : ''}>RH (%)</option>
                        <option value="Tdp" ${n.propType === 'Tdp' ? 'selected' : ''}>Dew Point (°C)</option>
                        <option value="W" ${n.propType === 'W' ? 'selected' : ''}>Hum. Ratio</option>
                    </select>
                </div>
                <input type="number" id="ms_${n.id}_propVal" value="${n.propVal}" step="1" class="w-full p-1.5 text-sm rounded" onchange="syncMsState()">
            </div>
        `;
        } else if (n.type === 'process') {
            inner = `
            <div class="col-span-1 md:col-span-2">
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Entering Point</label>
                <select id="ms_${n.id}_p1" class="w-full p-1.5 text-sm rounded" onchange="syncMsState()">${getParentOptions(n.p1)}</select>
            </div>
            <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Target Tdb (°C)</label>
                <input type="number" id="ms_${n.id}_tdb" value="${n.tdb}" step="0.5" class="w-full p-1.5 text-sm rounded" onchange="syncMsState()">
            </div>
            <div>
                <div class="flex justify-between items-end mb-1">
                    <label class="block text-xs font-medium text-slate-700 dark:text-slate-300">Target Property</label>
                    <select id="ms_${n.id}_propType" class="text-[10px] bg-slate-100 dark:bg-slate-700 rounded p-0.5 outline-none" onchange="syncMsState()">
                        <option value="RH" ${n.propType === 'RH' ? 'selected' : ''}>RH (%)</option>
                        <option value="Tdp" ${n.propType === 'Tdp' ? 'selected' : ''}>Dew Point (°C)</option>
                        <option value="W" ${n.propType === 'W' ? 'selected' : ''}>Hum. Ratio</option>
                    </select>
                </div>
                <input type="number" id="ms_${n.id}_propVal" value="${n.propVal}" step="1" class="w-full p-1.5 text-sm rounded" onchange="syncMsState()">
            </div>
            <div class="col-span-1 md:col-span-2">
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Volumetric Flow <span class="font-normal text-slate-400 italic">(Opt. Override)</span></label>
                <div class="flex items-center gap-2">
                    <input type="number" id="ms_${n.id}_flow" value="${n.flow !== undefined ? n.flow : ''}" placeholder="Inherit" step="10" class="w-full p-1.5 text-sm rounded focus:ring-2 focus:ring-amber-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white border border-slate-300" onchange="syncMsState()">
                    <span class="text-sm font-bold text-slate-500 dark:text-slate-400 ms-unit-label"></span>
                </div>
            </div>
        `;
        } else if (n.type === 'mix') {
            inner = `
            <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Point 1 to Mix</label>
                <select id="ms_${n.id}_p1" class="w-full p-1.5 text-sm rounded" onchange="syncMsState()">${getParentOptions(n.p1)}</select>
            </div>
            <div>
                <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Point 2 to Mix</label>
                <select id="ms_${n.id}_p2" class="w-full p-1.5 text-sm rounded" onchange="syncMsState()">${getParentOptions(n.p2)}</select>
            </div>
            <div class="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Vol. Flow (Pt 1)</label>
                    <div class="flex items-center gap-1">
                        <input type="number" id="ms_${n.id}_flow1" value="${n.flow1}" step="10" class="w-full p-1.5 text-sm rounded focus:ring-2 focus:ring-amber-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white border border-slate-300" onchange="syncMsState()">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Vol. Flow (Pt 2)</label>
                    <div class="flex items-center gap-1">
                        <input type="number" id="ms_${n.id}_flow2" value="${n.flow2}" step="10" class="w-full p-1.5 text-sm rounded focus:ring-2 focus:ring-amber-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white border border-slate-300" onchange="syncMsState()">
                        <span class="text-xs font-bold text-slate-500 dark:text-slate-400 ms-unit-label"></span>
                    </div>
                </div>
            </div>
        `;
        }

        html += `
        <div class="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-l-4 transition-colors" style="border-left-color: ${color}">
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center gap-2 w-full">
                    <span class="w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold text-white shadow flex-shrink-0" style="background-color: ${color}">${index + 1}</span>
                    <input type="text" id="ms_${n.id}_name" value="${n.name}" class="font-bold text-slate-800 dark:text-slate-100 border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-blue-500 outline-none bg-transparent w-full" onchange="syncMsState()">
                    <span class="text-[10px] uppercase bg-slate-100 dark:bg-slate-700 px-1 rounded text-slate-500 dark:text-slate-400 whitespace-nowrap">${n.type}</span>
                </div>
                ${ms_nodes.length > 1 ? `
                <button onclick="removeMsNode(${n.id})" class="text-slate-300 hover:text-red-500 ml-2 transition-colors" title="Delete Point">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>` : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${inner}
            </div>
        </div>
    `;
    });
    container.innerHTML = html;
}

function syncMsState() {
    ms_nodes.forEach(n => {
        n.name = document.getElementById(`ms_${n.id}_name`)?.value || n.name;
        if (n.type === 'source') {
            n.tdb = parseFloat(document.getElementById(`ms_${n.id}_tdb`)?.value) || 0;
            n.propType = document.getElementById(`ms_${n.id}_propType`)?.value || 'RH';
            n.propVal = parseFloat(document.getElementById(`ms_${n.id}_propVal`)?.value) || 0;
        } else if (n.type === 'process') {
            n.p1 = parseInt(document.getElementById(`ms_${n.id}_p1`)?.value) || null;
            n.tdb = parseFloat(document.getElementById(`ms_${n.id}_tdb`)?.value) || 0;
            n.propType = document.getElementById(`ms_${n.id}_propType`)?.value || 'RH';
            n.propVal = parseFloat(document.getElementById(`ms_${n.id}_propVal`)?.value) || 0;
            let fVal = document.getElementById(`ms_${n.id}_flow`)?.value;
            n.flow = (fVal === '' || isNaN(parseFloat(fVal))) ? '' : parseFloat(fVal);
        } else if (n.type === 'mix') {
            n.p1 = parseInt(document.getElementById(`ms_${n.id}_p1`)?.value) || null;
            n.p2 = parseInt(document.getElementById(`ms_${n.id}_p2`)?.value) || null;
            n.flow1 = parseFloat(document.getElementById(`ms_${n.id}_flow1`)?.value) || 0;
            n.flow2 = parseFloat(document.getElementById(`ms_${n.id}_flow2`)?.value) || 0;
        }
    });

    const unit = document.getElementById('ms_flowUnit').value;

    ms_nodes.forEach(n => {
        if (n.type === 'source') {
            n.state = calcProperties(n.tdb, n.propVal, n.propType);
            n.mFlow = 0; // Source doesn't dictate mass flow in this layout
            n.vFlow = 0;
        } else if (n.type === 'process') {
            let parent = ms_nodes.find(pn => pn.id === n.p1);
            if (parent && parent.state) {
                n.state = calcProperties(n.tdb, n.propVal, n.propType);
                if (n.flow !== '' && n.flow > 0) {
                    n.vFlow = n.flow;
                    let vFlowM3s = unit === 'LPS' ? n.flow * 0.001 : unit === 'CFM' ? n.flow * 0.000471947 : n.flow / 3600;
                    n.mFlow = vFlowM3s / n.state.V;
                } else {
                    n.mFlow = parent.mFlow; // Inherit
                    let vFlowM3s = n.mFlow * n.state.V;
                    n.vFlow = unit === 'LPS' ? vFlowM3s * 1000 : unit === 'CFM' ? vFlowM3s / 0.000471947 : vFlowM3s * 3600;
                }
            } else {
                n.state = null; n.mFlow = 0; n.vFlow = 0;
            }
        } else if (n.type === 'mix') {
            let p1 = ms_nodes.find(pn => pn.id === n.p1);
            let p2 = ms_nodes.find(pn => pn.id === n.p2);
            if (p1 && p1.state && p2 && p2.state) {
                let vFlow1_m3s = unit === 'LPS' ? n.flow1 * 0.001 : unit === 'CFM' ? n.flow1 * 0.000471947 : n.flow1 / 3600;
                let vFlow2_m3s = unit === 'LPS' ? n.flow2 * 0.001 : unit === 'CFM' ? n.flow2 * 0.000471947 : n.flow2 / 3600;

                let mFlow1 = vFlow1_m3s / p1.state.V;
                let mFlow2 = vFlow2_m3s / p2.state.V;
                let mFlowCalc = mFlow1 + mFlow2;

                if (mFlowCalc > 0) {
                    const H3 = (mFlow1 * p1.state.H + mFlow2 * p2.state.H) / mFlowCalc;
                    const W3 = (mFlow1 * p1.state.W + mFlow2 * p2.state.W) / mFlowCalc;
                    const Tdb3 = (H3 - 2501 * W3) / (1.006 + 1.846 * W3);
                    n.state = calcProperties(Tdb3, W3, 'W');

                    n.mFlow = mFlowCalc;
                    let vFlowM3s = n.mFlow * n.state.V;
                    n.vFlow = unit === 'LPS' ? vFlowM3s * 1000 : unit === 'CFM' ? vFlowM3s / 0.000471947 : vFlowM3s * 3600;
                } else {
                    n.state = { ...p1.state }; n.vFlow = 0; n.mFlow = 0;
                }
            } else {
                n.state = null; n.mFlow = 0; n.vFlow = 0;
            }
        }
    });

    // Update UI Labels
    document.querySelectorAll('.ms-unit-label').forEach(el => el.innerText = unit);
    updateTable('ms_resultsTable', ms_nodes.map(n => n.state));

    const capContainer = document.getElementById('ms_capacities_container');
    let capHtml = '';

    ms_nodes.forEach((n, idx) => {
        if (n.type === 'process' && n.state) {
            let p1 = ms_nodes.find(pn => pn.id === n.p1);
            let p1Idx = ms_nodes.indexOf(p1);

            if (p1 && p1.state) {
                const cap = calculateCapacityVals(p1.state, n.state, n.mFlow);
                const cColor = getMsColor(idx);

                const renderC = (val, colClass) => `
                <div class="text-xl font-bold ${colClass} flex items-center justify-between">
                    ${val} 
                    <button onclick="copyToClipboard('${val}', this)" class="text-slate-300 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                    </button>
                </div>`;

                capHtml += `
            <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-t-4 transition-colors" style="border-top-color: ${cColor}">
                <h2 class="text-md font-bold text-slate-900 dark:text-white mb-3 flex justify-between items-center">
                    <span>Process No. ${idx + 1} Capacity <span class="text-slate-500 dark:text-slate-400 font-normal text-sm">(${n.name}: Point ${p1Idx + 1} → ${idx + 1})</span></span>
                    <span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">${cap.mode}</span>
                </h2>
                <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Total (kW)</div>${renderC(cap.Qt.toFixed(2), 'text-slate-800 dark:text-slate-100')}</div>
                    <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Sensible (kW)</div>${renderC(cap.Qs.toFixed(2), 'text-blue-600 dark:text-blue-400')}</div>
                    <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Latent (kW)</div>${renderC(cap.Ql.toFixed(2), 'text-emerald-600 dark:text-emerald-400')}</div>
                    <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">SHR</div>${renderC(cap.SHR.toFixed(2), 'text-purple-600 dark:text-purple-400')}</div>
                    <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Moisture (kg/h)</div>${renderC(cap.moistureDiff.toFixed(2), 'text-cyan-600 dark:text-cyan-400')}</div>
                    <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Δh/ΔW (kJ/g)</div>${renderC(cap.dh_dw_text, 'text-orange-500 dark:text-orange-400')}</div>
                </div>
            </div>`;
            }
        }
    });

    if (ms_nodes.length > 1) {
        let roomNode = ms_nodes[0];
        let lastNode = ms_nodes[ms_nodes.length - 1];

        if (roomNode && roomNode.state && lastNode && lastNode.state && roomNode.id !== lastNode.id) {
            const cap = calculateCapacityVals(lastNode.state, roomNode.state, lastNode.mFlow);

            const renderC = (val, colClass) => `
            <div class="text-xl font-bold ${colClass} flex items-center justify-between">
                ${val} 
                <button onclick="copyToClipboard('${val}', this)" class="text-slate-300 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                </button>
            </div>`;

            capHtml += `
        <div class="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 border-t-4 border-t-blue-500 transition-colors">
            <h2 class="text-md font-bold text-slate-900 dark:text-white mb-3 flex justify-between items-center">
                <span>Room Load <span class="text-slate-500 dark:text-slate-400 font-normal text-sm">(Point ${ms_nodes.length} → 1)</span></span>
                <span class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-1 rounded">Space Load</span>
            </h2>
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3">
                <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Total (kW)</div>${renderC(cap.Qt.toFixed(2), 'text-slate-800 dark:text-slate-100')}</div>
                <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Sensible (kW)</div>${renderC(cap.Qs.toFixed(2), 'text-blue-600 dark:text-blue-400')}</div>
                <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Latent (kW)</div>${renderC(cap.Ql.toFixed(2), 'text-emerald-600 dark:text-emerald-400')}</div>
                <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">SHR</div>${renderC(cap.SHR.toFixed(2), 'text-purple-600 dark:text-purple-400')}</div>
                <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Moisture (kg/h)</div>${renderC(cap.moistureDiff.toFixed(2), 'text-cyan-600 dark:text-cyan-400')}</div>
                <div class="stat-card group/card"><div class="text-xs text-slate-500 dark:text-slate-400">Δh/ΔW (kJ/g)</div>${renderC(cap.dh_dw_text, 'text-orange-500 dark:text-orange-400')}</div>
            </div>
        </div>`;
        }
    }

    capContainer.innerHTML = capHtml;

    let chartPoints = [];
    let chartLines = [];
    ms_nodes.forEach((n, i) => {
        if (!n.state) return;
        const color = getMsColor(i);
        let dragFn = null;
        if (n.type === 'source' || n.type === 'process') {
            dragFn = (tdb, w) => {
                const st = calcProperties(tdb, w, 'W');
                const tEl = document.getElementById(`ms_${n.id}_tdb`);
                const vEl = document.getElementById(`ms_${n.id}_propVal`);
                if (tEl) tEl.value = st.Tdb.toFixed(1);
                if (vEl) {
                    if (n.propType === 'RH') vEl.value = st.RH.toFixed(1);
                    else if (n.propType === 'Tdp') vEl.value = st.Tdp.toFixed(1);
                    else if (n.propType === 'W') vEl.value = st.W.toFixed(5);
                }
                syncMsState();
            };
        } else if (n.type === 'mix') {
            dragFn = (tdb, w) => {
                const p1 = ms_nodes.find(pn => pn.id === n.p1);
                const p2 = ms_nodes.find(pn => pn.id === n.p2);
                if (p1 && p1.state && p2 && p2.state) {
                    const alpha = projectMixFraction(tdb, w, p1.state, p2.state);
                    const totF = (n.flow1 || 0) + (n.flow2 || 0) || 1000;
                    const f1El = document.getElementById(`ms_${n.id}_flow1`);
                    const f2El = document.getElementById(`ms_${n.id}_flow2`);
                    if (f1El) f1El.value = Math.round(totF * (1 - alpha));
                    if (f2El) f2El.value = Math.round(totF * alpha);
                    syncMsState();
                }
            };
        }
        chartPoints.push({ s: n.state, c: color, l: `${i + 1}`, name: `Point ${i + 1}: ${n.name}`, onDrag: dragFn });

        if (n.type === 'process') {
            let p1 = ms_nodes.find(pn => pn.id === n.p1);
            if (p1 && p1.state) chartLines.push({ p1: p1.state, p2: n.state, c: color, d: false });
        } else if (n.type === 'mix') {
            let p1 = ms_nodes.find(pn => pn.id === n.p1);
            let p2 = ms_nodes.find(pn => pn.id === n.p2);
            if (p1 && p1.state) chartLines.push({ p1: p1.state, p2: n.state, c: '#94a3b8', d: true });
            if (p2 && p2.state) chartLines.push({ p1: p2.state, p2: n.state, c: '#94a3b8', d: true });
        }
    });

    if (ms_nodes.length > 1) {
        let roomNode = ms_nodes[0];
        let lastNode = ms_nodes[ms_nodes.length - 1];
        if (roomNode && roomNode.state && lastNode && lastNode.state && roomNode.id !== lastNode.id) {
            chartLines.push({ p1: lastNode.state, p2: roomNode.state, c: '#3b82f6', d: true });
        }
    }

    drawChart('ms_psyChart', chartPoints, chartLines, getBoundary('ms_bound_'));
}



// Hook updateAll & updateLoadAnalyzer to publish live outputs to MagicStore
const _origUpdateAll = updateAll;
updateAll = function() {
    _origUpdateAll();
    if (window.MagicStore) {
        const qTot = parseFloat(document.getElementById('cc_tot')?.innerText) || 0;
        const flow = parseFloat(document.getElementById('flowRate')?.value) || 0;
        window.MagicStore.publish({
            hvacCoolingLoadKw: qTot,
            hvacCoolingLoadRt: qTot / 3.51685,
            hvacSupplyAirLps: flow
        }, 'analyzerPage');
    }
};

const _origUpdateLoadAnalyzer = updateLoadAnalyzer;
updateLoadAnalyzer = function() {
    _origUpdateLoadAnalyzer();
    if (window.MagicStore) {
        const qTot = parseFloat(document.getElementById('load_cc_tot')?.innerText) || 0;
        const saFlow = parseFloat(document.getElementById('load_res_flow_lps')?.innerText) || 0;
        window.MagicStore.publish({
            hvacRoomCoolingKw: qTot,
            hvacRoomSupplyLps: saFlow
        }, 'loadAnalyzerPage');
    }
};
