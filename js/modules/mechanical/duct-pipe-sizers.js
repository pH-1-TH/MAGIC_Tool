// ============================================================================
// Mechanical & HVAC Modules 4–5: Duct Sizer & Hydraulic Pipe Sizer
// File: js/modules/mechanical/duct-pipe-sizers.js
// ============================================================================


function solveFluidDiameter(Q_m3s, maxFric_Pa_m, maxVel_ms, rho, mu, epsilon_m) {
    if (Q_m3s <= 0) return { D: 0, V: 0, F: 0, limitedBy: 'None' };

    const D_vel = Math.sqrt((4 * Q_m3s) / (Math.PI * maxVel_ms));
    let D_low = 0.005; let D_high = 5.0; let D_fric = D_low;

    for (let i = 0; i < 50; i++) {
        let D_mid = (D_low + D_high) / 2;
        let V = (4 * Q_m3s) / (Math.PI * Math.pow(D_mid, 2));
        let Re = (rho * V * D_mid) / mu;

        const safeRe = Math.max(Re, 500);
        let f = Math.pow(-1.8 * Math.log10(Math.pow((epsilon_m / (3.7 * D_mid)), 1.11) + (6.9 / safeRe)), -2);

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
    let f_actual = Math.pow(-1.8 * Math.log10(Math.pow((epsilon_m / (3.7 * D_final)), 1.11) + (6.9 / Re_actual)), -2);
    let F_actual = f_actual * (rho / 2) * (Math.pow(V_actual, 2) / D_final);

    return { D: D_final, V: V_actual, F: F_actual, limitedBy: limitedBy };
}

function calcFlowProps(Q_m3s, D_m, rho, mu, epsilon_m) {
    if (Q_m3s <= 0 || D_m <= 0) return { V: 0, F: 0, Re: 0 };
    const V = (4 * Q_m3s) / (Math.PI * Math.pow(D_m, 2));
    const Re = (rho * V * D_m) / mu;
    // Use continuous turbulent Haaland formula across nomogram range to prevent artificial Re=2300 step kinks
    const safeRe = Math.max(Re, 500);
    const f = Math.pow(-1.8 * Math.log10(Math.pow((epsilon_m / (3.7 * D_m)), 1.11) + (6.9 / safeRe)), -2);
    const F = f * (rho / 2) * (Math.pow(V, 2) / D_m);
    return { V, F, Re };
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

function updatePipeCalc() {
    const cap = parseFloat(document.getElementById('pipe_calc_cap').value) || 0;
    const dt = parseFloat(document.getElementById('pipe_calc_dt').value) || 0.1; // avoid divide by zero

    // 1. Convert Capacity to kW
    let Q_kW = currentPipeSys === 'IP' ? cap * 3.51685 : cap;

    // 2. Convert deltaT to Celsius
    let dt_C = currentPipeSys === 'IP' ? dt * (5 / 9) : dt;
    if (dt_C === 0) dt_C = 0.1;

    // 3. Mass flow rate in kg/s (Cp of water ≈ 4.184 kJ/kg.K)
    let m_dot = Q_kW / (4.184 * dt_C);

    // 4. Convert to selected volumetric flow rate (Water density ≈ 1000 kg/m³)
    // 1 kg/s is exactly 1 L/s, or 60 LPM
    let flow = currentPipeSys === 'IP' ? m_dot * 15.8503 : m_dot * 60;

    document.getElementById('pipe_calc_res').value = flow.toFixed(2);
}

function applyPipeCalcFlow() {
    const flow = document.getElementById('pipe_calc_res').value;
    const unit = currentPipeSys === 'IP' ? 'GPM' : 'LPM';

    document.getElementById('pipe_flow').value = flow;
    document.getElementById('pipe_unit').value = unit;

    updatePipeSizer();
}

function updatePipeSizer() {
    const flow = parseFloat(document.getElementById('pipe_flow').value) || 0;
    const unit = document.getElementById('pipe_unit').value;

    // Fetch inputs and normalize to SI internally
    let maxFric = parseFloat(document.getElementById('pipe_maxFric').value) || 0;
    if (currentPipeSys === 'IP') maxFric *= 98.0665; // Convert ft/100ft back to Pa/m

    let maxVel = parseFloat(document.getElementById('pipe_maxVel').value) || 0;
    let minVel = parseFloat(document.getElementById('pipe_minVel').value);

    if (currentPipeSys === 'IP') {
        maxVel /= 3.28084; // Convert ft/s back to m/s
        if (!isNaN(minVel)) minVel /= 3.28084;
    }
    if (maxVel <= 0) maxVel = 1.5;

    let lengthInput = parseFloat(document.getElementById('pipe_length').value) || 0;
    let length_m = lengthInput;
    if (currentPipeSys === 'IP') length_m /= 3.28084; // Convert ft back to m

    const roughness_mm = parseFloat(document.getElementById('pipe_roughness').value) || 0.045;
    const temp = parseFloat(document.getElementById('pipe_temp').value) || 10;

    let Q = 0;
    if (unit === 'LPS') Q = flow / 1000;
    else if (unit === 'LPM') Q = flow / 60000;
    else if (unit === 'GPM') Q = flow * 0.00006309;
    else if (unit === 'CMH') Q = flow / 3600;

    let rho_water, mu_water;
    if (temp === 10) {
        rho_water = 999.7; mu_water = 1.307e-3;
    } else if (temp === 20) {
        rho_water = 998.2; mu_water = 1.002e-3;
    } else {
        rho_water = 983.2; mu_water = 0.466e-3;
    }

    const epsilon = roughness_mm / 1000;

    const res = solveFluidDiameter(Q, maxFric, maxVel, rho_water, mu_water, epsilon);
    const D_mm = res.D * 1000;
    const D_in = D_mm / 25.4;

    // Warning logic for Minimum Velocity
    let vColorClass = "text-slate-800 dark:text-slate-100";
    let limitText = res.limitedBy;

    if (!isNaN(minVel) && minVel > 0 && res.V < minVel && res.D > 0) {
        vColorClass = "text-orange-500 dark:text-orange-400";
        limitText = `<span class="text-orange-500 font-bold">Conflict: Vel < Min</span>`;
    }

    // Output Results (Dual Units)
    document.getElementById('pipe_res_D_main').innerHTML = `${D_mm.toFixed(1)} <span class="text-lg text-slate-500 dark:text-slate-400">mm</span>`;
    document.getElementById('pipe_res_D_sub').innerText = `${D_in.toFixed(2)} in`;

    document.getElementById('pipe_res_limit').innerHTML = limitText;

    const V_fps = res.V * 3.28084;
    document.getElementById('pipe_res_V').innerHTML = `<span class="${vColorClass}">${res.V.toFixed(2)}</span> <span class="text-xs text-slate-500 dark:text-slate-400">m/s</span>`;
    document.getElementById('pipe_res_V_sub').innerText = `${V_fps.toFixed(2)} ft/s`;

    const F_ft = res.F / 98.0665;
    document.getElementById('pipe_res_F').innerHTML = `${res.F.toFixed(0)} <span class="text-xs text-slate-500 dark:text-slate-400">Pa/m</span>`;
    document.getElementById('pipe_res_F_sub').innerText = `${F_ft.toFixed(2)} ft/100ft`;

    const standardSizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 600];
    let recommendedDN = "-";
    for (let i = 0; i < standardSizes.length; i++) {
        if (standardSizes[i] >= D_mm) {
            recommendedDN = standardSizes[i];
            break;
        }
    }
    if (D_mm > 600) recommendedDN = ">600";
    if (Q === 0) recommendedDN = "--";

    document.getElementById('pipe_res_DN').innerText = `DN${recommendedDN}`;

    // Surface Area & Total PD for Pipe
    if (length_m > 0) {
        let areaDia = (typeof recommendedDN === 'number') ? recommendedDN / 1000 : res.D;
        let area_m2 = Math.PI * areaDia * length_m;
        let area_ft2 = area_m2 * 10.7639;

        let pd_pa = res.F * length_m;
        let pd_ft = pd_pa / 2989.06692; // total head in ft

        document.getElementById('pipe_res_area').innerHTML = `${area_m2.toFixed(1)} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">m²</span>`;
        document.getElementById('pipe_res_area_sub').innerText = `${area_ft2.toFixed(1)} ft²`;

        document.getElementById('pipe_res_dp').innerHTML = `${pd_pa.toFixed(0)} <span class="text-xs text-slate-500 dark:text-slate-400 font-normal">Pa</span>`;
        document.getElementById('pipe_res_dp_sub').innerText = `${pd_ft.toFixed(2)} ft hd`;
    } else {
        document.getElementById('pipe_res_area').innerHTML = '-';
        document.getElementById('pipe_res_area_sub').innerText = '';
        document.getElementById('pipe_res_dp').innerHTML = '-';
        document.getElementById('pipe_res_dp_sub').innerText = '';
    }

    drawLogLogNomogram('pipeChart', flow, unit, Q, res.D, rho_water, mu_water, epsilon, maxFric, maxVel, true);
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
