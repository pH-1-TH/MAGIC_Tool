// ============================================================================
// Plumbing & Sanitary Modules 15–17: Water Demand, Storm Drainage & Retention Pond
// File: js/modules/plumbing/plumbing-tools.js
// ============================================================================

function populateWSFUTable() {
    const body = document.getElementById('wsfu_table_body');
    if (!body) return;
    const defaultQtys = { wc_fv: 4, wc_ft: 0, lav: 6, uri: 2, shw: 1, snk: 2 };
    body.innerHTML = wsfuData.map((f, idx) => `
    <tr class="border-b border-slate-100 dark:border-slate-700/60">
        <td class="py-2 font-medium">${f.name}</td>
        <td class="py-2 text-center text-slate-400">${f.unit}</td>
        <td class="py-2 text-center">
            <input type="number" id="qty_${f.id}" value="${defaultQtys[f.id] ?? (idx === 0 ? 4 : (idx === 2 ? 6 : 2))}" min="0" class="w-16 p-1 text-center border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none" oninput="calcWater()">
        </td>
        <td class="py-2 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400" id="sub_${f.id}">0.0</td>
    </tr>
`).join('');
}

function applyWsfuPreset(preset) {
    const presets = {
        office: [6, 0, 8, 4, 0, 2],
        condo:  [0, 24, 24, 0, 24, 24],
        mall:   [16, 4, 20, 10, 2, 8],
        clear:  [0, 0, 0, 0, 0, 0]
    };
    const vals = presets[preset] || presets.office;
    wsfuData.forEach((f, idx) => {
        const el = document.getElementById(`qty_${f.id}`);
        if (el) el.value = vals[idx] ?? 0;
    });
    const curveEl = document.getElementById('wsfu_curve');
    if (curveEl && preset === 'condo') curveEl.value = 'B';
    else if (curveEl && (preset === 'office' || preset === 'mall')) curveEl.value = 'A';
    calcWater();
}

function calcWater() {
    let total = 0;
    wsfuData.forEach(f => {
        const el = document.getElementById(`qty_${f.id}`);
        const qty = el ? (parseInt(el.value) || 0) : 0;
        const sub = qty * f.unit;
        const subEl = document.getElementById(`sub_${f.id}`);
        if (subEl) subEl.innerText = sub.toFixed(1);
        total += sub;
    });
    const totEl = document.getElementById('wsfu_total');
    if (totEl) totEl.innerText = total.toFixed(1);

    const curve = document.getElementById('wsfu_curve')?.value || 'A';
    let gpm = 0;
    if (curve === 'A') {
        gpm = 10 + 0.25 * total + 0.00008 * Math.pow(total, 1.9);
    } else {
        gpm = 5 + 0.18 * total + 0.00004 * Math.pow(total, 1.9);
    }
    if (total === 0) gpm = 0;

    const lps = gpm * 0.06309;
    document.getElementById('wsfu_res_gpm').innerText = `${gpm.toFixed(1)} GPM`;
    document.getElementById('wsfu_res_lps').innerText = `${lps.toFixed(2)} L/s`;

    const hrs = parseFloat(document.getElementById('wsfu_tank_hrs')?.value) || 24;
    const vol_m3 = (gpm * 0.003785 * 60 * 0.4) * hrs;
    document.getElementById('wsfu_res_tank_m3').innerText = `${vol_m3.toFixed(1)} m³`;
    document.getElementById('wsfu_res_tank_gal').innerText = `${Math.round(vol_m3 * 264.17).toLocaleString()} US Gal`;

    // Main supply pipe size recommendation (target v <= 2.0 m/s)
    const stdPipes = [20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200];
    const flowM3s = lps / 1000;
    let recPipe = stdPipes[0];
    let vel = 0;
    if (flowM3s > 0) {
        recPipe = stdPipes.find(d => (flowM3s / (Math.PI * Math.pow(d / 2000, 2))) <= 2.0) || 200;
        vel = flowM3s / (Math.PI * Math.pow(recPipe / 2000, 2));
    }
    const pipeEl = document.getElementById('wsfu_res_pipe');
    const velEl = document.getElementById('wsfu_res_vel');
    if (pipeEl) pipeEl.innerText = total > 0 ? `Ø${recPipe} mm` : '-- mm';
    if (velEl) velEl.innerText = total > 0 ? `Velocity: ${vel.toFixed(2)} m/s` : 'Target ≤ 2.0 m/s';

    drawWsfuChart(total, gpm, curve);
}




