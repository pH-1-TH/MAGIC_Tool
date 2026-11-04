// ============================================================================
// M.A.G.I.C. Core UI Utilities, View Switcher, Info Modal & Sound Controller
// File: js/core/magic-ui.js
// ============================================================================

function setRandomQuote() {
    const quotes = [
        "Science is about knowing; engineering is about doing. – Henry Petroski",
        "To the optimist, the glass is half full. To the pessimist, the glass is half empty. To the engineer, the glass is twice as big as it needs to be.",
        "Engineers like to solve problems. If there are no problems handily available, they will create their own problems. – Scott Adams",
        "Any idiot can build a bridge that stands, but it takes an engineer to build a bridge that barely stands.",
        "The fewer moving parts, the better. Exactly. No truer words were ever spoken in the context of engineering. – Christian Koch",
        "There's nothing I believe in more strongly than getting young people interested in science and engineering, for a better tomorrow. – Bill Nye",
        "Strive for perfection in everything you do. Take the best that exists and make it better. – Sir Henry Royce",
        "Engineering is the closest thing to magic that exists in the world. – Elon Musk",
        "Scientists study the world as it is; engineers create the world that has never been. – Theodore von Kármán",
        "Perfection is achieved, not when there is nothing more to add, but when there is nothing left to take away. – Antoine de Saint-Exupéry",
        "A good scientist is a person with original ideas. A good engineer is a person who makes a design that works with as few original ideas as possible. – Freeman Dyson",
        "Aerodynamics are for people who can't build engines. – Enzo Ferrari",
        "The engineer has been, and is, a maker of history. – James Kip Finch"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    const marqueeEl = document.getElementById('marqueeContent');
    if (marqueeEl) {
        marqueeEl.innerHTML = `✦ M.A.G.I.C. Engineering Tools V. 1.11 &nbsp; | &nbsp; ${randomQuote} ✦`;
    }
}

function toggleHamburgerMenu(forceState) {
    const drawer = document.getElementById('hamburgerDrawer');
    if (!drawer) return;
    const isHidden = drawer.classList.contains('hidden');
    const shouldOpen = typeof forceState === 'boolean' ? forceState : isHidden;
    if (shouldOpen) {
        drawer.classList.remove('hidden');
    } else {
        drawer.classList.add('hidden');
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        toggleHamburgerMenu(false);
    }
});

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    const isDark = document.documentElement.classList.contains('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
    refreshActiveCharts();
}

function updateThemeIcon() {
    const isDark = document.documentElement.classList.contains('dark');
    // Show Sun icon (themeIconLight) when in Dark mode, Show Moon icon (themeIconDark) when in Light mode
    document.getElementById('themeIconLight').style.display = isDark ? 'block' : 'none';
    document.getElementById('themeIconDark').style.display = isDark ? 'none' : 'block';
}

