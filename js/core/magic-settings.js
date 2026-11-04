// ============================================================================
// M.A.G.I.C. Global & Local Settings Manager
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
            safetyFactorPct: 25
        },
        local: {
            // Per-module overrides keyed by moduleId:
            // { mode: 'inherit' | 'custom', unitSystem: 'SI'|'IP', standard: 'EIT'|'IEC', ambientTemp: 40, safetyMargin: 15, note: '' }
        }
    };

    let settings = JSON.parse(JSON.stringify(defaultSettings));
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.global) Object.assign(settings.global, parsed.global);
            if (parsed.local) Object.assign(settings.local, parsed.local);
        }
    } catch (e) { }

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
                voltage3P: loc.voltage3P || g.voltage3P,
                location: loc.location || g.location,
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
        },

        resetLocalToGlobal(moduleId) {
            delete settings.local[moduleId];
            save();
            this.applyModuleSettings(moduleId);
            this.updateLocalSettingsUI(moduleId);
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
        },

        propagateSettings() {
            const allModules = [
                'analyzerPage', 'loadAnalyzerPage', 'multiStagePage', 'ductSizerPage',
                'pipeSizerPage', 'ctPage', 'roiPage', 'fuelTankPage', 'eqListPage',
                'wiringPage', 'transformerPage', 'motorSizerPage', 'shortCircuitPage',
                'starterSimulatorPage', 'waterDemandPage', 'stormPage', 'pondPage',
                'sprinklerPage', 'warehouseSprinklerPage', 'fireWaterPage'
            ];
            allModules.forEach(mId => this.applyModuleSettings(mId));
            if (typeof refreshActiveCharts === 'function') refreshActiveCharts();
        },

        applyModuleSettings(moduleId) {
            const eff = this.getEffective(moduleId);
            const sys = eff.unitSystem; // 'SI' | 'IP'

            if (moduleId === 'ductSizerPage' && typeof setDuctSystem === 'function') {
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
        },

        openGlobalModal() {
            const g = settings.global;
            const modal = document.getElementById('globalSettingsModal');
            if (!modal) return;
            const fields = [
                'projectName', 'projectCode', 'clientName', 'location',
                'engineerName', 'reviewerName', 'revision', 'unitSystem',
                'electricalStd', 'voltage3P', 'elecAmbientTemp', 'oaDbC', 'oaWbC', 'waterTempC'
            ];
            fields.forEach(f => {
                const el = document.getElementById(`gs_${f}`);
                if (el && g[f] !== undefined) el.value = g[f];
            });
            modal.classList.remove('hidden');
        },

        saveFromGlobalModal() {
            const fields = [
                'projectName', 'projectCode', 'clientName', 'location',
                'engineerName', 'reviewerName', 'revision', 'unitSystem',
                'electricalStd', 'voltage3P', 'elecAmbientTemp', 'oaDbC', 'oaWbC', 'waterTempC'
            ];
            const updates = {};
            fields.forEach(f => {
                const el = document.getElementById(`gs_${f}`);
                if (el) {
                    const numFields = ['voltage3P', 'elecAmbientTemp', 'oaDbC', 'oaWbC', 'waterTempC'];
                    updates[f] = numFields.includes(f) ? (parseFloat(el.value) || 0) : el.value;
                }
            });
            this.updateGlobal(updates, true);
            const modal = document.getElementById('globalSettingsModal');
            if (modal) modal.classList.add('hidden');
        },

        toggleLocalPanel(moduleId) {
            const panel = document.getElementById(`local_settings_panel_${moduleId}`);
            if (!panel) return;
            panel.classList.toggle('hidden');
            this.updateLocalSettingsUI(moduleId);
        },

        updateLocalSettingsUI(moduleId) {
            const loc = this.getLocal(moduleId);
            const eff = this.getEffective(moduleId);
            const badge = document.getElementById(`local_badge_${moduleId}`);
            if (badge) {
                if (eff.isOverridden) {
                    badge.innerText = `Local Override (${eff.unitSystem})`;
                    badge.title = `Local Standard: ${eff.electricalStd} @ ${eff.elecAmbientTemp}°C`;
                    badge.className = "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30";
                } else {
                    badge.innerText = `Global (${eff.unitSystem})`;
                    badge.title = `Inherited Global Standard: ${eff.electricalStd} @ ${eff.elecAmbientTemp}°C`;
                    badge.className = "px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300";
                }
            }
            const unitSel = document.getElementById(`loc_unit_${moduleId}`);
            const stdSel = document.getElementById(`loc_std_${moduleId}`);
            const ambSel = document.getElementById(`loc_amb_${moduleId}`);
            const noteIn = document.getElementById(`loc_note_${moduleId}`);
            if (unitSel) unitSel.value = loc.unitSystem || eff.unitSystem;
            if (stdSel) stdSel.value = loc.electricalStd || eff.electricalStd;
            if (ambSel) ambSel.value = String(loc.elecAmbientTemp || eff.elecAmbientTemp);
            if (noteIn) noteIn.value = loc.note || '';
        },

        applyLocalFromPanel(moduleId) {
            const unitSel = document.getElementById(`loc_unit_${moduleId}`);
            const stdSel = document.getElementById(`loc_std_${moduleId}`);
            const ambSel = document.getElementById(`loc_amb_${moduleId}`);
            const noteIn = document.getElementById(`loc_note_${moduleId}`);
            this.setLocalOverride(moduleId, {
                unitSystem: unitSel ? unitSel.value : 'SI',
                electricalStd: stdSel ? stdSel.value : 'EIT',
                elecAmbientTemp: ambSel ? parseInt(ambSel.value) : 40,
                note: noteIn ? noteIn.value : ''
            });
        }
    };
})();
