// ============================================================================
// Electrical Engineering Modules 9 & 11: Load Estimator & Transformer Sizer
// File: js/modules/electrical/load-transformer.js
// ============================================================================

let eqRecords = [];

function populateCategories() {
    const catSelect = document.getElementById('eq_cat');
    catSelect.innerHTML = Object.keys(eqData).map(k => `<option value="${k}">${k}</option>`).join('');
    updateSubCategories();
}

function updateSubCategories() {
    const cat = document.getElementById('eq_cat').value;
    const subSelect = document.getElementById('eq_subcat');
    subSelect.innerHTML = eqData[cat].map(s => `<option value="${s.name}" data-factor="${s.factor}">${s.name}</option>`).join('');
    updateEqFactor();
}

function updateEqFactor() {
    const subSelect = document.getElementById('eq_subcat');
    if (!subSelect.options[subSelect.selectedIndex]) return;
    const factor = parseFloat(subSelect.options[subSelect.selectedIndex].getAttribute('data-factor')) || 1.0;
    document.getElementById('eq_efactor').value = factor.toFixed(2);
    calcEqPower();
}

function calcEqPower() {
    const cap = parseFloat(document.getElementById('eq_cap').value) || 0;
    const efactor = parseFloat(document.getElementById('eq_efactor').value) || 0;
    document.getElementById('eq_kw').value = (cap * efactor).toFixed(2);
}

function addEqRecord() {
    let name = document.getElementById('eq_name').value.trim();
    const building = document.getElementById('eq_building').value.trim() || '-';
    const floor = document.getElementById('eq_floor').value.trim() || '-';
    const zone = document.getElementById('eq_zone').value.trim() || '-';
    const cat = document.getElementById('eq_cat').value || 'Other';
    const subcat = document.getElementById('eq_subcat').value || 'Standard';
    const cap = parseFloat(document.getElementById('eq_cap').value) || 0;
    const efactor = parseFloat(document.getElementById('eq_efactor').value) || 1.0;
    let pf = parseFloat(document.getElementById('eq_pf').value) || 0.85;
    const kw = parseFloat(document.getElementById('eq_kw').value) || 0;

    if (!name) {
        const count = eqRecords.filter(r => r.cat === cat).length + 1;
        name = `${cat}-${count.toString().padStart(2, '0')}`;
    }

    if (pf <= 0) pf = 1.0;
    const kva = kw / pf;

    eqRecords.push({
        id: Date.now() + Math.random(),
        name, building, floor, zone, cat, subcat, cap, efactor, pf, kw, kva
    });

    document.getElementById('eq_name').value = '';
    // We intentionally do not clear building/floor/zone to speed up repetitive entry
    renderEqTables();
}

function editEqRecord(id, field, value) {
    let r = eqRecords.find(x => x.id === id);
    if (!r) return;

    if (field === 'name') r.name = value;
    if (field === 'building') r.building = value;
    if (field === 'floor') r.floor = value;
    if (field === 'zone') r.zone = value;
    if (field === 'cap') r.cap = parseFloat(value) || 0;
    if (field === 'efactor') r.efactor = parseFloat(value) || 0;
    if (field === 'pf') {
        r.pf = parseFloat(value) || 1.0;
        if (r.pf <= 0) r.pf = 1.0;
    }

    r.kw = r.cap * r.efactor;
    r.kva = r.kw / r.pf;

    renderEqTables();
}

function deleteEqRecord(id) {
    eqRecords = eqRecords.filter(r => r.id !== id);
    renderEqTables();
}

