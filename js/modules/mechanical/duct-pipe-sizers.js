// ============================================================================
// Mechanical & HVAC Modules 4–5: Duct Sizer & Hydraulic Pipe Sizer
// File: js/modules/mechanical/duct-pipe-sizers.js
// ============================================================================


function calcDarcyFrictionFactor(Re, epsilon_m, D_m) {
    if (Re <= 0 || D_m <= 0) return 0.02;
    const fTurbulent = (reVal) => {
        const sRe = Math.max(reVal, 500);
        return Math.pow(-1.8 * Math.log10(Math.pow((epsilon_m / (3.7 * D_m)), 1.11) + (6.9 / sRe)), -2);
    };
    if (Re >= 4000) return fTurbulent(Re);
    if (Re <= 2000) return 64 / Math.max(Re, 1);
    const w = (Re - 2000) / 2000;
    const sw = w * w * (3 - 2 * w); // C1 smoothstep blend between laminar and turbulent
    return (1 - sw) * (64 / Re) + sw * fTurbulent(Re);
}

function solveFluidDiameter(Q_m3s, maxFric_Pa_m, maxVel_ms, rho, mu, epsilon_m) {
    if (Q_m3s <= 0) return { D: 0, V: 0, F: 0, Re: 0, f: 0, limitedBy: 'None' };

    const D_vel = Math.sqrt((4 * Q_m3s) / (Math.PI * maxVel_ms));
    let D_low = 0.005; let D_high = 5.0; let D_fric = D_low;

    for (let i = 0; i < 50; i++) {
        let D_mid = (D_low + D_high) / 2;
        let V = (4 * Q_m3s) / (Math.PI * Math.pow(D_mid, 2));
        let Re = (rho * V * D_mid) / mu;
        let f = calcDarcyFrictionFactor(Re, epsilon_m, D_mid);
        let friction = f * (rho / 2) * (Math.pow(V, 2) / D_mid);

        if (friction > maxFric_Pa_m) {
            D_low = D_mid;
        } else {
            D_high = D_mid;
            D_fric = D_mid;
        }
    }

    let D_final = Math.max(D_vel, D_fric);
    let limitedBy = D_final === D_vel ? 'Velocity Limit' : 'Friction Limit';

    let V_actual = (4 * Q_m3s) / (Math.PI * Math.pow(D_final, 2));
    let Re_actual = (rho * V_actual * D_final) / mu;
    let f_actual = calcDarcyFrictionFactor(Re_actual, epsilon_m, D_final);
    let F_actual = f_actual * (rho / 2) * (Math.pow(V_actual, 2) / D_final);

    return { D: D_final, V: V_actual, F: F_actual, Re: Re_actual, f: f_actual, limitedBy: limitedBy };
}

function calcFlowProps(Q_m3s, D_m, rho, mu, epsilon_m) {
    if (Q_m3s <= 0 || D_m <= 0) return { V: 0, F: 0, Re: 0, f: 0, regime: 'None' };
    const V = (4 * Q_m3s) / (Math.PI * Math.pow(D_m, 2));
    const Re = (rho * V * D_m) / mu;
    const f = calcDarcyFrictionFactor(Re, epsilon_m, D_m);
    const F = f * (rho / 2) * (Math.pow(V, 2) / D_m);
    const regime = Re < 2300 ? 'Laminar' : (Re < 4000 ? 'Transitional' : 'Turbulent');
    return { V, F, Re, f, regime };
}

window._nomogramStates = window._nomogramStates || {};




function setDuctSystem(sys) {
    if (sys === currentDuctSys) return;

    const btnSI = document.getElementById('btn_duct_sys_SI');
    const btnIP = document.getElementById('btn_duct_sys_IP');

    if (sys === 'IP') {
        btnSI.className = "px-3 py-1 text-xs font-bold rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors";
        btnIP.className = "px-3 py-1 text-xs font-bold rounded shadow-sm bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 transition-colors";
    } else {
        btnIP.className = "px-3 py-1 text-xs font-bold rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors";
        btnSI.className = "px-3 py-1 text-xs font-bold rounded shadow-sm bg-teal-50 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300 transition-colors";
    }

    // Estimator Conversions
    const capInput = document.getElementById('duct_calc_cap');
    const dtInput = document.getElementById('duct_calc_dt');
    let capVal = parseFloat(capInput.value) || 0;
    let dtVal = parseFloat(dtInput.value) || 0;

    // Sizer Conversions
    const flowInput = document.getElementById('duct_flow');
    const flowUnit = document.getElementById('duct_unit');
    let flowVal = parseFloat(flowInput.value) || 0;

    const fricInput = document.getElementById('duct_maxFric');
    let fricVal = parseFloat(fricInput.value) || 0;

    const velInput = document.getElementById('duct_maxVel');
    let velVal = parseFloat(velInput.value) || 0;

    const lenInput = document.getElementById('duct_length');
    let lenVal = parseFloat(lenInput.value) || 0;

    const rectHInput = document.getElementById('duct_rect_H');
    let rectHVal = parseFloat(rectHInput.value) || 0;

    if (sys === 'IP') {
        // Estimator to IP
        capInput.value = (capVal / 3.51685).toFixed(1);
        dtInput.value = (dtVal * 1.8).toFixed(1);
        document.getElementById('label_duct_calc_cap').innerText = "Sensible Heat Load (Ton)";
        document.getElementById('label_duct_calc_dt').innerText = "Temperature Diff. (ΔT) (°F)";
        document.getElementById('label_duct_calc_res').innerText = "Estimated Flow Rate (CFM)";

        // Sizer Flow to IP
        if (flowUnit.value === 'LPS') flowInput.value = (flowVal * 2.11888).toFixed(0);
        else if (flowUnit.value === 'CMH') flowInput.value = (flowVal * 0.5885).toFixed(0);
        flowUnit.value = 'CFM';

        // Sizer Fric to IP (1 in.wg/100ft = 8.1722 Pa/m)
        fricInput.value = (fricVal / 8.1722).toFixed(2);
        fricInput.step = 0.01;
        document.getElementById('label_duct_maxFric').innerText = "Max Friction (in.wg/100ft)";

        // Sizer Vel to IP (1 m/s = 196.85 FPM)
        velInput.value = (velVal * 196.85).toFixed(0);
        velInput.step = 50;
        document.getElementById('label_duct_maxVel').innerText = "Max Velocity (FPM)";

        // Sizer Length to IP
        if (lenInput.value !== '') lenInput.value = (lenVal * 3.28084).toFixed(0);
        document.getElementById('label_duct_length').innerHTML = 'Length (ft) <span class="text-xs font-normal text-slate-400 italic">Opt.</span>';

        // Rect Height to IP
        rectHInput.value = (rectHVal / 25.4).toFixed(0);
        rectHInput.step = 2;
        document.getElementById('label_duct_rect_H').innerText = "Fixed Height (in)";
        document.getElementById('label_duct_rect_W').innerText = "Exact Width (in)";

    } else {
        // Estimator to SI
        capInput.value = (capVal * 3.51685).toFixed(0);
        dtInput.value = (dtVal / 1.8).toFixed(1);
        document.getElementById('label_duct_calc_cap').innerText = "Sensible Heat Load (kW)";
        document.getElementById('label_duct_calc_dt').innerText = "Temperature Diff. (ΔT) (°C)";
        document.getElementById('label_duct_calc_res').innerText = "Estimated Flow Rate (L/s)";

        // Sizer Flow to SI
        if (flowUnit.value === 'CFM') flowInput.value = (flowVal / 2.11888).toFixed(0);
        else if (flowUnit.value === 'CMH') flowInput.value = (flowVal / 3.6).toFixed(0);
        flowUnit.value = 'LPS';

        // Sizer Fric to SI
        fricInput.value = (fricVal * 8.1722).toFixed(1);
        fricInput.step = 0.1;
        document.getElementById('label_duct_maxFric').innerText = "Max Friction (Pa/m)";

        // Sizer Vel to SI
        velInput.value = (velVal / 196.85).toFixed(1);
        velInput.step = 0.5;
        document.getElementById('label_duct_maxVel').innerText = "Max Velocity (m/s)";

        // Sizer Length to SI
        if (lenInput.value !== '') lenInput.value = (lenVal / 3.28084).toFixed(1);
        document.getElementById('label_duct_length').innerHTML = 'Length (m) <span class="text-xs font-normal text-slate-400 italic">Opt.</span>';

        // Rect Height to SI
        rectHInput.value = (rectHVal * 25.4).toFixed(0);
        rectHInput.step = 50;
        document.getElementById('label_duct_rect_H').innerText = "Fixed Height (mm)";
        document.getElementById('label_duct_rect_W').innerText = "Exact Width (mm)";
    }

    currentDuctSys = sys;
    updateDuctCalc();
    updateDuctSizer();
}

