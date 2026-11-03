// ============================================================================
// Fire Protection Modules 18–20: Sprinkler Hydraulic, Warehouse ESFR & Fire Water
// File: js/modules/fire/fire-tools.js
// ============================================================================

function calcFire() {
    const k = parseFloat(document.getElementById('fire_k').value);
    const p = parseFloat(document.getElementById('fire_p_min').value);
    const q = k * Math.sqrt(p);

    document.getElementById('fire_res_q').innerText = `${q.toFixed(1)} GPM`;
    document.getElementById('fire_res_q_lpm').innerText = `${(q * 3.785).toFixed(1)} LPM`;

    const area = parseFloat(document.getElementById('fire_area').value) || 1500;
    const density = parseFloat(document.getElementById('fire_density').value) || 0.1;
    const totalQ = area * density * 1.15;

    document.getElementById('fire_res_total_q').innerText = `${totalQ.toFixed(0)} GPM`;

    const d = parseFloat(document.getElementById('fire_pipe_d').value) / 25.4;
    const C = parseFloat(document.getElementById('fire_c').value);
    const loss_psi_ft = (4.52 * Math.pow(q, 1.85)) / (Math.pow(C, 1.85) * Math.pow(d, 4.87));
    const total_loss = loss_psi_ft * (parseFloat(document.getElementById('fire_pipe_l').value) * 3.28);

    document.getElementById('fire_res_loss').innerText = `${total_loss.toFixed(2)} psi`;
    document.getElementById('fire_res_loss_bar').innerText = `${(total_loss * 0.0689).toFixed(3)} bar`;

    drawNfpaChart(area, density);
}

function applyFireWaterPreset(preset) {
    const presets = {
        light:  { density: 0.10, area: 1500, hose: 100, duration: 30 },
        ord1:   { density: 0.15, area: 1500, hose: 250, duration: 60 },
        ord2:   { density: 0.20, area: 1500, hose: 250, duration: 90 },
        extra1: { density: 0.30, area: 2500, hose: 500, duration: 90 },
        extra2: { density: 0.40, area: 2500, hose: 500, duration: 120 }
    };
    const sel = document.getElementById('fw_hazard');
    if (sel && sel.value !== preset && presets[preset]) {
        sel.value = preset;
    }
    if (presets[preset]) {
        document.getElementById('fw_density').value = presets[preset].density.toFixed(2);
        document.getElementById('fw_area').value = presets[preset].area;
        document.getElementById('fw_hose').value = presets[preset].hose;
        document.getElementById('fw_duration').value = presets[preset].duration;
    }
    calcFireWater();
}

