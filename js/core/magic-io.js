// ============================================================================
// M.A.G.I.C. Import/Export (.magic.json / .xlsx) & Separation / Master Report Engine
// File: js/core/magic-io.js
// ============================================================================

(function () {
    function collectModuleDomData(moduleId) {
        const page = document.getElementById(moduleId);
        const mod = window.MagicRegistry ? window.MagicRegistry.getById(moduleId) : { id: moduleId, title: moduleId };
        if (!page) return { mod, inputs: [], results: [], chartDataUrl: null };

        // 1. Collect Labeled Inputs & Selects
        const inputs = [];
        page.querySelectorAll('input, select').forEach(el => {
            if (!el.id || el.id.startsWith('loc_') || el.closest('nav') || el.closest('.no-print')) return;
            if (el.type === 'checkbox') {
                inputs.push({ id: el.id, label: el.id, value: el.checked ? 'Enabled' : 'Disabled' });
                return;
            }
            let label = '';
            const wrapper = el.closest('div');
            if (wrapper) {
                const lblEl = wrapper.querySelector('label') || (wrapper.parentElement && wrapper.parentElement.querySelector('label'));
                if (lblEl) label = lblEl.innerText.replace(/\s+/g, ' ').trim();
            }
            if (!label) label = el.id;
            let valText = el.value;
            if (el.tagName === 'SELECT' && el.selectedOptions && el.selectedOptions[0]) {
                valText = el.selectedOptions[0].text.trim();
            }
            if (valText !== '' && valText !== undefined) {
                inputs.push({ id: el.id, label, value: valText });
            }
        });

        // 2. Collect KPI Stat Cards & Key Outputs
        const results = [];
        page.querySelectorAll('.stat-card').forEach(card => {
            const lines = card.innerText.split('\n').map(s => s.trim()).filter(Boolean);
            if (lines.length >= 2) {
                results.push({
                    label: lines[0],
                    value: lines[1],
                    sub: lines.slice(2).join(' • ')
                });
            }
        });

        // Also check major result banners (like wire_res_size, esfr_res_head, etc.)
        if (moduleId === 'wiringPage') {
            const sz = document.getElementById('wire_res_size')?.innerText.replace(/\s+/g, ' ').trim();
            const iz = document.getElementById('wire_res_max_iz')?.innerText;
            const df = document.getElementById('wire_res_total_df')?.innerText;
            const dfDet = document.getElementById('wire_res_df_detail')?.innerText;
            if (sz) results.push({ label: 'Recommended Cable Size', value: sz, sub: `Iz' = ${iz} | Cf = ${df} (${dfDet})` });
        } else if (moduleId === 'warehouseSprinklerPage') {
            const hd = document.getElementById('esfr_res_head')?.innerText;
            const pr = document.getElementById('esfr_res_pressure')?.innerText;
            if (hd) results.push({ label: 'Recommended ESFR Protection', value: hd, sub: pr || '' });
        } else if (moduleId === 'fireWaterPage') {
            const tot = document.getElementById('fw_brk_total')?.innerText;
            if (tot) results.push({ label: 'Total Effective Tank Volume', value: tot, sub: 'Per NFPA 13 / 14 / 22' });
        }

        // 3. Capture Canvas Chart Snapshot if present
        let chartDataUrl = null;
        if (mod && mod.canvasId) {
            const canvas = document.getElementById(mod.canvasId);
            if (canvas) {
                try {
                    chartDataUrl = canvas.toDataURL('image/png');
                } catch (e) { }
            }
        }

        return { mod, inputs, results, chartDataUrl };
    }

    function buildModuleReportHtml(moduleId, isPartofMaster = false) {
        if (window.MagicRegistry) {
            const m = window.MagicRegistry.getById(moduleId);
            if (m && typeof m.calcFn === 'function') m.calcFn();
        }
        const { mod, inputs, results, chartDataUrl } = collectModuleDomData(moduleId);
        const eff = window.MagicSettings ? window.MagicSettings.getEffective(moduleId) : {};
        const kb = (window.MagicDB && window.MagicDB.knowledgeBase && window.MagicDB.knowledgeBase[moduleId]) || {};

        return `
            <div class="bg-white text-slate-900 p-8 rounded-2xl border border-slate-300 shadow-none mb-8 ${isPartofMaster ? 'report-page-break' : ''}">
                <!-- Report Header -->
                <div class="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-6">
                    <div>
                        <div class="text-[11px] font-bold uppercase tracking-widest text-blue-700">${mod.disciplineLabel || 'MEP Engineering'} — Calculation Sheet</div>
                        <h2 class="text-2xl font-black text-slate-900 mt-0.5">${mod.title}</h2>
                        <div class="text-xs text-slate-600 mt-1">Standard Reference: <strong>${mod.standard}</strong> ${eff.isOverridden ? `• <em>Local Override Active (${eff.unitSystem})</em>` : `• Global (${eff.unitSystem || 'SI'})`}</div>
                        ${eff.note ? `<div class="text-xs text-amber-700 font-semibold mt-1">Design Note: ${eff.note}</div>` : ''}
                    </div>
                    <div class="text-right text-xs text-slate-600 space-y-0.5">
                        <div class="font-bold text-slate-900">${eff.projectName || 'M.A.G.I.C. Project'}</div>
                        <div>Code: ${eff.projectCode || 'PRJ-001'} • ${eff.revision || 'Rev. 0'}</div>
                        <div>Location: ${eff.location || 'Bangkok'}</div>
                        <div>Date: ${new Date().toISOString().slice(0, 10)}</div>
                    </div>
                </div>

                ${kb.summary ? `<p class="text-xs text-slate-600 italic mb-5 bg-slate-50 p-3 rounded-lg border border-slate-200">${kb.summary}</p>` : ''}

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <!-- Inputs Table -->
                    <div>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">1. Design Input Parameters</h3>
                        <table class="w-full text-xs border-collapse">
                            <tbody>
                                ${inputs.slice(0, 18).map(inp => `
                                    <tr class="border-b border-slate-100">
                                        <td class="py-1.5 pr-2 text-slate-600 font-medium">${inp.label}</td>
                                        <td class="py-1.5 pl-2 text-right font-mono font-bold text-slate-900">${inp.value}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Outputs Table -->
                    <div>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-2">2. Calculated Engineering Outputs</h3>
                        <div class="space-y-2">
                            ${results.map(r => `
                                <div class="p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 flex justify-between items-center">
                                    <div>
                                        <div class="text-[10px] font-bold uppercase text-slate-500">${r.label}</div>
                                        ${r.sub ? `<div class="text-[10px] text-slate-500 mt-0.5">${r.sub}</div>` : ''}
                                    </div>
                                    <div class="text-sm font-black font-mono text-blue-700">${r.value}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                ${chartDataUrl ? `
                    <div class="mt-4">
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1.5 mb-3">3. Analytical Diagram / Operating Curve</h3>
                        <div class="border border-slate-200 rounded-xl p-3 bg-slate-900 flex justify-center">
                            <img src="${chartDataUrl}" alt="${mod.title} Chart" class="max-h-[300px] w-auto object-contain rounded" />
                        </div>
                    </div>
                ` : ''}

                <!-- Sign-off Footer -->
                <div class="mt-6 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-xs text-slate-600">
                    <div>Prepared By: <strong>${eff.engineerName || 'Lead Engineer'}</strong></div>
                    <div>Checked By: <strong>${eff.reviewerName || 'Senior Reviewer'}</strong></div>
                    <div class="text-right">M.A.G.I.C. Engineering Suite v3.0</div>
                </div>
            </div>
        `;
    }

    window.MagicIO = {
        // 1. Export Full Project (.magic.json)
        exportProjectJSON() {
            const domInputs = {};
            document.querySelectorAll('input[id], select[id]').forEach(el => {
                if (el.id.startsWith('gs_') || el.id.startsWith('loc_')) return;
                domInputs[el.id] = el.type === 'checkbox' ? el.checked : el.value;
            });

            const payload = {
                app: "M.A.G.I.C. Engineering Tools Suite",
                version: "3.0.0",
                exportedAt: new Date().toISOString(),
                settings: window.MagicSettings ? window.MagicSettings.exportSettings() : {},
                equipmentSchedule: window.MagicEquipment ? window.MagicEquipment.exportData() : [],
                ssotStore: window.MagicStore ? window.MagicStore.exportState() : {},
                domInputs,
                eqRecords: typeof eqRecords !== 'undefined' ? eqRecords : [],
                transLoads: typeof transLoads !== 'undefined' ? transLoads : [],
                ms_nodes: typeof ms_nodes !== 'undefined' ? ms_nodes : []
            };

            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const prjCode = (payload.settings.global && payload.settings.global.projectCode) || 'Project';
            a.href = url;
            a.download = `MAGIC_${prjCode}_${new Date().toISOString().slice(0, 10)}.magic.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // 2. Import Full Project (.magic.json)
        importProjectJSON(fileInput) {
            const file = fileInput.files && fileInput.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.settings && window.MagicSettings) {
                        window.MagicSettings.importSettings(data.settings);
                    }
                    if (data.ssotStore && window.MagicStore) {
                        window.MagicStore.importState(data.ssotStore);
                    }
                    if (data.domInputs) {
                        Object.keys(data.domInputs).forEach(id => {
                            const el = document.getElementById(id);
                            if (el) {
                                if (el.type === 'checkbox') el.checked = Boolean(data.domInputs[id]);
                                else el.value = data.domInputs[id];
                            }
                        });
                    }
                    if (Array.isArray(data.eqRecords) && typeof eqRecords !== 'undefined') {
                        eqRecords = data.eqRecords;
                        if (typeof renderEqTables === 'function') renderEqTables();
                    }
                    if (Array.isArray(data.transLoads) && typeof transLoads !== 'undefined') {
                        transLoads = data.transLoads;
                        if (typeof renderTransLoads === 'function') renderTransLoads();
                    }
                    if (Array.isArray(data.ms_nodes) && typeof ms_nodes !== 'undefined' && data.ms_nodes.length > 0) {
                        ms_nodes = data.ms_nodes;
                        if (typeof renderMsInputs === 'function') renderMsInputs();
                        if (typeof syncMsState === 'function') syncMsState();
                    }
                    // Recalculate all modules
                    if (window.MagicRegistry) {
                        window.MagicRegistry.getAll().forEach(m => {
                            try { m.calcFn(); } catch (err) { }
                        });
                    }
                    if (typeof window.updateLandingBadges === 'function') window.updateLandingBadges();
                } catch (err) {
                    console.error('Failed to import .magic.json project:', err);
                }
                fileInput.value = '';
            };
            reader.readAsText(file);
        },

        // 3. Individual Module Separation Report (Print/PDF or .XLSX)
        exportSeparationReport(moduleId, format = 'print') {
            if (format === 'xlsx') {
                if (typeof XLSX === 'undefined') return;
                const { mod, inputs, results } = collectModuleDomData(moduleId);
                const g = window.MagicSettings ? window.MagicSettings.getEffective(moduleId) : {};
                const rows = [
                    ["M.A.G.I.C. ENGINEERING TOOLS — MODULE SEPARATION REPORT"],
                    ["Project", g.projectName || "", "Project Code", g.projectCode || ""],
                    ["Module", mod.title, "Standard", mod.standard],
                    ["Location", g.location || "", "Engineer", g.engineerName || ""],
                    ["Date", new Date().toISOString().slice(0, 10), "Unit System", g.unitSystem || "SI"],
                    [],
                    ["1. DESIGN INPUT PARAMETERS", "VALUE"],
                    ...inputs.map(i => [i.label, i.value]),
                    [],
                    ["2. CALCULATED OUTPUTS", "RESULT", "NOTES / DETAILS"],
                    ...results.map(r => [r.label, r.value, r.sub || ""])
                ];
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(rows);
                XLSX.utils.book_append_sheet(wb, ws, mod.title.slice(0, 28));
                XLSX.writeFile(wb, `MAGIC_${mod.id}_Report.xlsx`);
                return;
            }

            // Print / PDF Single-Module Separation Report
            const container = document.getElementById('printReportContainer');
            if (!container) {
                window.print();
                return;
            }
            container.innerHTML = buildModuleReportHtml(moduleId, false);
            document.body.classList.add('printing-master-report');
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.body.classList.remove('printing-master-report');
                }, 400);
            }, 150);
        },

        // 4. Master Report Builder Modal & Generator
        openMasterReportModal() {
            const modal = document.getElementById('masterReportModal');
            const listEl = document.getElementById('masterReportModuleList');
            if (!modal || !listEl || !window.MagicRegistry) return;

            const allMods = window.MagicRegistry.getAll();
            const s = window.MagicStore ? window.MagicStore.get() : {};
            listEl.innerHTML = allMods.map(m => `
                <label class="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 cursor-pointer text-xs">
                    <div class="flex items-center gap-2.5">
                        <input type="checkbox" class="master-mod-chk w-4 h-4 accent-blue-600 rounded" value="${m.id}" data-disc="${m.discipline}" checked>
                        <div>
                            <div class="font-bold text-slate-800 dark:text-slate-100">${m.title}</div>
                            <div class="text-[10px] text-slate-400">${m.disciplineLabel} • ${m.standard}</div>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono font-semibold text-[10px]">
                        ${typeof m.getBadge === 'function' ? m.getBadge(s) : ''}
                    </span>
                </label>
            `).join('');
            modal.classList.remove('hidden');
        },

        selectMasterDiscipline(disc) {
            document.querySelectorAll('.master-mod-chk').forEach(chk => {
                if (disc === 'all') chk.checked = true;
                else if (disc === 'none') chk.checked = false;
                else chk.checked = (chk.dataset.disc === disc);
            });
        },

        generateMasterReport(format = 'print') {
            const selectedIds = Array.from(document.querySelectorAll('.master-mod-chk:checked')).map(c => c.value);
            if (selectedIds.length === 0) return;

            const g = window.MagicSettings ? window.MagicSettings.getGlobal() : {};
            const s = window.MagicStore ? window.MagicStore.get() : {};

            if (format === 'xlsx') {
                if (typeof XLSX === 'undefined') return;
                const wb = XLSX.utils.book_new();

                // Executive Summary Cover Sheet
                const coverRows = [
                    ["M.A.G.I.C. ENGINEERING TOOLS SUITE — MASTER MEP CALCULATION WORKBOOK"],
                    ["Project Name", g.projectName || "", "Project Code", g.projectCode || ""],
                    ["Client", g.clientName || "", "Location", g.location || ""],
                    ["Lead Engineer", g.engineerName || "", "Reviewer", g.reviewerName || ""],
                    ["Revision", g.revision || "", "Date", new Date().toISOString().slice(0, 10)],
                    ["Global Unit System", g.unitSystem || "SI", "Electrical Standard", g.electricalStd || "EIT"],
                    [],
                    ["EXECUTIVE SUMMARY — INCLUDED MODULES", "DISCIPLINE", "STANDARD", "KEY OUTPUT SUMMARY"],
                    ...selectedIds.map(id => {
                        const m = window.MagicRegistry.getById(id);
                        return [m.title, m.disciplineLabel, m.standard, typeof m.getBadge === 'function' ? m.getBadge(s) : ''];
                    })
                ];
                const wsCover = XLSX.utils.aoa_to_sheet(coverRows);
                XLSX.utils.book_append_sheet(wb, wsCover, "00_Master_Summary");

                selectedIds.forEach((id, idx) => {
                    const { mod, inputs, results } = collectModuleDomData(id);
                    const sheetRows = [
                        [`${mod.title.toUpperCase()} (${mod.standard})`],
                        ["Discipline", mod.disciplineLabel],
                        [],
                        ["INPUT PARAMETER", "VALUE"],
                        ...inputs.map(i => [i.label, i.value]),
                        [],
                        ["CALCULATED OUTPUT", "RESULT", "DETAILS"],
                        ...results.map(r => [r.label, r.value, r.sub || ""])
                    ];
                    const ws = XLSX.utils.aoa_to_sheet(sheetRows);
                    const tabName = `${String(idx + 1).padStart(2, '0')}_${mod.title.replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`;
                    XLSX.utils.book_append_sheet(wb, ws, tabName);
                });

                XLSX.writeFile(wb, `MAGIC_Master_Report_${g.projectCode || 'MEP'}.xlsx`);
                return;
            }

            // Print / PDF Multi-Page Master Calculation Book
            const container = document.getElementById('printReportContainer');
            if (!container) return;

            const coverHtml = `
                <div class="bg-white text-slate-900 p-10 rounded-2xl border-2 border-slate-900 mb-8 report-page-break">
                    <div class="text-xs font-bold uppercase tracking-widest text-blue-700 mb-2">M.A.G.I.C. Multi-Discipline Engineering Suite</div>
                    <h1 class="text-4xl font-black text-slate-900 mb-2">MASTER MEP CALCULATION REPORT</h1>
                    <p class="text-sm text-slate-600 mb-8">Consolidated Mechanical, Electrical, Plumbing & Fire Protection Design Book</p>

                    <div class="grid grid-cols-2 gap-4 p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs mb-8">
                        <div><span class="text-slate-500">Project Name:</span> <strong class="text-slate-900">${g.projectName}</strong></div>
                        <div><span class="text-slate-500">Project Code:</span> <strong class="text-slate-900">${g.projectCode} (${g.revision})</strong></div>
                        <div><span class="text-slate-500">Client:</span> <strong class="text-slate-900">${g.clientName}</strong></div>
                        <div><span class="text-slate-500">Site Location:</span> <strong class="text-slate-900">${g.location}</strong></div>
                        <div><span class="text-slate-500">Lead Engineer:</span> <strong class="text-slate-900">${g.engineerName}</strong></div>
                        <div><span class="text-slate-500">Checked By:</span> <strong class="text-slate-900">${g.reviewerName}</strong></div>
                        <div><span class="text-slate-500">Global Units:</span> <strong class="text-slate-900">${g.unitSystem}</strong></div>
                        <div><span class="text-slate-500">Electrical Standard:</span> <strong class="text-slate-900">${g.electricalStd} (${g.voltage3P}V)</strong></div>
                    </div>

                    <h2 class="text-sm font-bold uppercase tracking-wider text-slate-700 border-b-2 border-slate-800 pb-2 mb-3">Table of Contents & Executive SSOT Summary</h2>
                    <table class="w-full text-xs border-collapse">
                        <thead>
                            <tr class="bg-slate-100 text-slate-700 border-b border-slate-300">
                                <th class="p-2 text-left">#</th>
                                <th class="p-2 text-left">Module</th>
                                <th class="p-2 text-left">Discipline</th>
                                <th class="p-2 text-left">Governing Standard</th>
                                <th class="p-2 text-right">Primary Design Output</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${selectedIds.map((id, i) => {
                                const m = window.MagicRegistry.getById(id);
                                return `
                                    <tr class="border-b border-slate-200">
                                        <td class="p-2 font-mono">${i + 1}</td>
                                        <td class="p-2 font-bold text-slate-900">${m.title}</td>
                                        <td class="p-2 text-slate-600">${m.disciplineLabel}</td>
                                        <td class="p-2 text-slate-600">${m.standard}</td>
                                        <td class="p-2 text-right font-mono font-bold text-blue-700">${typeof m.getBadge === 'function' ? m.getBadge(s) : ''}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            const sheetsHtml = selectedIds.map(id => buildModuleReportHtml(id, true)).join('');
            container.innerHTML = coverHtml + sheetsHtml;

            const modal = document.getElementById('masterReportModal');
            if (modal) modal.classList.add('hidden');

            document.body.classList.add('printing-master-report');
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.body.classList.remove('printing-master-report');
                }, 400);
            }, 200);
        },

        // 5. SSOT Central Database & Shared Parameter Inspector Modal
        openSSOTModal() {
            const modal = document.getElementById('ssotModal');
            const body = document.getElementById('ssotModalBody');
            if (!modal || !body || !window.MagicStore || !window.MagicDB) return;

            const s = window.MagicStore.get();
            const rows = [
                { disc: 'Mechanical & HVAC', key: 'hvacCoolingLoadKw', label: 'AHU Total Cooling Load', val: `${(s.hvacCoolingLoadKw || 0).toFixed(2)} kW (${(s.hvacCoolingLoadRt || 0).toFixed(2)} RT)` },
                { disc: 'Mechanical & HVAC', key: 'hvacSupplyAirLps', label: 'AHU Supply Airflow', val: `${(s.hvacSupplyAirLps || 0).toFixed(0)} LPS` },
                { disc: 'Mechanical & HVAC', key: 'ductSizeText', label: 'Sized Main Duct', val: `${s.ductSizeText} @ ${(s.ductFlowLps || 0).toFixed(0)} LPS` },
                { disc: 'Mechanical & HVAC', key: 'pipeSizeText', label: 'Sized Hydronic Pipe', val: `${s.pipeSizeText} @ ${(s.pipeFlowLpm || 0).toFixed(0)} LPM` },
                { disc: 'Mechanical & HVAC', key: 'ctMakeupM3Day', label: 'Cooling Tower Make-up Water', val: `${(s.ctMakeupM3Day || 0).toFixed(1)} m³/day` },
                { disc: 'Electrical Engineering', key: 'elecConnectedKva', label: 'Equipment Schedule Connected Load', val: `${(s.elecConnectedKw || 0).toFixed(1)} kW / ${(s.elecConnectedKva || 0).toFixed(1)} kVA` },
                { disc: 'Electrical Engineering', key: 'wiringCableSize', label: 'Active Feeder Breaker & Cable', val: `${s.wiringBreakerAt} A AT • ${s.wiringCableSize} (${(s.wiringAmps || 0).toFixed(1)} A)` },
                { disc: 'Electrical Engineering', key: 'transformerKva', label: 'Selected Distribution Transformer', val: `${s.transformerKva} kVA (FLC: ${(s.transformerFlc || 0).toFixed(1)} A, Isc: ${(s.transformerIscKa || 0).toFixed(2)} kA)` },
                { disc: 'Electrical Engineering', key: 'motorPowerKw', label: 'Selected Induction Motor', val: `${s.motorPowerKw} kW (FLC: ${(s.motorFlc || 0).toFixed(1)} A, Brk: ${s.motorBreakerAt} A)` },
                { disc: 'Electrical Engineering', key: 'shortCircuitKa', label: 'Downstream Fault Current (Isc)', val: `${(s.shortCircuitKa || 0).toFixed(2)} kA` },
                { disc: 'Plumbing & Sanitary', key: 'waterPeakGpm', label: 'Domestic Water Peak Flow & Tank', val: `${(s.waterPeakGpm || 0).toFixed(1)} GPM (${s.waterTotalWsfu} WSFU) • Tank: ${(s.waterTankM3 || 0).toFixed(1)} m³` },
                { disc: 'Plumbing & Sanitary', key: 'stormFlowLps', label: 'Stormwater Runoff & Drain Pipe', val: `${(s.stormFlowLps || 0).toFixed(1)} L/s • Ø${s.stormPipeMm} mm` },
                { disc: 'Fire Protection', key: 'sprinklerDemandGpm', label: 'NFPA 13 Sprinkler Demand', val: `${s.sprinklerDemandGpm} GPM (${(s.sprinklerDensity || 0.10).toFixed(2)} gpm/ft² × ${s.sprinklerAreaFt2} ft²)` },
                { disc: 'Fire Protection', key: 'fireWaterTankM3', label: 'NFPA 20 Fire Pump & NFPA 22 Tank', val: `Pump: ${s.fireWaterPumpGpm} GPM • Tank: ${(s.fireWaterTankM3 || 0).toFixed(1)} m³` }
            ];

            body.innerHTML = `
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
                    <div class="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                        <div class="text-[10px] font-bold uppercase text-blue-500">Motor Step Catalog</div>
                        <div class="text-lg font-black text-slate-800 dark:text-white mt-0.5">${window.MagicDB.motorStepCatalog.length} Steps</div>
                        <div class="text-[10px] text-slate-400">0.37 kW – 400 kW (IEC/EIT)</div>
                    </div>
                    <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <div class="text-[10px] font-bold uppercase text-amber-500">Conductor Table</div>
                        <div class="text-lg font-black text-slate-800 dark:text-white mt-0.5">${window.MagicDB.ampacityTable.length} Sizes</div>
                        <div class="text-[10px] text-slate-400">1.5 – 500 mm² (EIT & IEC)</div>
                    </div>
                    <div class="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20">
                        <div class="text-[10px] font-bold uppercase text-teal-500">Duct & Pipe Schedules</div>
                        <div class="text-lg font-black text-slate-800 dark:text-white mt-0.5">${window.MagicDB.standardSpiralDuctsMM.length + window.MagicDB.standardCommercialPipes.length} Sizes</div>
                        <div class="text-[10px] text-slate-400">Ø80–1600 mm & DN15–DN600</div>
                    </div>
                    <div class="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                        <div class="text-[10px] font-bold uppercase text-purple-500">Thailand IDF Database</div>
                        <div class="text-lg font-black text-slate-800 dark:text-white mt-0.5">${window.MagicDB.thailandProvinces.length} Provinces</div>
                        <div class="text-[10px] text-slate-400">5-Yr to 100-Yr Return Periods</div>
                    </div>
                </div>
                <div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                    <table class="w-full text-xs text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-100 dark:bg-slate-900 text-slate-500 uppercase text-[10px]">
                                <th class="p-2.5">Discipline</th>
                                <th class="p-2.5">SSOT Parameter</th>
                                <th class="p-2.5 font-mono">Store Key</th>
                                <th class="p-2.5 text-right">Live Active Value</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-700/60">
                            ${rows.map(r => `
                                <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                    <td class="p-2.5 font-semibold text-slate-500">${r.disc}</td>
                                    <td class="p-2.5 font-bold text-slate-800 dark:text-slate-200">${r.label}</td>
                                    <td class="p-2.5 font-mono text-[11px] text-indigo-500">${r.key}</td>
                                    <td class="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">${r.val}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            modal.classList.remove('hidden');
        }
    };
})();