function updateDuctCalc() {
    const cap = parseFloat(document.getElementById('duct_calc_cap').value) || 0;
    const dt = parseFloat(document.getElementById('duct_calc_dt').value) || 0.1;

    let Q_kW = currentDuctSys === 'IP' ? cap * 3.51685 : cap;
    let dt_C = currentDuctSys === 'IP' ? dt * (5 / 9) : dt;
    if (dt_C === 0) dt_C = 0.1;

    // Mass flow rate in kg/s (Cp of Air ≈ 1.006 kJ/kg.K)
    let m_dot = Q_kW / (1.006 * dt_C);
    // Volumetric flow rate in m3/s (Density of Air ≈ 1.204 kg/m³)
    let vol_m3s = m_dot / 1.204;

    let flow = currentDuctSys === 'IP' ? vol_m3s * 2118.88 : vol_m3s * 1000;
    document.getElementById('duct_calc_res').value = flow.toFixed(0);
}

function applyDuctCalcFlow() {
    const flow = document.getElementById('duct_calc_res').value;
    const unit = currentDuctSys === 'IP' ? 'CFM' : 'LPS';

    document.getElementById('duct_flow').value = flow;
    document.getElementById('duct_unit').value = unit;

    updateDuctSizer();
}

function updateDuctSizer() {
    const flow = parseFloat(document.getElementById('duct_flow').value) || 0;
    const unit = document.getElementById('duct_unit').value;

    let maxFric = parseFloat(document.getElementById('duct_maxFric').value) || 0;
    if (currentDuctSys === 'IP') maxFric *= 8.1722; // Convert in.wg/100ft to Pa/m

    let maxVel = parseFloat(document.getElementById('duct_maxVel').value) || 0;
    if (currentDuctSys === 'IP') maxVel *= 0.00508; // Convert FPM to m/s
    if (maxVel <= 0) maxVel = 8.0;

    let lengthInput = parseFloat(document.getElementById('duct_length').value) || 0;
    let length_m = lengthInput;
    if (currentDuctSys === 'IP') length_m *= 0.3048; // Convert ft to m

    let rectHInput = parseFloat(document.getElementById('duct_rect_H').value) || (currentDuctSys === 'IP' ? 12 : 300);
    let rectH_mm = currentDuctSys === 'IP' ? rectHInput * 25.4 : rectHInput;

    const roughness_mm = parseFloat(document.getElementById('duct_roughness').value) || 0.09;
    const epsilon = roughness_mm / 1000;

    let Q = 0;
    if (unit === 'LPS') Q = flow / 1000;
    else if (unit === 'CFM') Q = flow * 0.000471947;
    else if (unit === 'CMH') Q = flow / 3600;

    const rho_air = 1.204;
    const mu_air = 1.81e-5;

    const res = solveFluidDiameter(Q, maxFric, maxVel, rho_air, mu_air, epsilon);
    const D_mm = res.D * 1000;
    const D_in = D_mm / 25.4;

    // Output Round Duct Dual Display
    document.getElementById('duct_res_D_main').innerHTML = `${Math.ceil(D_mm)} <span class="text-lg text-slate-500 dark:text-slate-400">mm</span>`;
    document.getElementById('duct_res_D_sub').innerText = `${D_in.toFixed(1)} in`;

    document.getElementById('duct_res_limit').innerText = res.limitedBy;

    const V_fps = res.V * 196.85;
    document.getElementById('duct_res_V_main').innerHTML = `${res.V.toFixed(2)} <span class="text-sm text-slate-500 dark:text-slate-400">m/s</span>`;
    document.getElementById('duct_res_V_sub').innerText = `${V_fps.toFixed(0)} FPM`;

    const F_inwg = res.F / 8.1722;
    document.getElementById('duct_res_F_main').innerHTML = `${res.F.toFixed(2)} <span class="text-sm text-slate-500 dark:text-slate-400">Pa/m</span>`;
    document.getElementById('duct_res_F_sub').innerText = `${F_inwg.toFixed(3)} in.wg/100ft`;

    if (length_m > 0) {
        let area_m2 = Math.PI * res.D * length_m;
        let area_ft2 = area_m2 * 10.7639;
        let pd_pa = res.F * length_m;
        let pd_inwg = pd_pa / 249.0889;

        document.getElementById('duct_res_area_main').innerHTML = `${area_m2.toFixed(1)} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">m²</span>`;
        document.getElementById('duct_res_area_sub').innerText = `${area_ft2.toFixed(1)} ft²`;

        document.getElementById('duct_res_dp_main').innerHTML = `${pd_pa.toFixed(0)} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">Pa</span>`;
        document.getElementById('duct_res_dp_sub').innerText = `${pd_inwg.toFixed(3)} in.wg`;
    } else {
        document.getElementById('duct_res_area_main').innerHTML = '-';
        document.getElementById('duct_res_area_sub').innerText = '';
        document.getElementById('duct_res_dp_main').innerHTML = '-';
        document.getElementById('duct_res_dp_sub').innerText = '';
    }

    // Rectangular Equivalent Solver
    if (D_mm > 0 && rectH_mm > 0) {
        let rectW = rectH_mm;
        for (let i = 0; i < 30; i++) {
            let rW = Math.max(rectW, 1);
            let f_a = 1.30 * Math.pow((rW * rectH_mm), 0.625) / Math.pow((rW + rectH_mm), 0.25) - D_mm;
            let rW_up = rW + 1;
            let f_a_up = 1.30 * Math.pow((rW_up * rectH_mm), 0.625) / Math.pow((rW_up + rectH_mm), 0.25) - D_mm;
            let derivative = f_a_up - f_a;
            if (Math.abs(derivative) < 0.0001) break;
            rectW = rW - (f_a / derivative);
        }
        rectW = Math.max(rectW, 1);

        if (currentDuctSys === 'IP') {
            let w_in = rectW / 25.4;
            document.getElementById('duct_rect_W').value = Math.ceil(w_in);
            let rec_h = rectHInput;
            let rec_w = Math.ceil(w_in / 2) * 2; // standard 2 inch increments
            document.getElementById('duct_rect_rec_main').innerText = `${rec_h} × ${rec_w} in`;

            if (length_m > 0) {
                let rArea_m2 = 2 * ((rectH_mm / 1000) + ((rec_w * 25.4) / 1000)) * length_m;
                let rArea_ft2 = rArea_m2 * 10.7639;
                document.getElementById('duct_rect_area_main').innerHTML = `${rArea_m2.toFixed(1)} <span class="text-sm text-slate-500 font-normal">m²</span>`;
                document.getElementById('duct_rect_area_sub').innerText = `${rArea_ft2.toFixed(1)} ft²`;
            } else {
                document.getElementById('duct_rect_area_main').innerText = '-';
                document.getElementById('duct_rect_area_sub').innerText = '';
            }
        } else {
            document.getElementById('duct_rect_W').value = Math.ceil(rectW);
            let rec_h = rectHInput;
            let rec_w = Math.ceil(rectW / 50) * 50; // standard 50 mm increments
            document.getElementById('duct_rect_rec_main').innerText = `${rec_h} × ${rec_w} mm`;

            if (length_m > 0) {
                let rArea_m2 = 2 * ((rectH_mm / 1000) + (rec_w / 1000)) * length_m;
                let rArea_ft2 = rArea_m2 * 10.7639;
                document.getElementById('duct_rect_area_main').innerHTML = `${rArea_m2.toFixed(1)} <span class="text-sm text-slate-500 font-normal">m²</span>`;
                document.getElementById('duct_rect_area_sub').innerText = `${rArea_ft2.toFixed(1)} ft²`;
            } else {
                document.getElementById('duct_rect_area_main').innerText = '-';
                document.getElementById('duct_rect_area_sub').innerText = '';
            }
        }
    } else {
        document.getElementById('duct_rect_W').value = 0;
        document.getElementById('duct_rect_rec_main').innerText = `-- × -- mm`;
        document.getElementById('duct_rect_area_main').innerText = '-';
        document.getElementById('duct_rect_area_sub').innerText = '';
    }

    drawLogLogNomogram('ductChart', flow, unit, Q, res.D, rho_air, mu_air, epsilon, maxFric, maxVel, false);
}

