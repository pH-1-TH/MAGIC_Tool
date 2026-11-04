// ============================================================================
// M.A.G.I.C. Global & Local Settings Manager (Full-Page Hub & Per-Module Engine)
// File: js/core/magic-settings.js
// ============================================================================

(function () {
    const SETTINGS_KEY = 'magic_settings_v3';

    const defaultSettings = {
        global: {
            projectName: 'M.A.G.I.C. MEP Design Project',
            projectCode: 'PRJ-2026-001',
            clientName: 'Engineering Client',
            location: 'Bangkok',
            engineerName: 'Lead MEP Engineer',
            reviewerName: 'Senior Principal Engineer',
            revision: 'Rev. 0',
            unitSystem: 'SI',        // 'SI' | 'IP'
            electricalStd: 'EIT',    // 'EIT' (40°C Ref) | 'IEC' (30°C Ref)
            voltage3P: 400,
            voltage1P: 230,
            frequency: 50,
            elecAmbientTemp: 40,
            oaDbC: 35.0,
            oaWbC: 28.0,
            roomDbC: 24.0,
            roomRhPct: 50.0,
            elevationM: 0,
            waterTempC: 20,
            safetyFactorPct: 10
        },
        local: {
            // Per-module overrides keyed by moduleId:
            // { mode: 'inherit' | 'custom', unitSystem, electricalStd, voltage3P, elecAmbientTemp, waterTempC, oaDbC, location, safetyFactorPct, note }
        }
    };

    const REGIONAL_PRESETS = {
        TH_EIT: {
            unitSystem: 'SI',
            electricalStd: 'EIT',
            voltage3P: 400,
            voltage1P: 230,
            frequency: 50,
            elecAmbientTemp: 40,
            oaDbC: 35.0,
            oaWbC: 28.0,
            roomDbC: 24.0,
            roomRhPct: 50.0,
            waterTempC: 20,
            location: 'Bangkok',
            safetyFactorPct: 10
        },
        INTL_IEC: {
            unitSystem: 'SI',
            electricalStd: 'IEC',
            voltage3P: 400,
            voltage1P: 230,
            frequency: 50,
            elecAmbientTemp: 30,
            oaDbC: 32.0,
            oaWbC: 25.0,
            roomDbC: 24.0,
            roomRhPct: 50.0,
            waterTempC: 20,
            location: 'Bangkok',
            safetyFactorPct: 10
        },
        US_IP: {
            unitSystem: 'IP',
            electricalStd: 'IEC',
            voltage3P: 380,
            voltage1P: 220,
            frequency: 60,
            elecAmbientTemp: 30,
            oaDbC: 35.0,
            oaWbC: 26.0,
            roomDbC: 24.0,
            roomRhPct: 50.0,
            waterTempC: 10,
            location: 'Bangkok',
            safetyFactorPct: 15
        }
    };

    const GLOBAL_FIELD_IDS = [
        'projectName', 'projectCode', 'clientName', 'location',
        'engineerName', 'reviewerName', 'revision', 'unitSystem',
        'electricalStd', 'voltage3P', 'voltage1P', 'frequency',
        'elecAmbientTemp', 'oaDbC', 'oaWbC', 'waterTempC',
        'roomDbC', 'roomRhPct', 'elevationM', 'safetyFactorPct'
    ];

    const NUMERIC_FIELDS = [
        'voltage3P', 'voltage1P', 'frequency', 'elecAmbientTemp',
        'oaDbC', 'oaWbC', 'waterTempC', 'roomDbC', 'roomRhPct',
        'elevationM', 'safetyFactorPct'
    ];

    let settings = JSON.parse(JSON.stringify(defaultSettings));
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.global) Object.assign(settings.global, parsed.global);
            if (parsed.local) Object.assign(settings.local, parsed.local);
        }
    } catch (e) { }

    let currentOverrideFilter = 'all';

    function save() {
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch (e) { }
    }

    window.MagicSettings = {
        getGlobal() {
            return Object.assign({}, settings.global);
        },

        getLocal(moduleId) {
            return settings.local[moduleId] || { mode: 'inherit' };
        },

        getEffective(moduleId) {
            const g = settings.global;
            const loc = settings.local[moduleId];
            if (!loc || loc.mode !== 'custom') {
                return Object.assign({}, g, { isOverridden: false });
            }
            return Object.assign({}, g, {
                unitSystem: loc.unitSystem || g.unitSystem,
                electricalStd: loc.electricalStd || g.electricalStd,
                elecAmbientTemp: loc.elecAmbientTemp !== undefined ? loc.elecAmbientTemp : g.elecAmbientTemp,
                voltage3P: loc.voltage3P !== undefined ? loc.voltage3P : g.voltage3P,
                waterTempC: loc.waterTempC !== undefined ? loc.waterTempC : g.waterTempC,
                oaDbC: loc.oaDbC !== undefined ? loc.oaDbC : g.oaDbC,
                location: loc.location || g.location,
                safetyFactorPct: loc.safetyFactorPct !== undefined ? loc.safetyFactorPct : g.safetyFactorPct,
                note: loc.note || '',
                isOverridden: true
            });
        },

        updateGlobal(newGlobal, applyToModules = true) {
            Object.assign(settings.global, newGlobal);
            save();
            this.renderGlobalHeaderBadges();
            if (applyToModules) {
                this.propagateSettings();
            }
        },

        setLocalOverride(moduleId, overrideObj) {
            settings.local[moduleId] = Object.assign({ mode: 'custom' }, overrideObj);
            save();
            this.applyModuleSettings(moduleId);
            this.updateLocalSettingsUI(moduleId);
            this.renderGlobalHeaderBadges();
            this.renderOverridesMatrix();
        },

        resetLocalToGlobal(moduleId) {
            delete settings.local[moduleId];
            save();
            this.applyModuleSettings(moduleId);
            this.updateLocalSettingsUI(moduleId);
            this.renderGlobalHeaderBadges();
            this.renderOverridesMatrix();
        },

        resetAllLocalOverrides() {
            const overriddenIds = Object.keys(settings.local);
            settings.local = {};
            save();
            overriddenIds.forEach(mId => {
                this.applyModuleSettings(mId);
                this.updateLocalSettingsUI(mId);
            });
            this.renderGlobalHeaderBadges();
            this.renderOverridesMatrix();
            this.showToast('All 20 modules reset to inherit Global Settings');
        },

        resetFactoryDefaults() {
            settings = JSON.parse(JSON.stringify(defaultSettings));
            save();
            this.loadGlobalPageUI();
            this.renderGlobalHeaderBadges();
            this.propagateSettings();
            this.showToast('Restored Factory Default Settings');
        },

        exportSettings() {
            return JSON.parse(JSON.stringify(settings));
        },

        importSettings(data) {
            if (!data || typeof data !== 'object') return;
            if (data.global) Object.assign(settings.global, data.global);
            if (data.local) settings.local = Object.assign({}, data.local);
            save();
            this.renderGlobalHeaderBadges();
            this.propagateSettings();
            this.loadGlobalPageUI();
        },

        propagateSettings() {
            const allModules = [
                'analyzerPage', 'loadAnalyzerPage', 'multiStagePage', 'ductSizerPage',
                'pipeSizerPage', 'ctPage', 'roiPage', 'fuelTankPage', 'eqListPage',
                'wiringPage', 'transformerPage', 'motorSizerPage', 'shortCircuitPage',
                'starterSimulatorPage', 'waterDemandPage', 'stormPage', 'pondPage',
                'sprinklerPage', 'warehouseSprinklerPage', 'fireWaterPage'
            ];
            allModules.forEach(mId => {
                this.applyModuleSettings(mId);
                this.updateLocalSettingsUI(mId);
            });
            if (typeof refreshActiveCharts === 'function') refreshActiveCharts();
        },

        applyModuleSettings(moduleId) {
            const eff = this.getEffective(moduleId);
            const sys = eff.unitSystem; // 'SI' | 'IP'

            if (moduleId === 'analyzerPage') {
                const t1El = document.getElementById('t1');
                const t2El = document.getElementById('t2');
                if (t1El && eff.oaDbC !== undefined) t1El.value = String(eff.oaDbC);
                if (t2El && eff.roomDbC !== undefined) t2El.value = String(eff.roomDbC);
                if (typeof updateAll === 'function') updateAll();
            } else if (moduleId === 'loadAnalyzerPage') {
                const lt1El = document.getElementById('load_t1');
                const lt2El = document.getElementById('load_t2');
                if (lt1El && eff.oaDbC !== undefined) lt1El.value = String(eff.oaDbC);
                if (lt2El && eff.roomDbC !== undefined) lt2El.value = String(eff.roomDbC);
                if (typeof updateLoadAnalyzer === 'function') updateLoadAnalyzer();
            } else if (moduleId === 'ductSizerPage' && typeof setDuctSystem === 'function') {
                setDuctSystem(sys);
            } else if (moduleId === 'pipeSizerPage' && typeof setPipeSystem === 'function') {
                setPipeSystem(sys);
                const tEl = document.getElementById('pipe_temp');
                if (tEl && [10, 20, 60].includes(Number(eff.waterTempC))) {
                    tEl.value = String(eff.waterTempC);
                    if (typeof updatePipeSizer === 'function') updatePipeSizer();
                }
            } else if (moduleId === 'ctPage' && typeof setCtSystem === 'function') {
                setCtSystem(sys);
            } else if (moduleId === 'wiringPage') {
                const stdEl = document.getElementById('wire_std');
                const ambEl = document.getElementById('wire_temp_amb');
                const voltEl = document.getElementById('wire_volt');
                if (stdEl) stdEl.value = eff.electricalStd;
                if (ambEl) ambEl.value = String(eff.elecAmbientTemp);
                if (voltEl) voltEl.value = String(eff.voltage3P);
                if (typeof populateWiringTable === 'function') populateWiringTable();
                if (typeof calcWiring === 'function') calcWiring();
            } else if (moduleId === 'transformerPage') {
                const vEl = document.getElementById('trans_volt');
                if (vEl) vEl.value = String(eff.voltage3P);
                if (typeof calcTransformer === 'function') calcTransformer();
            } else if (moduleId === 'motorSizerPage') {
                const vEl = document.getElementById('motor_volt');
                if (vEl && [400, 380, 230].includes(Number(eff.voltage3P))) vEl.value = String(eff.voltage3P);
                if (typeof calcMotor === 'function') calcMotor();
            } else if (moduleId === 'shortCircuitPage') {
                const vEl = document.getElementById('sc_volt');
                if (vEl) vEl.value = String(eff.voltage3P);
                if (typeof calcSC === 'function') calcSC();
            } else if (moduleId === 'starterSimulatorPage') {
                const vEl = document.getElementById('sim_motor_v');
                if (vEl) vEl.value = String(eff.voltage3P);
                if (typeof calcStarter === 'function') calcStarter();
            } else if (moduleId === 'stormPage') {
                const provEl = document.getElementById('storm_province');
                if (provEl && eff.location) {
                    provEl.value = eff.location;
                    if (typeof applyProvData === 'function') applyProvData(eff.location, 'storm');
                }
            } else if (moduleId === 'pondPage') {
                const provEl = document.getElementById('pond_province');
                if (provEl && eff.location) {
                    provEl.value = eff.location;
                    if (typeof applyProvData === 'function') applyProvData(eff.location, 'pond');
                }
            }
        },

        renderGlobalHeaderBadges() {
            const g = settings.global;
            const prjEl = document.getElementById('landing_project_title');
            const metaEl = document.getElementById('landing_project_meta');
            const unitBadge = document.getElementById('landing_unit_badge');
            const stdBadge = document.getElementById('landing_std_badge');
            if (prjEl) prjEl.innerText = `${g.projectName} (${g.projectCode})`;
            if (metaEl) metaEl.innerText = `${g.location} • Eng: ${g.engineerName} • ${g.revision}`;
            if (unitBadge) unitBadge.innerText = g.unitSystem === 'IP' ? 'IP (Imperial)' : 'SI (Metric)';
            if (stdBadge) {
                const stdTitle = g.electricalStd === 'IEC' ? 'IEC 60364-5-52 (Ref 30°C)' : 'EIT 2001-64 (Ref 40°C)';
                stdBadge.className = 'std-hover-wrap';
                stdBadge.innerHTML = `
                    <span class="std-icon-trigger" aria-label="Active Global Standards">ⓘ</span>
                    <span class="std-hover-card std-hover-card--bottom std-hover-card--right">
                        <span class="block text-[9px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">Active Global Standards</span>
                        <span class="block text-xs font-extrabold text-white mb-1">${stdTitle} • ${g.voltage3P}V / ${g.frequency}Hz</span>
                        <span class="block text-[11px] text-slate-300">Mechanical: ASHRAE Fundamentals • Plumbing: ASPE/IPC • Fire: NFPA 13/14/20/22</span>
                        <span class="block mt-1 font-mono text-[10px] text-emerald-300">Ambient: ${g.elecAmbientTemp}°C | OA: ${g.oaDbC}°C DB / ${g.oaWbC}°C WB</span>
                    </span>
                `;
            }

            // Update Full-Page Live Summary Strip if present
            const sumUnit = document.getElementById('gsp_summary_unit');
            const sumStd = document.getElementById('gsp_summary_std');
            const sumClimate = document.getElementById('gsp_summary_climate');
            if (sumUnit) sumUnit.innerText = g.unitSystem === 'IP' ? 'IP (Imperial — CFM, in, TR, GPM)' : 'SI (Metric — L/s, mm, kW, m³/h)';
            if (sumStd) sumStd.innerText = `${g.electricalStd === 'IEC' ? 'IEC 60364 (30°C)' : 'EIT 2001-64 (40°C)'} • ${g.voltage3P}V 3P / ${g.frequency}Hz @ ${g.elecAmbientTemp}°C`;
            if (sumClimate) sumClimate.innerText = `${g.location} • OA ${g.oaDbC}°C DB / ${g.oaWbC}°C WB • Water ${g.waterTempC}°C`;
        },

        populateGlobalLocationOptions() {
            const locEl = document.getElementById('gs_location');
            if (!locEl || locEl.tagName !== 'SELECT') return;
            if (locEl.options.length > 5) return;
            const provList = (window.MagicDB && Array.isArray(window.MagicDB.thailandProvinces))
                ? window.MagicDB.thailandProvinces.map(p => p.name).sort()
                : ['Bangkok', 'Chiang Mai', 'Phuket', 'Chon Buri', 'Rayong', 'Khon Kaen', 'Nakhon Ratchasima', 'Songkhla'];
            locEl.innerHTML = provList.map(p => `<option value="${p}">${p}</option>`).join('');
        },

        onGlobalProvinceChange(provName) {
            const provList = (window.MagicDB && Array.isArray(window.MagicDB.thailandProvinces))
                ? window.MagicDB.thailandProvinces
                : [];
            const prov = provList.find(p => p.name === provName);
            if (!prov) return;

            const oaDbEl = document.getElementById('gs_oaDbC');
            const oaWbEl = document.getElementById('gs_oaWbC');
            const elevEl = document.getElementById('gs_elevationM');
            const idfBadge = document.getElementById('gsp_prov_idf_badge');

            if (oaDbEl && prov.oaDbC !== undefined) oaDbEl.value = String(prov.oaDbC);
            if (oaWbEl && prov.oaWbC !== undefined) oaWbEl.value = String(prov.oaWbC);
            if (elevEl && prov.elevationM !== undefined) elevEl.value = String(prov.elevationM);
            if (idfBadge) {
                idfBadge.innerText = `${prov.name}: ${prov.oaDbC}°C DB / ${prov.oaWbC}°C WB • Elev ${prov.elevationM}m • Rain I₅=${prov.intensity} mm/h (C=${prov.C})`;
            }
            this.showToast(`📍 Loaded ${prov.name} Climate & Rainfall Data (${prov.oaDbC}°C DB / ${prov.oaWbC}°C WB, I=${prov.intensity} mm/h)`);
        },

        setGlobalUnitVisual(sys) {
            const unitEl = document.getElementById('gs_unitSystem');
            if (unitEl) unitEl.value = sys;
            const btnSI = document.getElementById('gsp_unit_card_SI');
            const btnIP = document.getElementById('gsp_unit_card_IP');
            if (btnSI && btnIP) {
                if (sys === 'IP') {
                    btnIP.className = "p-3.5 rounded-xl border-2 border-blue-600 bg-blue-500/10 text-left transition cursor-pointer";
                    btnSI.className = "p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-blue-400 text-left transition cursor-pointer";
                } else {
                    btnSI.className = "p-3.5 rounded-xl border-2 border-blue-600 bg-blue-500/10 text-left transition cursor-pointer";
                    btnIP.className = "p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-blue-400 text-left transition cursor-pointer";
                }
            }
        },

        setGlobalElecStdVisual(std) {
            const stdEl = document.getElementById('gs_electricalStd');
            if (stdEl) stdEl.value = std;
            const btnEIT = document.getElementById('gsp_std_card_EIT');
            const btnIEC = document.getElementById('gsp_std_card_IEC');
            if (btnEIT && btnIEC) {
                if (std === 'IEC') {
                    btnIEC.className = "p-3.5 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-left transition cursor-pointer";
                    btnEIT.className = "p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-amber-400 text-left transition cursor-pointer";
                } else {
                    btnEIT.className = "p-3.5 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-left transition cursor-pointer";
                    btnIEC.className = "p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/70 hover:border-amber-400 text-left transition cursor-pointer";
                }
            }
        },

        applyRegionalPreset(presetKey, activeBtnKey) {
            const preset = REGIONAL_PRESETS[presetKey];
            if (!preset) return;
            Object.keys(preset).forEach(k => {
                const el = document.getElementById(`gs_${k}`);
                if (el) el.value = String(preset[k]);
            });
            this.setGlobalUnitVisual(preset.unitSystem);
            this.setGlobalElecStdVisual(preset.electricalStd);

            ['TH_EIT', 'INTL_IEC', 'US_IP'].forEach(k => {
                const btn = document.getElementById(`gsp_preset_${k}`);
                if (btn) {
                    if (k === (activeBtnKey || presetKey)) {
                        btn.className = "p-3.5 rounded-xl border-2 border-blue-600 bg-blue-600/10 dark:bg-blue-500/15 text-left transition cursor-pointer shadow-xs";
                    } else {
                        btn.className = "p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:border-blue-500/50 text-left transition cursor-pointer";
                    }
                }
            });
            this.showToast(`Loaded ${presetKey === 'TH_EIT' ? 'Thailand EIT' : presetKey === 'INTL_IEC' ? 'International IEC' : 'US Imperial'} Preset — Click Save to Apply`);
        },

        filterOverridesMatrix(discipline) {
            currentOverrideFilter = discipline || 'all';
            ['all', 'mechanical', 'electrical', 'plumbing', 'fire'].forEach(d => {
                const btn = document.getElementById(`gsp_filter_${d}`);
                if (btn) {
                    if (d === currentOverrideFilter) {
                        btn.className = "px-3 py-1.5 rounded-lg text-xs font-extrabold bg-blue-600 text-white shadow-xs transition cursor-pointer";
                    } else {
                        btn.className = "px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer";
                    }
                }
            });
            this.renderOverridesMatrix();
        },

        toggleModuleModeFromMatrix(moduleId) {
            const eff = this.getEffective(moduleId);
            const mod = window.MagicRegistry && typeof window.MagicRegistry.getById === 'function' ? window.MagicRegistry.getById(moduleId) : null;
            const label = (mod && (mod.title || mod.name)) || moduleId;
            if (eff.isOverridden) {
                this.resetLocalToGlobal(moduleId);
                this.showToast(`${label} reset to Inherit Global`);
            } else {
                this.setLocalOverride(moduleId, {
                    unitSystem: eff.unitSystem,
                    electricalStd: eff.electricalStd,
                    voltage3P: eff.voltage3P,
                    elecAmbientTemp: eff.elecAmbientTemp,
                    waterTempC: eff.waterTempC,
                    oaDbC: eff.oaDbC,
                    location: eff.location,
                    safetyFactorPct: eff.safetyFactorPct,
                    note: 'Custom module override'
                });
                this.showToast(`${label} switched to Custom Local Override`);
            }
        },

        quickChangeModuleUnit(moduleId, newUnit) {
            const eff = this.getEffective(moduleId);
            const mod = window.MagicRegistry && typeof window.MagicRegistry.getById === 'function' ? window.MagicRegistry.getById(moduleId) : null;
            const label = (mod && (mod.title || mod.name)) || moduleId;
            this.setLocalOverride(moduleId, {
                unitSystem: newUnit,
                electricalStd: eff.electricalStd,
                voltage3P: eff.voltage3P,
                elecAmbientTemp: eff.elecAmbientTemp,
                waterTempC: eff.waterTempC,
                oaDbC: eff.oaDbC,
                location: eff.location,
                safetyFactorPct: eff.safetyFactorPct,
                note: eff.note || `Override to ${newUnit}`
            });
            this.showToast(`Updated ${label} unit system to ${newUnit}`);
        },

        renderOverridesMatrix() {
            const container = document.getElementById('gs_overrides_matrix_body');
            const countBadge = document.getElementById('gs_overrides_count_badge');
            const mods = (window.MagicRegistry && (typeof window.MagicRegistry.getAll === 'function' ? window.MagicRegistry.getAll() : window.MagicRegistry.modules)) || [];
            const activeOverrides = Object.keys(settings.local).filter(k => settings.local[k] && settings.local[k].mode === 'custom');
            if (countBadge) {
                countBadge.innerText = `${activeOverrides.length} Custom / ${mods.length} Total`;
                countBadge.className = activeOverrides.length > 0
                    ? "px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                    : "px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
            }
            if (!container) return;

            const filteredMods = currentOverrideFilter === 'all'
                ? mods
                : mods.filter(m => m.discipline === currentOverrideFilter);

            const discBadges = {
                mechanical: '⚙️ Mechanical',
                electrical: '⚡ Electrical',
                plumbing: '💧 Plumbing',
                fire: '🔥 Fire'
            };

            container.innerHTML = filteredMods.map(mod => {
                const modTitle = mod.title || mod.name || mod.id;
                const eff = this.getEffective(mod.id);
                const isCustom = eff.isOverridden;
                let summary = `Units: ${eff.unitSystem}`;
                if (mod.discipline === 'electrical') {
                    summary += ` • ${eff.electricalStd} • ${eff.voltage3P}V @ ${eff.elecAmbientTemp}°C`;
                } else if (mod.discipline === 'mechanical') {
                    summary += ` • Fluid ${eff.waterTempC}°C • OA ${eff.oaDbC}°C`;
                } else if (mod.discipline === 'plumbing') {
                    summary += ` • Province: ${eff.location}`;
                } else if (mod.discipline === 'fire') {
                    summary += ` • Safety Margin: +${eff.safetyFactorPct}%`;
                }
                return `
                    <div class="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border transition ${isCustom ? 'bg-amber-500/5 border-amber-500/35' : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/80'}">
                        <div class="min-w-0 flex-1">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-slate-300">${discBadges[mod.discipline] || mod.discipline}</span>
                                <button type="button" onclick="switchView('${mod.id}')" class="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline cursor-pointer text-left">${modTitle}</button>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${isCustom ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'}">
                                    ${isCustom ? '⚡ Custom Override' : '🔗 Inherit Global'}
                                </span>
                            </div>
                            <div class="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">${summary}${eff.note ? ` • "${eff.note}"` : ''}</div>
                        </div>
                        <div class="flex flex-wrap items-center gap-2">
                            <div class="inline-flex rounded-lg p-0.5 bg-slate-200/80 dark:bg-slate-700 border border-slate-300/60 dark:border-slate-600">
                                <button type="button" onclick="window.MagicSettings.quickChangeModuleUnit('${mod.id}', 'SI')" class="px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${eff.unitSystem === 'SI' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}">SI</button>
                                <button type="button" onclick="window.MagicSettings.quickChangeModuleUnit('${mod.id}', 'IP')" class="px-2 py-1 rounded-md text-[10px] font-bold transition cursor-pointer ${eff.unitSystem === 'IP' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300'}">IP</button>
                            </div>
                            ${isCustom
                                ? `<button type="button" onclick="window.MagicSettings.resetLocalToGlobal('${mod.id}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/25 transition cursor-pointer">Reset to Global</button>`
                                : `<button type="button" onclick="window.MagicSettings.toggleModuleModeFromMatrix('${mod.id}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-200/70 hover:bg-amber-500/15 dark:bg-slate-700 dark:hover:bg-amber-500/20 text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 transition cursor-pointer">Lock Custom</button>`
                            }
                            <button type="button" onclick="switchView('${mod.id}')" class="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition cursor-pointer">Open →</button>
                        </div>
                    </div>
                `;
            }).join('');
        },

        loadGlobalPageUI() {
            this.populateGlobalLocationOptions();
            const g = settings.global;
            GLOBAL_FIELD_IDS.forEach(f => {
                const el = document.getElementById(`gs_${f}`);
                if (el && g[f] !== undefined) el.value = g[f];
            });
            const idfBadge = document.getElementById('gsp_prov_idf_badge');
            if (idfBadge && window.MagicDB && Array.isArray(window.MagicDB.thailandProvinces)) {
                const prov = window.MagicDB.thailandProvinces.find(p => p.name === g.location);
                if (prov) {
                    idfBadge.innerText = `${prov.name}: ${prov.oaDbC}°C DB / ${prov.oaWbC}°C WB • Elev ${prov.elevationM}m • Rain I₅=${prov.intensity} mm/h (C=${prov.C})`;
                }
            }
            this.setGlobalUnitVisual(g.unitSystem);
            this.setGlobalElecStdVisual(g.electricalStd);
            this.renderGlobalHeaderBadges();
            this.renderOverridesMatrix();
        },

        openGlobalPage(sectionId) {
            if (typeof switchView === 'function') {
                switchView('globalSettingsPage');
            }
            this.loadGlobalPageUI();
            if (sectionId) {
                setTimeout(() => {
                    const sec = document.getElementById(sectionId);
                    if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 60);
            }
        },

        // Backward-compatible alias so all existing openGlobalModal() calls open the full-page settings view
        openGlobalModal(initialTab) {
            const sectionMap = {
                project: 'gsp_sec_project',
                standards: 'gsp_sec_standards',
                climate: 'gsp_sec_climate',
                overrides: 'gsp_sec_overrides'
            };
            this.openGlobalPage(sectionMap[initialTab] || null);
        },

        saveFromGlobalModal(returnToMenu = false) {
            const updates = {};
            GLOBAL_FIELD_IDS.forEach(f => {
                const el = document.getElementById(`gs_${f}`);
                if (el) {
                    updates[f] = NUMERIC_FIELDS.includes(f) ? (parseFloat(el.value) || 0) : el.value;
                }
            });
            this.updateGlobal(updates, true);
            this.loadGlobalPageUI();
            this.showToast('✅ Global Settings Saved & Propagated Across All 20 Modules');
            if (returnToMenu && typeof switchView === 'function') {
                switchView('mainMenuPage');
            }
        },

        showToast(message) {
            let toast = document.getElementById('magic_settings_toast');
            if (!toast) {
                toast = document.createElement('div');
                toast.id = 'magic_settings_toast';
                toast.className = 'fixed bottom-5 right-5 z-[120] px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold shadow-xl border border-emerald-400/30 transition-all duration-300 opacity-0 pointer-events-none';
                document.body.appendChild(toast);
            }
            toast.innerText = message;
            toast.classList.remove('opacity-0');
            toast.classList.add('opacity-100');
            clearTimeout(this._toastTimer);
            this._toastTimer = setTimeout(() => {
                toast.classList.remove('opacity-100');
                toast.classList.add('opacity-0');
            }, 2600);
        },

        toggleLocalPanel(moduleId) {
            const panel = document.getElementById(`local_settings_panel_${moduleId}`);
            if (!panel) return;
            const willOpen = panel.classList.contains('hidden');
            document.querySelectorAll('[id^="local_settings_panel_"]').forEach(el => {
                if (el.id !== `local_settings_panel_${moduleId}`) el.classList.add('hidden');
            });
            panel.classList.toggle('hidden', !willOpen);
            if (willOpen) {
                this.updateLocalSettingsUI(moduleId);
            }
        },

        updateLocalSettingsUI(moduleId) {
            const loc = this.getLocal(moduleId);
            const eff = this.getEffective(moduleId);
            const badge = document.getElementById(`local_badge_${moduleId}`);
            if (badge) {
                if (eff.isOverridden) {
                    badge.innerText = `⚡ Local Override (${eff.unitSystem})`;
                    badge.title = `Custom Local Override Active`;
                    badge.className = "px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30";
                } else {
                    badge.innerText = `🔗 Global (${eff.unitSystem})`;
                    badge.title = `Inherited from Global Settings (${eff.unitSystem})`;
                    badge.className = "px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                }
            }

            const inheritBtn = document.getElementById(`loc_mode_inherit_${moduleId}`);
            const customBtn = document.getElementById(`loc_mode_custom_${moduleId}`);
            const statusHint = document.getElementById(`loc_status_hint_${moduleId}`);
            if (inheritBtn && customBtn) {
                if (eff.isOverridden) {
                    inheritBtn.className = "px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white";
                    customBtn.className = "px-2.5 py-1 rounded-md text-[10px] font-extrabold transition cursor-pointer bg-amber-500 text-white shadow-xs";
                } else {
                    inheritBtn.className = "px-2.5 py-1 rounded-md text-[10px] font-extrabold transition cursor-pointer bg-emerald-600 text-white shadow-xs";
                    customBtn.className = "px-2.5 py-1 rounded-md text-[10px] font-bold transition cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white";
                }
            }
            if (statusHint) {
                statusHint.innerText = eff.isOverridden
                    ? '⚡ Custom Override Active — isolated from Global Settings changes.'
                    : '🔗 Synced with Global Settings — edit any field below and click Apply to override.';
            }

            const unitSel = document.getElementById(`loc_unit_${moduleId}`);
            const stdSel = document.getElementById(`loc_std_${moduleId}`);
            const voltSel = document.getElementById(`loc_volt_${moduleId}`);
            const ambSel = document.getElementById(`loc_amb_${moduleId}`);
            const waterSel = document.getElementById(`loc_water_${moduleId}`);
            const oadbIn = document.getElementById(`loc_oadb_${moduleId}`);
            const locSel = document.getElementById(`loc_loc_${moduleId}`);
            const marginIn = document.getElementById(`loc_margin_${moduleId}`);
            const noteIn = document.getElementById(`loc_note_${moduleId}`);

            if (unitSel) unitSel.value = loc.unitSystem || eff.unitSystem;
            if (stdSel) stdSel.value = loc.electricalStd || eff.electricalStd;
            if (voltSel) voltSel.value = String(loc.voltage3P !== undefined ? loc.voltage3P : eff.voltage3P);
            if (ambSel) ambSel.value = String(loc.elecAmbientTemp !== undefined ? loc.elecAmbientTemp : eff.elecAmbientTemp);
            if (waterSel) waterSel.value = String(loc.waterTempC !== undefined ? loc.waterTempC : eff.waterTempC);
            if (oadbIn) oadbIn.value = String(loc.oaDbC !== undefined ? loc.oaDbC : eff.oaDbC);
            if (locSel) locSel.value = loc.location || eff.location;
            if (marginIn) marginIn.value = String(loc.safetyFactorPct !== undefined ? loc.safetyFactorPct : eff.safetyFactorPct);
            if (noteIn) noteIn.value = loc.note || '';
        },

        applyLocalFromPanel(moduleId) {
            const eff = this.getEffective(moduleId);
            const unitSel = document.getElementById(`loc_unit_${moduleId}`);
            const stdSel = document.getElementById(`loc_std_${moduleId}`);
            const voltSel = document.getElementById(`loc_volt_${moduleId}`);
            const ambSel = document.getElementById(`loc_amb_${moduleId}`);
            const waterSel = document.getElementById(`loc_water_${moduleId}`);
            const oadbIn = document.getElementById(`loc_oadb_${moduleId}`);
            const locSel = document.getElementById(`loc_loc_${moduleId}`);
            const marginIn = document.getElementById(`loc_margin_${moduleId}`);
            const noteIn = document.getElementById(`loc_note_${moduleId}`);

            const overridePayload = {
                unitSystem: unitSel ? unitSel.value : eff.unitSystem,
                note: noteIn ? noteIn.value : ''
            };
            if (stdSel) overridePayload.electricalStd = stdSel.value;
            if (voltSel) overridePayload.voltage3P = parseInt(voltSel.value, 10) || eff.voltage3P;
            if (ambSel) overridePayload.elecAmbientTemp = parseInt(ambSel.value, 10) || eff.elecAmbientTemp;
            if (waterSel) overridePayload.waterTempC = parseFloat(waterSel.value) || eff.waterTempC;
            if (oadbIn) overridePayload.oaDbC = parseFloat(oadbIn.value) || eff.oaDbC;
            if (locSel) overridePayload.location = locSel.value;
            if (marginIn) overridePayload.safetyFactorPct = parseFloat(marginIn.value) || 0;

            this.setLocalOverride(moduleId, overridePayload);
            this.showToast(`Applied Local Override for ${moduleId}`);
        }
    };

    document.addEventListener('click', function (e) {
        if (e.target.closest('[id^="local_settings_panel_"]') || e.target.closest('[onclick*="toggleLocalPanel"]')) {
            return;
        }
        document.querySelectorAll('[id^="local_settings_panel_"]:not(.hidden)').forEach(el => {
            el.classList.add('hidden');
        });
    });
})();
