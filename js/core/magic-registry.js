// ============================================================================
// M.A.G.I.C. Plug-in Module Registry, Landing Page Controller & Shell Injector
// File: js/core/magic-registry.js
// ============================================================================

(function () {
    const modules = [
        // Mechanical & HVAC (8)
        {
            id: 'analyzerPage',
            title: 'System Analyzer',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'ASHRAE Fundamentals 2021',
            desc: 'Forward calculation of a 4-State AHU model based on entering and leaving temperatures.',
            color: 'blue',
            canvasId: 'psyChart',
            calcFn: () => typeof updateAll === 'function' && updateAll(),
            getBadge: (s) => `Cooling: ${(s.hvacCoolingLoadKw || 0).toFixed(1)} kW (${(s.hvacCoolingLoadRt || 0).toFixed(1)} RT)`
        },
        {
            id: 'loadAnalyzerPage',
            title: 'Room Load Analyzer',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'ASHRAE Psychrometrics',
            desc: 'Reverse calculation of Supply Air required based on Room Sensible and Latent heat loads.',
            color: 'rose',
            canvasId: 'load_psyChart',
            calcFn: () => typeof updateLoadAnalyzer === 'function' && updateLoadAnalyzer(),
            getBadge: (s) => `SA: ${(s.hvacRoomSupplyLps || 0).toFixed(0)} LPS • Coil: ${(s.hvacRoomCoolingKw || 0).toFixed(1)} kW`
        },
        {
            id: 'multiStagePage',
            title: 'Multi-Stage Analyzer',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'ASHRAE Process Model',
            desc: 'Build unlimited dynamic psychrometric process states, mixing points, and sequential coils.',
            color: 'amber',
            canvasId: 'ms_psyChart',
            calcFn: () => typeof syncMsState === 'function' && syncMsState(),
            getBadge: () => `Dynamic Multi-Node Solver`
        },
        {
            id: 'ductSizerPage',
            title: 'Duct Sizer',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'Darcy-Weisbach / Haaland',
            desc: 'Optimize air distribution networks with friction and velocity sizing and log-log nomogram.',
            color: 'teal',
            canvasId: 'ductChart',
            calcFn: () => typeof updateDuctSizer === 'function' && updateDuctSizer(),
            getBadge: (s) => `${(s.ductFlowLps || 1000).toFixed(0)} LPS → ${s.ductSizeText || 'Ø450 mm'}`
        },
        {
            id: 'pipeSizerPage',
            title: 'Hydraulic Pipe Sizer',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'Darcy-Weisbach Hydronics',
            desc: 'Size chilled and hot water piping networks with temperature-corrected fluid properties.',
            color: 'cyan',
            canvasId: 'pipeChart',
            calcFn: () => typeof updatePipeSizer === 'function' && updatePipeSizer(),
            getBadge: (s) => `${(s.pipeFlowLpm || 287).toFixed(0)} LPM → ${s.pipeSizeText || 'DN65'}`
        },
        {
            id: 'ctPage',
            title: 'Cooling Tower Make-up',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'CTI / ASHRAE Equipment',
            desc: 'Quantify evaporation, drift, and blowdown losses across Cycles of Concentration (COC).',
            color: 'indigo',
            canvasId: 'ctChart',
            calcFn: () => typeof updateCoolingTower === 'function' && updateCoolingTower(),
            getBadge: (s) => `Make-up: ${(s.ctMakeupM3Day || 0).toFixed(1)} m³/day`
        },
        {
            id: 'roiPage',
            title: 'Chiller ROI Calculator',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'ASHRAE LCCA Financial',
            desc: 'Compare capital and 10-year operating lifecycle costs between chiller alternatives.',
            color: 'emerald',
            canvasId: 'roiChart',
            calcFn: () => typeof updateROI === 'function' && updateROI(),
            getBadge: (s) => `Payback: ${(s.roiPaybackYears || 0).toFixed(1)} Years`
        },
        {
            id: 'fuelTankPage',
            title: 'Generator Fuel Tank Sizer',
            discipline: 'mechanical',
            disciplineLabel: 'Mechanical & HVAC',
            standard: 'NFPA 110 Standby Power',
            desc: 'Calculate required diesel fuel storage volume based on consumption rate and autonomy hours.',
            color: 'slate',
            canvasId: null,
            calcFn: () => typeof updateFuel === 'function' && updateFuel(),
            getBadge: (s) => `Storage: ${(s.fuelTotalLiters || 0).toLocaleString()} L`
        },

        // Electrical Engineering (6)
        {
            id: 'eqListPage',
            title: 'Electrical Load Estimator',
            discipline: 'electrical',
            disciplineLabel: 'Electrical Engineering',
            standard: 'EIT 2001-64 / IEEE 141',
            desc: 'Build multi-zone MEP equipment schedules with automatic kW/kVA pivot summaries and Excel export.',
            color: 'yellow',
            canvasId: null,
            calcFn: () => typeof renderEqTables === 'function' && renderEqTables(),
            getBadge: (s) => `Connected: ${(s.elecConnectedKw || 0).toFixed(1)} kW (${(s.elecConnectedKva || 0).toFixed(1)} kVA)`
        },
        {
            id: 'wiringPage',
            title: 'Wiring & Breaker Sizer',
            discipline: 'electrical',
            disciplineLabel: 'Electrical Engineering',
            standard: 'EIT 2001-64 & IEC 60364-5-52',
            desc: 'Size breakers, copper cables, and SI/Imperial raceways (IMC, Wireway, Tray) with motor step catalog.',
            color: 'orange',
            canvasId: null,
            calcFn: () => typeof calcWiring === 'function' && calcWiring(),
            getBadge: (s) => `${(s.wiringAmps || 0).toFixed(1)} A → ${s.wiringBreakerAt || 32}A / ${s.wiringCableSize || '6 mm²'}`
        },
        {
            id: 'transformerPage',
            title: 'Transformer Sizer',
            discipline: 'electrical',
            disciplineLabel: 'Electrical Engineering',
            standard: 'MEA / PEA / EIT Standard',
            desc: 'Calculate secondary full-load current, main breaker rating, and bolted fault current (Isc).',
            color: 'blue',
            canvasId: null,
            calcFn: () => typeof calcTransformer === 'function' && calcTransformer(),
            getBadge: (s) => `${s.transformerKva || 500} kVA • Isc: ${(s.transformerIscKa || 12.0).toFixed(1)} kA`
        },
        {
            id: 'motorSizerPage',
            title: 'Motor & Starter Selector',
            discipline: 'electrical',
            disciplineLabel: 'Electrical Engineering',
            standard: 'EIT 2001-64 / IEC 60947',
            desc: 'Select motor branch protection, AC-3 contactor, thermal overload, and feeder cable.',
            color: 'amber',
            canvasId: null,
            calcFn: () => typeof calcMotor === 'function' && calcMotor(),
            getBadge: (s) => `${s.motorPowerKw || 7.5} kW • FLC: ${(s.motorFlc || 14.5).toFixed(1)} A`
        },
        {
            id: 'shortCircuitPage',
            title: 'Short Circuit Calculator',
            discipline: 'electrical',
            disciplineLabel: 'Electrical Engineering',
            standard: 'IEEE 242 Point-to-Point',
            desc: 'Analyze prospective 3-phase symmetrical and peak fault current along LV feeders.',
            color: 'red',
            canvasId: null,
            calcFn: () => typeof calcSC === 'function' && calcSC(),
            getBadge: (s) => `Fault @ Point: ${(s.shortCircuitKa || 0).toFixed(2)} kA`
        },
        {
            id: 'starterSimulatorPage',
            title: 'Starter Type Simulator',
            discipline: 'electrical',
            disciplineLabel: 'Electrical Engineering',
            standard: 'IEC 60034 Starting Model',
            desc: 'Simulate winding voltage, inrush line current, and starting torque for DOL, Y-Δ, and Soft Start.',
            color: 'emerald',
            canvasId: null,
            calcFn: () => typeof calcStarter === 'function' && calcStarter(),
            getBadge: (s) => `Inrush: ${(s.starterLineCurrentA || 0).toFixed(0)} A`
        },

        // Plumbing & Sanitary (3)
        {
            id: 'waterDemandPage',
            title: 'Water Demand & Tank Sizer',
            discipline: 'plumbing',
            disciplineLabel: 'Plumbing & Sanitary',
            standard: "ASPE / IPC Hunter's Curve",
            desc: 'Calculate fixture units (WSFU), peak flow demand, supply pipe diameter, and storage volume.',
            color: 'cyan',
            canvasId: 'wsfuChart',
            calcFn: () => typeof calcWater === 'function' && calcWater(),
            getBadge: (s) => `${(s.waterPeakGpm || 0).toFixed(1)} GPM • Tank: ${(s.waterTankM3 || 0).toFixed(1)} m³`
        },
        {
            id: 'stormPage',
            title: 'Storm Drainage Sizer',
            discipline: 'plumbing',
            disciplineLabel: 'Plumbing & Sanitary',
            standard: 'Rational Method / Thailand IDF',
            desc: 'Size roof and site storm drains using localized rainfall intensity for 77 Thailand provinces.',
            color: 'sky',
            canvasId: null,
            calcFn: () => typeof calcStorm === 'function' && calcStorm(),
            getBadge: (s) => `Runoff: ${(s.stormFlowLps || 0).toFixed(1)} L/s (Ø${s.stormPipeMm || 150} mm)`
        },
        {
            id: 'pondPage',
            title: 'Retention Pond Volume',
            discipline: 'plumbing',
            disciplineLabel: 'Plumbing & Sanitary',
            standard: 'Pre/Post-Dev Runoff Volume',
            desc: 'Determine on-site stormwater detention volume from pre- vs. post-development runoff coefficients.',
            color: 'teal',
            canvasId: null,
            calcFn: () => typeof calcPond === 'function' && calcPond(),
            getBadge: (s) => `Retention: ${(s.pondVolumeM3 || 0).toFixed(1)} m³`
        },

        // Fire Protection (3)
        {
            id: 'sprinklerPage',
            title: 'Sprinkler Hydraulic Calculator',
            discipline: 'fire',
            disciplineLabel: 'Fire Protection',
            standard: 'NFPA 13 Fig. 19.3.3.1.1',
            desc: 'Calculate K-factor head flow, Hazen-Williams pipe friction loss, and interactive Area/Density demand.',
            color: 'red',
            canvasId: 'nfpaChart',
            calcFn: () => typeof calcFire === 'function' && calcFire(),
            getBadge: (s) => `Head: ${(s.sprinklerHeadGpm || 14.8).toFixed(1)} GPM • Sys: ${s.sprinklerDemandGpm || 173} GPM`
        },
        {
            id: 'warehouseSprinklerPage',
            title: 'Warehouse Sprinkler (ESFR)',
            discipline: 'fire',
            disciplineLabel: 'Fire Protection',
            standard: 'NFPA 13 Table 12.1 (ESFR)',
            desc: 'Select Early Suppression Fast Response (ESFR) sprinkler K-factor and design pressure for storage racks.',
            color: 'orange',
            canvasId: null,
            calcFn: () => typeof calcESFR === 'function' && calcESFR(),
            getBadge: (s) => `Selected: ${s.esfrHeadSpec || 'K-25.2 ESFR'}`
        },
        {
            id: 'fireWaterPage',
            title: 'Fire Water Consumption',
            discipline: 'fire',
            disciplineLabel: 'Fire Protection',
            standard: 'NFPA 13 / 14 / 20 / 22',
            desc: 'Calculate combined sprinkler, hose stream, and standpipe demand, NFPA 20 pump size, and NFPA 22 tank volume.',
            color: 'rose',
            canvasId: 'fireWaterChart',
            calcFn: () => typeof calcFireWater === 'function' && calcFireWater(),
            getBadge: (s) => `Pump: ${s.fireWaterPumpGpm || 500} GPM • Tank: ${(s.fireWaterTankM3 || 118.7).toFixed(1)} m³`
        }
    ];

    let activeDisciplineFilter = 'all';
    let activeSearchQuery = '';

    window.MagicRegistry = {
        getAll() {
            return modules;
        },

        getById(id) {
            return modules.find(m => m.id === id);
        },

        registerModule(modDef) {
            if (!modDef || !modDef.id) return;
            const idx = modules.findIndex(m => m.id === modDef.id);
            if (idx >= 0) modules[idx] = Object.assign({}, modules[idx], modDef);
            else modules.push(modDef);
        },

        filterLanding(discipline, searchText) {
            if (discipline !== undefined && discipline !== null) {
                activeDisciplineFilter = discipline;
                document.querySelectorAll('.landing-disc-tab').forEach(btn => {
                    if (btn.dataset.disc === discipline) {
                        btn.classList.add('disc-tab-active');
                    } else {
                        btn.classList.remove('disc-tab-active');
                    }
                });
            }
            if (searchText !== undefined && searchText !== null) {
                activeSearchQuery = searchText.trim().toLowerCase();
            }

            // Show/hide discipline sections & individual module cards
            const sections = ['mechanical', 'electrical', 'plumbing', 'fire'];
            sections.forEach(sec => {
                const secContainer = document.getElementById(`landing_sec_${sec}`);
                if (!secContainer) return;
                const matchDisc = (activeDisciplineFilter === 'all' || activeDisciplineFilter === sec);
                if (!matchDisc) {
                    secContainer.classList.add('hidden');
                    return;
                }
                let visibleCount = 0;
                secContainer.querySelectorAll('[data-module-id]').forEach(card => {
                    const mId = card.dataset.moduleId;
                    const mod = this.getById(mId);
                    const textMatch = !activeSearchQuery ||
                        (mod && (mod.title.toLowerCase().includes(activeSearchQuery) ||
                                 mod.desc.toLowerCase().includes(activeSearchQuery) ||
                                 mod.standard.toLowerCase().includes(activeSearchQuery) ||
                                 mod.disciplineLabel.toLowerCase().includes(activeSearchQuery)));
                    if (textMatch) {
                        card.classList.remove('hidden');
                        visibleCount++;
                    } else {
                        card.classList.add('hidden');
                    }
                });
                if (visibleCount > 0) secContainer.classList.remove('hidden');
                else secContainer.classList.add('hidden');
            });
        },

        injectModuleToolbars() {
            modules.forEach(mod => {
                const pageEl = document.getElementById(mod.id);
                if (!pageEl || pageEl.dataset.toolbarInjected) return;
                pageEl.dataset.toolbarInjected = 'true';

                const navEl = pageEl.querySelector('nav');
                if (!navEl) return;

                // Build SSOT Cross-Module Sync buttons if defined
                const syncDefs = (window.MagicStore && window.MagicStore.syncDefinitions[mod.id]) || [];
                const syncButtonsHtml = syncDefs.map((sd, idx) => `
                    <button type="button" onclick="window.MagicRegistry.runSync('${mod.id}', ${idx})"
                        class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/25 transition cursor-pointer"
                        title="Pull live value from Central SSOT Store">
                        <span>🔗 ${sd.label}:</span>
                        <span class="font-bold underline" id="sync_val_${mod.id}_${idx}">${sd.getDesc()}</span>
                    </button>
                `).join('');

                // Action Bar + Collapsible Local Settings Override Panel
                const barWrapper = document.createElement('div');
                barWrapper.className = 'no-print space-y-2 mb-3';
                barWrapper.innerHTML = `
                    <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 dark:bg-slate-800/70 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">Standard:</span>
                            <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold border border-blue-500/20">${mod.standard}</span>
                            <span id="local_badge_${mod.id}" class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">Global (SI)</span>
                            ${syncButtonsHtml}
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5">
                            <button type="button" onclick="showInfo('${mod.id}')"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-blue-500 transition cursor-pointer">
                                <span>ⓘ Formulas & Ref</span>
                            </button>
                            <button type="button" onclick="window.MagicSettings.toggleLocalPanel('${mod.id}')"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:border-amber-500 transition cursor-pointer">
                                <span>⚙️ Local Settings</span>
                            </button>
                            <button type="button" onclick="window.MagicIO.exportSeparationReport('${mod.id}', 'print')"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer">
                                <span>📄 Module Report (PDF)</span>
                            </button>
                            <button type="button" onclick="window.MagicIO.exportSeparationReport('${mod.id}', 'xlsx')"
                                class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs transition cursor-pointer">
                                <span>📊 Export .XLSX</span>
                            </button>
                        </div>
                    </div>
                    <div id="local_settings_panel_${mod.id}" class="hidden bg-amber-50/90 dark:bg-slate-800/95 p-4 rounded-xl border border-amber-300 dark:border-amber-500/40 shadow-sm">
                        <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div class="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                                ⚙️ Local Module Settings Override — ${mod.title}
                            </div>
                            <span class="text-[11px] text-slate-500 dark:text-slate-400">Overrides global settings for this module only.</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                                <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Local Unit System</label>
                                <select id="loc_unit_${mod.id}" class="w-full p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700">
                                    <option value="SI">SI (Metric)</option>
                                    <option value="IP">IP (Imperial)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Electrical Standard</label>
                                <select id="loc_std_${mod.id}" class="w-full p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700">
                                    <option value="EIT">EIT 2001-64 (40°C Ref)</option>
                                    <option value="IEC">IEC 60364-5-52 (30°C Ref)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Local Ambient (°C)</label>
                                <select id="loc_amb_${mod.id}" class="w-full p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700">
                                    <option value="30">30°C</option>
                                    <option value="35">35°C</option>
                                    <option value="40" selected>40°C</option>
                                    <option value="45">45°C</option>
                                    <option value="50">50°C</option>
                                </select>
                            </div>
                            <div>
                                <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Module Design Note</label>
                                <input type="text" id="loc_note_${mod.id}" placeholder="e.g. Zone A Riser / Chiller Plant"
                                    class="w-full p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700">
                            </div>
                        </div>
                        <div class="flex justify-end gap-2 mt-3">
                            <button type="button" onclick="window.MagicSettings.resetLocalToGlobal('${mod.id}')"
                                class="px-3 py-1 rounded text-xs font-semibold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300">
                                Reset to Global
                            </button>
                            <button type="button" onclick="window.MagicSettings.applyLocalFromPanel('${mod.id}')"
                                class="px-3.5 py-1 rounded text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white">
                                Apply Local Override
                            </button>
                        </div>
                    </div>
                `;
                navEl.insertAdjacentElement('afterend', barWrapper);
                if (window.MagicSettings) window.MagicSettings.updateLocalSettingsUI(mod.id);
            });
        },

        runSync(moduleId, syncIndex) {
            const syncDefs = (window.MagicStore && window.MagicStore.syncDefinitions[moduleId]) || [];
            if (syncDefs[syncIndex] && typeof syncDefs[syncIndex].apply === 'function') {
                syncDefs[syncIndex].apply();
            }
        }
    };

    window.updateLandingBadges = function () {
        if (!window.MagicStore) return;
        const s = window.MagicStore.get();
        modules.forEach(mod => {
            const badgeEl = document.getElementById(`landing_badge_${mod.id}`);
            if (badgeEl && typeof mod.getBadge === 'function') {
                badgeEl.innerText = mod.getBadge(s);
            }
            const syncDefs = window.MagicStore.syncDefinitions[mod.id] || [];
            syncDefs.forEach((sd, idx) => {
                const syncSpan = document.getElementById(`sync_val_${mod.id}_${idx}`);
                if (syncSpan) syncSpan.innerText = sd.getDesc();
            });
        });
    };
})();
