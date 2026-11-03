// ============================================================================
// M.A.G.I.C. Central Reactive State Store & Cross-Module SSOT Bus
// File: js/core/magic-store.js
// ============================================================================

(function () {
    const STORAGE_KEY = 'magic_ssot_store_v3';

    const defaultSharedState = {
        // Mechanical & HVAC shared outputs
        hvacCoolingLoadKw: 70.0,
        hvacCoolingLoadRt: 19.9,
        hvacSupplyAirLps: 2500.0,
        hvacRoomCoolingKw: 32.0,
        hvacRoomSupplyLps: 1850.0,
        ductFlowLps: 1000.0,
        ductSizeText: 'Ø450 mm',
        pipeFlowLpm: 287.0,
        pipeSizeText: 'DN65',
        ctHeatRejectionKw: 3500.0,
        ctMakeupM3Day: 118.8,
        roiPaybackYears: 3.3,
        fuelTotalLiters: 1380,

        // Electrical shared outputs
        elecConnectedKw: 0.0,
        elecConnectedKva: 0.0,
        wiringLoadKw: 15.0,
        wiringAmps: 25.47,
        wiringBreakerAt: 32,
        wiringCableSize: '6 mm²',
        transformerKva: 500,
        transformerFlc: 721.7,
        transformerBreakerAt: 1000,
        transformerIscKa: 12.03,
        motorPowerKw: 7.5,
        motorFlc: 14.5,
        motorBreakerAt: 40,
        shortCircuitKa: 15.2,
        starterLineCurrentA: 87.0,

        // Plumbing shared outputs
        waterTotalWsfu: 61.0,
        waterPeakGpm: 28.0,
        waterTankM3: 61.0,
        stormFlowLps: 50.0,
        stormPipeMm: 200,
        pondVolumeM3: 120.0,

        // Fire Protection shared outputs
        sprinklerHeadGpm: 14.8,
        sprinklerDensity: 0.10,
        sprinklerAreaFt2: 1500,
        sprinklerDemandGpm: 173,
        esfrHeadSpec: 'K-25.2 ESFR',
        fireWaterTotalGpm: 475.0,
        fireWaterPumpGpm: 500,
        fireWaterTankM3: 118.7,

        // Metadata on last updated source
        _lastUpdated: {}
    };

    let state = Object.assign({}, defaultSharedState);
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            state = Object.assign({}, defaultSharedState, parsed);
        }
    } catch (e) { }

    const listeners = [];

    function save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (e) { }
    }

    function notify(changedKeys, sourceModule) {
        listeners.forEach(fn => {
            try { fn(state, changedKeys, sourceModule); } catch (e) { }
        });
        if (typeof window.updateLandingBadges === 'function') {
            window.updateLandingBadges();
        }
    }

    window.MagicStore = {
        get(key) {
            return key ? state[key] : Object.assign({}, state);
        },

        set(key, value, sourceModule = 'system') {
            if (state[key] === value) return;
            state[key] = value;
            state._lastUpdated[key] = { source: sourceModule, time: new Date().toLocaleTimeString() };
            save();
            notify([key], sourceModule);
        },

        batchSet(updates, sourceModule = 'system') {
            const changed = [];
            Object.keys(updates).forEach(k => {
                if (state[k] !== updates[k]) {
                    state[k] = updates[k];
                    state._lastUpdated[k] = { source: sourceModule, time: new Date().toLocaleTimeString() };
                    changed.append(k);
                }
            });
            if (changed.length > 0) {
                save();
                notify(changed, sourceModule);
            }
        },

        publish(updates, sourceModule = 'system') {
            Object.keys(updates).forEach(k => {
                state[k] = updates[k];
                if (!state._lastUpdated) state._lastUpdated = {};
                state._lastUpdated[k] = { source: sourceModule, time: new Date().toLocaleTimeString() };
            });
            save();
            notify(Object.keys(updates), sourceModule);
        },

        subscribe(fn) {
            if (typeof fn === 'function') listeners.push(fn);
        },

        reset() {
            state = Object.assign({}, defaultSharedState);
            save();
            notify(Object.keys(state), 'reset');
        },

        exportState() {
            return JSON.parse(JSON.stringify(state));
        },

        importState(newState) {
            if (!newState || typeof newState !== 'object') return;
            state = Object.assign({}, defaultSharedState, newState);
            save();
            notify(Object.keys(state), 'import');
        },

        // Cross-Module SSOT Data Pull Definitions
        syncDefinitions: {
            ductSizerPage: [
                {
                    label: "Pull Supply Air from System Analyzer",
                    getDesc: () => `${(state.hvacSupplyAirLps || 0).toFixed(0)} LPS`,
                    apply: () => {
                        if (typeof setDuctSystem === 'function') setDuctSystem('SI');
                        const fl = document.getElementById('duct_flow');
                        const un = document.getElementById('duct_unit');
                        if (fl && un) {
                            un.value = 'LPS';
                            fl.value = (state.hvacSupplyAirLps || 1000).toFixed(0);
                            if (typeof updateDuctSizer === 'function') updateDuctSizer();
                        }
                    }
                },
                {
                    label: "Pull Supply Air from Room Load Analyzer",
                    getDesc: () => `${(state.hvacRoomSupplyLps || 0).toFixed(0)} LPS`,
                    apply: () => {
                        if (typeof setDuctSystem === 'function') setDuctSystem('SI');
                        const fl = document.getElementById('duct_flow');
                        const un = document.getElementById('duct_unit');
                        if (fl && un) {
                            un.value = 'LPS';
                            fl.value = (state.hvacRoomSupplyLps || 1000).toFixed(0);
                            if (typeof updateDuctSizer === 'function') updateDuctSizer();
                        }
                    }
                }
            ],
            pipeSizerPage: [
                {
                    label: "Pull Cooling Load from System Analyzer",
                    getDesc: () => `${(state.hvacCoolingLoadKw || 0).toFixed(1)} kW`,
                    apply: () => {
                        if (typeof setPipeSystem === 'function') setPipeSystem('SI');
                        const cap = document.getElementById('pipe_calc_cap');
                        if (cap) {
                            cap.value = (state.hvacCoolingLoadKw || 100).toFixed(1);
                            if (typeof updatePipeCalc === 'function') updatePipeCalc();
                            if (typeof applyPipeCalcFlow === 'function') applyPipeCalcFlow();
                        }
                    }
                }
            ],
            ctPage: [
                {
                    label: "Pull Chiller Load from System Analyzer",
                    getDesc: () => `${(state.hvacCoolingLoadKw || 0).toFixed(1)} kW`,
                    apply: () => {
                        const chk = document.getElementById('ct_use_calc');
                        const cap = document.getElementById('ct_calc_cap');
                        const unit = document.getElementById('ct_calc_cap_unit');
                        if (chk && cap && unit) {
                            chk.checked = true;
                            unit.value = 'kW';
                            cap.value = (state.hvacCoolingLoadKw || 100).toFixed(1);
                            if (typeof toggleCtCalc === 'function') toggleCtCalc();
                        }
                    }
                }
            ],
            wiringPage: [
                {
                    label: "Pull Motor Rating from Motor Selector",
                    getDesc: () => `${state.motorPowerKw || 7.5} kW`,
                    apply: () => {
                        const loadEl = document.getElementById('wire_load');
                        const unitEl = document.getElementById('wire_load_unit');
                        if (loadEl && unitEl) {
                            unitEl.value = 'kW';
                            loadEl.value = state.motorPowerKw || 7.5;
                            if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('wire');
                            if (typeof calcWiring === 'function') calcWiring();
                        }
                    }
                },
                {
                    label: "Pull Total Load from Electrical Load Estimator",
                    getDesc: () => `${(state.elecConnectedKw || 0).toFixed(1)} kW`,
                    apply: () => {
                        if ((state.elecConnectedKw || 0) <= 0) return;
                        const loadEl = document.getElementById('wire_load');
                        const unitEl = document.getElementById('wire_load_unit');
                        if (loadEl && unitEl) {
                            unitEl.value = 'kW';
                            loadEl.value = state.elecConnectedKw.toFixed(1);
                            if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('wire');
                            if (typeof calcWiring === 'function') calcWiring();
                        }
                    }
                }
            ],
            transformerPage: [
                {
                    label: "Pull Connected kVA from Electrical Load Estimator",
                    getDesc: () => `${(state.elecConnectedKva || 0).toFixed(1)} kVA`,
                    apply: () => {
                        const kva = state.elecConnectedKva || 0;
                        if (kva <= 0) return;
                        const nameEl = document.getElementById('trans_load_name');
                        const valEl = document.getElementById('trans_load_val');
                        if (nameEl && valEl && typeof addTransLoad === 'function') {
                            nameEl.value = 'Equipment Schedule Total';
                            valEl.value = kva.toFixed(1);
                            addTransLoad();
                            if (typeof recommendTransformer === 'function') recommendTransformer();
                        }
                    }
                }
            ],
            shortCircuitPage: [
                {
                    label: "Pull Fault Level (Isc) from Transformer Sizer",
                    getDesc: () => `${(state.transformerIscKa || 12.0).toFixed(2)} kA (${state.transformerKva || 500} kVA)`,
                    apply: () => {
                        const iscEl = document.getElementById('sc_isc_source');
                        if (iscEl && state.transformerIscKa) {
                            iscEl.value = state.transformerIscKa.toFixed(2);
                            if (typeof calcSC === 'function') calcSC();
                        }
                    }
                }
            ],
            starterSimulatorPage: [
                {
                    label: "Pull Motor kW from Motor Selector",
                    getDesc: () => `${state.motorPowerKw || 7.5} kW`,
                    apply: () => {
                        const kwEl = document.getElementById('sim_motor_kw');
                        if (kwEl) {
                            kwEl.value = state.motorPowerKw || 7.5;
                            if (typeof syncMotorCatalogFromInput === 'function') syncMotorCatalogFromInput('sim');
                            if (typeof calcStarter === 'function') calcStarter();
                        }
                    }
                }
            ],
            fireWaterPage: [
                {
                    label: "Pull Area & Density from Sprinkler Hydraulic Calculator",
                    getDesc: () => `${(state.sprinklerDensity || 0.10).toFixed(2)} gpm/ft² × ${state.sprinklerAreaFt2 || 1500} ft²`,
                    apply: () => {
                        const dEl = document.getElementById('fw_density');
                        const aEl = document.getElementById('fw_area');
                        const hEl = document.getElementById('fw_hazard');
                        if (dEl && aEl) {
                            if (hEl) hEl.value = 'custom';
                            dEl.value = (state.sprinklerDensity || 0.15).toFixed(2);
                            aEl.value = state.sprinklerAreaFt2 || 1500;
                            if (typeof calcFireWater === 'function') calcFireWater();
                        }
                    }
                }
            ]
        }
    };
})();
