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

const EIT_LOAD_TYPES = {
    HVAC: { label: 'HVAC / Air-Con', icon: '❄️', defaultDf: 0.85, badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25', desc: 'Air Conditioning, Chillers, AHUs, FCUs' },
    Motor: { label: 'Motor / Pump', icon: '⚙️', defaultDf: 0.80, badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25', desc: 'Motors, Exhaust/Supply Fans, Pumps' },
    PlumbingPump: { label: 'Plumbing Pump', icon: '💧', defaultDf: 0.80, badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25', desc: 'Booster, Transfer, Sump Pumps' },
    Lighting: { label: 'Lighting', icon: '💡', defaultDf: 1.00, badge: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/25', desc: 'Continuous commercial lighting' },
    Receptacle: { label: 'Receptacle / Socket', icon: '🔌', defaultDf: 0.70, badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25', desc: 'General socket outlets (tiered 10kVA@100%, bal@50%)' },
    Kitchen: { label: 'Kitchen Appliance', icon: '🍳', defaultDf: 0.70, badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/25', desc: 'Commercial kitchen & cooking diversity 70%' },
    WaterHeater: { label: 'Water Heater', icon: '♨️', defaultDf: 0.80, badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25', desc: 'Domestic & commercial water heating' },
    Elevator: { label: 'Elevator / Lift', icon: '🛗', defaultDf: 0.85, badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25', desc: 'Passenger / Service elevators diversity' },
    FirePump: { label: 'Fire Pump (Emergency)', icon: '🔥', defaultDf: 0.00, badge: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25', desc: 'Non-coincident emergency load (0% peak)' },
    Standby: { label: 'Standby / Redundant', icon: '🛡️', defaultDf: 0.00, badge: 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/25', desc: 'EIT 3.2.7 Redundant unit (0% peak)' },
    Other: { label: 'Other Load', icon: '📦', defaultDf: 0.80, badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25', desc: 'General miscellaneous equipment' }
};

function inferTransLoadType(str, hint) {
    const hay = ((str || '') + ' ' + (hint || '')).toLowerCase();
    if (hay.includes('standby') || hay.includes('spare')) return 'Standby';
    if (hay.includes('fire pump') || hay.includes('jockey')) return 'FirePump';
    if (hay.includes('chiller') || hay.includes('ahu') || hay.includes('fcu') || hay.includes('cooling tower') || hay.includes('split') || hay.includes('vrf') || hay.includes('air-con') || hay.includes('hvac')) return 'HVAC';
    if (hay.includes('booster') || hay.includes('transfer') || hay.includes('sump') || hay.includes('plumbing')) return 'PlumbingPump';
    if (hay.includes('pump') || hay.includes('fan') || hay.includes('motor')) return 'Motor';
    if (hay.includes('light')) return 'Lighting';
    if (hay.includes('socket') || hay.includes('receptacle') || hay.includes('outlet')) return 'Receptacle';
    if (hay.includes('kitchen') || hay.includes('cook')) return 'Kitchen';
    if (hay.includes('water heater') || hay.includes('boiler') || hay.includes('heater')) return 'WaterHeater';
    if (hay.includes('elevator') || hay.includes('lift')) return 'Elevator';
    return 'Other';
}

function normalizeTransLoad(item) {
    if (!item) return null;
    const connectedKva = Number(item.connectedKva !== undefined ? item.connectedKva : (item.kva || 0)) || 0;
    const loadType = item.loadType && EIT_LOAD_TYPES[item.loadType] ? item.loadType : inferTransLoadType(item.name);
    let df = item.demandFactor !== undefined && item.demandFactor !== null && !isNaN(item.demandFactor)
        ? Number(item.demandFactor)
        : (EIT_LOAD_TYPES[loadType] ? EIT_LOAD_TYPES[loadType].defaultDf : 0.80);
    if (loadType === 'Standby' || loadType === 'FirePump' || item.isStandby) {
        df = 0.00;
    }
    df = Math.max(0, Math.min(1, df));
    const demandKva = Number((connectedKva * df).toFixed(2));
    return {
        id: item.id || (Date.now() + Math.random()),
        name: item.name || 'Load',
        loadType: loadType,
        connectedKva: Number(connectedKva.toFixed(2)),
        demandFactor: Number(df.toFixed(3)),
        demandKva: demandKva,
        isStandby: Boolean(item.isStandby || loadType === 'Standby'),
        eqRef: item.eqRef || null
    };
}

function onTransLoadTypeChanged() {
    const typeSelect = document.getElementById('trans_load_type');
    const dfInput = document.getElementById('trans_load_df');
    if (!typeSelect || !dfInput) return;
    const type = typeSelect.value;
    const def = EIT_LOAD_TYPES[type] ? EIT_LOAD_TYPES[type].defaultDf : 0.80;
    dfInput.value = def.toFixed(2);
}

function addTransLoad(optName, optKva, optType, optDf) {
    const nameInput = document.getElementById('trans_load_name');
    const valInput = document.getElementById('trans_load_val');
    const typeInput = document.getElementById('trans_load_type');
    const dfInput = document.getElementById('trans_load_df');

    let name = (optName !== undefined ? optName : (nameInput ? nameInput.value : '')).trim() || `Load ${transLoads.length + 1}`;
    let kva = optKva !== undefined ? parseFloat(optKva) : (valInput ? parseFloat(valInput.value) : 0);
    let loadType = optType || (typeInput ? typeInput.value : 'Other');
    if (!EIT_LOAD_TYPES[loadType]) loadType = inferTransLoadType(name);

    let defaultDf = EIT_LOAD_TYPES[loadType] ? EIT_LOAD_TYPES[loadType].defaultDf : 0.80;
    let df = optDf !== undefined ? parseFloat(optDf) : (dfInput && dfInput.value !== '' ? parseFloat(dfInput.value) : defaultDf);

    if (isNaN(df)) df = defaultDf;
    if (kva > 0) {
        const item = normalizeTransLoad({
            id: Date.now() + Math.random(),
            name,
            loadType,
            connectedKva: kva,
            demandFactor: df
        });
        transLoads.push(item);

        if (nameInput) nameInput.value = '';
        if (valInput) valInput.value = '';
        if (dfInput) dfInput.value = (EIT_LOAD_TYPES[loadType] ? EIT_LOAD_TYPES[loadType].defaultDf : 0.85).toFixed(2);

        renderTransLoads();
        calcTransformer();
    }
}

function addTransLoadFromEquipment(eq) {
    if (!eq) return;
    const qty = Math.max(1, Number(eq.qty) || 1);
    const pf = Number(eq.pf) > 0 ? Number(eq.pf) : 0.85;
    let unitKw = Number(eq.powerKw) || 0;
    let unitKva = 0;
    if (unitKw > 0) {
        unitKva = unitKw / pf;
    } else if (eq.capUnit === 'kVA' && Number(eq.capacity) > 0) {
        unitKva = Number(eq.capacity);
    } else if (eq.capUnit === 'TR' && Number(eq.capacity) > 0) {
        unitKva = (Number(eq.capacity) * 3.517) / (pf * 5.0);
    }

    if (unitKva <= 0) return;

    const notes = ((eq.notes || '') + ' ' + (eq.description || '')).toLowerCase();
    const hasStandbyMention = notes.includes('standby') || notes.includes('spare') || notes.includes('duty');

    // Case 1: Qty 2 with Duty + Standby
    if (qty === 2 && hasStandbyMention) {
        const baseType = eq.loadType || inferTransLoadType(eq.tag, eq.description || eq.type);
        const dutyDf = eq.demandFactor !== undefined && Number(eq.demandFactor) > 0 ? Number(eq.demandFactor) : (EIT_LOAD_TYPES[baseType] ? EIT_LOAD_TYPES[baseType].defaultDf : 0.80);
        
        // Duty Unit
        transLoads.push(normalizeTransLoad({
            id: Date.now() + Math.random(),
            name: `${eq.tag} (Duty) — ${eq.description || eq.type}`,
            loadType: baseType === 'Standby' ? 'Motor' : baseType,
            connectedKva: unitKva,
            demandFactor: dutyDf,
            isStandby: false,
            eqRef: eq.id
        }));
        
        // Standby Unit (0% Demand Factor per EIT 3.2.7)
        transLoads.push(normalizeTransLoad({
            id: Date.now() + Math.random() + 1,
            name: `${eq.tag} (Standby) — ${eq.description || eq.type}`,
            loadType: 'Standby',
            connectedKva: unitKva,
            demandFactor: 0.00,
            isStandby: true,
            eqRef: eq.id
        }));
    } else if (hasStandbyMention && notes.includes('standby')) {
        // Pure Standby Unit
        transLoads.push(normalizeTransLoad({
            id: Date.now() + Math.random(),
            name: `${eq.tag} — ${eq.description || eq.type}`,
            loadType: 'Standby',
            connectedKva: unitKva * qty,
            demandFactor: 0.00,
            isStandby: true,
            eqRef: eq.id
        }));
    } else {
        // Normal Equipment
        let baseType = eq.loadType || inferTransLoadType(eq.tag, eq.description || eq.type);
        let df = eq.demandFactor !== undefined && !isNaN(eq.demandFactor) ? Number(eq.demandFactor) : (EIT_LOAD_TYPES[baseType] ? EIT_LOAD_TYPES[baseType].defaultDf : 0.85);
        if (eq.discipline === 'fire' || (eq.type && eq.type.includes('Fire Pump'))) {
            baseType = 'FirePump';
            df = 0.00;
        }
        transLoads.push(normalizeTransLoad({
            id: Date.now() + Math.random(),
            name: `${eq.tag} — ${eq.description || eq.type}${qty > 1 ? ` (×${qty})` : ''}`,
            loadType: baseType,
            connectedKva: unitKva * qty,
            demandFactor: df,
            isStandby: baseType === 'Standby',
            eqRef: eq.id
        }));
    }

    renderTransLoads();
    calcTransformer();
    if (window.MagicSettings && typeof window.MagicSettings.showToast === 'function') {
        window.MagicSettings.showToast(`Imported ${eq.tag} into Transformer Load List`);
    }
}

function openEquipmentPickerForTransformer() {
    if (window.MagicEquipment && typeof window.MagicEquipment.openPicker === 'function') {
        window.MagicEquipment.openPicker('transformerPage');
    }
}

function applyEitStandardDemand() {
    if (!Array.isArray(transLoads) || transLoads.length === 0) {
        if (window.MagicSettings && typeof window.MagicSettings.showToast === 'function') {
            window.MagicSettings.showToast('No loads in list to apply EIT demand.');
        }
        return;
    }

    // 1. Standby & Emergency Fire Pump: DF = 0
    transLoads.forEach(l => {
        if (l.loadType === 'Standby' || l.loadType === 'FirePump' || l.isStandby) {
            l.demandFactor = 0.00;
        }
    });

    // 2. Receptacles: EIT 3.2.3.2 / NEC 220.44 (First 10 kVA @ 100%, remainder @ 50%)
    const recLoads = transLoads.filter(l => l.loadType === 'Receptacle' && !l.isStandby);
    const totalRecKva = recLoads.reduce((sum, l) => sum + (l.connectedKva || 0), 0);
    if (totalRecKva > 0) {
        let recDemand = 0;
        if (totalRecKva <= 10) {
            recDemand = totalRecKva;
        } else {
            recDemand = 10 + 0.50 * (totalRecKva - 10);
        }
        const effRecDf = recDemand / totalRecKva;
        recLoads.forEach(l => {
            l.demandFactor = Number(effRecDf.toFixed(3));
        });
    }

    // 3. HVAC: Largest @ 100%, remainder @ 85% (Continuous commercial diversity)
    const hvacLoads = transLoads.filter(l => l.loadType === 'HVAC' && !l.isStandby);
    if (hvacLoads.length > 0) {
        hvacLoads.sort((a, b) => b.connectedKva - a.connectedKva);
        hvacLoads[0].demandFactor = 1.00;
        for (let i = 1; i < hvacLoads.length; i++) {
            hvacLoads[i].demandFactor = 0.85;
        }
    }

    // 4. Motors & Plumbing Pumps: Largest @ 100%, remainder @ 80% (EIT 3.2.5.1 / 6.3)
    const motorLoads = transLoads.filter(l => (l.loadType === 'Motor' || l.loadType === 'PlumbingPump') && !l.isStandby);
    if (motorLoads.length > 0) {
        motorLoads.sort((a, b) => b.connectedKva - a.connectedKva);
        motorLoads[0].demandFactor = 1.00;
        for (let i = 1; i < motorLoads.length; i++) {
            motorLoads[i].demandFactor = 0.80;
        }
    }

    // 5. Elevators: 1 -> 1.00, 2 -> 0.95, 3 -> 0.90, >=4 -> 0.85
    const elevLoads = transLoads.filter(l => l.loadType === 'Elevator' && !l.isStandby);
    if (elevLoads.length > 0) {
        const count = elevLoads.length;
        const df = count === 1 ? 1.00 : count === 2 ? 0.95 : count === 3 ? 0.90 : 0.85;
        elevLoads.forEach(l => { l.demandFactor = df; });
    }

    // 6. Kitchen: 70% (Table 3-4 commercial cooking)
    transLoads.filter(l => l.loadType === 'Kitchen' && !l.isStandby).forEach(l => { l.demandFactor = 0.70; });

    // 7. Water Heaters: 80%
    transLoads.filter(l => l.loadType === 'WaterHeater' && !l.isStandby).forEach(l => { l.demandFactor = 0.80; });

    // 8. Lighting: 100% (Continuous commercial)
    transLoads.filter(l => l.loadType === 'Lighting' && !l.isStandby).forEach(l => { l.demandFactor = 1.00; });

    // 9. Other: 80%
    transLoads.filter(l => l.loadType === 'Other' && !l.isStandby).forEach(l => { l.demandFactor = 0.80; });

    // Recalculate demand kVA for all
    transLoads.forEach(l => {
        l.demandKva = Number((l.connectedKva * l.demandFactor).toFixed(2));
    });

    renderTransLoads();
    calcTransformer();

    if (window.MagicSettings && typeof window.MagicSettings.showToast === 'function') {
        window.MagicSettings.showToast('⚡ Applied EIT Standard 2001-64 Demand Factors to all loads!');
    }
}

function updateTransLoadDf(id, newDf) {
    const item = transLoads.find(l => l.id === id);
    if (!item) return;
    let df = parseFloat(newDf);
    if (isNaN(df)) df = 0.80;
    df = Math.max(0, Math.min(1.0, df));
    item.demandFactor = Number(df.toFixed(3));
    item.demandKva = Number((item.connectedKva * item.demandFactor).toFixed(2));
    renderTransLoads(false);
    calcTransformer();
}

function updateTransLoadType(id, newType) {
    const item = transLoads.find(l => l.id === id);
    if (!item) return;
    if (!EIT_LOAD_TYPES[newType]) return;
    item.loadType = newType;
    if (newType === 'Standby' || newType === 'FirePump') {
        item.demandFactor = 0.00;
        item.isStandby = true;
    } else {
        item.demandFactor = EIT_LOAD_TYPES[newType].defaultDf;
        item.isStandby = false;
    }
    item.demandKva = Number((item.connectedKva * item.demandFactor).toFixed(2));
    renderTransLoads(true);
    calcTransformer();
}

function deleteTransLoad(id) {
    transLoads = transLoads.filter(l => l.id !== id);
    renderTransLoads();
    calcTransformer();
}

function clearAllTransLoads() {
    if (transLoads.length === 0) return;
    if (!confirm('Clear all loads from the Transformer load list?')) return;
    transLoads = [];
    renderTransLoads();
    calcTransformer();
}

function renderTransLoads(fullRerender = true) {
    const body = document.getElementById('trans_load_body');
    if (!body) return;

    transLoads = transLoads.map(normalizeTransLoad).filter(Boolean);

    let sumConn = 0;
    let sumDemand = 0;
    transLoads.forEach(l => {
        sumConn += l.connectedKva;
        sumDemand += l.demandKva;
    });

    const weightedDf = sumConn > 0 ? (sumDemand / sumConn) : 0;

    const sumKvaEl = document.getElementById('trans_sum_kva');
    const sumConnEl = document.getElementById('trans_sum_conn_kva');
    const sumDfEl = document.getElementById('trans_sum_df');

    if (sumKvaEl) sumKvaEl.innerText = sumDemand.toFixed(1);
    if (sumConnEl) sumConnEl.innerText = sumConn.toFixed(1);
    if (sumDfEl) sumDfEl.innerText = `${weightedDf.toFixed(2)} (${(weightedDf * 100).toFixed(0)}%)`;

    if (transLoads.length === 0) {
        body.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-slate-500 font-normal italic">No loads added. Use the input row above or click <strong>📋 From Equipment Schedule</strong> to import loads.</td></tr>`;
        return;
    }

    if (!fullRerender) {
        transLoads.forEach(l => {
            const cell = document.getElementById(`trans_row_dem_${l.id}`);
            if (cell) cell.innerText = l.demandKva.toFixed(1);
        });
        return;
    }

    body.innerHTML = transLoads.map(l => {
        const typeInfo = EIT_LOAD_TYPES[l.loadType] || EIT_LOAD_TYPES.Other;
        const typeOptions = Object.keys(EIT_LOAD_TYPES).map(k => `
            <option value="${k}" ${k === l.loadType ? 'selected' : ''}>${EIT_LOAD_TYPES[k].icon} ${EIT_LOAD_TYPES[k].label}</option>
        `).join('');

        const isZeroDf = l.demandFactor === 0;
        const rowClass = isZeroDf ? 'opacity-75 bg-slate-50/50 dark:bg-slate-900/20' : '';

        return `
        <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${rowClass}">
            <td class="p-2.5">
                <div class="font-medium text-slate-800 dark:text-slate-100">${l.name}</div>
                ${l.isStandby ? '<div class="text-[10px] text-slate-400">🛡️ Standby Unit (Excluded from Peak)</div>' : ''}
                ${l.loadType === 'FirePump' ? '<div class="text-[10px] text-red-500 font-medium">🔥 Emergency Load (NFPA 20 / EIT Non-coincident)</div>' : ''}
            </td>
            <td class="p-2.5">
                <select onchange="updateTransLoadType(${l.id}, this.value)" class="text-xs py-1 px-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer outline-none focus:border-blue-500">
                    ${typeOptions}
                </select>
            </td>
            <td class="p-2.5 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                ${l.connectedKva.toFixed(1)}
            </td>
            <td class="p-2.5 text-center">
                <input type="number" step="0.05" min="0" max="1" value="${l.demandFactor.toFixed(2)}"
                    onchange="updateTransLoadDf(${l.id}, this.value)"
                    class="w-16 text-center text-xs font-mono font-bold py-1 px-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none">
            </td>
            <td id="trans_row_dem_${l.id}" class="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                ${l.demandKva.toFixed(1)}
            </td>
            <td class="p-2.5 text-center">
                <button type="button" onclick="deleteTransLoad(${l.id})" class="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer" title="Delete Load">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            </td>
        </tr>`;
    }).join('');
}

function recommendTransformer() {
    let sumDemand = transLoads.reduce((acc, curr) => acc + (curr.demandKva || 0), 0);
    if (sumDemand === 0) {
        sumDemand = transLoads.reduce((acc, curr) => acc + (curr.connectedKva || 0), 0);
    }
    if (sumDemand === 0) return;

    let target = sumDemand * 1.25;
    const standardKvas = [30, 50, 100, 160, 250, 315, 400, 500, 630, 800, 1000, 1250, 1500, 1600, 2000, 2500];
    let recommended = standardKvas.find(k => k >= target) || standardKvas[standardKvas.length - 1];

    const kvaEl = document.getElementById('trans_kva');
    if (kvaEl) kvaEl.value = recommended;
    calcTransformer();

    if (window.MagicSettings && typeof window.MagicSettings.showToast === 'function') {
        window.MagicSettings.showToast(`Recommended ${recommended} kVA Transformer (Target 1.25× = ${target.toFixed(1)} kVA)`);
    }
}

function calcTransformer() {
    const kva = parseFloat(document.getElementById('trans_kva')?.value) || 500;
    const volt = parseFloat(document.getElementById('trans_volt')?.value) || 400;
    const z = parseFloat(document.getElementById('trans_z')?.value) || 6.0;

    const flc = (kva * 1000) / (Math.sqrt(3) * volt);
    const breaker = (typeof standardBreakers !== 'undefined' && standardBreakers.find(b => b >= flc * 1.25)) || Math.ceil(flc * 1.25);
    const isc = (flc / (z / 100)) / 1000; // in kA

    const resFlcEl = document.getElementById('trans_res_flc');
    const resBreakerEl = document.getElementById('trans_res_breaker');
    const resIscEl = document.getElementById('trans_res_isc');
    if (resFlcEl) resFlcEl.innerHTML = `${flc.toFixed(1)} <span class="text-lg font-normal text-slate-500">A</span>`;
    if (resBreakerEl) resBreakerEl.innerHTML = `${breaker} <span class="text-lg font-normal text-slate-500">A</span>`;
    if (resIscEl) resIscEl.innerHTML = `${isc.toFixed(1)} <span class="text-lg font-normal text-slate-500">kA</span>`;

    // Forward Load Calculation from transLoads
    let sumConn = 0;
    let sumDemand = 0;
    if (Array.isArray(transLoads) && transLoads.length > 0) {
        transLoads.forEach(l => {
            sumConn += (l.connectedKva || 0);
            sumDemand += (l.demandKva !== undefined ? l.demandKva : (l.connectedKva * (l.demandFactor || 0.8)));
        });
    }

    const overallDf = sumConn > 0 ? (sumDemand / sumConn) : 0.80;
    const connKw = sumConn * 0.85;
    const demandKw = sumDemand * 0.85;
    const loadPct = kva > 0 ? ((sumDemand / kva) * 100) : 0;
    const availKva = Math.max(0, kva - sumDemand);
    const availPct = kva > 0 ? ((availKva / kva) * 100) : 0;

    // Update Load Check Box
    const loadKwEl = document.getElementById('trans_load_kw');
    const loadConnKvaEl = document.getElementById('trans_load_conn_kva');
    const loadDfValEl = document.getElementById('trans_load_df_val');
    const demandKwEl = document.getElementById('trans_demand_kw');
    const demandKvaCheckEl = document.getElementById('trans_demand_kva_check');
    const loadBadgeEl = document.getElementById('trans_load_badge');

    if (loadKwEl) loadKwEl.innerText = connKw.toFixed(1);
    if (loadConnKvaEl) loadConnKvaEl.innerText = sumConn.toFixed(1);
    if (loadDfValEl) loadDfValEl.innerText = `${overallDf.toFixed(2)} (${(overallDf * 100).toFixed(0)}%)`;
    if (demandKwEl) demandKwEl.innerText = demandKw.toFixed(1);
    if (demandKvaCheckEl) demandKvaCheckEl.innerText = sumDemand.toFixed(1);

    if (loadBadgeEl) {
        if (sumDemand === 0) {
            loadBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
            loadBadgeEl.innerText = 'No Loads';
        } else if (loadPct > 100) {
            loadBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30';
            loadBadgeEl.innerText = `⚠️ OVERLOAD (${loadPct.toFixed(1)}%)`;
        } else if (loadPct > 80) {
            loadBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30';
            loadBadgeEl.innerText = `⚡ High Load (${loadPct.toFixed(1)}%)`;
        } else {
            loadBadgeEl.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30';
            loadBadgeEl.innerText = `✅ Optimal (${loadPct.toFixed(1)}%)`;
        }
    }

    // Update Right Stat Cards
    const loadKvaEl = document.getElementById('trans_load_kva');
    const loadPctEl = document.getElementById('trans_load_pct');
    const availEl = document.getElementById('trans_res_avail');
    const availPctEl = document.getElementById('trans_avail_pct');

    if (loadKvaEl) {
        loadKvaEl.innerText = `${sumDemand.toFixed(1)} kVA`;
    }
    if (loadPctEl) {
        loadPctEl.innerText = `${loadPct.toFixed(1)}% of ${kva} kVA Rating`;
    }
    if (availEl) {
        availEl.innerText = `${availKva.toFixed(1)} kVA`;
    }
    if (availPctEl) {
        availPctEl.innerText = `${availPct.toFixed(1)}% Headroom Margin`;
    }
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
        let sumDemand = transLoads.reduce((a, c) => a + (c.demandKva || 0), 0);
        let sumConn = transLoads.reduce((a, c) => a + (c.connectedKva || 0), 0);
        window.MagicStore.publish({
            transformerKva: kva,
            transformerFlc: flc,
            transformerBreakerAt: brk,
            transformerIscKa: isc,
            transformerDemandKva: sumDemand,
            transformerConnectedKva: sumConn,
            transformerLoadingPct: kva > 0 ? (sumDemand / kva * 100) : 0
        }, 'transformerPage');
    }
};
