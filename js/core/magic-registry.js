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
            desc: 'Calculate K-factor head flow, pipe friction loss, and interactive Area/Density demand.',
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
            desc: 'Calculate combined sprinkler, hose stream, and standpipe demand, fire pump size, and storage tank volume.',
            color: 'rose',
            canvasId: 'fireWaterChart',
            calcFn: () => typeof calcFireWater === 'function' && calcFireWater(),
            getBadge: (s) => `Pump: ${s.fireWaterPumpGpm || 500} GPM • Tank: ${(s.fireWaterTankM3 || 118.7).toFixed(1)} m³`
        }
    ];

    let activeDisciplineFilter = 'all';
    let activeSearchQuery = '';

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function buildDisciplineLocalControls(mod) {
        const disc = mod.discipline;
        const unitField = `
            <div>
                <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Unit System</label>
                <select id="loc_unit_${mod.id}" class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                    <option value="SI">SI (Metric)</option>
                    <option value="IP">IP (Imperial)</option>
                </select>
            </div>
        `;
        const noteField = `
            <div>
                <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Design / Zone Note</label>
                <input type="text" id="loc_note_${mod.id}" placeholder="e.g. Tower A / Riser 1"
                    class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
            </div>
        `;

        if (disc === 'electrical') {
            return `
                <div>
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Electrical Code</label>
                    <select id="loc_std_${mod.id}" class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                        <option value="EIT">EIT 2001-64 (40°C Ref)</option>
                        <option value="IEC">IEC 60364-5-52 (30°C Ref)</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">3-Phase Voltage (V)</label>
                    <select id="loc_volt_${mod.id}" class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                        <option value="400">400 V (50Hz)</option>
                        <option value="380">380 V</option>
                        <option value="415">415 V</option>
                        <option value="230">230 V</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Ambient Temp (°C)</label>
                    <select id="loc_amb_${mod.id}" class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                        <option value="30">30°C</option>
                        <option value="35">35°C</option>
                        <option value="40" selected>40°C</option>
                        <option value="45">45°C</option>
                        <option value="50">50°C</option>
                    </select>
                </div>
                ${noteField}
            `;
        }

        if (disc === 'mechanical') {
            return `
                ${unitField}
                <div>
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Hydronic Temp (°C)</label>
                    <select id="loc_water_${mod.id}" class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                        <option value="10">10°C (Chilled Water)</option>
                        <option value="20">20°C (Condenser / Make-up)</option>
                        <option value="60">60°C (Hot Water)</option>
                    </select>
                </div>
                <div>
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Outdoor Design DB (°C)</label>
                    <input type="number" step="0.5" id="loc_oadb_${mod.id}" value="35.0"
                        class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                </div>
                ${noteField}
            `;
        }

        if (disc === 'plumbing') {
            const provList = (window.MagicDB && Array.isArray(window.MagicDB.thailandProvinces))
                ? window.MagicDB.thailandProvinces.map(p => p.name).sort()
                : ['Bangkok', 'Chiang Mai', 'Chon Buri', 'Phuket', 'Nakhon Ratchasima', 'Khon Kaen', 'Songkhla'];
            const provOptions = provList.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
            return `
                ${unitField}
                <div class="sm:col-span-2">
                    <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Province / Location (Rainfall IDF)</label>
                    <select id="loc_loc_${mod.id}" class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                        ${provOptions}
                    </select>
                </div>
                ${noteField}
            `;
        }

        // Fire Protection
        return `
            ${unitField}
            <div class="sm:col-span-2">
                <label class="block font-semibold text-slate-600 dark:text-slate-300 mb-1">Hydraulic Safety Margin (%)</label>
                <select id="loc_margin_${mod.id}" class="w-full p-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white">
                    <option value="10">10% Margin (Standard Grid/Loop)</option>
                    <option value="15">15% Margin (Tree / High-Rise)</option>
                    <option value="20">20% Margin (Industrial / Extra Hazard)</option>
                </select>
            </div>
            ${noteField}
        `;
    }

    window.MagicRegistry = {
        modules,
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

        renderStdHoverIcon(moduleId, opts = {}) {
            const mod = this.getById(moduleId);
            const kb = (window.MagicDB && window.MagicDB.knowledgeBase && window.MagicDB.knowledgeBase[moduleId]) || {};
            const stdCode = escapeHtml(kb.standard || kb.std || (mod && mod.standard) || 'Engineering Standard');
            const summary = escapeHtml(kb.summary || (mod && mod.desc) || '');
            const eqs = (kb.formulas || kb.equations || []).slice(0, 3);
            const posClass = [
                opts.direction === 'bottom' ? 'std-hover-card--bottom' : '',
                opts.align === 'right' ? 'std-hover-card--right' : ''
            ].filter(Boolean).join(' ');

            // Use only inline/span tags so it is 100% valid HTML5 even inside <button> cards
            const eqHtml = eqs.length
                ? `<span class="block mt-2 pt-2 border-t border-slate-700/80 space-y-1">
                    ${eqs.map(eq => `<span class="block font-mono text-[10px] text-emerald-300 bg-slate-900/90 px-2 py-0.5 rounded border border-slate-700/70 truncate">${escapeHtml(eq)}</span>`).join('')}
                   </span>`
                : '';

            return `
                <span class="std-hover-wrap" onclick="event.stopPropagation(); showInfo('${moduleId}')">
                    <span class="std-icon-trigger" aria-label="Standard & Methodology Reference">ⓘ</span>
                    <span class="std-hover-card ${posClass}">
                        <span class="block text-[9px] font-bold uppercase tracking-wider text-blue-400 mb-0.5">Standard & Methodology</span>
                        <span class="block text-xs font-extrabold text-white mb-1">${stdCode}</span>
                        <span class="block text-[11px] text-slate-300 leading-snug">${summary}</span>
                        ${eqHtml}
                        <span class="block mt-1.5 text-[9px] text-slate-400 italic">Click ⓘ for full reference sheet</span>
                    </span>
                </span>
            `;
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
            // 1. Hydrate Landing Page Card Standard Icons & raise z-index on hover
            document.querySelectorAll('[data-module-id]').forEach(card => {
                card.classList.add('relative', 'hover:z-30');
                const mId = card.dataset.moduleId;
                const slot = card.querySelector('.std-card-slot');
                if (slot && !slot.dataset.hydrated) {
                    slot.dataset.hydrated = 'true';
                    slot.innerHTML = this.renderStdHoverIcon(mId, { direction: 'top', align: 'left' });
                }
            });

            // 2. Inject Module Toolbars & Header Standard Icons
            modules.forEach(mod => {
                const pageEl = document.getElementById(mod.id);
                if (!pageEl || pageEl.dataset.toolbarInjected) return;
                pageEl.dataset.toolbarInjected = 'true';

                // Inject hover standard icon next to module <header> <h1>
                const headerH1 = pageEl.querySelector('header h1');
                if (headerH1 && !headerH1.querySelector('.std-hover-wrap')) {
                    headerH1.classList.add('inline-flex', 'items-center', 'gap-2.5', 'flex-wrap');
                    headerH1.insertAdjacentHTML('beforeend', this.renderStdHoverIcon(mod.id, { direction: 'bottom', align: 'left' }));
                }

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

                // Action Bar + Floating Non-Intrusive Local Settings Popover
                const barWrapper = document.createElement('div');
                barWrapper.className = 'no-print relative mb-3';
                barWrapper.innerHTML = `
                    <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-100/90 dark:bg-slate-800/70 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                        <div class="flex flex-wrap items-center gap-2">
                            ${this.renderStdHoverIcon(mod.id, { direction: 'bottom', align: 'left' })}
                            <button type="button" onclick="window.MagicSettings.toggleLocalPanel('${mod.id}')"
                                id="local_badge_${mod.id}"
                                class="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-500 border border-transparent transition cursor-pointer">
                                🔗 Global (SI)
                            </button>
                            ${syncButtonsHtml}
                        </div>
                        <div class="flex flex-wrap items-center gap-1.5">
                            ${window.MagicEquipment ? window.MagicEquipment.renderToolbarButton(mod.id) : ''}
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
                    <div id="local_settings_panel_${mod.id}" class="hidden absolute right-0 top-full mt-2 w-full max-w-2xl z-40 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl">
                        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-700">
                            <div class="flex items-center gap-2">
                                <span class="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm">⚙️</span>
                                <div>
                                    <div class="text-xs font-extrabold text-slate-900 dark:text-white">
                                        ${escapeHtml(mod.title)} — Local Module Basis
                                    </div>
                                    <div class="text-[10px] text-slate-500 dark:text-slate-400">${escapeHtml(mod.disciplineLabel)} • Scope-isolated parameters</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl text-[11px]">
                                <button type="button" id="loc_mode_inherit_${mod.id}" onclick="window.MagicSettings.resetLocalToGlobal('${mod.id}')"
                                    class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer">
                                    🔗 Inherit Global
                                </button>
                                <button type="button" id="loc_mode_custom_${mod.id}" onclick="window.MagicSettings.applyLocalFromPanel('${mod.id}')"
                                    class="px-2.5 py-1 rounded-lg font-bold transition cursor-pointer">
                                    ⚡ Custom Override
                                </button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                            ${buildDisciplineLocalControls(mod)}
                        </div>
                        <div class="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                            <span id="loc_status_hint_${mod.id}" class="text-[11px] text-slate-400">Currently inheriting Global Project Settings.</span>
                            <div class="flex items-center gap-2">
                                <button type="button" onclick="window.MagicSettings.toggleLocalPanel('${mod.id}')"
                                    class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 cursor-pointer">
                                    Close
                                </button>
                                <button type="button" onclick="window.MagicSettings.applyLocalFromPanel('${mod.id}'); window.MagicSettings.toggleLocalPanel('${mod.id}')"
                                    class="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm cursor-pointer">
                                    Save Local Override
                                </button>
                            </div>
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