// Global state for Pipe Unit System
let currentPipeSys = 'SI';

function setPipeSystem(sys) {
    if (sys === currentPipeSys) return;

    const btnSI = document.getElementById('btn_pipe_sys_SI');
    const btnIP = document.getElementById('btn_pipe_sys_IP');

    if (sys === 'IP') {
        btnSI.className = "px-3 py-1 text-xs font-bold rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors";
        btnIP.className = "px-3 py-1 text-xs font-bold rounded shadow-sm bg-cyan-50 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 transition-colors";
    } else {
        btnIP.className = "px-3 py-1 text-xs font-bold rounded text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors";
        btnSI.className = "px-3 py-1 text-xs font-bold rounded shadow-sm bg-cyan-50 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300 transition-colors";
    }

    // Flow Rate Estimator Conversions
    const capInput = document.getElementById('pipe_calc_cap');
    const dtInput = document.getElementById('pipe_calc_dt');
    let capVal = parseFloat(capInput.value) || 0;
    let dtVal = parseFloat(dtInput.value) || 0;

    // Design Constraints Conversions
    const flowInput = document.getElementById('pipe_flow');
    const flowUnit = document.getElementById('pipe_unit');
    let flowVal = parseFloat(flowInput.value) || 0;

    const fricInput = document.getElementById('pipe_maxFric');
    let fricVal = parseFloat(fricInput.value) || 0;

    const velInput = document.getElementById('pipe_maxVel');
    let velVal = parseFloat(velInput.value) || 0;

    const minVelInput = document.getElementById('pipe_minVel');
    let minVelVal = parseFloat(minVelInput.value);

    const lenInput = document.getElementById('pipe_length');
    let lenVal = parseFloat(lenInput.value) || 0;

    if (sys === 'IP') {
        // Estimator to IP
        capInput.value = (capVal / 3.51685).toFixed(1);
        dtInput.value = (dtVal * 1.8).toFixed(1);
        document.getElementById('label_pipe_calc_cap').innerText = "Cooling / Heating Cap. (Ton)";
        document.getElementById('label_pipe_calc_dt').innerText = "Temperature Diff. (ΔT) (°F)";
        document.getElementById('label_pipe_calc_res').innerText = "Estimated Flow Rate (GPM)";

        // Sizer Flow to IP (GPM)
        if (flowUnit.value === 'LPS') flowInput.value = (flowVal * 15.8503).toFixed(1);
        else if (flowUnit.value === 'LPM') flowInput.value = (flowVal * 0.264172).toFixed(1);
        else if (flowUnit.value === 'CMH') flowInput.value = (flowVal * 4.40287).toFixed(1);
        flowUnit.value = 'GPM';

        // Sizer Fric to IP
        fricInput.value = (fricVal / 98.0665).toFixed(2);
        fricInput.step = 0.1;
        document.getElementById('label_pipe_maxFric').innerText = "Max Friction (ft/100ft)";

        // Sizer Vel to IP
        velInput.value = (velVal * 3.28084).toFixed(2);
        velInput.step = 0.5;
        if (!isNaN(minVelVal)) minVelInput.value = (minVelVal * 3.28084).toFixed(2);
        minVelInput.step = 0.5;
        document.getElementById('label_pipe_velLimits').innerHTML = 'Velocity Limits (ft/s) <span class="text-xs font-normal text-slate-400 italic">Min - Max</span>';

        // Sizer Length to IP
        if (lenInput.value !== '') {
            lenInput.value = (lenVal * 3.28084).toFixed(0);
        }
        document.getElementById('label_pipe_length').innerHTML = 'Length (ft) <span class="text-xs font-normal text-slate-400 italic">Opt.</span>';

    } else {
        // Estimator to SI
        capInput.value = (capVal * 3.51685).toFixed(0);
        dtInput.value = (dtVal / 1.8).toFixed(1);
        document.getElementById('label_pipe_calc_cap').innerText = "Cooling / Heating Cap. (kW)";
        document.getElementById('label_pipe_calc_dt').innerText = "Temperature Diff. (ΔT) (°C)";
        document.getElementById('label_pipe_calc_res').innerText = "Estimated Flow Rate (LPM)";

        // Sizer Flow to SI (LPM)
        if (flowUnit.value === 'GPM') flowInput.value = (flowVal * 3.78541).toFixed(1);
        else if (flowUnit.value === 'LPS') flowInput.value = (flowVal * 60).toFixed(1);
        else if (flowUnit.value === 'CMH') flowInput.value = (flowVal * 16.6667).toFixed(1);
        flowUnit.value = 'LPM';

        // Sizer Fric to SI
        fricInput.value = (fricVal * 98.0665).toFixed(0);
        fricInput.step = 10;
        document.getElementById('label_pipe_maxFric').innerText = "Max Friction (Pa/m)";

        // Sizer Vel to SI
        velInput.value = (velVal / 3.28084).toFixed(2);
        velInput.step = 0.1;
        if (!isNaN(minVelVal)) minVelInput.value = (minVelVal / 3.28084).toFixed(2);
        minVelInput.step = 0.1;
        document.getElementById('label_pipe_velLimits').innerHTML = 'Velocity Limits (m/s) <span class="text-xs font-normal text-slate-400 italic">Min - Max</span>';

        // Sizer Length to SI
        if (lenInput.value !== '') {
            lenInput.value = (lenVal / 3.28084).toFixed(1);
        }
        document.getElementById('label_pipe_length').innerHTML = 'Length (m) <span class="text-xs font-normal text-slate-400 italic">Opt.</span>';
    }

    currentPipeSys = sys;
    updatePipeCalc();
    updatePipeSizer();
}

// ============================================================================
// Hydraulic Pipe Sizer Expansion:
// 1. Commercial Pipe Size Selector (Auto-Size vs User-Defined DN15–DN600 / 1/2"–24")
// 2. Multi-Fluid Library (Water, PG25, EG30, Diesel No.2, Biodiesel B5/B20, Lube/Hydraulic Oil, Thermal Oil, Custom)
// 3. Pipe Fittings, Valves & Overall System Friction Loss Calculator (K-Factor & Eq. Length)
// ============================================================================