function switchView(viewId) {
    toggleHamburgerMenu(false);
    const views = [
        'mainMenuPage', 'globalSettingsPage', 'equipmentSchedulePage', 'analyzerPage', 'loadAnalyzerPage', 'multiStagePage',
        'ductSizerPage', 'pipeSizerPage', 'ctPage', 'roiPage', 'eqListPage',
        'wiringPage', 'transformerPage', 'motorSizerPage', 'shortCircuitPage',
        'waterDemandPage', 'stormPage', 'pondPage', 'sprinklerPage',
        'warehouseSprinklerPage', 'fireWaterPage', 'fuelTankPage', 'starterSimulatorPage'
    ];
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) {
            el.classList.add('hidden');
            el.classList.remove('block');
        }
    });

    const target = document.getElementById(viewId);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('block');
    }

    if (viewId === 'globalSettingsPage' && window.MagicSettings && typeof window.MagicSettings.loadGlobalPageUI === 'function') {
        window.MagicSettings.loadGlobalPageUI();
    }
    if (viewId === 'equipmentSchedulePage' && window.MagicEquipment) {
        window.MagicEquipment.render();
    }

    refreshActiveCharts();
    if (viewId === 'multiStagePage' && ms_nodes.length === 0) {
        initMultiStage();
        syncMsState();
    }
    window.scrollTo(0, 0);
}
function copyToClipboard(text, btnElement) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        const originalSvg = btnElement.innerHTML;
        btnElement.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>`;
        setTimeout(() => { btnElement.innerHTML = originalSvg; }, 1500);
    } catch (err) { }
    document.body.removeChild(textArea);
}

function refreshActiveCharts() {
    const activeView = [
        'mainMenuPage', 'analyzerPage', 'loadAnalyzerPage', 'multiStagePage',
        'ductSizerPage', 'pipeSizerPage', 'ctPage', 'roiPage', 'eqListPage',
        'wiringPage', 'transformerPage', 'unbalancedLoadPage', 'waterDemandPage', 'sprinklerPage', 'fireWaterPage'
    ].find(id => {
        const el = document.getElementById(id);
        return el && !el.classList.contains('hidden');
    });

    if (activeView === 'analyzerPage') updateAll();
    else if (activeView === 'loadAnalyzerPage') updateLoadAnalyzer();
    else if (activeView === 'multiStagePage') {
        syncMsState();
        if (ms_nodes.length > 0) renderMsInputs();
    }
    else if (activeView === 'ductSizerPage') updateDuctSizer();
    else if (activeView === 'pipeSizerPage') {
        if (typeof updatePipeCalc === 'function') updatePipeCalc();
        updatePipeSizer();
    }
    else if (activeView === 'ctPage') updateCoolingTower();
    else if (activeView === 'roiPage') updateROI();
    else if (activeView === 'wiringPage') calcWiring();
    else if (activeView === 'transformerPage') calcTransformer();
    else if (activeView === 'unbalancedLoadPage') calcUnbalanced();
    else if (activeView === 'waterDemandPage') calcWater();
    else if (activeView === 'sprinklerPage') calcFire();
    else if (activeView === 'fireWaterPage') calcFireWater();
}


function showInfo(moduleKey) {
    const modal = document.getElementById('infoModal');
    const titleEl = document.getElementById('modalTitle');
    const contentEl = document.getElementById('modalContent');
    if (!modal || !titleEl || !contentEl) return;

    const kb = (window.MagicDB && window.MagicDB.knowledgeBase && window.MagicDB.knowledgeBase[moduleKey]) || {
        title: "Engineering Methodology & Standard Reference",
        standard: "ASHRAE / EIT 2001-64 / IEC / NFPA",
        summary: "Standardized MEP calculation module.",
        formulas: []
    };

    titleEl.innerText = kb.title;
    contentEl.innerHTML = `
        <div class="space-y-4">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <span>Standard Reference:</span>
                <span>${kb.standard}</span>
            </div>
            <p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">${kb.summary}</p>
            ${kb.formulas && kb.formulas.length ? `
                <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div class="text-xs font-bold uppercase tracking-wider text-slate-400">Governing Equations</div>
                    ${kb.formulas.map(f => `<div class="font-mono text-xs text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 p-2 rounded border border-slate-100 dark:border-slate-700">${f}</div>`).join('')}
                </div>
            ` : ''}
        </div>
    `;
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('infoModal');
    if (modal) modal.classList.add('hidden');
}

const hoverAudio = new Audio('https://raw.githubusercontent.com/kapishdima/soundcn/main/public/sounds/click.mp3');
hoverAudio.volume = 0.2;
let audioInitialized = false;

function initHoverSounds() {
    const buttons = document.querySelectorAll('#mainMenuPage button.group, .module-card-btn');
    buttons.forEach(btn => {
        if (btn.dataset.soundBound) return;
        btn.dataset.soundBound = 'true';
        btn.addEventListener('mouseenter', () => {
            if (audioInitialized) {
                hoverAudio.currentTime = 0;
                hoverAudio.play().catch(() => {});
            }
        });
    });
}

document.addEventListener('mousedown', () => {
    if (!audioInitialized) {
        hoverAudio.play().then(() => {
            hoverAudio.pause();
            audioInitialized = true;
        }).catch(() => {});
    }
}, { once: true });
