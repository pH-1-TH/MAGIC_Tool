// ============================================================================
// M.A.G.I.C. Global Equipment Schedule (SSOT Equipment Register)
// File: js/core/magic-equipment.js
// ----------------------------------------------------------------------------
// - Single project-wide equipment list (tags, location, electrical & hydraulic data)
// - Full-page editor (#equipmentSchedulePage) with inline editing, filters, search
// - Equipment Picker modal: any module can reference ("pull") an equipment item
//   and auto-fill its inputs through MODULE_BINDINGS (plug-in friendly)
// - Persisted to localStorage and included in .magic.json project files
// ============================================================================

(function () {
    const STORAGE_KEY = 'magic_equipment_v1';

    const DISCIPLINES = {
        mechanical: { label: '⚙️ Mechanical', badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25' },
        electrical: { label: '⚡ Electrical', badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25' },
        plumbing: { label: '💧 Plumbing', badge: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25' },
        fire: { label: '🔥 Fire', badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25' }
    };

    const EQUIPMENT_TYPES = {
        mechanical: ['Chiller', 'AHU', 'FCU', 'Cooling Tower', 'CHW Pump', 'CDW Pump', 'Exhaust Fan', 'Supply Fan', 'Split Type', 'Package Unit', 'VRF Outdoor'],
        electrical: ['Transformer', 'Generator', 'MDB', 'DB', 'Motor', 'UPS', 'Lighting Load', 'Socket Load'],
        plumbing: ['Booster Pump', 'Transfer Pump', 'Sump Pump', 'Water Heater', 'Water Tank', 'Grease Trap'],
        fire: ['Fire Pump (Electric)', 'Fire Pump (Diesel)', 'Jockey Pump', 'Fire Water Tank', 'Sprinkler Zone']
    };

    const EIT_LOAD_TYPES = {
        HVAC: { label: 'HVAC / Air-Con', icon: '❄️', defaultDf: 0.85 },
        Motor: { label: 'Motor / Pump', icon: '⚙️', defaultDf: 0.80 },
        PlumbingPump: { label: 'Plumbing Pump', icon: '💧', defaultDf: 0.80 },
        Lighting: { label: 'Lighting', icon: '💡', defaultDf: 1.00 },
        Receptacle: { label: 'Receptacle / Socket', icon: '🔌', defaultDf: 0.70 },
        Kitchen: { label: 'Kitchen Appliance', icon: '🍳', defaultDf: 0.70 },
        WaterHeater: { label: 'Water Heater', icon: '♨️', defaultDf: 0.80 },
        Elevator: { label: 'Elevator / Lift', icon: '🛗', defaultDf: 0.85 },
        FirePump: { label: 'Fire Pump (Emergency)', icon: '🔥', defaultDf: 0.00 },
        Standby: { label: 'Standby / Redundant', icon: '🛡️', defaultDf: 0.00 },
        Other: { label: 'Other Load', icon: '📦', defaultDf: 0.80 }
    };

    function inferLoadType(eq) {
        if (eq.loadType && EIT_LOAD_TYPES[eq.loadType]) return eq.loadType;
        const desc = ((eq.description || '') + ' ' + (eq.notes || '') + ' ' + (eq.type || '')).toLowerCase();
        if (desc.includes('standby') || desc.includes('spare')) return 'Standby';
        if (desc.includes('fire pump') || desc.includes('jockey') || eq.discipline === 'fire') return 'FirePump';
        if (desc.includes('chiller') || desc.includes('ahu') || desc.includes('fcu') || desc.includes('cooling tower') || desc.includes('split') || desc.includes('vrf') || desc.includes('air-con')) return 'HVAC';
        if (desc.includes('booster') || desc.includes('transfer') || desc.includes('sump') || desc.includes('plumbing')) return 'PlumbingPump';
        if (desc.includes('pump') || desc.includes('fan') || desc.includes('motor')) return 'Motor';
        if (desc.includes('light')) return 'Lighting';
        if (desc.includes('socket') || desc.includes('receptacle') || desc.includes('outlet')) return 'Receptacle';
        if (desc.includes('kitchen') || desc.includes('cook')) return 'Kitchen';
        if (desc.includes('water heater') || desc.includes('boiler') || desc.includes('heater')) return 'WaterHeater';
        if (desc.includes('elevator') || desc.includes('lift')) return 'Elevator';
        return 'Other';
    }

    function defaultDfForType(loadType) {
        return EIT_LOAD_TYPES[loadType] ? EIT_LOAD_TYPES[loadType].defaultDf : 0.80;
    }

    // Columns used by the editor table: [key, label, type, widthClass, options?]
    const COLUMNS = [
        ['tag', 'Tag', 'text', 'w-24'],
        ['description', 'Description', 'text', 'w-40'],
        ['discipline', 'Discipline', 'discipline', 'w-28'],
        ['type', 'Type', 'type', 'w-32'],
        ['loadType', 'EIT Load Type', 'loadType', 'w-36'],
        ['demandFactor', 'DF', 'number', 'w-16'],
        ['building', 'Bldg', 'text', 'w-14'],
        ['floor', 'Floor', 'text', 'w-14'],
        ['zone', 'Zone / Area', 'text', 'w-20'],
        ['qty', 'Qty', 'number', 'w-12'],
        ['capacity', 'Capacity', 'number', 'w-16'],
        ['capUnit', 'Cap. Unit', 'capUnit', 'w-16'],
        ['powerKw', 'Power (kW)', 'number', 'w-16'],
        ['voltage', 'Volt (V)', 'number', 'w-14'],
        ['phase', 'Ph', 'phase', 'w-12'],
        ['pf', 'PF', 'number', 'w-12'],
        ['eff', 'Eff.', 'number', 'w-12'],
        ['starter', 'Starter', 'starter', 'w-16'],
        ['airflowLps', 'Air (L/s)', 'number', 'w-16'],
        ['espPa', 'ESP (Pa)', 'number', 'w-16'],
        ['waterFlowLps', 'Water (L/s)', 'number', 'w-16'],
        ['headKpa', 'Head (kPa)', 'number', 'w-16'],
        ['notes', 'Notes', 'text', 'w-32']
    ];

    const CAP_UNITS = ['kW', 'TR', 'kVA', 'HP', 'L/s', 'm³/h', 'GPM', 'm³', 'L', '-'];
    const STARTERS = ['-', 'DOL', 'SD', 'VFD', 'SS'];
    const NUMERIC_KEYS = ['qty', 'capacity', 'powerKw', 'voltage', 'phase', 'pf', 'eff', 'airflowLps', 'espPa', 'waterFlowLps', 'headKpa', 'demandFactor'];

    const SAMPLE_EQUIPMENT = [
        { tag: 'CH-01', description: 'Water-Cooled Centrifugal Chiller', discipline: 'mechanical', type: 'Chiller', loadType: 'HVAC', demandFactor: 1.00, building: 'A', floor: 'RF', zone: 'Chiller Plant', qty: 1, capacity: 500, capUnit: 'TR', powerKw: 310, voltage: 400, phase: 3, pf: 0.90, eff: 0.96, starter: 'VFD', airflowLps: 0, espPa: 0, waterFlowLps: 75.7, headKpa: 0, notes: '0.62 kW/TR' },
        { tag: 'CHWP-01', description: 'Primary Chilled Water Pump', discipline: 'mechanical', type: 'CHW Pump', loadType: 'Motor', demandFactor: 0.80, building: 'A', floor: 'RF', zone: 'Chiller Plant', qty: 2, capacity: 75.7, capUnit: 'L/s', powerKw: 30, voltage: 400, phase: 3, pf: 0.86, eff: 0.93, starter: 'VFD', airflowLps: 0, espPa: 0, waterFlowLps: 75.7, headKpa: 250, notes: '1 Duty + 1 Standby' },
        { tag: 'AHU-01', description: 'Air Handling Unit — Lobby', discipline: 'mechanical', type: 'AHU', loadType: 'HVAC', demandFactor: 0.85, building: 'A', floor: 'GF', zone: 'Lobby', qty: 1, capacity: 70, capUnit: 'kW', powerKw: 7.5, voltage: 400, phase: 3, pf: 0.85, eff: 0.90, starter: 'VFD', airflowLps: 3500, espPa: 350, waterFlowLps: 3.3, headKpa: 0, notes: 'ESP: 350 Pa' },
        { tag: 'FCU-01', description: 'Fan Coil Unit — Meeting Room', discipline: 'mechanical', type: 'FCU', loadType: 'HVAC', demandFactor: 0.85, building: 'A', floor: '2F', zone: 'Meeting Room', qty: 1, capacity: 5, capUnit: 'kW', powerKw: 0.35, voltage: 230, phase: 1, pf: 0.90, eff: 0.82, starter: 'DOL', airflowLps: 280, espPa: 50, waterFlowLps: 0.24, headKpa: 0, notes: 'Ceiling Concealed, ESP: 50 Pa' },
        { tag: 'EF-01', description: 'Toilet Exhaust Fan', discipline: 'mechanical', type: 'Exhaust Fan', loadType: 'Motor', demandFactor: 0.80, building: 'A', floor: 'RF', zone: 'Roof Exhaust', qty: 1, capacity: 850, capUnit: 'L/s', powerKw: 1.5, voltage: 400, phase: 3, pf: 0.85, eff: 0.88, starter: 'DOL', airflowLps: 850, espPa: 200, waterFlowLps: 0, headKpa: 0, notes: 'Centrifugal Inline, ESP: 200 Pa' },
        { tag: 'BP-01', description: 'Domestic Water Booster Pump Set', discipline: 'plumbing', type: 'Booster Pump', loadType: 'PlumbingPump', demandFactor: 0.80, building: 'A', floor: 'B1', zone: 'Pump Room', qty: 2, capacity: 5, capUnit: 'L/s', powerKw: 5.5, voltage: 400, phase: 3, pf: 0.85, eff: 0.89, starter: 'VFD', airflowLps: 0, espPa: 0, waterFlowLps: 5, headKpa: 450, notes: '1 Duty + 1 Standby' },
        { tag: 'FP-01', description: 'Electric Fire Pump (NFPA 20)', discipline: 'fire', type: 'Fire Pump (Electric)', loadType: 'FirePump', demandFactor: 0.00, building: 'A', floor: 'B1', zone: 'Fire Pump Room', qty: 1, capacity: 1000, capUnit: 'GPM', powerKw: 75, voltage: 400, phase: 3, pf: 0.88, eff: 0.95, starter: 'SD', airflowLps: 0, espPa: 0, waterFlowLps: 63.1, headKpa: 690, notes: 'NFPA 20 Emergency' },
        { tag: 'TR-01', description: 'Main Distribution Transformer', discipline: 'electrical', type: 'Transformer', loadType: 'Other', demandFactor: 1.00, building: 'A', floor: 'GF', zone: 'Substation', qty: 1, capacity: 1000, capUnit: 'kVA', powerKw: 0, voltage: 400, phase: 3, pf: 0.90, eff: 0.98, starter: '-', airflowLps: 0, espPa: 0, waterFlowLps: 0, headKpa: 0, notes: '22kV / 400-230V, Z = 6%' }
    ];

    // ------------------------------------------------------------------------
    // Module bindings: how each module consumes an equipment item.
    // To plug a new module in, add an entry { label, multi?, apply(eq) }.
    // ------------------------------------------------------------------------
    function setVal(id, value) {
        const el = document.getElementById(id);
        if (!el || value === undefined || value === null || value === '') return false;
        if (el.tagName === 'SELECT') {
            const has = Array.from(el.options).some(o => o.value === String(value));
            if (!has) return false;
        }
        el.value = String(value);
        return true;
    }

    function totalKw(eq) {
        return (Number(eq.powerKw) || 0) * Math.max(1, Number(eq.qty) || 1);
    }

    function totalKva(eq) {
        const pf = Number(eq.pf) > 0 ? Number(eq.pf) : 1;
        if (eq.capUnit === 'kVA' && !(Number(eq.powerKw) > 0)) {
            return (Number(eq.capacity) || 0) * Math.max(1, Number(eq.qty) || 1);
        }
        return totalKw(eq) / pf;
    }

    const MODULE_BINDINGS = {
        wiringPage: {
            label: 'Load kW, Voltage, Phase & PF',
            apply(eq) {
                setVal('wire_load_unit', 'kW');
                setVal('wire_load', Number(eq.powerKw) || 0);
                setVal('wire_volt', eq.voltage);
                setVal('wire_phase', Number(eq.phase) === 1 ? '1' : '3');
                setVal('wire_pf', eq.pf);
                if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('wire');
                if (typeof calcWiring === 'function') calcWiring();
            }
        },
        motorSizerPage: {
            label: 'Motor kW, Voltage, Starter & MCC Branch',
            multi: true,
            apply(eq) {
                // If MCC cabinet module is present, add as an MCC branch
                if (typeof addMccBranchFromEquipment === 'function') {
                    addMccBranchFromEquipment(eq);
                }
                // Also update single motor inputs for instant analysis
                setVal('motor_power_unit', 'kW');
                setVal('motor_power', Number(eq.powerKw) || 0);
                setVal('motor_volt', eq.voltage);
                setVal('motor_pf', eq.pf);
                setVal('motor_eff', eq.eff);
                if (eq.starter && eq.starter !== '-') setVal('motor_starter', eq.starter);
                if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('motor');
                if (typeof calcMotor === 'function') calcMotor();
            }
        },
        starterSimulatorPage: {
            label: 'Motor kW, Voltage & Starter Type',
            apply(eq) {
                setVal('sim_motor_kw', Number(eq.powerKw) || 0);
                setVal('sim_motor_v', eq.voltage);
                if (eq.starter === 'DOL' || eq.starter === 'SD' || eq.starter === 'SS') setVal('sim_starter_type', eq.starter);
                if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('sim');
                if (typeof calcStarter === 'function') calcStarter();
            }
        },
        shortCircuitPage: {
            label: 'System Voltage',
            apply(eq) {
                setVal('sc_volt', eq.voltage);
                if (typeof calcSC === 'function') calcSC();
            }
        },
        ductSizerPage: {
            label: 'Airflow (L/s)',
            apply(eq) {
                setVal('duct_unit', 'LPS');
                setVal('duct_flow', Number(eq.airflowLps) || 0);
                if (typeof updateDuctSizer === 'function') updateDuctSizer();
            }
        },
        pipeSizerPage: {
            label: 'Water Flow (L/s)',
            apply(eq) {
                setVal('pipe_unit', 'LPS');
                setVal('pipe_flow', Number(eq.waterFlowLps) || 0);
                if (typeof updatePipeSizer === 'function') updatePipeSizer();
            }
        },
        transformerPage: {
            label: 'Add to Transformer Load List (kVA & EIT Demand)',
            multi: true,
            apply(eq) {
                if (typeof addTransLoadFromEquipment === 'function') {
                    addTransLoadFromEquipment(eq);
                } else if (typeof transLoads !== 'undefined') {
                    const kva = totalKva(eq);
                    if (!(kva > 0)) return;
                    const lt = eq.loadType || inferLoadType(eq);
                    const df = eq.demandFactor !== undefined && !isNaN(eq.demandFactor) ? Number(eq.demandFactor) : defaultDfForType(lt);
                    transLoads.push({
                        id: Date.now() + Math.random(),
                        name: `${eq.tag} — ${eq.description || eq.type}`,
                        loadType: lt,
                        connectedKva: Number(kva.toFixed(2)),
                        demandFactor: df,
                        demandKva: Number((kva * df).toFixed(2)),
                        isStandby: lt === 'Standby',
                        eqRef: eq.id
                    });
                    if (typeof renderTransLoads === 'function') renderTransLoads();
                    if (typeof calcTransformer === 'function') calcTransformer();
                }
            }
        },
        eqListPage: {
            label: 'Add to Electrical Load Estimator',
            multi: true,
            apply(eq) {
                if (typeof eqRecords === 'undefined') return;
                const kw = totalKw(eq);
                const pf = Number(eq.pf) > 0 ? Number(eq.pf) : 1;
                const cap = Number(eq.capacity) || 0;
                eqRecords.push({
                    id: Date.now() + Math.random(),
                    name: eq.tag,
                    building: eq.building || '-',
                    floor: eq.floor || '-',
                    zone: eq.zone || '-',
                    cat: eq.type || 'Other',
                    subcat: 'Equipment Schedule',
                    cap: cap,
                    efactor: cap > 0 ? kw / cap : 1,
                    pf: pf,
                    kw: kw,
                    kva: kw / pf,
                    eqRef: eq.id
                });
                if (typeof renderEqTables === 'function') renderEqTables();
            }
        }
    };

    // ------------------------------------------------------------------------
    // State
    // ------------------------------------------------------------------------
    let items = [];
    let filterDisc = 'all';
    let searchText = '';
    let pickerTarget = null;
    let pickerSearch = '';

    function uid() {
        return 'eq_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    function normalize(raw) {
        const eq = Object.assign({
            id: uid(), tag: '', description: '', discipline: 'mechanical', type: '',
            loadType: '', demandFactor: 0.80,
            building: '', floor: '', zone: '', qty: 1, capacity: 0, capUnit: 'kW',
            powerKw: 0, voltage: 400, phase: 3, pf: 0.85, eff: 0.90, starter: '-',
            airflowLps: 0, espPa: 0, waterFlowLps: 0, headKpa: 0, notes: ''
        }, raw || {});
        NUMERIC_KEYS.forEach(k => { eq[k] = parseFloat(eq[k]) || 0; });
        if (!DISCIPLINES[eq.discipline]) eq.discipline = 'mechanical';
        if (!eq.loadType) eq.loadType = inferLoadType(eq);
        if (raw && raw.demandFactor === undefined) eq.demandFactor = defaultDfForType(eq.loadType);
        return eq;
    }

    function load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) {
                    items = parsed.map(normalize);
                    return;
                }
            }
        } catch (e) { }
        items = SAMPLE_EQUIPMENT.map(normalize);
        save();
    }

    function save() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch (e) { }
    }

    function esc(str) {
        return String(str === undefined || str === null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function toast(msg) {
        if (window.MagicSettings && typeof window.MagicSettings.showToast === 'function') {
            window.MagicSettings.showToast(msg);
        }
    }

    function matches(eq, disc, text) {
        if (disc !== 'all' && eq.discipline !== disc) return false;
        if (!text) return true;
        const hay = [eq.tag, eq.description, eq.type, eq.building, eq.floor, eq.zone, eq.notes].join(' ').toLowerCase();
        return hay.includes(text);
    }

    function nextTag(type) {
        const prefixMap = {
            'Chiller': 'CH', 'AHU': 'AHU', 'FCU': 'FCU', 'Cooling Tower': 'CT', 'CHW Pump': 'CHWP', 'CDW Pump': 'CDWP',
            'Exhaust Fan': 'EF', 'Supply Fan': 'SF', 'Split Type': 'AC', 'Package Unit': 'PAC', 'VRF Outdoor': 'VRF',
            'Transformer': 'TR', 'Generator': 'GEN', 'MDB': 'MDB', 'DB': 'DB', 'Motor': 'M', 'UPS': 'UPS',
            'Booster Pump': 'BP', 'Transfer Pump': 'TP', 'Sump Pump': 'SP', 'Water Heater': 'WH', 'Water Tank': 'WT',
            'Fire Pump (Electric)': 'FP', 'Fire Pump (Diesel)': 'DFP', 'Jockey Pump': 'JP', 'Fire Water Tank': 'FWT'
        };
        const prefix = prefixMap[type] || 'EQ';
        let n = 1;
        while (items.some(i => i.tag === `${prefix}-${String(n).padStart(2, '0')}`)) n++;
        return `${prefix}-${String(n).padStart(2, '0')}`;
    }

    // ------------------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------------------
    window.MagicEquipment = {
        DISCIPLINES,
        EQUIPMENT_TYPES,
        MODULE_BINDINGS,
        EIT_LOAD_TYPES,

        getAll() { return items.map(i => Object.assign({}, i)); },
        getById(id) { return items.find(i => i.id === id) || null; },
        getByTag(tag) { return items.find(i => i.tag === tag) || null; },
        query(disc = 'all', text = '') { return items.filter(i => matches(i, disc, (text || '').toLowerCase())); },

        add(partial) {
            const disc = (partial && partial.discipline) || (filterDisc !== 'all' ? filterDisc : 'mechanical');
            const type = (partial && partial.type) || EQUIPMENT_TYPES[disc][0];
            const eq = normalize(Object.assign({ discipline: disc, type, tag: nextTag(type) }, partial || {}));
            items.push(eq);
            save();
            this.render();
            return eq;
        },

        update(id, field, value) {
            const eq = items.find(i => i.id === id);
            if (!eq) return;
            eq[field] = NUMERIC_KEYS.includes(field) ? (parseFloat(value) || 0) : value;
            if (field === 'discipline') {
                const types = EQUIPMENT_TYPES[eq.discipline] || [];
                if (!types.includes(eq.type)) eq.type = types[0] || '';
                eq.loadType = inferLoadType(eq);
                eq.demandFactor = defaultDfForType(eq.loadType);
            }
            if (field === 'type') {
                eq.loadType = inferLoadType(eq);
                eq.demandFactor = defaultDfForType(eq.loadType);
            }
            if (field === 'loadType') {
                eq.demandFactor = defaultDfForType(value);
            }
            save();
            if (field === 'discipline' || field === 'type' || field === 'loadType' || field === 'demandFactor' || field === 'qty' || field === 'powerKw' || field === 'pf' || field === 'capacity' || field === 'capUnit') {
                this.render();
            } else {
                this.renderSummary();
            }
        },

        duplicate(id) {
            const src = items.find(i => i.id === id);
            if (!src) return;
            const copy = normalize(Object.assign({}, src, { id: uid(), tag: nextTag(src.type) }));
            items.splice(items.indexOf(src) + 1, 0, copy);
            save();
            this.render();
            toast(`Duplicated ${src.tag} → ${copy.tag}`);
        },

        remove(id) {
            const eq = items.find(i => i.id === id);
            if (!eq) return;
            if (!confirm(`Delete equipment ${eq.tag}?`)) return;
            items = items.filter(i => i.id !== id);
            save();
            this.render();
        },

        clearAll() {
            if (!confirm('Delete ALL equipment in the schedule? This cannot be undone (export first if needed).')) return;
            items = [];
            save();
            this.render();
        },

        loadSamples() {
            SAMPLE_EQUIPMENT.forEach(s => items.push(normalize(Object.assign({}, s, { id: uid() }))));
            save();
            this.render();
            toast('Loaded sample equipment');
        },

        exportData() { return items.map(i => Object.assign({}, i)); },

        importData(arr) {
            if (!Array.isArray(arr)) return;
            items = arr.map(normalize);
            save();
            this.render();
        },

        setFilter(disc) {
            filterDisc = disc || 'all';
            this.render();
        },

        setSearch(text) {
            searchText = (text || '').trim().toLowerCase();
            this.renderTable();
        },

        // --------------------------------------------------------------------
        // Excel / CSV I/O
        // --------------------------------------------------------------------
        exportXlsx() {
            if (typeof XLSX === 'undefined') { alert('SheetJS (XLSX) library not loaded.'); return; }
            const header = COLUMNS.map(c => c[1]).concat(['Total kW', 'Total kVA']);
            const rows = items.map(eq => COLUMNS.map(c => eq[c[0]]).concat([Number(totalKw(eq).toFixed(2)), Number(totalKva(eq).toFixed(2))]));
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([header].concat(rows)), 'Equipment Schedule');
            const prj = (window.MagicSettings && window.MagicSettings.getGlobal().projectCode) || 'Project';
            XLSX.writeFile(wb, `MAGIC_${prj}_Equipment_Schedule.xlsx`);
        },

        importXlsx(fileInput) {
            const file = fileInput.files && fileInput.files[0];
            if (!file || typeof XLSX === 'undefined') return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                    const sheet = wb.Sheets[wb.SheetNames[0]];
                    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
                    const labelToKey = {};
                    COLUMNS.forEach(c => { labelToKey[c[1].toLowerCase()] = c[0]; labelToKey[c[0].toLowerCase()] = c[0]; });
                    let count = 0;
                    rows.forEach(r => {
                        const obj = {};
                        Object.keys(r).forEach(h => {
                            const key = labelToKey[String(h).trim().toLowerCase()];
                            if (key) obj[key] = r[h];
                        });
                        if (obj.tag || obj.description) {
                            obj.discipline = String(obj.discipline || 'mechanical').toLowerCase().replace(/[^a-z]/g, '');
                            items.push(normalize(Object.assign({ id: uid() }, obj)));
                            count++;
                        }
                    });
                    save();
                    this.render();
                    toast(`Imported ${count} equipment item(s) from Excel`);
                } catch (err) {
                    alert('Could not read the Excel file: ' + err.message);
                }
                fileInput.value = '';
            };
            reader.readAsArrayBuffer(file);
        },

        // --------------------------------------------------------------------
        // Rendering — Full Page
        // --------------------------------------------------------------------
        render() {
            this.renderFilters();
            this.renderTable();
            this.renderSummary();
        },

        renderFilters() {
            const wrap = document.getElementById('eqs_filter_bar');
            if (!wrap) return;
            const counts = { all: items.length };
            Object.keys(DISCIPLINES).forEach(d => { counts[d] = items.filter(i => i.discipline === d).length; });
            const pills = [['all', '📋 All Equipment']].concat(Object.keys(DISCIPLINES).map(d => [d, DISCIPLINES[d].label]));
            wrap.innerHTML = pills.map(([key, label]) => `
                <button type="button" onclick="window.MagicEquipment.setFilter('${key}')"
                    class="px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${filterDisc === key
                        ? 'font-extrabold bg-blue-600 text-white shadow-xs'
                        : 'font-semibold bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}">
                    ${label} (${counts[key] || 0})
                </button>`).join('');
        },

        renderCell(eq, col) {
            const [key, , type, width] = col;
            const base = `bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:border-blue-500 outline-none px-1 py-0.5 text-xs ${width}`;
            const onChange = `onchange="window.MagicEquipment.update('${eq.id}', '${key}', this.value)"`;
            const selectCls = `${base} dark:bg-slate-800 cursor-pointer`;
            const opts = (list, cur) => list.map(o => `<option value="${esc(o)}" ${String(o) === String(cur) ? 'selected' : ''}>${esc(o)}</option>`).join('');

            if (type === 'discipline') {
                return `<select ${onChange} class="${selectCls}">${Object.keys(DISCIPLINES).map(d => `<option value="${d}" ${d === eq.discipline ? 'selected' : ''}>${DISCIPLINES[d].label}</option>`).join('')}</select>`;
            }
            if (type === 'type') {
                const list = (EQUIPMENT_TYPES[eq.discipline] || []).slice();
                if (eq.type && !list.includes(eq.type)) list.push(eq.type);
                return `<select ${onChange} class="${selectCls}">${opts(list, eq.type)}</select>`;
            }
            if (type === 'loadType') {
                const ltKeys = Object.keys(EIT_LOAD_TYPES);
                const ltOpts = ltKeys.map(k => `<option value="${k}" ${k === eq.loadType ? 'selected' : ''}>${EIT_LOAD_TYPES[k].icon} ${EIT_LOAD_TYPES[k].label}</option>`).join('');
                return `<select ${onChange} class="${selectCls}">${ltOpts}</select>`;
            }
            if (type === 'capUnit') return `<select ${onChange} class="${selectCls}">${opts(CAP_UNITS, eq.capUnit)}</select>`;
            if (type === 'starter') return `<select ${onChange} class="${selectCls}">${opts(STARTERS, eq.starter)}</select>`;
            if (type === 'phase') return `<select ${onChange} class="${selectCls}">${opts([1, 3], eq.phase)}</select>`;
            if (type === 'number') return `<input type="number" step="any" value="${esc(eq[key])}" ${onChange} class="${base} text-right font-mono">`;
            const bold = key === 'tag' ? 'font-extrabold text-slate-900 dark:text-white' : '';
            return `<input type="text" value="${esc(eq[key])}" ${onChange} class="${base} ${bold}">`;
        },

        renderTable() {
            const head = document.getElementById('eqs_table_head');
            const body = document.getElementById('eqs_table_body');
            if (!head || !body) return;

            head.innerHTML = `<tr>${COLUMNS.map(c => `<th class="p-2 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">${c[1]}</th>`).join('')}
                <th class="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Σ kW</th>
                <th class="p-2 text-right text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">Σ kVA</th>
                <th class="p-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actions</th></tr>`;

            const rows = items.filter(i => matches(i, filterDisc, searchText));
            if (rows.length === 0) {
                body.innerHTML = `<tr><td colspan="${COLUMNS.length + 3}" class="p-6 text-center text-xs text-slate-500 italic">
                    No equipment found. Click <strong>＋ Add Equipment</strong> to start your project schedule.</td></tr>`;
                return;
            }

            body.innerHTML = rows.map(eq => `
                <tr class="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                    ${COLUMNS.map(c => `<td class="p-1.5 align-middle">${this.renderCell(eq, c)}</td>`).join('')}
                    <td class="p-1.5 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">${totalKw(eq).toFixed(2)}</td>
                    <td class="p-1.5 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">${totalKva(eq).toFixed(2)}</td>
                    <td class="p-1.5 text-center whitespace-nowrap">
                        <button type="button" onclick="window.MagicEquipment.duplicate('${eq.id}')" title="Duplicate" class="px-1.5 py-0.5 rounded text-slate-400 hover:text-blue-500 cursor-pointer">⧉</button>
                        <button type="button" onclick="window.MagicEquipment.remove('${eq.id}')" title="Delete" class="px-1.5 py-0.5 rounded text-slate-400 hover:text-rose-500 cursor-pointer">🗑</button>
                    </td>
                </tr>`).join('');
        },

        renderSummary() {
            const el = document.getElementById('eqs_summary');
            if (!el) return;
            const kw = items.reduce((a, i) => a + totalKw(i), 0);
            const kva = items.reduce((a, i) => a + totalKva(i), 0);
            const units = items.reduce((a, i) => a + Math.max(1, Number(i.qty) || 1), 0);
            const card = (label, value, color) => `
                <div class="p-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs">
                    <div class="text-[10px] font-bold uppercase tracking-wider text-slate-400">${label}</div>
                    <div class="text-lg font-black ${color}">${value}</div>
                </div>`;
            el.innerHTML =
                card('Equipment Tags', items.length, 'text-slate-900 dark:text-white') +
                card('Total Units (Qty)', units, 'text-slate-900 dark:text-white') +
                card('Connected Load', `${kw.toLocaleString('en-US', { maximumFractionDigits: 1 })} kW`, 'text-amber-600 dark:text-amber-400') +
                card('Apparent Load', `${kva.toLocaleString('en-US', { maximumFractionDigits: 1 })} kVA`, 'text-blue-600 dark:text-blue-400');
        },

        // --------------------------------------------------------------------
        // Equipment Picker (used from inside any bound module)
        // --------------------------------------------------------------------
        hasBinding(moduleId) { return Boolean(MODULE_BINDINGS[moduleId]); },

        ensurePickerModal() {
            if (document.getElementById('eqPickerModal')) return;
            const modal = document.createElement('div');
            modal.id = 'eqPickerModal';
            modal.className = 'fixed inset-0 z-[115] bg-slate-900/65 hidden flex items-center justify-center p-4 backdrop-blur-sm no-print';
            modal.innerHTML = `
                <div class="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div class="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                        <div>
                            <h2 class="text-base font-extrabold text-slate-900 dark:text-white">📋 Select from Global Equipment Schedule</h2>
                            <p id="eqPickerSubtitle" class="text-[11px] text-slate-500 dark:text-slate-400"></p>
                        </div>
                        <button type="button" onclick="window.MagicEquipment.closePicker()" class="w-8 h-8 rounded-lg bg-slate-200/70 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:bg-rose-500/15 hover:text-rose-500 font-bold cursor-pointer">✕</button>
                    </div>
                    <div class="p-4 space-y-3">
                        <div class="flex flex-wrap items-center gap-2">
                            <input type="search" id="eqPickerSearch" placeholder="Search tag, description, type, location..." oninput="window.MagicEquipment.setPickerSearch(this.value)"
                                class="flex-1 min-w-[200px] p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-xs text-slate-900 dark:text-white">
                            <button type="button" id="eqPickerAddAll" onclick="window.MagicEquipment.pickAllFiltered()" class="hidden px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white cursor-pointer">＋ Add All Listed</button>
                            <button type="button" onclick="window.MagicEquipment.closePicker(); switchView('equipmentSchedulePage')" class="px-3 py-2 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 cursor-pointer">✏️ Edit Schedule</button>
                        </div>
                        <div id="eqPickerList" class="max-h-[55vh] overflow-y-auto space-y-1.5 pr-1"></div>
                    </div>
                </div>`;
            modal.addEventListener('click', (e) => { if (e.target === modal) this.closePicker(); });
            document.body.appendChild(modal);
        },

        openPicker(moduleId) {
            const binding = MODULE_BINDINGS[moduleId];
            if (!binding) return;
            this.ensurePickerModal();
            pickerTarget = moduleId;
            pickerSearch = '';
            const mod = window.MagicRegistry && window.MagicRegistry.getById(moduleId);
            document.getElementById('eqPickerSubtitle').innerText = `Target: ${(mod && mod.title) || moduleId} → fills ${binding.label}`;
            document.getElementById('eqPickerSearch').value = '';
            document.getElementById('eqPickerAddAll').classList.toggle('hidden', !binding.multi);
            this.renderPickerList();
            document.getElementById('eqPickerModal').classList.remove('hidden');
            setTimeout(() => document.getElementById('eqPickerSearch').focus(), 30);
        },

        closePicker() {
            const modal = document.getElementById('eqPickerModal');
            if (modal) modal.classList.add('hidden');
            pickerTarget = null;
        },

        setPickerSearch(text) {
            pickerSearch = (text || '').trim().toLowerCase();
            this.renderPickerList();
        },

        renderPickerList() {
            const list = document.getElementById('eqPickerList');
            if (!list) return;
            const rows = items.filter(i => matches(i, 'all', pickerSearch));
            if (rows.length === 0) {
                list.innerHTML = `<div class="p-6 text-center text-xs text-slate-500 italic">No equipment found. Add items in the Global Equipment Schedule page.</div>`;
                return;
            }
            list.innerHTML = rows.map(eq => {
                const d = DISCIPLINES[eq.discipline] || DISCIPLINES.mechanical;
                const specs = [
                    eq.capacity ? `${eq.capacity} ${eq.capUnit}` : '',
                    eq.powerKw ? `${eq.powerKw} kW` : '',
                    eq.voltage ? `${eq.voltage}V/${eq.phase}Ø` : '',
                    eq.airflowLps ? `${eq.airflowLps} L/s air` : '',
                    eq.waterFlowLps ? `${eq.waterFlowLps} L/s water` : '',
                    eq.qty > 1 ? `×${eq.qty}` : ''
                ].filter(Boolean).join(' • ');
                return `
                    <button type="button" onclick="window.MagicEquipment.pick('${eq.id}')"
                        class="w-full flex items-center justify-between gap-3 p-3 rounded-xl text-left bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:bg-blue-500/5 transition cursor-pointer">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-extrabold text-sm text-slate-900 dark:text-white">${esc(eq.tag)}</span>
                                <span class="px-1.5 py-0.5 rounded border text-[10px] font-bold ${d.badge}">${d.label}</span>
                                <span class="text-[11px] text-slate-500 dark:text-slate-400">${esc(eq.type)}</span>
                            </div>
                            <div class="text-xs text-slate-600 dark:text-slate-300 truncate">${esc(eq.description)}</div>
                            <div class="text-[11px] font-mono text-slate-500 dark:text-slate-400">${esc(specs)} ${eq.zone ? '• 📍 ' + esc([eq.building, eq.floor, eq.zone].filter(Boolean).join(' / ')) : ''}</div>
                        </div>
                        <span class="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-600 text-white">Use →</span>
                    </button>`;
            }).join('');
        },

        pick(id) {
            const eq = this.getById(id);
            const binding = pickerTarget && MODULE_BINDINGS[pickerTarget];
            if (!eq || !binding) return;
            binding.apply(eq);
            this.markReference(pickerTarget, eq);
            if (!binding.multi) this.closePicker();
            toast(`Applied ${eq.tag} to ${pickerTarget}`);
        },

        pickAllFiltered() {
            const binding = pickerTarget && MODULE_BINDINGS[pickerTarget];
            if (!binding || !binding.multi) return;
            const rows = items.filter(i => matches(i, 'all', pickerSearch));
            rows.forEach(eq => binding.apply(eq));
            toast(`Added ${rows.length} equipment item(s)`);
            this.closePicker();
        },

        markReference(moduleId, eq) {
            const badge = document.getElementById(`eq_ref_badge_${moduleId}`);
            if (badge) {
                badge.innerText = `📋 ${eq.tag}`;
                badge.title = `${eq.description} (${eq.type})`;
                badge.classList.remove('hidden');
            }
        },

        // Toolbar button HTML injected by MagicRegistry into bound modules
        renderToolbarButton(moduleId) {
            if (!MODULE_BINDINGS[moduleId]) return '';
            return `
                <button type="button" onclick="window.MagicEquipment.openPicker('${moduleId}')"
                    class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-300 border border-violet-500/25 transition cursor-pointer"
                    title="Fill inputs from the Global Equipment Schedule">
                    <span>📋 From Equipment</span>
                </button>
                <span id="eq_ref_badge_${moduleId}" class="hidden px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-600 text-white"></span>`;
        }
    };

    load();
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.MagicEquipment.closePicker();
    });
})();