const PIPE_FLUID_CATALOG = {
    '10': {
        name: 'Chilled Water (~10 °C)',
        shortName: 'Chilled Water 10°C',
        category: 'Water',
        rho: 999.7,
        mu: 1.307e-3,
        cp: 4.192,
        desc: 'Clean Hydronic Water @ 10 °C (50 °F)'
    },
    '20': {
        name: 'Condenser Water (~20 °C)',
        shortName: 'Condenser Water 20°C',
        category: 'Water',
        rho: 998.2,
        mu: 1.002e-3,
        cp: 4.184,
        desc: 'Clean Hydronic Water @ 20 °C (68 °F)'
    },
    '60': {
        name: 'Hot Heating Water (~60 °C)',
        shortName: 'Hot Water 60°C',
        category: 'Water',
        rho: 983.2,
        mu: 0.466e-3,
        cp: 4.185,
        desc: 'Hot Heating Water @ 60 °C (140 °F)'
    },
    'PG25': {
        name: 'PG25 — Propylene Glycol 25% (~5 °C)',
        shortName: 'PG25 Glycol (5°C)',
        category: 'Glycol / Brine',
        rho: 1026.0,
        mu: 3.65e-3,
        cp: 3.910,
        desc: '25% Propylene Glycol Aqueous Solution @ 5 °C'
    },
    'PG25_20': {
        name: 'PG25 — Propylene Glycol 25% (~20 °C)',
        shortName: 'PG25 Glycol (20°C)',
        category: 'Glycol / Brine',
        rho: 1021.0,
        mu: 2.25e-3,
        cp: 3.940,
        desc: '25% Propylene Glycol Aqueous Solution @ 20 °C'
    },
    'EG30': {
        name: 'EG30 — Ethylene Glycol 30% (~5 °C)',
        shortName: 'EG30 Glycol (5°C)',
        category: 'Glycol / Brine',
        rho: 1045.0,
        mu: 3.10e-3,
        cp: 3.650,
        desc: '30% Ethylene Glycol Aqueous Solution @ 5 °C'
    },
    'DIESEL_NO2': {
        name: 'Diesel No. 2 (ASTM D975 @ 25 °C)',
        shortName: 'Diesel No. 2',
        category: 'Fuels & Biofuels',
        rho: 835.0,
        mu: 2.84e-3,
        cp: 1.950,
        desc: 'Distillate Fuel Oil No. 2 (3.40 cSt @ 25 °C)'
    },
    'BIODIESEL_B5': {
        name: 'Biodiesel B5 (5% FAME Blend @ 25 °C)',
        shortName: 'Biodiesel B5',
        category: 'Fuels & Biofuels',
        rho: 838.0,
        mu: 3.05e-3,
        cp: 1.960,
        desc: 'Commercial Diesel B5 Blend (3.64 cSt @ 25 °C)'
    },
    'BIODIESEL_B20': {
        name: 'Biodiesel B20 (20% FAME Blend @ 25 °C)',
        shortName: 'Biodiesel B20',
        category: 'Fuels & Biofuels',
        rho: 846.0,
        mu: 3.45e-3,
        cp: 1.980,
        desc: 'Biodiesel B20 Blend (4.08 cSt @ 25 °C)'
    },
    'OIL_VG32': {
        name: 'Oil — Hydraulic / Lube ISO VG 32 (@ 40 °C)',
        shortName: 'Oil ISO VG 32',
        category: 'Oils & Lubricants',
        rho: 870.0,
        mu: 27.84e-3,
        cp: 1.920,
        desc: 'Mineral Hydraulic/Lube Oil ISO VG 32 (32.0 cSt @ 40 °C)'
    },
    'OIL_VG46': {
        name: 'Oil — Hydraulic / Lube ISO VG 46 (@ 40 °C)',
        shortName: 'Oil ISO VG 46',
        category: 'Oils & Lubricants',
        rho: 875.0,
        mu: 40.25e-3,
        cp: 1.920,
        desc: 'Industrial Hydraulic/Lube Oil ISO VG 46 (46.0 cSt @ 40 °C)'
    },
    'OIL_THERMAL': {
        name: 'Oil — Thermal Heat Transfer (@ 80 °C)',
        shortName: 'Thermal Oil (80°C)',
        category: 'Oils & Lubricants',
        rho: 840.0,
        mu: 6.30e-3,
        cp: 2.150,
        desc: 'Heat Transfer Thermal Oil (7.50 cSt @ 80 °C)'
    },
    'CUSTOM': {
        name: 'Custom Fluid (User-Defined ρ, μ, Cp)',
        shortName: 'Custom Fluid',
        category: 'Custom',
        rho: 950.0,
        mu: 2.00e-3,
        cp: 3.500,
        desc: 'User-Specified Thermophysical Properties'
    }
};

// Standard Commercial Pipe Schedule (ASME B36.10 Sch 40 / Commercial Steel)
const PIPE_SCHEDULE_LIST = (typeof standardCommercialPipes !== 'undefined' && Array.isArray(standardCommercialPipes))
    ? standardCommercialPipes.map(p => ({
        dn: p.dn,
        inch: p.inch,
        id_mm: p.id_mm,
        od_mm: p.od_mm || +(p.id_mm * 1.12).toFixed(1)
    }))
    : [
        { dn: 15,  inch: '1/2"',   id_mm: 15.8,  od_mm: 21.3 },
        { dn: 20,  inch: '3/4"',   id_mm: 20.9,  od_mm: 26.7 },
        { dn: 25,  inch: '1"',     id_mm: 26.6,  od_mm: 33.4 },
        { dn: 32,  inch: '1-1/4"', id_mm: 35.1,  od_mm: 42.2 },
        { dn: 40,  inch: '1-1/2"', id_mm: 40.9,  od_mm: 48.3 },
        { dn: 50,  inch: '2"',     id_mm: 52.5,  od_mm: 60.3 },
        { dn: 65,  inch: '2-1/2"', id_mm: 62.7,  od_mm: 73.0 },
        { dn: 80,  inch: '3"',     id_mm: 77.9,  od_mm: 88.9 },
        { dn: 100, inch: '4"',     id_mm: 102.3, od_mm: 114.3 },
        { dn: 125, inch: '5"',     id_mm: 128.2, od_mm: 141.3 },
        { dn: 150, inch: '6"',     id_mm: 154.1, od_mm: 168.3 },
        { dn: 200, inch: '8"',     id_mm: 202.7, od_mm: 219.1 },
        { dn: 250, inch: '10"',    id_mm: 254.5, od_mm: 273.1 },
        { dn: 300, inch: '12"',    id_mm: 304.8, od_mm: 323.9 },
        { dn: 350, inch: '14"',    id_mm: 336.6, od_mm: 355.6 },
        { dn: 400, inch: '16"',    id_mm: 387.4, od_mm: 406.4 },
        { dn: 450, inch: '18"',    id_mm: 438.2, od_mm: 457.2 },
        { dn: 500, inch: '20"',    id_mm: 489.0, od_mm: 508.0 },
        { dn: 600, inch: '24"',    id_mm: 590.6, od_mm: 609.6 }
    ];

// Standard Pipe Fittings & Valves Catalog (Crane TP-410 / ASHRAE Fundamentals)
const PIPE_FITTING_CATALOG = [
    { key: 'elbow_90_std', name: '90° Standard Elbow', k: 0.75, ld: 30, icon: '↱' },
    { key: 'elbow_90_lr',  name: '90° Long Radius Elbow (r/D=1.5)', k: 0.45, ld: 20, icon: '↱' },
    { key: 'elbow_45',     name: '45° Standard Elbow', k: 0.35, ld: 16, icon: '↗' },
    { key: 'tee_run',      name: 'Tee — Flow Through Run', k: 0.40, ld: 20, icon: '⊤' },
    { key: 'tee_branch',   name: 'Tee — Flow Through Branch (90°)', k: 1.50, ld: 60, icon: '⊢' },
    { key: 'valve_gate',   name: 'Gate Valve (Fully Open)', k: 0.15, ld: 8, icon: '⋈' },
    { key: 'valve_bfly',   name: 'Butterfly Valve (Fully Open)', k: 0.60, ld: 30, icon: '⧓' },
    { key: 'valve_ball',   name: 'Ball Valve (Fully Open)', k: 0.10, ld: 5, icon: '⊖' },
    { key: 'valve_globe',  name: 'Globe / Balancing Valve', k: 6.00, ld: 300, icon: '⊗' },
    { key: 'check_swing',  name: 'Swing Check Valve', k: 2.00, ld: 100, icon: '⍄' },
    { key: 'check_lift',   name: 'Lift / Spring Check Valve', k: 4.00, ld: 200, icon: '⍄' },
    { key: 'strainer_y',   name: 'Y-Strainer / Basket Strainer (Clean)', k: 2.50, ld: 125, icon: '▽' },
    { key: 'flex_joint',   name: 'Flexible Connector / Expansion Joint', k: 0.50, ld: 25, icon: '≋' },
    { key: 'reducer',      name: 'Reducer / Contraction', k: 0.30, ld: 15, icon: '⊳' },
    { key: 'increaser',    name: 'Increaser / Enlargement', k: 0.50, ld: 25, icon: '⊲' },
    { key: 'entrance',     name: 'Pipe Entrance (Tank Suction)', k: 0.50, ld: 25, icon: '⇥' },
    { key: 'exit',         name: 'Pipe Exit (Tank Discharge)', k: 1.00, ld: 50, icon: '⇤' }
];

const PIPE_FITTINGS_STORAGE_KEY = 'magic_pipe_fittings_v1';

const DEFAULT_HVAC_FITTINGS = [
    { id: 'pf_1', key: 'elbow_90_std', name: '90° Standard Elbow', k: 0.75, qty: 6 },
    { id: 'pf_2', key: 'tee_branch',   name: 'Tee — Flow Through Branch (90°)', k: 1.50, qty: 2 },
    { id: 'pf_3', key: 'valve_bfly',   name: 'Butterfly Valve (Fully Open)', k: 0.60, qty: 4 },
    { id: 'pf_4', key: 'check_swing',  name: 'Swing Check Valve', k: 2.00, qty: 1 },
    { id: 'pf_5', key: 'strainer_y',   name: 'Y-Strainer / Basket Strainer (Clean)', k: 2.50, qty: 1 },
    { id: 'pf_6', key: 'flex_joint',   name: 'Flexible Connector / Expansion Joint', k: 0.50, qty: 2 }
];