function calcStorm() {
    const A = parseFloat(document.getElementById('storm_area').value) || 0;
    const I = parseFloat(document.getElementById('storm_intensity').value) || 0;
    const C = parseFloat(document.getElementById('storm_c').value) || 0.95;

    const q_m3h = (C * I * A) / 1000;
    const q_lps = q_m3h / 3.6;

    document.getElementById('storm_res_flow_lps').innerText = `${q_lps.toFixed(2)} L/s`;
    document.getElementById('storm_res_flow_m3h').innerText = `${q_m3h.toFixed(1)} m³/h`;

    let pipe = 100;
    if (q_lps > 12) pipe = 150;
    if (q_lps > 35) pipe = 200;
    if (q_lps > 70) pipe = 250;
    document.getElementById('storm_res_pipe').innerText = `${pipe} mm`;
    document.getElementById('storm_res_qty4').innerText = `${Math.ceil(q_lps / 6)} x 100mm Pipes`;

    // Update Intensity Display
    document.getElementById('storm_res_intensity').innerText = `${I.toFixed(0)} mm/hr`;
    const interval = document.getElementById('storm_interval').value;
    const provName = document.getElementById('storm_province').value;

    let intervalText = `${interval}-Yr Return Period`;
    if (!provName) intervalText = "Manual Override";
    document.getElementById('storm_res_interval').innerText = intervalText;
}

function calcPond() {
    const A = parseFloat(document.getElementById('pond_area').value) || 0;
    const Cpre = parseFloat(document.getElementById('pond_c_pre').value) || 0.3;
    const Cpost = parseFloat(document.getElementById('pond_c_post').value) || 0.9;
    const dur = parseFloat(document.getElementById('pond_duration').value) || 60;
    const intensity = parseFloat(document.getElementById('pond_intensity').value) || 100;

    const vol = (Cpost - Cpre) * (intensity / 1000) * (dur / 60) * A;
    document.getElementById('pond_res_vol').innerText = `${vol.toFixed(1)} m³`;
}



const _origCalcWater = calcWater;
calcWater = function() {
    _origCalcWater();
    if (window.MagicStore) {
        const wsfu = parseFloat(document.getElementById('wsfu_total')?.innerText) || 0;
        const gpm = parseFloat(document.getElementById('wsfu_res_gpm')?.innerText) || 0;
        const tank = parseFloat(document.getElementById('wsfu_res_tank_m3')?.innerText) || 0;
        window.MagicStore.publish({
            waterTotalWsfu: wsfu,
            waterPeakGpm: gpm,
            waterTankM3: tank
        }, 'waterDemandPage');
    }
};

const _origCalcStorm = calcStorm;
calcStorm = function() {
    _origCalcStorm();
    if (window.MagicStore) {
        const lps = parseFloat(document.getElementById('storm_res_flow_lps')?.innerText) || 0;
        const pipe = parseFloat(document.getElementById('storm_res_pipe')?.innerText) || 100;
        window.MagicStore.publish({
            stormFlowLps: lps,
            stormPipeMm: pipe
        }, 'stormPage');
    }
};

const _origCalcPond = calcPond;
calcPond = function() {
    _origCalcPond();
    if (window.MagicStore) {
        const vol = parseFloat(document.getElementById('pond_res_vol')?.innerText) || 0;
        window.MagicStore.publish({ pondVolumeM3: vol }, 'pondPage');
    }
};