function calcFireWater() {
    const density = parseFloat(document.getElementById('fw_density')?.value) || 0.15;
    const area = parseFloat(document.getElementById('fw_area')?.value) || 1500;
    const hydMargin = parseFloat(document.getElementById('fw_hyd_margin')?.value) || 0;
    const hoseGpm = parseFloat(document.getElementById('fw_hose')?.value) || 0;
    const standpipeGpm = parseFloat(document.getElementById('fw_standpipe')?.value) || 0;
    const duration = parseFloat(document.getElementById('fw_duration')?.value) || 60;
    const tankMargin = parseFloat(document.getElementById('fw_tank_margin')?.value) || 0;

    // Update SI helper labels
    const densSiEl = document.getElementById('fw_density_si');
    const areaSiEl = document.getElementById('fw_area_si');
    if (densSiEl) densSiEl.innerText = `${(density * 40.746).toFixed(1)} mm/min`;
    if (areaSiEl) areaSiEl.innerText = `${(area * 0.092903).toFixed(1)} m²`;

    // Flow calculations (GPM)
    const qSprinklerBase = density * area;
    const qSprinkler = qSprinklerBase * (1 + hydMargin / 100);
    const qTotal = qSprinkler + hoseGpm + standpipeGpm;

    // Standard NFPA 20 Centrifugal Fire Pump nominal ratings (GPM)
    const nfpa20Pumps = [25, 50, 100, 150, 200, 250, 300, 400, 450, 500, 750, 1000, 1250, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
    let selectedPump = nfpa20Pumps.find(r => r >= qTotal / 1.40 && r >= qSprinkler) || nfpa20Pumps[nfpa20Pumps.length - 1];
    // Prefer nominal rating >= qTotal when within standard range, or show overload %
    const nominalPump = nfpa20Pumps.find(r => r >= qTotal) || selectedPump;
    const pumpLoadPct = (qTotal / nominalPump) * 100;

    // Water Volume calculations (US Gallons & m³)
    const volSprGal = qSprinkler * duration;
    const volHoseGal = hoseGpm * duration;
    const volSpGal = standpipeGpm * duration;
    const volNetGal = volSprGal + volHoseGal + volSpGal;
    const volMarginGal = volNetGal * (tankMargin / 100);
    const volTotalGal = volNetGal + volMarginGal;

    const galToM3 = 0.00378541178;
    const volSprM3 = volSprGal * galToM3;
    const volHoseM3 = volHoseGal * galToM3;
    const volSpM3 = volSpGal * galToM3;
    const volMarginM3 = volMarginGal * galToM3;
    const volTotalM3 = volTotalGal * galToM3;

    // Update top KPI cards
    const elQSpr = document.getElementById('fw_res_q_spr');
    if (elQSpr) {
        elQSpr.innerText = `${qSprinkler.toFixed(1)} GPM`;
        document.getElementById('fw_res_q_spr_si').innerText = `${(qSprinkler * 3.78541).toFixed(0)} LPM (Base: ${qSprinklerBase.toFixed(0)} GPM)`;
        document.getElementById('fw_res_q_tot').innerText = `${qTotal.toFixed(1)} GPM`;
        document.getElementById('fw_res_q_tot_si').innerText = `${(qTotal * 3.78541).toFixed(0)} LPM (${(qTotal * 0.227125).toFixed(1)} m³/hr)`;
        document.getElementById('fw_res_pump').innerText = `${nominalPump} GPM`;
        document.getElementById('fw_res_pump_load').innerText = `${pumpLoadPct.toFixed(0)}% of Rated (${(nominalPump * 3.78541).toFixed(0)} LPM)`;
        document.getElementById('fw_res_vol_m3').innerText = `${volTotalM3.toFixed(1)} m³`;
        document.getElementById('fw_res_vol_gal').innerText = `${Math.round(volTotalGal).toLocaleString()} US Gal`;

        document.getElementById('fw_duration_badge').innerText = `${duration} Min Supply`;
        document.getElementById('fw_brk_spr').innerText = `${volSprM3.toFixed(1)} m³ (${Math.round(volSprGal).toLocaleString()} gal)`;
        document.getElementById('fw_brk_hose').innerText = `${volHoseM3.toFixed(1)} m³ (${Math.round(volHoseGal).toLocaleString()} gal)`;
        document.getElementById('fw_brk_sp').innerText = `${volSpM3.toFixed(1)} m³ (${Math.round(volSpGal).toLocaleString()} gal)`;
        document.getElementById('fw_brk_margin').innerText = `${volMarginM3.toFixed(1)} m³ (${Math.round(volMarginGal).toLocaleString()} gal)`;
        document.getElementById('fw_brk_total').innerText = `${volTotalM3.toFixed(1)} m³ (${Math.round(volTotalM3 * 1000).toLocaleString()} L)`;
    }

    drawFireWaterChart(duration, volSprM3, volHoseM3, volSpM3, volMarginM3, volTotalM3, volTotalGal);
}


function calcESFR() {
    const h = parseFloat(document.getElementById('esfr_ceiling').value) || 0;
    const s = parseFloat(document.getElementById('esfr_storage').value) || 0;

    let res = "N/A";
    let p = "--";
    let heads = 12;
    if (h <= 9.1) { res = "K-14.0 ESFR"; p = "50"; }
    else if (h <= 10.7) { res = "K-16.8 ESFR"; p = "52"; }
    else if (h <= 12.2) { res = "K-25.2 ESFR"; p = "40"; }
    else if (h <= 13.7) { res = "K-25.2 ESFR"; p = "50"; }
    else if (h <= 14.6) { res = "K-25.2 ESFR"; p = "60"; }
    else { res = "Special Design Req."; heads = "--"; }

    document.getElementById('esfr_res_head').innerText = res;
    document.getElementById('esfr_res_pressure').innerText = `${p} psi @ ${heads} heads`;
}



const _origCalcFire = calcFire;
calcFire = function() {
    _origCalcFire();
    if (window.MagicStore) {
        const qHead = parseFloat(document.getElementById('fire_res_q')?.innerText) || 0;
        const dens = parseFloat(document.getElementById('fire_density')?.value) || 0.10;
        const area = parseFloat(document.getElementById('fire_area')?.value) || 1500;
        const totQ = parseFloat(document.getElementById('fire_res_total_q')?.innerText) || 0;
        window.MagicStore.publish({
            sprinklerHeadGpm: qHead,
            sprinklerDensity: dens,
            sprinklerAreaFt2: area,
            sprinklerDemandGpm: totQ
        }, 'sprinklerPage');
    }
};

const _origCalcESFR = calcESFR;
calcESFR = function() {
    _origCalcESFR();
    if (window.MagicStore) {
        const spec = document.getElementById('esfr_res_head')?.innerText || '--';
        window.MagicStore.publish({ esfrHeadSpec: spec }, 'warehouseSprinklerPage');
    }
};

const _origCalcFireWater = calcFireWater;
calcFireWater = function() {
    _origCalcFireWater();
    if (window.MagicStore) {
        const qTot = parseFloat(document.getElementById('fw_res_q_tot')?.innerText) || 0;
        const pump = parseFloat(document.getElementById('fw_res_pump')?.innerText) || 500;
        const tank = parseFloat(document.getElementById('fw_res_vol_m3')?.innerText) || 0;
        window.MagicStore.publish({
            fireWaterTotalGpm: qTot,
            fireWaterPumpGpm: pump,
            fireWaterTankM3: tank
        }, 'fireWaterPage');
    }
};