const DEFAULT_FUEL_FITTINGS = [
    { id: 'pf_f1', key: 'elbow_90_std', name: '90° Standard Elbow', k: 0.75, qty: 8 },
    { id: 'pf_f2', key: 'valve_ball',   name: 'Ball Valve (Fully Open)', k: 0.10, qty: 3 },
    { id: 'pf_f3', key: 'check_swing',  name: 'Swing Check Valve', k: 2.00, qty: 1 },
    { id: 'pf_f4', key: 'strainer_y',   name: 'Y-Strainer / Basket Strainer (Clean)', k: 2.50, qty: 1 },
    { id: 'pf_f5', key: 'entrance',     name: 'Pipe Entrance (Tank Suction)', k: 0.50, qty: 1 },
    { id: 'pf_f6', key: 'exit',         name: 'Pipe Exit (Tank Discharge)', k: 1.00, qty: 1 }
];

let pipeFittingsList = [];

function loadPipeFittings() {
    try {
        const raw = localStorage.getItem(PIPE_FITTINGS_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                pipeFittingsList = parsed;
                return;
            }
        }
    } catch (e) {}
    pipeFittingsList = JSON.parse(JSON.stringify(DEFAULT_HVAC_FITTINGS));
    savePipeFittings();
}

function savePipeFittings() {
    try {
        localStorage.setItem(PIPE_FITTINGS_STORAGE_KEY, JSON.stringify(pipeFittingsList));
    } catch (e) {}
}

function getActivePipeFluidProps() {
    const selKey = document.getElementById('pipe_temp')?.value || '10';
    const customBox = document.getElementById('pipe_custom_fluid_inputs');
    if (customBox) {
        customBox.classList.toggle('hidden', selKey !== 'CUSTOM');
    }

    let rho = 999.7, mu = 1.307e-3, cp = 4.192, name = 'Chilled Water (~10 °C)', desc = '';
    if (selKey === 'CUSTOM') {
        rho = parseFloat(document.getElementById('pipe_custom_rho')?.value) || 950;
        const mu_mPas = parseFloat(document.getElementById('pipe_custom_mu')?.value) || 2.0;
        mu = Math.max(0.05, mu_mPas) * 1e-3;
        cp = parseFloat(document.getElementById('pipe_custom_cp')?.value) || 3.50;
        name = 'Custom Fluid';
        desc = 'User-Defined Fluid';
    } else if (PIPE_FLUID_CATALOG[selKey]) {
        const preset = PIPE_FLUID_CATALOG[selKey];
        rho = preset.rho;
        mu = preset.mu;
        cp = preset.cp;
        name = preset.name;
        desc = preset.desc;
    }

    const nu_cSt = (mu / rho) * 1e6; // kinematic viscosity in mm²/s (cSt)

    // Update live fluid property badges if present
    const rhoBadge = document.getElementById('pipe_fluid_badge_rho');
    const muBadge = document.getElementById('pipe_fluid_badge_mu');
    const nuBadge = document.getElementById('pipe_fluid_badge_nu');
    const cpBadge = document.getElementById('pipe_fluid_badge_cp');
    if (rhoBadge) rhoBadge.innerText = `${rho.toFixed(1)} kg/m³`;
    if (muBadge) muBadge.innerText = `${(mu * 1000).toFixed(2)} mPa·s`;
    if (nuBadge) nuBadge.innerText = `${nu_cSt.toFixed(2)} cSt`;
    if (cpBadge) cpBadge.innerText = `${cp.toFixed(2)} kJ/kg·K`;

    return { key: selKey, name, desc, rho, mu, nu_cSt, cp };
}

function selectPipeSizeDN(dnValue) {
    const selEl = document.getElementById('pipe_selected_dn');
    if (selEl) {
        selEl.value = String(dnValue);
    }
    updatePipeSizer();
}

function addQuickPipeFitting(fittingKey, addQty = 1) {
    const cat = PIPE_FITTING_CATALOG.find(f => f.key === fittingKey);
    if (!cat) return;
    if (!pipeFittingsList) loadPipeFittings();

    const existing = pipeFittingsList.find(item => item.key === fittingKey && Math.abs(item.k - cat.k) < 0.001);
    if (existing) {
        existing.qty = Math.max(1, (parseInt(existing.qty) || 0) + addQty);
    } else {
        pipeFittingsList.push({
            id: 'pf_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
            key: cat.key,
            name: cat.name,
            k: cat.k,
            qty: addQty
        });
    }
    savePipeFittings();
    updatePipeSizer();
}

function addPipeFittingFromSelect() {
    const selEl = document.getElementById('pipe_new_fitting_key');
    const qtyEl = document.getElementById('pipe_new_fitting_qty');
    const key = selEl?.value || 'elbow_90_std';
    const qty = Math.max(1, parseInt(qtyEl?.value) || 1);
    addQuickPipeFitting(key, qty);
}

function updatePipeFittingRow(id, field, value) {
    const item = pipeFittingsList.find(f => f.id === id);
    if (!item) return;
    if (field === 'key') {
        const cat = PIPE_FITTING_CATALOG.find(c => c.key === value);
        if (cat) {
            item.key = cat.key;
            item.name = cat.name;
            item.k = cat.k;
        }
    } else if (field === 'k') {
        item.k = Math.max(0, parseFloat(value) || 0);
    } else if (field === 'qty') {
        item.qty = Math.max(0, parseInt(value) || 0);
    } else if (field === 'name') {
        item.name = value;
    }
    savePipeFittings();
    updatePipeSizer();
}

function stepPipeFittingQty(id, delta) {
    const item = pipeFittingsList.find(f => f.id === id);
    if (!item) return;
    const nextQty = (parseInt(item.qty) || 0) + delta;
    if (nextQty <= 0) {
        pipeFittingsList = pipeFittingsList.filter(f => f.id !== id);
    } else {
        item.qty = nextQty;
    }
    savePipeFittings();
    updatePipeSizer();
}

function removePipeFittingRow(id) {
    pipeFittingsList = pipeFittingsList.filter(f => f.id !== id);
    savePipeFittings();
    updatePipeSizer();
}

function loadPipeFittingPreset(presetType) {
    if (presetType === 'HVAC') {
        pipeFittingsList = JSON.parse(JSON.stringify(DEFAULT_HVAC_FITTINGS));
    } else if (presetType === 'FUEL') {
        pipeFittingsList = JSON.parse(JSON.stringify(DEFAULT_FUEL_FITTINGS));
    } else if (presetType === 'CLEAR') {
        pipeFittingsList = [];
    }
    savePipeFittings();
    updatePipeSizer();
}

function updatePipeCalc() {
    const capEl = document.getElementById('pipe_calc_cap');
    const dtEl = document.getElementById('pipe_calc_dt');
    const resEl = document.getElementById('pipe_calc_res');
    if (!capEl || !dtEl || !resEl) return;

    const cap = parseFloat(capEl.value) || 0;
    const dt = parseFloat(dtEl.value) || 0.1;

    // 1. Convert Capacity to kW
    let Q_kW = currentPipeSys === 'IP' ? cap * 3.51685 : cap;

    // 2. Convert deltaT to Celsius
    let dt_C = currentPipeSys === 'IP' ? dt * (5 / 9) : dt;
    if (dt_C <= 0) dt_C = 0.1;

    // 3. Use active fluid Cp (kJ/kg·K) and density rho (kg/m³)
    const fluid = getActivePipeFluidProps();
    const cp = fluid.cp > 0 ? fluid.cp : 4.184;
    const rho = fluid.rho > 0 ? fluid.rho : 1000;

    // Mass flow rate in kg/s: m_dot = Q_kW / (cp * dt_C)
    const m_dot = Q_kW / (cp * dt_C);

    // Volumetric flow rate in L/s: V_lps = (m_dot / rho) * 1000
    const flow_lps = (m_dot / rho) * 1000;

    // Convert to LPM (SI) or GPM (IP)
    const flow = currentPipeSys === 'IP' ? flow_lps * 15.850323 : flow_lps * 60;
    resEl.value = flow.toFixed(2);
}

function applyPipeCalcFlow() {
    const flow = document.getElementById('pipe_calc_res')?.value || 0;
    const unit = currentPipeSys === 'IP' ? 'GPM' : 'LPM';

    const flowEl = document.getElementById('pipe_flow');
    const unitEl = document.getElementById('pipe_unit');
    if (flowEl) flowEl.value = flow;
    if (unitEl) unitEl.value = unit;

    updatePipeSizer();
}