function renderEqTables() {
    const listBody = document.getElementById('eq_list_body');
    const pivotBody = document.getElementById('eq_pivot_body');
    const pivotTh = document.getElementById('eq_pivot_th');

    if (eqRecords.length === 0) {
        listBody.innerHTML = `<tr><td colspan="12" class="p-4 text-center text-slate-500 font-normal italic">No equipment added. Please fill Section 1.</td></tr>`;
        pivotBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500 font-normal italic">No data saved yet.</td></tr>`;
        document.getElementById('eq_total_kw').innerText = "0.00";
        document.getElementById('eq_total_kva').innerText = "0.00";
        return;
    }

    listBody.innerHTML = eqRecords.map(r => `
    <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
        <td class="p-2">
            <input type="text" value="${r.name}" onchange="editEqRecord(${r.id}, 'name', this.value)" class="w-full bg-transparent font-semibold border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-yellow-500 outline-none px-1 py-0.5">
        </td>
        <td class="p-2">
            <input type="text" value="${r.building}" onchange="editEqRecord(${r.id}, 'building', this.value)" class="w-16 bg-transparent text-xs text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-yellow-500 outline-none px-1 py-0.5">
        </td>
        <td class="p-2">
            <input type="text" value="${r.floor}" onchange="editEqRecord(${r.id}, 'floor', this.value)" class="w-12 bg-transparent text-xs text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-yellow-500 outline-none px-1 py-0.5">
        </td>
        <td class="p-2">
            <input type="text" value="${r.zone}" onchange="editEqRecord(${r.id}, 'zone', this.value)" class="w-16 bg-transparent text-xs text-slate-600 dark:text-slate-400 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-yellow-500 outline-none px-1 py-0.5">
        </td>
        <td class="p-2 text-slate-600 dark:text-slate-400 text-xs px-2 whitespace-nowrap">${r.cat}</td>
        <td class="p-2 text-slate-500 dark:text-slate-500 text-xs px-2 whitespace-nowrap">${r.subcat}</td>
        <td class="p-2 text-center">
            <input type="number" value="${r.cap}" onchange="editEqRecord(${r.id}, 'cap', this.value)" class="w-16 bg-transparent text-center border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-yellow-500 outline-none px-1 py-0.5">
        </td>
        <td class="p-2 text-center">
            <input type="number" step="0.01" value="${r.efactor.toFixed(2)}" onchange="editEqRecord(${r.id}, 'efactor', this.value)" class="w-16 bg-transparent text-center text-indigo-600 dark:text-indigo-400 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-yellow-500 outline-none px-1 py-0.5">
        </td>
        <td class="p-2 text-center">
            <input type="number" step="0.01" value="${r.pf.toFixed(2)}" onchange="editEqRecord(${r.id}, 'pf', this.value)" class="w-16 bg-transparent text-center text-teal-600 dark:text-teal-400 border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-yellow-500 outline-none px-1 py-0.5">
        </td>
        <td class="p-3 text-right font-mono font-bold">${r.kw.toFixed(2)}</td>
        <td class="p-3 text-right font-mono font-bold">${r.kva.toFixed(2)}</td>
        <td class="p-3 text-center">
            <button onclick="deleteEqRecord(${r.id})" class="text-slate-400 hover:text-red-500 transition-colors" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
            </button>
        </td>
    </tr>
`).join('');

    let totalKW = 0, totalKVA = 0;
    const pivot = {};
    const pivotBy = document.getElementById('eq_pivot_by')?.value || 'cat';
    const pivotNames = { cat: 'Category', name: 'Equip. Name', building: 'Building', floor: 'Floor', zone: 'Zone' };
    if (pivotTh) pivotTh.innerText = pivotNames[pivotBy];

    eqRecords.forEach(r => {
        let key = r[pivotBy] || '-';
        if (!pivot[key]) pivot[key] = { count: 0, kw: 0, kva: 0 };
        pivot[key].count += 1;
        pivot[key].kw += r.kw;
        pivot[key].kva += r.kva;
        totalKW += r.kw;
        totalKVA += r.kva;
    });

    pivotBody.innerHTML = Object.keys(pivot).map(key => `
    <tr class="border-b border-slate-100 dark:border-slate-700/50">
        <td class="p-3 border-r border-slate-100 dark:border-slate-700/50 font-semibold">${key}</td>
        <td class="p-3 border-r border-slate-100 dark:border-slate-700/50 text-center">${pivot[key].count}</td>
        <td class="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">${pivot[key].kw.toFixed(2)}</td>
        <td class="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">${pivot[key].kva.toFixed(2)}</td>
    </tr>
`).join('');

    document.getElementById('eq_total_kw').innerText = totalKW.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('eq_total_kva').innerText = totalKVA.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function exportEqToExcel() {
    if (eqRecords.length === 0) return; // Do nothing if there's no data

    // 1. Prepare Summary Data
    let totalKW = 0, totalKVA = 0;
    const pivot = {};
    const pivotBy = document.getElementById('eq_pivot_by')?.value || 'cat';
    const pivotNames = { cat: 'Category', name: 'Equip. Name', building: 'Building', floor: 'Floor', zone: 'Zone' };

    eqRecords.forEach(r => {
        let key = r[pivotBy] || '-';
        if (!pivot[key]) pivot[key] = { count: 0, kw: 0, kva: 0 };
        pivot[key].count += 1;
        pivot[key].kw += r.kw;
        pivot[key].kva += r.kva;
        totalKW += r.kw;
        totalKVA += r.kva;
    });

    const pivotData = [[pivotNames[pivotBy], "Items Count", "Sum kW", "Sum kVA"]];
    Object.keys(pivot).forEach(key => {
        // Keep values as Numbers for correct formatting in Excel
        pivotData.push([key, pivot[key].count, Number(pivot[key].kw.toFixed(2)), Number(pivot[key].kva.toFixed(2))]);
    });
    pivotData.push([]); // Empty row for spacing
    pivotData.push(["TOTAL", eqRecords.length, Number(totalKW.toFixed(2)), Number(totalKVA.toFixed(2))]);

    // 2. Prepare Detailed Equipment List Data
    const listData = [["Equip. Name", "Building", "Floor", "Zone", "Category", "Sub-Category", "Cap (Ton)", "E-Factor", "PF", "kW", "kVA"]];
    eqRecords.forEach(r => {
        listData.push([r.name, r.building, r.floor, r.zone, r.cat, r.subcat, r.cap, Number(r.efactor.toFixed(2)), Number(r.pf.toFixed(2)), Number(r.kw.toFixed(2)), Number(r.kva.toFixed(2))]);
    });

    // 3. Generate Workbook
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(pivotData);
    const wsList = XLSX.utils.aoa_to_sheet(listData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary Pivot");
    XLSX.utils.book_append_sheet(wb, wsList, "Equipment List");

    XLSX.writeFile(wb, "Electrical_Load_Estimate.xlsx");
}




let transLoads = [];

function addTransLoad() {
    const nameInput = document.getElementById('trans_load_name');
    const valInput = document.getElementById('trans_load_val');
    let name = nameInput.value.trim() || `Load ${transLoads.length + 1}`;
    let kva = parseFloat(valInput.value) || 0;

    if (kva > 0) {
        transLoads.push({ id: Date.now() + Math.random(), name, kva });
        nameInput.value = '';
        valInput.value = '';
        renderTransLoads();
    }
}

function deleteTransLoad(id) {
    transLoads = transLoads.filter(l => l.id !== id);
    renderTransLoads();
}

function renderTransLoads() {
    const body = document.getElementById('trans_load_body');
    if (transLoads.length === 0) {
        body.innerHTML = `<tr><td colspan="3" class="p-3 text-center text-slate-500 font-normal italic">No loads added.</td></tr>`;
        document.getElementById('trans_sum_kva').innerText = '0.0';
        return;
    }

    let sum = 0;
    body.innerHTML = transLoads.map(l => {
        sum += l.kva;
        return `
    <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
        <td class="p-2">${l.name}</td>
        <td class="p-2 text-right font-mono">${l.kva.toFixed(1)}</td>
        <td class="p-2 text-center">
            <button onclick="deleteTransLoad(${l.id})" class="text-slate-400 hover:text-red-500 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        </td>
    </tr>`;
    }).join('');

    document.getElementById('trans_sum_kva').innerText = sum.toFixed(1);
}

function recommendTransformer() {
    let sum = transLoads.reduce((acc, curr) => acc + curr.kva, 0);
    if (sum === 0) return;
    let target = sum * 1.25;
    const standardKvas = [30, 50, 100, 160, 250, 315, 400, 500, 630, 800, 1000, 1250, 1500, 1600, 2000, 2500];
    let recommended = standardKvas.find(k => k >= target) || standardKvas[standardKvas.length - 1];

    document.getElementById('trans_kva').value = recommended;
    calcTransformer();
}

function calcTransformer() {
    const kva = parseFloat(document.getElementById('trans_kva').value) || 0;
    const volt = parseFloat(document.getElementById('trans_volt').value) || 400;
    const z = parseFloat(document.getElementById('trans_z').value) || 6.0;

    const flc = (kva * 1000) / (Math.sqrt(3) * volt);
    const breaker = standardBreakers.find(b => b >= flc * 1.25) || Math.ceil(flc * 1.25);
    const isc = (flc / (z / 100)) / 1000; // in kA

    const resFlcEl = document.getElementById('trans_res_flc');
    const resBreakerEl = document.getElementById('trans_res_breaker');
    const resIscEl = document.getElementById('trans_res_isc');
    if (resFlcEl) resFlcEl.innerHTML = `${flc.toFixed(1)} <span class="text-lg font-normal text-slate-500">A</span>`;
    if (resBreakerEl) resBreakerEl.innerHTML = `${breaker} <span class="text-lg font-normal text-slate-500">A</span>`;
    if (resIscEl) resIscEl.innerHTML = `${isc.toFixed(1)} <span class="text-lg font-normal text-slate-500">kA</span>`;

    const loadKwEl = document.getElementById('trans_load_kw');
    const loadKvaEl = document.getElementById('trans_load_kva');
    const availEl = document.getElementById('trans_res_avail');
    if (loadKwEl) loadKwEl.innerText = (kva * 0.8 * 0.85).toFixed(1);
    if (loadKvaEl) loadKvaEl.innerText = `${(kva * 0.8).toFixed(1)} kVA`;
    if (availEl) availEl.innerText = `${(kva - (kva * 0.8)).toFixed(1)} kVA`;
}



const _origRenderEqTables = renderEqTables;
renderEqTables = function() {
    _origRenderEqTables();
    if (window.MagicStore) {
        let totKw = 0, totKva = 0;
        eqRecords.forEach(r => { totKw += r.kw; totKva += r.kva; });
        window.MagicStore.publish({
            elecConnectedKw: totKw,
            elecConnectedKva: totKva
        }, 'eqListPage');
    }
};

const _origCalcTransformer = calcTransformer;
calcTransformer = function() {
    _origCalcTransformer();
    if (window.MagicStore) {
        const kva = parseFloat(document.getElementById('trans_kva')?.value) || 500;
        const flc = parseFloat(document.getElementById('trans_res_flc')?.innerText) || 0;
        const brk = parseFloat(document.getElementById('trans_res_breaker')?.innerText) || 0;
        const isc = parseFloat(document.getElementById('trans_res_isc')?.innerText) || 0;
        window.MagicStore.publish({
            transformerKva: kva,
            transformerFlc: flc,
            transformerBreakerAt: brk,
            transformerIscKa: isc
        }, 'transformerPage');
    }
};
