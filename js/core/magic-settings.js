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
            elecAmbientTemp: 40,
            oaDbC: 35.0,
            oaWbC: 28.0,
            waterTempC: 20,
            location: 'Bangkok'
        },
        INTL_IEC: {
            unitSystem: 'SI',
            electricalStd: 'IEC',
            voltage3P: 400,
            elecAmbientTemp: 30,
            oaDbC: 32.0,
            oaWbC: 25.0,
            waterTempC: 20,
            location: 'Bangkok'
        },
        US_IP: {
            unitSystem: 'IP',
            electricalStd: 'IEC',
            voltage3P: 380,
            elecAmbientTemp: 30,
            oaDbC: 35.0,
            oaWbC: 26.0,
            waterTempC: 10,
            location: 'Bangkok'
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
            allModules.forEach(mId => {
                this.applyModuleSettings(mId);
                this.updateLocalSettingsUI(mId);
            });
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

        populateGlobalLocationOptions() {
            const locEl = document.getElementById('gs_location');
            if (!locEl || locEl.tagName !== 'SELECT') return;
            if (locEl.options.length > 5) return;
            const provs = (window.MagicDB && window.MagicDB.provinces)
                ? Object.keys(window.MagicDB.provinces).sort()
                : ['Bangkok', 'Chiang Mai', 'Phuket', 'Chonburi', 'Rayong', 'Khon Kaen', 'Nakhon Ratchasima', 'Songkhla'];
            locEl.innerHTML = provs.map(p => `<option value="${p}">${p}</option>`).join('');
        },

        switchGlobalTab(tabId) {
            const tabs = ['project', 'standards', 'climate', 'overrides'];
            tabs.forEach(t => {
                const panel = document.getElementById(`gs_tab_${t}`);
                const btn = document.getElementById(`gs_tab_btn_${t}`);
                if (panel) panel.classList.toggle('hidden', t !== tabId);
                if (btn) {
                    if (t === tabId) {
                        btn.className = "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-extrabold bg-blue-600 text-white shadow-sm transition cursor-pointer";
                    } else {
                        btn.className = "w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/60 transition cursor-pointer";
                    }
                }
            });
            if (tabId === 'overrides') {
                this.renderOverridesMatrix();
            }
        },

        applyRegionalPreset(presetKey) {
            const preset = REGIONAL_PRESETS[presetKey];
            if (!preset) return;
            Object.keys(preset).forEach(k => {
                const el = document.getElementById(`gs_${k}`);
                if (el) el.value = String(preset[k]);
            });
        },

        renderOverridesMatrix() {
            const container = document.getElementById('gs_overrides_matrix_body');
            const countBadge = document.getElementById('gs_overrides_count_badge');
            const mods = (window.MagicRegistry && window.MagicRegistry.modules) || [];
            const activeOverrides = Object.keys(settings.local).filter(k => settings.local[k] && settings.local[k].mode === 'custom');
            if (countBadge) {
                countBadge.innerText = String(activeOverrides.length);
                countBadge.className = activeOverrides.length > 0
                    ? "px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-white"
                    : "px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300";
            }
            if (!container) return;

            const g = settings.global;
            container.innerHTML = mods.map(mod => {
                const eff = this.getEffective(mod.id);
                const isCustom = eff.isOverridden;
                let summary = `Units: ${eff.unitSystem}`;
                if (mod.discipline === 'electrical') {
                    summary += ` • ${eff.electricalStd} • ${eff.voltage3P}V @ ${eff.elecAmbientTemp}°C`;
                } else if (mod.discipline === 'mechanical') {
                    summary += ` • Water ${eff.waterTempC}°C • OA ${eff.oaDbC}°C`;
                } else if (mod.discipline === 'plumbing') {
                    summary += ` • Prov: ${eff.location}`;
                } else if (mod.discipline === 'fire') {
                    summary += ` • Margin: +${eff.safetyFactorPct}%`;
                }
                return `
                    <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border ${isCustom ? 'bg-amber-500/5 border-amber-500/30' : 'bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700/70'}">
                        <div class="min-w-0">
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-xs text-slate-800 dark:text-slate-100">${mod.name}</span>
                                <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${isCustom ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}">
                                    ${isCustom ? '⚡ Custom Override' : '🔗 Inherited Global'}
                                </span>
                            </div>
                            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">${summary}${eff.note ? ` • "${eff.note}"` : ''}</div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            ${isCustom ? `<button type="button" onclick="window.MagicSettings.resetLocalToGlobal('${mod.id}')" class="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 transition cursor-pointer">Reset to Global</button>` : `<span class="text-[10px] text-slate-400">Synced (${g.unitSystem})</span>`}
                        </div>
                    </div>
                `;
            }).join('');
        },

        openGlobalModal(initialTab = 'project') {
            this.populateGlobalLocationOptions();
            const g = settings.global;
            const modal = document.getElementById('globalSettingsModal');
            if (!modal) return;
            const fields = [
                'projectName', 'projectCode', 'clientName', 'location',
                'engineerName', 'reviewerName', 'revision', 'unitSystem',
                'electricalStd', 'voltage3P', 'elecAmbientTemp', 'oaDbC', 'oaWbC', 'waterTempC',
                'roomDbC', 'roomRhPct', 'elevationM', 'safetyFactorPct'
            ];
            fields.forEach(f => {
                const el = document.getElementById(`gs_${f}`);
                if (el && g[f] !== undefined) el.value = g[f];
            });
            this.renderOverridesMatrix();
            this.switchGlobalTab(initialTab);
            modal.classList.remove('hidden');
        },

        saveFromGlobalModal() {
            const fields = [
                'projectName', 'projectCode', 'clientName', 'location',
                'engineerName', 'reviewerName', 'revision', 'unitSystem',
                'electricalStd', 'voltage3P', 'elecAmbientTemp', 'oaDbC', 'oaWbC', 'waterTempC',
                'roomDbC', 'roomRhPct', 'elevationM', 'safetyFactorPct'
            ];
            const numFields = [
                'voltage3P', 'elecAmbientTemp', 'oaDbC', 'oaWbC', 'waterTempC',
                'roomDbC', 'roomRhPct', 'elevationM', 'safetyFactorPct'
            ];
            const updates = {};
            fields.forEach(f => {
                const el = document.getElementById(`gs_${f}`);
                if (el) {
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
