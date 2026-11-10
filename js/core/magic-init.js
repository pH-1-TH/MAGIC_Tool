// ============================================================================
// M.A.G.I.C. Application Bootstrap & Lifecycle Controller
// File: js/core/magic-init.js
// ============================================================================

window.addEventListener('load', () => {
    try {
        if (typeof updateThemeIcon === 'function') updateThemeIcon();
        if (typeof setRandomQuote === 'function') setRandomQuote();
        if (typeof populateCategories === 'function') populateCategories();
        if (typeof populateWiringTable === 'function') populateWiringTable();
        if (typeof populateWSFUTable === 'function') populateWSFUTable();
        if (typeof populateProvinceDropdowns === 'function') populateProvinceDropdowns();

        // Set SI Defaults explicitly where needed
        if (document.getElementById('flowUnit')) document.getElementById('flowUnit').value = 'LPS';
        if (document.getElementById('duct_unit')) document.getElementById('duct_unit').value = 'LPS';
        if (document.getElementById('pipe_unit')) document.getElementById('pipe_unit').value = 'LPM';

        // Subscribe Landing Page Badges & Sync Buttons to SSOT Store
        if (window.MagicStore && typeof window.updateLandingBadges === 'function') {
            window.MagicStore.subscribe(() => window.updateLandingBadges());
        }

        // Inject Plug-in Module Toolbars (SSOT Sync, Local Settings, Separation Reports, Formula Ref)
        if (window.MagicRegistry && typeof window.MagicRegistry.injectModuleToolbars === 'function') {
            window.MagicRegistry.injectModuleToolbars();
        }

        // Render Global Project Header Badges
        if (window.MagicSettings && typeof window.MagicSettings.renderGlobalHeaderBadges === 'function') {
            window.MagicSettings.renderGlobalHeaderBadges();
        }

        // Run initial calculation pass across all 20 modules to populate SSOT Store & Landing Badges
        if (typeof updateAll === 'function') updateAll();
        if (typeof updateLoadAnalyzer === 'function') updateLoadAnalyzer();
        if (typeof updateDuctSizer === 'function') updateDuctSizer();
        if (typeof updatePipeCalc === 'function') updatePipeCalc();
        if (typeof updatePipeSizer === 'function') updatePipeSizer();
        if (typeof updateCoolingTower === 'function') updateCoolingTower();
        if (typeof updateROI === 'function') updateROI();
        if (typeof renderEqTables === 'function') renderEqTables();
        if (typeof calcWiring === 'function') calcWiring();
        if (typeof calcTransformer === 'function') calcTransformer();
        if (typeof calcMotor === 'function') calcMotor();
        if (typeof calcSC === 'function') calcSC();
        if (typeof calcWater === 'function') calcWater();
        if (typeof calcStorm === 'function') calcStorm();
        if (typeof calcPond === 'function') calcPond();
        if (typeof calcFire === 'function') calcFire();
        if (typeof calcFireWater === 'function') calcFireWater();
        if (typeof calcESFR === 'function') calcESFR();
        if (typeof updateFuel === 'function') updateFuel();
        if (typeof updatePUE === 'function') updatePUE();
        if (typeof calcStarter === 'function') calcStarter();

        if (typeof window.updateLandingBadges === 'function') {
            window.updateLandingBadges();
        }

        if (typeof initHoverSounds === 'function') initHoverSounds();
        if (typeof window.bindAllCanvasesTouchBridge === 'function') {
            window.bindAllCanvasesTouchBridge();
        }

        let resizeTimer = null;
        const handleViewportChange = () => {
            if (resizeTimer) clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (typeof refreshActiveCharts === 'function') refreshActiveCharts();
            }, 60);
        };
        window.addEventListener('resize', handleViewportChange);
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                if (typeof refreshActiveCharts === 'function') refreshActiveCharts();
            }, 180);
        });
    } catch (err) {
        console.error('M.A.G.I.C. initialization error:', err);
    }
});