function updatePipeSizer() {
    if (!pipeFittingsList || pipeFittingsList.length === 0) {
        if (!window._pipeFittingsLoadedOnce) {
            window._pipeFittingsLoadedOnce = true;
            loadPipeFittings();
        }
    }

    const flow = parseFloat(document.getElementById('pipe_flow')?.value) || 0;
    const unit = document.getElementById('pipe_unit')?.value || 'LPS';

    // Fetch inputs and normalize to SI internally
    let maxFric = parseFloat(document.getElementById('pipe_maxFric')?.value) || 0;
    if (currentPipeSys === 'IP') maxFric *= 98.0665; // Convert ft/100ft to Pa/m

    let maxVel = parseFloat(document.getElementById('pipe_maxVel')?.value) || 0;
    let minVel = parseFloat(document.getElementById('pipe_minVel')?.value);

    if (currentPipeSys === 'IP') {
        maxVel /= 3.28084; // Convert ft/s to m/s
        if (!isNaN(minVel)) minVel /= 3.28084;
    }
    if (maxVel <= 0) maxVel = 1.5;

    let lengthInput = parseFloat(document.getElementById('pipe_length')?.value);
    if (isNaN(lengthInput)) lengthInput = 0;
    let length_m = lengthInput;
    if (currentPipeSys === 'IP') length_m /= 3.28084; // Convert ft to m

    const roughness_mm = parseFloat(document.getElementById('pipe_roughness')?.value) || 0.045;
    const epsilon = roughness_mm / 1000;

    // Fluid properties (Water, PG25, EG30, Diesel No.2, Biodiesel B5, Oils, Custom)
    const fluid = getActivePipeFluidProps();
    const rho_fluid = fluid.rho;
    const mu_fluid = fluid.mu;

    // Keep thermal flow estimator synced with fluid Cp & rho
    updatePipeCalc();

    let Q = 0;
    if (unit === 'LPS') Q = flow / 1000;
    else if (unit === 'LPM') Q = flow / 60000;
    else if (unit === 'GPM') Q = flow * 0.0000630902;
    else if (unit === 'CMH') Q = flow / 3600;

    // 1. Solve Exact Inner Diameter from Max Friction & Max Velocity Constraints
    const resExact = solveFluidDiameter(Q, maxFric, maxVel, rho_fluid, mu_fluid, epsilon);
    const exactD_mm = resExact.D * 1000;
    const exactD_in = exactD_mm / 25.4;

    // 2. Find Auto-Recommended Commercial Pipe from PIPE_SCHEDULE_LIST
    let autoPipe = null;
    if (Q > 0) {
        for (let i = 0; i < PIPE_SCHEDULE_LIST.length; i++) {
            const p = PIPE_SCHEDULE_LIST[i];
            if (p.id_mm >= exactD_mm - 0.05) {
                autoPipe = p;
                break;
            }
        }
        if (!autoPipe) autoPipe = PIPE_SCHEDULE_LIST[PIPE_SCHEDULE_LIST.length - 1];
    }

    // 3. Check User Pipe Size Selection (AUTO vs Manual DN)
    const selectedDnVal = document.getElementById('pipe_selected_dn')?.value || 'AUTO';
    const isManualPipe = selectedDnVal !== 'AUTO';
    const resetAutoBtn = document.getElementById('btn_pipe_reset_auto');
    if (resetAutoBtn) {
        resetAutoBtn.classList.toggle('hidden', !isManualPipe);
    }

    let activePipe = autoPipe;
    if (isManualPipe) {
        const found = PIPE_SCHEDULE_LIST.find(p => String(p.dn) === String(selectedDnVal));
        if (found) activePipe = found;
    }

    // 4. Calculate Hydraulic Parameters for the Active Commercial Pipe (and Exact Diameter)
    const activeD_m = isManualPipe
        ? (activePipe ? activePipe.id_mm / 1000 : resExact.D)
        : (activePipe ? activePipe.id_mm / 1000 : resExact.D);

    const activeProps = (Q > 0 && activeD_m > 0)
        ? calcFlowProps(Q, activeD_m, rho_fluid, mu_fluid, epsilon)
        : { V: 0, F: 0, Re: 0, f: 0, regime: 'None' };

    // Determine Status / Limiting Factor & Warning Colors
    let vColorClass = "text-slate-800 dark:text-slate-100";
    let fColorClass = "text-slate-800 dark:text-slate-100";
    let limitText = resExact.limitedBy;

    const dispV = activeProps.V;
    const dispF = activeProps.F;

    if (Q > 0 && activePipe) {
        const overV = dispV > maxVel * 1.02;
        const overF = maxFric > 0 && dispF > maxFric * 1.02;
        const underMinV = !isNaN(minVel) && minVel > 0 && dispV < minVel;

        if (overV && overF) {
            vColorClass = "text-red-600 dark:text-red-400";
            fColorClass = "text-red-600 dark:text-red-400";
            limitText = `<span class="text-red-500 font-bold">Exceeds Max V & Max ΔP</span>`;
        } else if (overV) {
            vColorClass = "text-amber-600 dark:text-amber-400";
            limitText = `<span class="text-amber-500 font-bold">Exceeds Max Velocity</span>`;
        } else if (overF) {
            fColorClass = "text-amber-600 dark:text-amber-400";
            limitText = `<span class="text-amber-500 font-bold">Exceeds Max Friction</span>`;
        } else if (underMinV) {
            vColorClass = "text-orange-500 dark:text-orange-400";
            limitText = `<span class="text-orange-500 font-bold">Conflict: Vel &lt; Min</span>`;
        } else if (isManualPipe) {
            limitText = `<span class="text-emerald-600 dark:text-emerald-400 font-bold">Manual DN${activePipe.dn} (OK)</span>`;
        }
    }

    // 5. Update Primary Output Cards
    const dMainEl = document.getElementById('pipe_res_D_main');
    const dSubEl = document.getElementById('pipe_res_D_sub');
    if (dMainEl && dSubEl) {
        if (isManualPipe && activePipe) {
            dMainEl.innerHTML = `${activePipe.id_mm.toFixed(1)} <span class="text-lg text-slate-500 dark:text-slate-400">mm</span>`;
            dSubEl.innerText = `${(activePipe.id_mm / 25.4).toFixed(2)} in (Min Req ID: ${exactD_mm.toFixed(1)} mm)`;
        } else {
            dMainEl.innerHTML = `${exactD_mm.toFixed(1)} <span class="text-lg text-slate-500 dark:text-slate-400">mm</span>`;
            dSubEl.innerText = `${exactD_in.toFixed(2)} in${activePipe ? ` (Std ID: ${activePipe.id_mm} mm)` : ''}`;
        }
    }

    const limitEl = document.getElementById('pipe_res_limit');
    if (limitEl) limitEl.innerHTML = limitText;

    const dnEl = document.getElementById('pipe_res_DN');
    const dnSubEl = document.getElementById('pipe_res_dn_sub');
    if (dnEl) {
        if (Q <= 0 || !activePipe) {
            dnEl.innerText = 'DN--';
            if (dnSubEl) dnSubEl.innerText = 'Enter flow rate to size pipe';
        } else if (exactD_mm > 600 && !isManualPipe) {
            dnEl.innerText = 'DN>600';
            if (dnSubEl) dnSubEl.innerText = 'Exceeds DN600 (24") standard table';
        } else {
            dnEl.innerText = `DN${activePipe.dn} (${activePipe.inch})`;
            if (dnSubEl) {
                dnSubEl.innerText = isManualPipe
                    ? `User-Defined Pipe • ID ${activePipe.id_mm} mm (Auto Rec: DN${autoPipe ? autoPipe.dn : '--'})`
                    : `Auto-Sized Commercial Pipe • ID ${activePipe.id_mm} mm`;
            }
        }
    }

    const V_fps = dispV * 3.28084;
    const vEl = document.getElementById('pipe_res_V');
    const vSubEl = document.getElementById('pipe_res_V_sub');
    if (vEl) vEl.innerHTML = `<span class="${vColorClass}">${dispV.toFixed(2)}</span> <span class="text-xs text-slate-500 dark:text-slate-400">m/s</span>`;
    if (vSubEl) vSubEl.innerText = `${V_fps.toFixed(2)} ft/s${!isManualPipe && resExact.V > 0 ? ` (Exact: ${resExact.V.toFixed(2)} m/s)` : ''}`;

    const F_ft = dispF / 98.0665;
    const fEl = document.getElementById('pipe_res_F');
    const fSubEl = document.getElementById('pipe_res_F_sub');
    if (fEl) fEl.innerHTML = `<span class="${fColorClass}">${dispF >= 10 ? dispF.toFixed(0) : dispF.toFixed(1)}</span> <span class="text-xs text-slate-500 dark:text-slate-400">Pa/m</span>`;
    if (fSubEl) fSubEl.innerText = `${F_ft.toFixed(2)} ft/100ft`;

    // Reynolds Number & Flow Regime Card (if present)
    const reEl = document.getElementById('pipe_res_Re');
    const reSubEl = document.getElementById('pipe_res_Re_sub');
    if (reEl) {
        const reStr = activeProps.Re >= 10000 ? `${(activeProps.Re / 1000).toFixed(1)}k` : activeProps.Re.toFixed(0);
        reEl.innerHTML = `${reStr} <span class="text-xs text-slate-500 dark:text-slate-400">(${activeProps.regime})</span>`;
    }
    if (reSubEl) {
        reSubEl.innerText = `Darcy f = ${activeProps.f.toFixed(4)} • ν = ${fluid.nu_cSt.toFixed(2)} cSt`;
    }

    // 6. Fittings, Valves & Overall System Friction Loss Calculation
    const Pv_pa = 0.5 * rho_fluid * Math.pow(dispV, 2); // Dynamic velocity pressure (Pa)
    let sumK = 0;
    let totalLeq_m = 0;
    let fittingsDp_pa = 0;

    if (Array.isArray(pipeFittingsList)) {
        pipeFittingsList.forEach(item => {
            const k = Math.max(0, parseFloat(item.k) || 0);
            const qty = Math.max(0, parseInt(item.qty) || 0);
            const rowK = k * qty;
            const rowLeq = (activeProps.f > 0 && activeD_m > 0) ? (rowK * activeD_m) / activeProps.f : 0;
            const rowDp = rowK * Pv_pa;

            item._totalK = rowK;
            item._leq_m = rowLeq;
            item._dp_pa = rowDp;

            sumK += rowK;
            totalLeq_m += rowLeq;
            fittingsDp_pa += rowDp;
        });
    }

    const straightDp_pa = dispF * length_m;
    const equipDp_kpa = Math.max(0, parseFloat(document.getElementById('pipe_equip_dp')?.value) || 0);
    const equipDp_pa = equipDp_kpa * 1000;
    const safetyPct = Math.max(0, parseFloat(document.getElementById('pipe_safety_pct')?.value) || 0);

    const baseTotalDp_pa = straightDp_pa + fittingsDp_pa + equipDp_pa;
    const totalSystemDp_pa = baseTotalDp_pa * (1 + safetyPct / 100);
    const totalSystemDp_kpa = totalSystemDp_pa / 1000;

    // Fluid Head: H = dP / (rho * g)
    const g = 9.80665;
    const straightHead_m = rho_fluid > 0 ? straightDp_pa / (rho_fluid * g) : 0;
    const fittingsHead_m = rho_fluid > 0 ? fittingsDp_pa / (rho_fluid * g) : 0;
    const totalHead_m = rho_fluid > 0 ? totalSystemDp_pa / (rho_fluid * g) : 0;
    const totalHead_ft = totalHead_m * 3.28084;
    const totalPsi = totalSystemDp_kpa * 0.145038;

    // Hydraulic & Pump Power
    const hydPower_kw = (Q * totalSystemDp_pa) / 1000;
    const shaftPower_kw = hydPower_kw / 0.75; // 75% typical pump efficiency
    const shaftPower_hp = shaftPower_kw / 0.7457;

    // Surface Area & Top Total PD Card
    const areaEl = document.getElementById('pipe_res_area');
    const areaSubEl = document.getElementById('pipe_res_area_sub');
    const dpEl = document.getElementById('pipe_res_dp');
    const dpSubEl = document.getElementById('pipe_res_dp_sub');

    if (length_m > 0 || fittingsDp_pa > 0 || equipDp_pa > 0) {
        if (length_m > 0 && activePipe) {
            const od_m = (activePipe.od_mm || activePipe.dn) / 1000;
            const area_m2 = Math.PI * od_m * length_m;
            const area_ft2 = area_m2 * 10.7639;
            if (areaEl) areaEl.innerHTML = `${area_m2.toFixed(1)} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">m²</span>`;
            if (areaSubEl) areaSubEl.innerText = `${area_ft2.toFixed(1)} ft²`;
        } else {
            if (areaEl) areaEl.innerHTML = '-';
            if (areaSubEl) areaSubEl.innerText = '';
        }

        if (dpEl) {
            if (totalSystemDp_kpa >= 10) {
                dpEl.innerHTML = `${totalSystemDp_kpa.toFixed(1)} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">kPa</span>`;
            } else {
                dpEl.innerHTML = `${totalSystemDp_pa.toFixed(0)} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">Pa</span>`;
            }
        }
        if (dpSubEl) {
            dpSubEl.innerText = `${totalHead_m.toFixed(2)} m hd (${totalHead_ft.toFixed(1)} ft hd)`;
        }
    } else {
        if (areaEl) areaEl.innerHTML = '-';
        if (areaSubEl) areaSubEl.innerText = '';
        if (dpEl) dpEl.innerHTML = '-';
        if (dpSubEl) dpSubEl.innerText = '';
    }

    // 7. Update System Friction Loss Summary Cards & Fittings Table
    const sysStraightEl = document.getElementById('pipe_sys_dp_straight');
    const sysStraightSubEl = document.getElementById('pipe_sys_dp_straight_sub');
    const sysFitEl = document.getElementById('pipe_sys_dp_fittings');
    const sysFitSubEl = document.getElementById('pipe_sys_dp_fittings_sub');
    const sysTotalEl = document.getElementById('pipe_sys_dp_total');
    const sysTotalSubEl = document.getElementById('pipe_sys_dp_total_sub');
    const sysPwrEl = document.getElementById('pipe_sys_pump_power');
    const sysPwrSubEl = document.getElementById('pipe_sys_pump_power_sub');

    if (sysStraightEl) sysStraightEl.innerText = `${(straightDp_pa / 1000).toFixed(2)} kPa`;
    if (sysStraightSubEl) sysStraightSubEl.innerText = `${straightHead_m.toFixed(2)} m hd (${(straightHead_m * 3.28084).toFixed(1)} ft) • L = ${length_m.toFixed(1)} m`;

    if (sysFitEl) sysFitEl.innerText = `${(fittingsDp_pa / 1000).toFixed(2)} kPa`;
    if (sysFitSubEl) sysFitSubEl.innerText = `ΣK = ${sumK.toFixed(2)} • Leq = ${totalLeq_m.toFixed(1)} m (${(totalLeq_m * 3.28084).toFixed(1)} ft)`;

    if (sysTotalEl) sysTotalEl.innerText = `${totalSystemDp_kpa.toFixed(2)} kPa`;
    if (sysTotalSubEl) sysTotalSubEl.innerText = `${totalHead_m.toFixed(2)} m hd • ${totalHead_ft.toFixed(1)} ft hd • ${totalPsi.toFixed(2)} psi`;

    if (sysPwrEl) sysPwrEl.innerText = `${hydPower_kw.toFixed(2)} kW (Hyd)`;
    if (sysPwrSubEl) sysPwrSubEl.innerText = `Est. Shaft (@75% η): ${shaftPower_kw.toFixed(2)} kW (${shaftPower_hp.toFixed(2)} HP)`;

    renderPipeSizeComparison(Q, rho_fluid, mu_fluid, epsilon, maxFric, maxVel, minVel, activePipe, autoPipe, isManualPipe);
    renderPipeFittingsTable(Pv_pa);

    // 8. Draw Nomogram using the Active Pipe Diameter
    drawLogLogNomogram('pipeChart', flow, unit, Q, activeD_m > 0 ? activeD_m : resExact.D, rho_fluid, mu_fluid, epsilon, maxFric, maxVel, true);
}

function renderPipeSizeComparison(Q, rho, mu, epsilon, maxFric, maxVel, minVel, activePipe, autoPipe, isManualPipe) {
    const tbody = document.getElementById('pipe_size_comparison_body');
    if (!tbody) return;

    if (Q <= 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-xs text-slate-400">Enter a flow rate above to compare velocity and friction drop across standard pipe sizes.</td></tr>`;
        return;
    }

    // Show a focused window of sizes around activePipe & autoPipe, or all sizes if user toggles
    const showAll = window._pipeShowAllSizes === true;
    const centerDn = activePipe ? activePipe.dn : 50;
    const centerIdx = Math.max(0, PIPE_SCHEDULE_LIST.findIndex(p => p.dn === centerDn));
    const startIdx = showAll ? 0 : Math.max(0, centerIdx - 3);
    const endIdx = showAll ? PIPE_SCHEDULE_LIST.length - 1 : Math.min(PIPE_SCHEDULE_LIST.length - 1, startIdx + 6);

    const rowsHtml = [];
    for (let i = startIdx; i <= endIdx; i++) {
        const p = PIPE_SCHEDULE_LIST[i];
        const props = calcFlowProps(Q, p.id_mm / 1000, rho, mu, epsilon);
        const isSelected = activePipe && p.dn === activePipe.dn;
        const isAutoRec = autoPipe && p.dn === autoPipe.dn;

        const overV = props.V > maxVel * 1.02;
        const overF = maxFric > 0 && props.F > maxFric * 1.02;
        const underV = !isNaN(minVel) && minVel > 0 && props.V < minVel;

        let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">OK</span>`;
        if (overV && overF) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400">High V &amp; ΔP</span>`;
        } else if (overV) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">High Vel</span>`;
        } else if (overF) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">High ΔP</span>`;
        } else if (underV) {
            statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-500/10 text-orange-600 dark:text-orange-400">Low Vel</span>`;
        }

        const rowClass = isSelected
            ? 'bg-cyan-50/90 dark:bg-cyan-900/40 font-bold ring-1 ring-inset ring-cyan-500/50 cursor-pointer transition-colors'
            : 'hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors';

        const reStr = props.Re >= 10000 ? `${(props.Re / 1000).toFixed(0)}k` : props.Re.toFixed(0);

        rowsHtml.push(`
            <tr onclick="selectPipeSizeDN('${p.dn}')" class="${rowClass}">
                <td class="px-3 py-2 text-xs font-mono">
                    <span class="font-bold text-slate-900 dark:text-white">DN${p.dn}</span>
                    <span class="text-slate-400 ml-1">(${p.inch})</span>
                    ${isSelected ? `<span class="ml-1.5 px-1.5 py-0.5 rounded bg-cyan-600 text-white text-[9px] font-extrabold uppercase">${isManualPipe ? 'Selected' : 'Active'}</span>` : ''}
                    ${isAutoRec && (!isSelected || isManualPipe) ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 text-[9px] font-bold">Auto Rec</span>` : ''}
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-slate-600 dark:text-slate-300">${p.id_mm.toFixed(1)} mm</td>
                <td class="px-3 py-2 text-xs text-right font-mono ${overV ? 'text-red-500 font-bold' : 'text-slate-800 dark:text-slate-100'}">
                    ${props.V.toFixed(2)} m/s <span class="text-[10px] text-slate-400">(${(props.V * 3.28084).toFixed(2)} ft/s)</span>
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono ${overF ? 'text-amber-500 font-bold' : 'text-slate-800 dark:text-slate-100'}">
                    ${props.F >= 10 ? props.F.toFixed(0) : props.F.toFixed(1)} Pa/m <span class="text-[10px] text-slate-400">(${(props.F / 98.0665).toFixed(2)} ft/100ft)</span>
                </td>
                <td class="px-3 py-2 text-xs text-right font-mono text-slate-500 dark:text-slate-400">${reStr} (${props.regime.slice(0, 4)})</td>
                <td class="px-3 py-2 text-xs text-center">${statusBadge}</td>
            </tr>
        `);
    }
    tbody.innerHTML = rowsHtml.join('');
}

function togglePipeShowAllSizes() {
    window._pipeShowAllSizes = !window._pipeShowAllSizes;
    const btn = document.getElementById('btn_pipe_toggle_all_sizes');
    if (btn) {
        btn.innerText = window._pipeShowAllSizes ? 'Show Nearby Sizes (7)' : 'Show All 19 Sizes (DN15–DN600)';
    }
    updatePipeSizer();
}

function renderPipeFittingsTable(Pv_pa) {
    const tbody = document.getElementById('pipe_fittings_tbody');
    if (!tbody) return;

    if (!pipeFittingsList || pipeFittingsList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-xs text-slate-400">No fittings or valves added yet. Click any quick-add fitting chip above or select from the catalog below.</td></tr>`;
        return;
    }

    tbody.innerHTML = pipeFittingsList.map((item, idx) => {
        const totalK = item._totalK !== undefined ? item._totalK : (item.k * item.qty);
        const leq_m = item._leq_m !== undefined ? item._leq_m : 0;
        const dp_pa = item._dp_pa !== undefined ? item._dp_pa : (totalK * (Pv_pa || 0));

        const opts = PIPE_FITTING_CATALOG.map(c =>
            `<option value="${c.key}" ${c.key === item.key ? 'selected' : ''}>${c.name}</option>`
        ).join('');

        return `
            <tr class="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                <td class="p-2.5 text-center font-mono text-xs text-slate-400">${idx + 1}</td>
                <td class="p-2.5">
                    <select onchange="updatePipeFittingRow('${item.id}', 'key', this.value)"
                        class="w-full bg-transparent border border-slate-200 dark:border-slate-600 rounded px-2 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 dark:bg-slate-800 outline-none focus:border-cyan-500 cursor-pointer">
                        ${opts}
                    </select>
                </td>
                <td class="p-2.5 text-right">
                    <input type="number" step="0.05" min="0" value="${item.k}"
                        onchange="updatePipeFittingRow('${item.id}', 'k', this.value)"
                        class="w-20 p-1 text-right font-mono text-xs font-bold rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-cyan-500">
                </td>
                <td class="p-2.5 text-center">
                    <div class="inline-flex items-center border border-slate-200 dark:border-slate-600 rounded overflow-hidden bg-white dark:bg-slate-700">
                        <button type="button" onclick="stepPipeFittingQty('${item.id}', -1)" class="px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">-</button>
                        <input type="number" min="1" step="1" value="${item.qty}"
                            onchange="updatePipeFittingRow('${item.id}', 'qty', this.value)"
                            class="w-12 text-center font-mono text-xs font-bold bg-transparent text-slate-900 dark:text-white outline-none">
                        <button type="button" onclick="stepPipeFittingQty('${item.id}', 1)" class="px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">+</button>
                    </div>
                </td>
                <td class="p-2.5 text-right font-mono text-xs font-bold text-slate-700 dark:text-slate-200">${totalK.toFixed(2)}</td>
                <td class="p-2.5 text-right font-mono text-xs text-slate-600 dark:text-slate-300">${leq_m.toFixed(1)} m <span class="text-[10px] text-slate-400">(${(leq_m * 3.28084).toFixed(1)} ft)</span></td>
                <td class="p-2.5 text-right font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                    ${dp_pa >= 1000 ? `${(dp_pa / 1000).toFixed(2)} kPa` : `${dp_pa.toFixed(0)} Pa`}
                </td>
                <td class="p-2.5 text-center">
                    <button type="button" onclick="removePipeFittingRow('${item.id}')" title="Remove fitting"
                        class="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 transition cursor-pointer">
                        ✕
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}


const _origUpdateDuctSizer = updateDuctSizer;
updateDuctSizer = function() {
    _origUpdateDuctSizer();
    if (window.MagicStore) {
        const flow = parseFloat(document.getElementById('duct_flow')?.value) || 0;
        const dMain = document.getElementById('duct_res_De_main')?.innerText || '--';
        window.MagicStore.publish({
            ductFlowLps: flow,
            ductSizeText: dMain.replace(/\s+/g, ' ').trim()
        }, 'ductSizerPage');
    }
};

const _origUpdatePipeSizer = updatePipeSizer;
updatePipeSizer = function() {
    _origUpdatePipeSizer();
    if (window.MagicStore) {
        const flow = parseFloat(document.getElementById('pipe_flow')?.value) || 0;
        const dn = document.getElementById('pipe_res_DN')?.innerText || '--';
        window.MagicStore.publish({
            pipeFlowLpm: flow,
            pipeSizeText: dn.trim()
        }, 'pipeSizerPage');
    }
};
