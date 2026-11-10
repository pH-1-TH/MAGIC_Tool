// ============================================================================
// M.A.G.I.C. Unified Interactive Canvas Chart Engine
// File: js/core/magic-charts.js
// Includes: Psychrometric Chart, Log-Log Nomograms, NFPA 13 Graph,
//           Fire Water Consumption, Hunter's Curve, COC Curve, Chiller ROI,
//           Data Center PUE Curve + Multi-Device Touch/Pointer Bridge
// ============================================================================

/**
 * Universal Touch-to-Mouse Event Bridge for Interactive Engineering Canvases
 * Enables finger tap, scrub, and drag-and-drop on iPhone 16 Pro, Samsung Galaxy Ultra,
 * and iPad/tablets across all 9 interactive canvas charts without breaking page scroll.
 */
function bindCanvasTouchBridge(canvas) {
    if (!canvas || canvas.dataset.touchBridgeBound === 'true') return;
    canvas.dataset.touchBridgeBound = 'true';

    const dispatchSynthMouse = (type, touch, target) => {
        if (!touch) return;
        const evt = new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window,
            clientX: touch.clientX,
            clientY: touch.clientY,
            screenX: touch.screenX,
            screenY: touch.screenY,
            button: 0,
            buttons: type === 'mouseup' ? 0 : 1
        });
        (target || canvas).dispatchEvent(evt);
    };

    canvas.addEventListener('touchstart', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const touch = e.touches[0];
        dispatchSynthMouse('mousemove', touch, canvas);
        dispatchSynthMouse('mousedown', touch, canvas);
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
        if (!e.touches || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const r = canvas.getBoundingClientRect();
        const relX = touch.clientX - r.left;
        const relY = touch.clientY - r.top;
        // Prevent vertical page scroll while actively dragging/scrubbing inside the plot area
        if (relX >= 36 && relX <= r.width - 24 && relY >= 16 && relY <= r.height - 24) {
            if (e.cancelable) e.preventDefault();
        }
        dispatchSynthMouse('mousemove', touch, canvas);
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        const touch = (e.changedTouches && e.changedTouches[0]) || null;
        if (touch) {
            dispatchSynthMouse('mouseup', touch, window);
            dispatchSynthMouse('click', touch, canvas);
        }
    }, { passive: true });

    canvas.addEventListener('touchcancel', (e) => {
        const touch = (e.changedTouches && e.changedTouches[0]) || null;
        if (touch) dispatchSynthMouse('mouseup', touch, window);
        canvas.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    }, { passive: true });
}

function bindAllCanvasesTouchBridge() {
    document.querySelectorAll('canvas').forEach(bindCanvasTouchBridge);
}
window.bindCanvasTouchBridge = bindCanvasTouchBridge;
window.bindAllCanvasesTouchBridge = bindAllCanvasesTouchBridge;

function setNfpaPoint(density, area) {
    const areaEl = document.getElementById('fire_area');
    const densEl = document.getElementById('fire_density');
    if (areaEl) areaEl.value = Math.round(area);
    if (densEl) densEl.value = Number(density).toFixed(2);
    calcFire();
}

function drawNfpaChart(area, density) {
    const canvas = document.getElementById('nfpaChart');
    if (!canvas) return;
    bindCanvasTouchBridge(canvas);

    // High-DPI responsive canvas setup
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const logicalW = rect.width > 100 ? rect.width : 780;
    const logicalH = rect.height > 100 ? rect.height : 430;
    if (canvas.width !== Math.round(logicalW * dpr) || canvas.height !== Math.round(logicalH * dpr)) {
        canvas.width = Math.round(logicalW * dpr);
        canvas.height = Math.round(logicalH * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.classList.contains('dark');
    ctx.clearRect(0, 0, logicalW, logicalH);

    // Margins for dual axes (ft² left, m² right, gpm/ft² bottom, mm/min top)
    const margins = { left: 68, right: 64, top: 48, bottom: 50 };
    const w = logicalW - margins.left - margins.right;
    const h = logicalH - margins.top - margins.bottom;

    // Official NFPA 13 Figure 19.3.3.1.1 bounds
    const minD = 0.05, maxD = 0.40;
    const minA = 1500, maxA = 5000;
    const getX = (d) => margins.left + ((d - minD) / (maxD - minD)) * w;
    const getY = (a) => margins.top + h - ((a - minA) / (maxA - minA)) * h;

    window._nfpaChartState = { area, density, hoverPt: window._nfpaChartState?.hoverPt ?? null };
    // Attach interactive click & hover handlers once
    if (!canvas.dataset.interactiveBound) {
        canvas.dataset.interactiveBound = 'true';
        const getCoords = (evt) => {
            const r = canvas.getBoundingClientRect();
            const mx = evt.clientX - r.left;
            const my = evt.clientY - r.top;
            const m = { left: 68, right: 64, top: 48, bottom: 50 };
            const pw = r.width - m.left - m.right;
            const ph = r.height - m.top - m.bottom;
            if (mx < m.left || mx > r.width - m.right || my < m.top || my > r.height - m.bottom) return null;
            const dVal = Math.max(minD, Math.min(maxD, minD + ((mx - m.left) / pw) * (maxD - minD)));
            const aVal = Math.max(minA, Math.min(maxA, minA + ((m.top + ph - my) / ph) * (maxA - minA)));
            return { d: Math.round(dVal * 100) / 100, a: Math.round(aVal / 50) * 50 };
        };
        let dragging = false;
        canvas.addEventListener('mousedown', (e) => {
            dragging = true;
            const pt = getCoords(e);
            if (pt) setNfpaPoint(pt.d, pt.a);
        });
        canvas.addEventListener('mousemove', (e) => {
            const pt = getCoords(e);
            if (dragging && pt) {
                setNfpaPoint(pt.d, pt.a);
            } else if (window._nfpaChartState) {
                window._nfpaChartState.hoverPt = pt;
                drawNfpaChart(window._nfpaChartState.area, window._nfpaChartState.density);
            }
        });
        canvas.addEventListener('mouseleave', () => {
            if (window._nfpaChartState && window._nfpaChartState.hoverPt !== null) {
                window._nfpaChartState.hoverPt = null;
                drawNfpaChart(window._nfpaChartState.area, window._nfpaChartState.density);
            }
        });
        window.addEventListener('mouseup', () => { dragging = false; });
    }

    // 1. Minor Gridlines (every 0.01 gpm/ft² and every 200 ft² above 2000 + 100 ft² steps)
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.45)' : 'rgba(226, 232, 240, 0.85)';
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let dStep = 5; dStep <= 40; dStep += 1) {
        const d = dStep / 100;
        const x = getX(d);
        ctx.moveTo(x, margins.top);
        ctx.lineTo(x, margins.top + h);
    }
    const minorAreas = [
        1500, 1600, 1700, 1800, 1900, 2000,
        2200, 2400, 2500, 2600, 2800, 3000,
        3200, 3400, 3600, 3800, 4000,
        4200, 4400, 4600, 4800, 5000
    ];
    minorAreas.forEach(a => {
        const y = getY(a);
        ctx.moveTo(margins.left, y);
        ctx.lineTo(margins.left + w, y);
    });
    ctx.stroke();

    // 2. Major Gridlines (every 0.05 gpm/ft² and major NFPA area tiers)
    ctx.strokeStyle = isDark ? '#475569' : '#94a3b8';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    const majorDensities = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35, 0.40];
    majorDensities.forEach(d => {
        const x = getX(d);
        ctx.moveTo(x, margins.top);
        ctx.lineTo(x, margins.top + h);
    });
    const majorAreas = [
        { ft2: 1500, m2: '140' },
        { ft2: 2000, m2: '185' },
        { ft2: 2500, m2: '230' },
        { ft2: 3000, m2: '280' },
        { ft2: 4000, m2: '370' },
        { ft2: 5000, m2: '465' }
    ];
    majorAreas.forEach(item => {
        const y = getY(item.ft2);
        ctx.moveTo(margins.left, y);
        ctx.lineTo(margins.left + w, y);
    });
    ctx.stroke();

    // Outer frame
    ctx.strokeStyle = isDark ? '#94a3b8' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margins.left, margins.top, w, h);

    // 3. Axis Tick Labels & Titles
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';

    // Bottom X-Axis: Density (gpm/ft²) & Top X-Axis: Density (mm/min)
    const mmMinLabels = ['2.0', '4.1', '6.1', '8.2', '10.2', '12.2', '14.3', '16.3'];
    majorDensities.forEach((d, idx) => {
        const x = getX(d);
        ctx.fillText(d.toFixed(2), x, margins.top + h + 18);
        ctx.fillText(mmMinLabels[idx], x, margins.top - 10);
    });

    // Axis Titles (Top & Bottom)
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('Density (gpm/ft²)', margins.left + w / 2, margins.top + h + 38);
    ctx.fillText('Density (mm/min)', margins.left + w / 2, margins.top - 28);

    // Left Y-Axis: Area (ft²) & Right Y-Axis: Area (m²)
    ctx.font = '600 11px Inter, sans-serif';
    majorAreas.forEach(item => {
        const y = getY(item.ft2);
        ctx.textAlign = 'right';
        ctx.fillText(item.ft2.toString(), margins.left - 8, y + 4);
        ctx.textAlign = 'left';
        ctx.fillText(item.m2, margins.left + w + 8, y + 4);
    });

    // Vertical Axis Titles (Left & Right)
    ctx.save();
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.translate(18, margins.top + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Area of sprinkler operation (ft²)', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.translate(logicalW - 14, margins.top + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Area of sprinkler operation (m²)', 0, 0);
    ctx.restore();

    // 4. Official NFPA 13 Sloped Hazard Curves (Figure 19.3.3.1.1)
    const curves = [
        { l: 'Light', pts: [{ d: 0.10, a: 1500 }, { d: 0.07, a: 3000 }], c: '#3b82f6' },
        { l: 'Ordinary 1', pts: [{ d: 0.15, a: 1500 }, { d: 0.10, a: 4000 }], c: '#10b981' },
        { l: 'Ordinary 2', pts: [{ d: 0.20, a: 1500 }, { d: 0.15, a: 4000 }], c: '#f59e0b' },
        { l: 'Extra hazard Group 1', pts: [{ d: 0.30, a: 2500 }, { d: 0.20, a: 5000 }], c: '#ef4444' },
        { l: 'Extra hazard Group 2', pts: [{ d: 0.40, a: 2500 }, { d: 0.30, a: 5000 }], c: '#e11d48' }
    ];

    curves.forEach(curve => {
        const x1 = getX(curve.pts[0].d);
        const y1 = getY(curve.pts[0].a);
        const x2 = getX(curve.pts[1].d);
        const y2 = getY(curve.pts[1].a);

        // Draw sloped line
        ctx.beginPath();
        ctx.strokeStyle = curve.c;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Endpoint nodes
        [ [x1, y1], [x2, y2] ].forEach(([px, py]) => {
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
            ctx.fillStyle = curve.c;
            ctx.fill();
        });

        // Draw label rotated parallel to the sloped curve
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        let angle = Math.atan2(y2 - y1, x2 - x1);
        if (angle < -Math.PI / 2 || angle > Math.PI / 2) {
            angle += Math.PI;
        }
        ctx.save();
        ctx.translate(midX, midY);
        ctx.rotate(angle);
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        // Background pill for readability over grid
        const textW = ctx.measureText(curve.l).width + 8;
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(248, 250, 252, 0.9)';
        ctx.fillRect(-textW / 2, -16, textW, 13);
        ctx.fillStyle = curve.c;
        ctx.fillText(curve.l, 0, -6);
        ctx.restore();
    });

    // 5. Operating Point Crosshair & Marker
    if (area > 0 && density > 0) {
        const clampedD = Math.max(minD, Math.min(maxD, density));
        const clampedA = Math.max(minA, Math.min(maxA, area));
        const px = getX(clampedD);
        const py = getY(clampedA);

        // Dashed crosshair lines
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, margins.top + h);
        ctx.lineTo(px, py);
        ctx.lineTo(margins.left, py);
        ctx.stroke();
        ctx.restore();

        // Outer glow & main marker
        ctx.beginPath();
        ctx.arc(px, py, 9, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, 5.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.stroke();

        // Coordinate callout tag
        const label = `${density.toFixed(2)} gpm/ft² @ ${Math.round(area)} ft²`;
        ctx.font = 'bold 11px Inter, sans-serif';
        const tagW = ctx.measureText(label).width + 12;
        const tagX = Math.min(margins.left + w - tagW - 4, Math.max(margins.left + 4, px + 10));
        const tagY = Math.max(margins.top + 18, py - 10);
        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY - 14, tagW, 20, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.textAlign = 'left';
        ctx.fillText(label, tagX + 6, tagY);
    }

    // 6. Hover Crosshair & Tooltip
    const hPt = window._nfpaChartState?.hoverPt;
    if (hPt) {
        const hx = getX(hPt.d);
        const hy = getY(hPt.a);
        const hFlow = hPt.d * hPt.a * 1.15;

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(hx, margins.top);
        ctx.lineTo(hx, margins.top + h);
        ctx.moveTo(margins.left, hy);
        ctx.lineTo(margins.left + w, hy);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();

        const l1 = `Density: ${hPt.d.toFixed(2)} gpm/ft² (${(hPt.d * 40.746).toFixed(1)} mm/min)`;
        const l2 = `Area: ${hPt.a} ft² (${Math.round(hPt.a * 0.092903)} m²)`;
        const l3 = `Est. Demand (+15%): ${Math.round(hFlow)} GPM (${Math.round(hFlow * 3.785)} LPM)`;
        ctx.font = '600 10.5px Inter, sans-serif';
        const bw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width, ctx.measureText(l3).width) + 18;
        const bh = 56;
        let tx = hx + 12;
        if (tx + bw > margins.left + w) tx = hx - bw - 12;
        let ty = hy - bh - 8;
        if (ty < margins.top + 4) ty = hy + 10;

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(tx, ty, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.fillText(l1, tx + 9, ty + 6);
        ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
        ctx.fillText(l2, tx + 9, ty + 22);
        ctx.fillStyle = '#10b981';
        ctx.fillText(l3, tx + 9, ty + 38);
    }

    ctx.restore();
}


function drawChart(canvasId, points, lines, boundary = null) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // High-DPI responsive canvas setup
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const defaultH = canvasId === 'ms_psyChart' ? 480 : 410;
    const width = rect.width > 120 ? rect.width : 900;
    const height = rect.height > 120 ? Math.round(width * (defaultH / 900)) : defaultH;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.classList.contains('dark');
    const margins = { left: 66, right: 34, top: 24, bottom: 44 };
    const chartW = width - margins.left - margins.right;
    const chartH = height - margins.top - margins.bottom;

    const maxTdb = 50, maxW = 0.030;
    const getX = (Tdb) => margins.left + (Tdb / maxTdb) * chartW;
    const getY = (W) => height - margins.bottom - (W / maxW) * chartH;

    const prevState = window._psyChartStates[canvasId] || { hoverInfo: null, dragIndex: null };
    window._psyChartStates[canvasId] = {
        ...prevState,
        points, lines, boundary,
        margins, maxTdb, maxW
    };

    // Bind interactive Drag-and-Drop & Hover listeners once per canvas
    if (!canvas.dataset.psyInteractiveBound) {
        canvas.dataset.psyInteractiveBound = 'true';

        const getEventCoords = (evt) => {
            const r = canvas.getBoundingClientRect();
            const mx = evt.clientX - r.left;
            const my = evt.clientY - r.top;
            const st = window._psyChartStates[canvasId];
            const m = st.margins;
            const cw = r.width - m.left - m.right;
            const ch = r.height - m.top - m.bottom;

            // Convert pixel to (Tdb, W)
            let rawTdb = ((mx - m.left) / cw) * st.maxTdb;
            let rawW = ((r.height - m.bottom - my) / ch) * st.maxW;
            const inBounds = (mx >= m.left - 10 && mx <= r.width - m.right + 10 && my >= m.top - 10 && my <= r.height - m.bottom + 10);

            const clampedTdb = Math.max(0, Math.min(st.maxTdb, rawTdb));
            const pws = 0.61078 * Math.exp((17.27 * clampedTdb) / (clampedTdb + 237.3));
            const wSat = 0.621945 * (pws / (Patm - pws));
            const clampedW = Math.max(0, Math.min(Math.min(st.maxW, wSat), rawW));

            // Hit-test existing state points (within 14px radius)
            let hitIndex = null;
            let minDist = 14;
            (st.points || []).forEach((pt, idx) => {
                if (!pt.s) return;
                const px = m.left + (pt.s.Tdb / st.maxTdb) * cw;
                const py = r.height - m.bottom - (pt.s.W / st.maxW) * ch;
                const dist = Math.hypot(mx - px, my - py);
                if (dist <= minDist) {
                    minDist = dist;
                    hitIndex = idx;
                }
            });

            return { mx, my, inBounds, tdb: clampedTdb, w: clampedW, hitIndex };
        };

        canvas.addEventListener('mousedown', (evt) => {
            const info = getEventCoords(evt);
            const st = window._psyChartStates[canvasId];
            if (info.hitIndex !== null && st.points[info.hitIndex]?.onDrag) {
                st.dragIndex = info.hitIndex;
                canvas.style.cursor = 'grabbing';
                evt.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', (evt) => {
            const info = getEventCoords(evt);
            const st = window._psyChartStates[canvasId];
            if (!st) return;

            if (st.dragIndex !== null) {
                const pt = st.points[st.dragIndex];
                canvas.style.cursor = 'grabbing';
                if (pt && typeof pt.onDrag === 'function') {
                    pt.onDrag(info.tdb, info.w);
                }
                // Update hoverInfo to follow the dragged point
                const updatedSt = window._psyChartStates[canvasId];
                const updatedPt = updatedSt.points[st.dragIndex];
                if (updatedPt && updatedPt.s) {
                    updatedSt.hoverInfo = {
                        tdb: updatedPt.s.Tdb,
                        w: updatedPt.s.W,
                        props: updatedPt.s,
                        ptIndex: st.dragIndex,
                        ptLabel: updatedPt.name || `Point ${updatedPt.l}`,
                        ptColor: updatedPt.c,
                        isDragging: true
                    };
                    drawChart(canvasId, updatedSt.points, updatedSt.lines, updatedSt.boundary);
                }
                return;
            }

            if (!info.inBounds) {
                if (st.hoverInfo !== null) {
                    st.hoverInfo = null;
                    canvas.style.cursor = 'default';
                    drawChart(canvasId, st.points, st.lines, st.boundary);
                }
                return;
            }

            if (info.hitIndex !== null) {
                const hitPt = st.points[info.hitIndex];
                canvas.style.cursor = hitPt.onDrag ? 'grab' : 'pointer';
                st.hoverInfo = {
                    tdb: hitPt.s.Tdb,
                    w: hitPt.s.W,
                    props: hitPt.s,
                    ptIndex: info.hitIndex,
                    ptLabel: hitPt.name || `Point ${hitPt.l}`,
                    ptColor: hitPt.c,
                    canDrag: !!hitPt.onDrag
                };
            } else {
                canvas.style.cursor = 'crosshair';
                const cursorProps = calcProperties(info.tdb, info.w, 'W');
                st.hoverInfo = {
                    tdb: cursorProps.Tdb,
                    w: cursorProps.W,
                    props: cursorProps,
                    ptIndex: null,
                    ptLabel: 'Cursor Air State',
                    ptColor: '#06b6d4',
                    canDrag: false
                };
            }
            drawChart(canvasId, st.points, st.lines, st.boundary);
        });

        canvas.addEventListener('mouseleave', () => {
            const st = window._psyChartStates[canvasId];
            if (st && st.dragIndex === null && st.hoverInfo !== null) {
                st.hoverInfo = null;
                canvas.style.cursor = 'default';
                drawChart(canvasId, st.points, st.lines, st.boundary);
            }
        });

        window.addEventListener('mouseup', () => {
            const st = window._psyChartStates[canvasId];
            if (st && st.dragIndex !== null) {
                st.dragIndex = null;
                canvas.style.cursor = 'grab';
                drawChart(canvasId, st.points, st.lines, st.boundary);
            }
        });
    }

    // 1. Background Grid (Tdb & W)
    ctx.beginPath();
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.65)' : 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 1;

    for (let t = 0; t <= maxTdb; t += 5) {
        const x = getX(t);
        ctx.moveTo(x, margins.top);
        ctx.lineTo(x, height - margins.bottom);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${t}°`, x, height - margins.bottom + 8);
    }

    for (let w = 0; w <= maxW + 0.0001; w += 0.005) {
        const y = getY(w);
        ctx.moveTo(margins.left, y);
        ctx.lineTo(width - margins.right, y);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(w.toFixed(3), margins.left - 8, y);
    }
    ctx.stroke();

    // Axis Titles
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 11.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Dry Bulb Temperature Tdb (°C)', margins.left + chartW / 2, height - margins.bottom + 25);

    ctx.save();
    ctx.translate(14, margins.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Humidity Ratio W (kg/kg)', 0, 0);
    ctx.restore();

    // 2. Smooth Relative Humidity Curves (20%, 40%, 60%, 80%, 100%)
    [0.2, 0.4, 0.6, 0.8, 1.0].forEach((rh) => {
        ctx.beginPath();
        ctx.strokeStyle = rh === 1.0 ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(14, 165, 233, 0.30)');
        ctx.lineWidth = rh === 1.0 ? 2.2 : 1.4;
        let started = false;
        let labelPos = null;
        for (let t = 0; t <= maxTdb; t += 0.25) {
            const pws = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
            const pw = rh * pws;
            let W = 0.621945 * (pw / (Patm - pw));
            if (W > maxW) W = maxW;

            const x = getX(t), y = getY(W);
            if (!started) {
                ctx.moveTo(x, y);
                started = true;
            } else {
                ctx.lineTo(x, y);
            }
            if (Math.abs(t - 32) < 0.15 && W < maxW * 0.95) {
                labelPos = { x, y };
            }
        }
        ctx.stroke();

        if (labelPos) {
            ctx.fillStyle = rh === 1.0 ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#64748b' : '#94a3b8');
            ctx.font = '600 9.5px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${Math.round(rh * 100)}%`, labelPos.x + 2, labelPos.y - 2);
        }
    });

    // 3. Draw Operating Boundary Zone
    if (boundary && boundary.show) {
        ctx.beginPath();
        if (boundary.humType === 'Tdp') {
            let pwMin = 0.61078 * Math.exp((17.27 * boundary.hMin) / (boundary.hMin + 237.3));
            let wMin = 0.621945 * (pwMin / (Patm - pwMin));

            let pwMax = 0.61078 * Math.exp((17.27 * boundary.hMax) / (boundary.hMax + 237.3));
            let wMax = 0.621945 * (pwMax / (Patm - pwMax));

            ctx.moveTo(getX(boundary.tMin), getY(wMin));
            ctx.lineTo(getX(boundary.tMin), getY(wMax));
            ctx.lineTo(getX(boundary.tMax), getY(wMax));
            ctx.lineTo(getX(boundary.tMax), getY(wMin));
            ctx.closePath();
        } else if (boundary.humType === 'RH') {
            let rhMin = boundary.hMin / 100;
            let rhMax = boundary.hMax / 100;

            let pwsL = 0.61078 * Math.exp((17.27 * boundary.tMin) / (boundary.tMin + 237.3));
            let wLMin = 0.621945 * ((rhMin * pwsL) / (Patm - (rhMin * pwsL)));
            let wLMax = 0.621945 * ((rhMax * pwsL) / (Patm - (rhMax * pwsL)));

            ctx.moveTo(getX(boundary.tMin), getY(wLMin));
            ctx.lineTo(getX(boundary.tMin), getY(wLMax));

            for (let t = boundary.tMin; t <= boundary.tMax; t += 0.25) {
                let pws = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
                let w = 0.621945 * ((rhMax * pws) / (Patm - (rhMax * pws)));
                ctx.lineTo(getX(t), getY(w));
            }

            let pwsR = 0.61078 * Math.exp((17.27 * boundary.tMax) / (boundary.tMax + 237.3));
            let wRMax = 0.621945 * ((rhMax * pwsR) / (Patm - (rhMax * pwsR)));
            let wRMin = 0.621945 * ((rhMin * pwsR) / (Patm - (rhMin * pwsR)));

            ctx.lineTo(getX(boundary.tMax), getY(wRMax));
            ctx.lineTo(getX(boundary.tMax), getY(wRMin));

            for (let t = boundary.tMax; t >= boundary.tMin; t -= 0.25) {
                let pws = 0.61078 * Math.exp((17.27 * t) / (t + 237.3));
                let w = 0.621945 * ((rhMin * pws) / (Patm - (rhMin * pws)));
                ctx.lineTo(getX(t), getY(w));
            }
            ctx.closePath();
        }

        ctx.fillStyle = isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.22)';
        ctx.fill();
        ctx.strokeStyle = isDark ? 'rgba(34, 197, 94, 0.55)' : 'rgba(34, 197, 94, 0.75)';
        ctx.lineWidth = 1.5;
        if (isDark) ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // 4. Process Lines
    lines.forEach(line => {
        if (!line.p1 || !line.p2) return;
        ctx.beginPath();
        ctx.moveTo(getX(line.p1.Tdb), getY(line.p1.W));
        ctx.lineTo(getX(line.p2.Tdb), getY(line.p2.W));
        ctx.strokeStyle = line.c;
        ctx.lineWidth = 2.4;
        if (line.d) ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    const activeHover = window._psyChartStates[canvasId]?.hoverInfo;

    // 5. Draggable State Points
    points.forEach((pt, idx) => {
        if (!pt.s) return;
        const px = getX(pt.s.Tdb), py = getY(pt.s.W);
        const isHoveredPt = activeHover && activeHover.ptIndex === idx;

        if (isHoveredPt) {
            ctx.beginPath();
            ctx.arc(px, py, 12, 0, 2 * Math.PI);
            ctx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.12)';
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(px, py, isHoveredPt ? 7.5 : 6.2, 0, 2 * Math.PI);
        ctx.fillStyle = pt.c;
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.stroke();

        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(pt.l, px + 8, py - 4);
    });

    // 6. Interactive Hover Crosshairs & Psychrometric Parameter Tooltip
    if (activeHover && activeHover.props) {
        const hp = activeHover.props;
        const hx = getX(hp.Tdb);
        const hy = getY(hp.W);

        // Crosshair lines to Tdb and W axes
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = activeHover.ptColor || (isDark ? '#38bdf8' : '#0284c7');
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx, margins.top);
        ctx.lineTo(hx, height - margins.bottom);
        ctx.moveTo(margins.left, hy);
        ctx.lineTo(width - margins.right, hy);
        ctx.stroke();
        ctx.restore();

        // If hovering arbitrary chart point (not snapped to an existing state node), draw probe dot
        if (activeHover.ptIndex === null) {
            ctx.beginPath();
            ctx.arc(hx, hy, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#06b6d4';
            ctx.fill();
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
            ctx.stroke();
        }

        const dragTag = activeHover.isDragging
            ? ' [Dragging...]'
            : (activeHover.canDrag ? ' [Drag to Move]' : '');
        const title = `${activeHover.ptLabel}${dragTag}`;
        const row1 = `Tdb: ${hp.Tdb.toFixed(1)} °C   |   Twb: ${(hp.Twb ?? calcWetBulb(hp.Tdb, hp.Tdp, hp.W)).toFixed(1)} °C`;
        const row2 = `RH:  ${hp.RH.toFixed(1)} %    |   Tdp: ${hp.Tdp.toFixed(1)} °C`;
        const row3 = `W:   ${hp.W.toFixed(5)} kg/kg (${(hp.W * 1000).toFixed(2)} g/kg)`;
        const row4 = `h:   ${hp.H.toFixed(2)} kJ/kg  |   v: ${hp.V.toFixed(4)} m³/kg`;
        const row5 = `Pw:  ${hp.Pw.toFixed(4)} kPa`;

        ctx.font = 'bold 11.5px Inter, sans-serif';
        const wTitle = ctx.measureText(title).width;
        ctx.font = '600 10.5px Inter, sans-serif';
        const boxW = Math.max(
            wTitle,
            ctx.measureText(row1).width,
            ctx.measureText(row2).width,
            ctx.measureText(row3).width,
            ctx.measureText(row4).width
        ) + 24;
        const boxH = 108;

        let tx = hx + 14;
        if (tx + boxW > width - margins.right) tx = hx - boxW - 14;
        if (tx < margins.left + 4) tx = margins.left + 4;
        let ty = hy - boxH - 10;
        if (ty < margins.top + 4) ty = Math.min(height - margins.bottom - boxH - 4, hy + 12);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.97)';
        ctx.strokeStyle = activeHover.ptColor || '#06b6d4';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(tx, ty, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 11.5px Inter, sans-serif';
        ctx.fillStyle = activeHover.ptColor || (isDark ? '#38bdf8' : '#0284c7');
        ctx.fillText(title, tx + 11, ty + 8);

        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
        ctx.fillText(row1, tx + 11, ty + 27);
        ctx.fillText(row2, tx + 11, ty + 43);
        ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
        ctx.fillText(row3, tx + 11, ty + 59);
        ctx.fillText(row4, tx + 11, ty + 75);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText(row5, tx + 11, ty + 90);
    }

    ctx.restore();
}




function drawLogLogNomogram(canvasId, inputFlow, flowUnit, Q_m3s, D_m, rho, mu, epsilon, maxFric, maxVel, isPipe) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // High-DPI responsive canvas setup
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width > 120 ? rect.width : 1000;
    const height = rect.width > 120 ? Math.round(width * 0.42) : 420;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.classList.contains('dark');
    const sys = isPipe ? currentPipeSys : currentDuctSys;

    const margins = { left: 68, right: 32, top: 24, bottom: 44 };
    const chartW = width - margins.left - margins.right;
    const chartH = height - margins.top - margins.bottom;

    const isValidOP = (inputFlow > 0 && D_m > 0 && Q_m3s > 0 && !isNaN(inputFlow));
    const plotFlow = isValidOP ? inputFlow : (isPipe ? (sys === 'IP' ? 150 : 50) : (sys === 'IP' ? 2000 : 1000));
    const plotQ = isValidOP ? Q_m3s : (isPipe ? (sys === 'IP' ? 0.0094 : 0.000833) : (sys === 'IP' ? 0.943 : 1.0));
    const plotD = isValidOP ? D_m : (isPipe ? 0.032 : 0.4);
    const flowToM3s = plotQ / plotFlow;

    const currentF_si = calcFlowProps(plotQ, plotD, rho, mu, epsilon).F;

    // Unit conversions for chart display labels
    const f_conv = sys === 'IP' ? (isPipe ? (1 / 98.0665) : (1 / 8.1722)) : 1;
    const v_conv = sys === 'IP' ? (isPipe ? 3.28084 : 196.85) : 1;
    const f_label = sys === 'IP' ? (isPipe ? 'ft/100ft' : 'in.wg/100ft') : 'Pa/m';
    const v_label = sys === 'IP' ? (isPipe ? 'ft/s' : 'FPM') : 'm/s';

    const displayF = currentF_si * f_conv;
    const displayMaxFric = maxFric * f_conv;

    // Lock grid bounds while dragging so the axes don't jump mid-drag
    const prevSt = window._nomogramStates[canvasId] || { hoverPt: null, isDragging: false, lockedBounds: null };
    let pStartQ, pEndQ, pStartF, pEndF;
    if (prevSt.isDragging && prevSt.lockedBounds) {
        ({ pStartQ, pEndQ, pStartF, pEndF } = prevSt.lockedBounds);
    } else {
        const logQ = Math.log10(Math.max(plotFlow, 1e-10));
        const logF = Math.log10(Math.max(displayF, 1e-5));
        pStartQ = Math.floor(logQ) - 1;
        pEndQ = Math.ceil(logQ) + 1;
        if (pEndQ - pStartQ < 2) pEndQ = pStartQ + 2;
        pStartF = Math.floor(logF) - 1;
        pEndF = Math.ceil(logF) + 1;
        if (pEndF - pStartF < 2) pEndF = pStartF + 2;
    }

    const qMin = Math.pow(10, pStartQ);
    const qMax = Math.pow(10, pEndQ);
    const fMin = Math.pow(10, pStartF);
    const fMax = Math.pow(10, pEndF);

    const getX = (q) => margins.left + ((Math.log10(q) - pStartQ) / (pEndQ - pStartQ)) * chartW;
    const getY = (f) => height - margins.bottom - ((Math.log10(f) - pStartF) / (pEndF - pStartF)) * chartH;

    // Standard commercial sizes (mm)
    const stdSizesMm = isPipe
        ? [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 500, 600]
        : [80, 100, 125, 150, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000, 1250, 1600];

    const exactD_mm = plotD * 1000;
    const recStdMm = stdSizesMm.find(s => s >= exactD_mm - 0.1) || stdSizesMm[stdSizesMm.length - 1];
    const recStdD_m = recStdMm / 1000;

    window._nomogramStates[canvasId] = {
        ...prevSt,
        margins, pStartQ, pEndQ, pStartF, pEndF,
        flowToM3s, f_conv, v_conv, f_label, v_label, flowUnit,
        rho, mu, epsilon, isPipe, sys, stdSizesMm,
        opX: getX(plotFlow), opY: getY(displayF)
    };

    // Interactive Hover & Drag-and-Drop Binding
    if (!canvas.dataset.nomoInteractiveBound) {
        canvas.dataset.nomoInteractiveBound = 'true';

        const getNomoEvent = (evt) => {
            const r = canvas.getBoundingClientRect();
            const mx = evt.clientX - r.left;
            const my = evt.clientY - r.top;
            const st = window._nomogramStates[canvasId];
            const m = st.margins;
            const cw = r.width - m.left - m.right;
            const ch = r.height - m.top - m.bottom;
            const inBounds = (mx >= m.left && mx <= r.width - m.right && my >= m.top && my <= r.height - m.bottom);

            const fracX = Math.max(0, Math.min(1, (mx - m.left) / cw));
            const fracY = Math.max(0, Math.min(1, (r.height - m.bottom - my) / ch));
            const qVal = Math.pow(10, st.pStartQ + fracX * (st.pEndQ - st.pStartQ));
            const fVal = Math.pow(10, st.pStartF + fracY * (st.pEndF - st.pStartF));

            const opPx = m.left + ((Math.log10(Math.max(1e-9, parseFloat(document.getElementById(st.isPipe ? 'pipe_flow' : 'duct_flow').value) || 1)) - st.pStartQ) / (st.pEndQ - st.pStartQ)) * cw;
            const nearOP = Math.hypot(mx - st.opX * (r.width / width), my - st.opY * (r.height / height)) <= 16;

            return { mx, my, inBounds, qVal, fVal, nearOP };
        };

        canvas.addEventListener('mousedown', (evt) => {
            const info = getNomoEvent(evt);
            const st = window._nomogramStates[canvasId];
            if (info.inBounds) {
                st.isDragging = true;
                st.lockedBounds = { pStartQ: st.pStartQ, pEndQ: st.pEndQ, pStartF: st.pStartF, pEndF: st.pEndF };
                canvas.style.cursor = 'grabbing';
                const flowEl = document.getElementById(st.isPipe ? 'pipe_flow' : 'duct_flow');
                const fricEl = document.getElementById(st.isPipe ? 'pipe_maxFric' : 'duct_maxFric');
                if (flowEl) flowEl.value = info.qVal >= 10 ? Math.round(info.qVal) : Number(info.qVal.toPrecision(3));
                if (fricEl) fricEl.value = info.fVal >= 10 ? Math.round(info.fVal) : Number(info.fVal.toPrecision(3));
                if (st.isPipe) updatePipeSizer();
                else updateDuctSizer();
                evt.preventDefault();
            }
        });

        canvas.addEventListener('mousemove', (evt) => {
            const info = getNomoEvent(evt);
            const st = window._nomogramStates[canvasId];
            if (!st) return;

            if (st.isDragging) {
                canvas.style.cursor = 'grabbing';
                const flowEl = document.getElementById(st.isPipe ? 'pipe_flow' : 'duct_flow');
                const fricEl = document.getElementById(st.isPipe ? 'pipe_maxFric' : 'duct_maxFric');
                if (flowEl) flowEl.value = info.qVal >= 10 ? Math.round(info.qVal) : Number(info.qVal.toPrecision(3));
                if (fricEl) fricEl.value = info.fVal >= 10 ? Math.round(info.fVal) : Number(info.fVal.toPrecision(3));
                st.hoverPt = { q: info.qVal, f: info.fVal };
                if (st.isPipe) updatePipeSizer();
                else updateDuctSizer();
                return;
            }

            if (!info.inBounds) {
                if (st.hoverPt !== null) {
                    st.hoverPt = null;
                    canvas.style.cursor = 'default';
                    if (st.isPipe) updatePipeSizer();
                    else updateDuctSizer();
                }
                return;
            }

            canvas.style.cursor = info.nearOP ? 'grab' : 'crosshair';
            st.hoverPt = { q: info.qVal, f: info.fVal };
            if (st.isPipe) updatePipeSizer();
            else updateDuctSizer();
        });

        canvas.addEventListener('mouseleave', () => {
            const st = window._nomogramStates[canvasId];
            if (st && !st.isDragging && st.hoverPt !== null) {
                st.hoverPt = null;
                canvas.style.cursor = 'default';
                if (st.isPipe) updatePipeSizer();
                else updateDuctSizer();
            }
        });

        window.addEventListener('mouseup', () => {
            const st = window._nomogramStates[canvasId];
            if (st && st.isDragging) {
                st.isDragging = false;
                st.lockedBounds = null;
                canvas.style.cursor = 'grab';
                if (st.isPipe) updatePipeSizer();
                else updateDuctSizer();
            }
        });
    }

    // 1. Draw Log-Log Grid
    ctx.lineWidth = 1;
    ctx.font = '600 10.5px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let p = pStartQ; p <= pEndQ; p++) {
        for (let i = 1; i <= 9; i++) {
            const val = i * Math.pow(10, p);
            if (val > qMax * 1.0001) break;
            const x = getX(val);
            ctx.beginPath();
            ctx.moveTo(x, margins.top);
            ctx.lineTo(x, height - margins.bottom);
            ctx.strokeStyle = (i === 1) ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? 'rgba(51, 65, 85, 0.55)' : '#f1f5f9');
            ctx.stroke();

            if (i === 1 || i === 2 || i === 5) {
                ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
                const displayVal = val >= 1 ? val.toFixed(0) : val.toPrecision(1);
                ctx.fillText(displayVal, x, height - margins.bottom + 6);
            }
        }
    }
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`Volumetric Flow Rate (${flowUnit})`, margins.left + chartW / 2, height - margins.bottom + 24);

    ctx.font = '600 10.5px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let p = pStartF; p <= pEndF; p++) {
        for (let i = 1; i <= 9; i++) {
            const val = i * Math.pow(10, p);
            if (val > fMax * 1.0001) break;
            const y = getY(val);
            ctx.beginPath();
            ctx.moveTo(margins.left, y);
            ctx.lineTo(width - margins.right, y);
            ctx.strokeStyle = (i === 1) ? (isDark ? '#475569' : '#cbd5e1') : (isDark ? 'rgba(51, 65, 85, 0.55)' : '#f1f5f9');
            ctx.stroke();

            if (i === 1 || i === 2 || i === 5) {
                ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
                const displayVal = val >= 1 ? val.toFixed(0) : val.toPrecision(1);
                ctx.fillText(displayVal, margins.left - 8, y);
            }
        }
    }
    ctx.save();
    ctx.translate(16, margins.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.textAlign = 'center';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText(`Pressure Drop (${f_label})`, 0, 0);
    ctx.restore();

    // Clip inside plot frame
    ctx.save();
    ctx.beginPath();
    ctx.rect(margins.left, margins.top, chartW, chartH);
    ctx.clip();

    // 2. Family of Standard Commercial Diameter Curves (upward-sloping reference lines)
    stdSizesMm.forEach(dMm => {
        const dM = dMm / 1000;
        const isRecStd = (dMm === recStdMm && isValidOP);
        ctx.beginPath();
        const pts = [];
        for (let i = 0; i <= 80; i++) {
            const q_in = qMin * Math.pow(qMax / qMin, i / 80);
            const q_si = q_in * flowToM3s;
            const f_val = calcFlowProps(q_si, dM, rho, mu, epsilon).F * f_conv;
            if (f_val > 0) pts.push({ x: getX(q_in), y: getY(f_val) });
        }
        if (pts.length > 1) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = isRecStd
                ? '#10b981'
                : (isDark ? 'rgba(56, 189, 248, 0.22)' : 'rgba(14, 165, 233, 0.28)');
            ctx.lineWidth = isRecStd ? 2.4 : 1.1;
            if (isRecStd) ctx.setLineDash([6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        const vis = pts.filter(p => p.x >= margins.left + 20 && p.x <= width - margins.right - 20 && p.y >= margins.top + 14 && p.y <= height - margins.bottom - 14);
        if (vis.length > 4) {
            const lp = vis[Math.floor(vis.length * 0.78)];
            const angle = Math.atan2(pts[pts.length - 1].y - pts[0].y, pts[pts.length - 1].x - pts[0].x);
            ctx.save();
            ctx.translate(lp.x, lp.y);
            ctx.rotate(angle);
            ctx.fillStyle = isRecStd ? '#10b981' : (isDark ? 'rgba(125, 211, 252, 0.65)' : 'rgba(2, 132, 199, 0.7)');
            ctx.font = isRecStd ? 'bold 10.5px Inter, sans-serif' : '600 9.5px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const lbl = isPipe
                ? (sys === 'IP' ? `${(dMm / 25.4).toFixed(1)}"` : `DN${dMm}`)
                : (sys === 'IP' ? `Ø${Math.round(dMm / 25.4)}"` : `Ø${dMm}`);
            ctx.fillText(lbl, 0, -2);
            ctx.restore();
        }
    });

    // 3. Family of Constant Velocity Lines (downward-sloping reference lines)
    const velocities = isPipe
        ? (sys === 'IP' ? [1.5, 2.0, 3.0, 5.0, 7.0, 10.0, 15.0] : [0.4, 0.6, 1.0, 1.5, 2.0, 3.0, 4.0, 6.0])
        : (sys === 'IP' ? [400, 600, 800, 1000, 1500, 2000, 3000, 4000] : [2.0, 3.0, 4.0, 6.0, 8.0, 10.0, 15.0, 20.0]);

    velocities.forEach(v => {
        ctx.beginPath();
        const pts = [];
        const v_si = v / v_conv;
        for (let i = 0; i <= 80; i++) {
            const q_in = qMin * Math.pow(qMax / qMin, i / 80);
            const q_si = q_in * flowToM3s;
            const req_D = Math.sqrt((4 * q_si) / (Math.PI * v_si));
            const f_val = calcFlowProps(q_si, req_D, rho, mu, epsilon).F * f_conv;
            if (f_val > 0) pts.push({ x: getX(q_in), y: getY(f_val) });
        }
        if (pts.length > 1) {
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
            ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.35)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        const vis = pts.filter(p => p.x >= margins.left + 20 && p.x <= width - margins.right - 20 && p.y >= margins.top + 14 && p.y <= height - margins.bottom - 14);
        if (vis.length > 4) {
            const lp = vis[Math.floor(vis.length * 0.25)];
            const angle = Math.atan2(pts[pts.length - 1].y - pts[0].y, pts[pts.length - 1].x - pts[0].x);
            ctx.save();
            ctx.translate(lp.x, lp.y);
            ctx.rotate(angle);
            ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.font = '600 9.5px Inter, sans-serif';
            ctx.fillText(`${v} ${v_label}`, 0, -2);
            ctx.restore();
        }
    });

    // 4. Draw Both Design Limits: Max Friction Limit (red dashed) & Max Velocity Limit (amber dashed)
    const yMaxFric = getY(displayMaxFric);
    if (yMaxFric >= margins.top && yMaxFric <= height - margins.bottom) {
        ctx.beginPath();
        ctx.moveTo(margins.left, yMaxFric);
        ctx.lineTo(width - margins.right, yMaxFric);
        ctx.strokeStyle = '#ef4444';
        ctx.setLineDash([6, 4]);
        ctx.lineWidth = 1.8;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`Max Friction: ${displayMaxFric.toFixed(2)} ${f_label}`, margins.left + 8, yMaxFric - 4);
    }

    if (maxVel > 0) {
        const maxVelPts = [];
        for (let i = 0; i <= 80; i++) {
            const q_in = qMin * Math.pow(qMax / qMin, i / 80);
            const q_si = q_in * flowToM3s;
            const req_D = Math.sqrt((4 * q_si) / (Math.PI * maxVel));
            const f_val = calcFlowProps(q_si, req_D, rho, mu, epsilon).F * f_conv;
            if (f_val > 0) maxVelPts.push({ x: getX(q_in), y: getY(f_val) });
        }
        if (maxVelPts.length > 1) {
            ctx.beginPath();
            ctx.moveTo(maxVelPts[0].x, maxVelPts[0].y);
            for (let i = 1; i < maxVelPts.length; i++) ctx.lineTo(maxVelPts[i].x, maxVelPts[i].y);
            ctx.strokeStyle = '#f59e0b';
            ctx.setLineDash([5, 4]);
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // 5. Draw Exact Calculated Diameter Curve & Operating Points
    if (isValidOP) {
        ctx.beginPath();
        ctx.strokeStyle = isDark ? '#60a5fa' : '#2563eb';
        ctx.lineWidth = 2.8;
        const dPts = [];
        for (let i = 0; i <= 100; i++) {
            const q_in = qMin * Math.pow(qMax / qMin, i / 100);
            const q_si = q_in * flowToM3s;
            const f_val = calcFlowProps(q_si, D_m, rho, mu, epsilon).F * f_conv;
            if (f_val > 0) dPts.push({ x: getX(q_in), y: getY(f_val) });
        }
        if (dPts.length > 1) {
            ctx.moveTo(dPts[0].x, dPts[0].y);
            for (let i = 1; i < dPts.length; i++) ctx.lineTo(dPts[i].x, dPts[i].y);
            ctx.stroke();
        }

        const validDPts = dPts.filter(pt => pt.y <= height - margins.bottom - 10 && pt.y >= margins.top + 10);
        if (validDPts.length > 5) {
            const p1 = validDPts[validDPts.length - 2];
            const p2 = validDPts[validDPts.length - 1];
            const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
            const midPt = validDPts[Math.floor(validDPts.length * 0.82)];

            ctx.save();
            ctx.translate(midPt.x, midPt.y);
            ctx.rotate(angle);
            ctx.fillStyle = isDark ? '#93c5fd' : '#1d4ed8';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.font = 'bold 11.5px Inter, sans-serif';

            const dLabel = isPipe
                ? (sys === 'IP' ? `Exact ${(D_m * 39.3701).toFixed(2)}" (DN${recStdMm})` : `Exact Ø${(D_m * 1000).toFixed(1)}mm (Std DN${recStdMm})`)
                : (sys === 'IP' ? `Exact Ø${(D_m * 39.3701).toFixed(1)}"` : `Exact Ø${Math.round(D_m * 1000)} mm`);

            ctx.fillText(dLabel, 0, -5);
            ctx.restore();
        }

        // Plot Commercial Standard Size Operating Point (emerald ring) at inputFlow
        const stdProps = calcFlowProps(Q_m3s, recStdD_m, rho, mu, epsilon);
        const stdF_disp = stdProps.F * f_conv;
        const currentX = getX(inputFlow);
        const currentY = getY(displayF);
        const stdY = getY(stdF_disp);

        if (Math.abs(stdY - currentY) > 3) {
            ctx.beginPath();
            ctx.arc(currentX, stdY, 5, 0, 2 * Math.PI);
            ctx.fillStyle = '#10b981';
            ctx.fill();
            ctx.lineWidth = 1.8;
            ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
            ctx.stroke();
        }

        // Operating Point Crosshairs & Draggable Marker
        ctx.beginPath();
        ctx.moveTo(currentX, margins.top); ctx.lineTo(currentX, height - margins.bottom);
        ctx.moveTo(margins.left, currentY); ctx.lineTo(width - margins.right, currentY);
        ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.35)' : 'rgba(15, 23, 42, 0.25)';
        ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2; ctx.stroke(); ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(currentX, currentY, 10, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.22)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(currentX, currentY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = '#3b82f6';
        ctx.stroke();

        ctx.restore();

        // Operating Point Callout Badge
        const currV = calcFlowProps(Q_m3s, D_m, rho, mu, epsilon).V * v_conv;
        const stdV = stdProps.V * v_conv;
        const opLine1 = `Exact OP: ${displayF.toFixed(2)} ${f_label} | V: ${currV.toFixed(2)} ${v_label}`;
        const opLine2 = isPipe
            ? `Std DN${recStdMm}: ${stdF_disp.toFixed(0)} ${f_label} | V: ${stdV.toFixed(2)} ${v_label}`
            : `Std Ø${recStdMm}mm: ${stdF_disp.toFixed(2)} ${f_label} | V: ${stdV.toFixed(2)} ${v_label}`;

        ctx.font = 'bold 11px Inter, sans-serif';
        const bw = Math.max(ctx.measureText(opLine1).width, ctx.measureText(opLine2).width) + 18;
        let bx = currentX + 12;
        if (bx + bw > width - margins.right) bx = currentX - bw - 12;
        const by = Math.max(margins.top + 6, currentY - 42);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, 38, 6);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(opLine1, bx + 9, by + 5);
        ctx.fillStyle = '#10b981';
        ctx.fillText(opLine2, bx + 9, by + 20);
    } else {
        ctx.restore();
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.textAlign = 'center';
        ctx.font = 'italic 14px Inter, sans-serif';
        ctx.fillText('Enter a valid Flow Rate > 0 to plot operating point.', margins.left + chartW / 2, margins.top + chartH / 2);
    }

    // 6. Interactive Hover Crosshair & Parameter Readout Tooltip
    const hPt = window._nomogramStates[canvasId]?.hoverPt;
    if (hPt) {
        const hx = getX(hPt.q);
        const hy = getY(hPt.f);
        const hQ_m3s = hPt.q * flowToM3s;
        const hF_si = hPt.f / f_conv;
        const solved = solveFluidDiameter(hQ_m3s, hF_si, 999, rho, mu, epsilon);
        const hD_mm = solved.D * 1000;
        const hStdMm = stdSizesMm.find(s => s >= hD_mm - 0.1) || stdSizesMm[stdSizesMm.length - 1];
        const hVelDisp = solved.V * v_conv;

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx, margins.top);
        ctx.lineTo(hx, height - margins.bottom);
        ctx.moveTo(margins.left, hy);
        ctx.lineTo(width - margins.right, hy);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(hx, hy, 4.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();

        const l1 = `Flow (Q): ${hPt.q >= 10 ? hPt.q.toFixed(1) : hPt.q.toPrecision(3)} ${flowUnit}`;
        const l2 = `Friction (ΔP/L): ${hPt.f >= 10 ? hPt.f.toFixed(1) : hPt.f.toFixed(2)} ${f_label}`;
        const l3 = isPipe
            ? `Diameter: ${hD_mm.toFixed(1)} mm (${(hD_mm / 25.4).toFixed(2)}") → Std DN${hStdMm}`
            : `Diameter: Ø${hD_mm.toFixed(0)} mm (${(hD_mm / 25.4).toFixed(1)}") → Std Ø${hStdMm}mm`;
        const l4 = `Velocity (V): ${hVelDisp.toFixed(2)} ${v_label}`;

        ctx.font = '600 10.5px Inter, sans-serif';
        const tw = Math.max(ctx.measureText(l1).width, ctx.measureText(l2).width, ctx.measureText(l3).width, ctx.measureText(l4).width) + 20;
        const th = 72;
        let tx = hx + 14;
        if (tx + tw > width - margins.right) tx = hx - tw - 14;
        let ty = hy - th - 10;
        if (ty < margins.top + 4) ty = Math.min(height - margins.bottom - th - 4, hy + 12);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(tx, ty, tw, th, 7);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(l1, tx + 10, ty + 7);
        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
        ctx.fillText(l2, tx + 10, ty + 23);
        ctx.fillStyle = '#10b981';
        ctx.fillText(l3, tx + 10, ty + 39);
        ctx.fillStyle = '#f59e0b';
        ctx.fillText(l4, tx + 10, ty + 54);
    }

    ctx.restore();
}

// Global state for Duct Unit System
let currentDuctSys = 'SI';


function setCtCoc(val) {
    const el = document.getElementById('ct_coc');
    if (el) {
        el.value = Number(val).toFixed(1);
        updateCoolingTower();
    }
}

function hoverCtCoc(val) {
    if (!window._ctChartState) return;
    window._ctChartState.hoverCoc = val;
    drawCtChart('ctChart', window._ctChartState.data, window._ctChartState.currentCoc, window._ctChartState.currentMy);
}

function drawCtChart(canvasId, data, currentCoc, currentM) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // High-DPI responsive canvas sizing (prevents oval stretching & blurry text)
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width > 120 ? rect.width : 640;
    const height = rect.height > 120 ? rect.height : 350;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const state = window._ctChartState || {
        E_m3h: 1.5, D_m3h: 0.01, hrs: 24, days: 365,
        currentCoc: currentCoc || 4, currentMy: currentM || 18000,
        data: data || [], hoverCoc: null
    };

    const evalAtCoc = (c) => {
        const safeC = Math.max(1.2, c);
        const b_h = Math.max(0, (state.E_m3h / (safeC - 1)) - state.D_m3h);
        const m_h = state.E_m3h + state.D_m3h + b_h;
        const md = m_h * state.hrs;
        const my = md * state.days;
        const bd = b_h * state.hrs;
        return { coc: safeC, md, my, bd };
    };

    const isDark = document.documentElement.classList.contains('dark');
    const margins = { top: 28, bottom: 44, left: 68, right: 24 };
    const chartW = width - margins.left - margins.right;
    const chartH = height - margins.top - margins.bottom;

    const minCoc = 1.35, maxCoc = 10.2;
    const maxDataY = Math.max(evalAtCoc(1.5).my, currentM || 0, ...data.map(d => d.y));
    const maxY = Math.max(100, Math.ceil((maxDataY * 1.12) / 1000) * 1000);

    const getX = (coc) => margins.left + ((coc - minCoc) / (maxCoc - minCoc)) * chartW;
    const getY = (val) => margins.top + chartH - (val / maxY) * chartH;

    // Bind interactive hover & click events once
    if (!canvas.dataset.hoverBound) {
        canvas.dataset.hoverBound = 'true';
        const getCocFromEvent = (evt) => {
            const r = canvas.getBoundingClientRect();
            const mx = evt.clientX - r.left;
            const my = evt.clientY - r.top;
            const cw = r.width - margins.left - margins.right;
            const ch = r.height - margins.top - margins.bottom;
            if (mx < margins.left - 8 || mx > r.width - margins.right + 8 || my < margins.top - 8 || my > r.height - margins.bottom + 8) {
                return null;
            }
            let rawCoc = minCoc + ((mx - margins.left) / cw) * (maxCoc - minCoc);
            rawCoc = Math.max(1.5, Math.min(10.0, rawCoc));
            // Snap to standard COC tiers or active COC when cursor is within 0.14 COC
            const snapTargets = [1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, window._ctChartState?.currentCoc || 4.0];
            for (const t of snapTargets) {
                if (Math.abs(rawCoc - t) < 0.14) return t;
            }
            return Math.round(rawCoc * 10) / 10;
        };

        canvas.addEventListener('mousemove', (e) => {
            if (!window._ctChartState) return;
            const hCoc = getCocFromEvent(e);
            if (window._ctChartState.hoverCoc !== hCoc) {
                window._ctChartState.hoverCoc = hCoc;
                drawCtChart(canvasId, window._ctChartState.data, window._ctChartState.currentCoc, window._ctChartState.currentMy);
            }
        });

        canvas.addEventListener('mouseleave', () => {
            if (!window._ctChartState) return;
            window._ctChartState.hoverCoc = null;
            drawCtChart(canvasId, window._ctChartState.data, window._ctChartState.currentCoc, window._ctChartState.currentMy);
        });

        canvas.addEventListener('click', (e) => {
            const c = getCocFromEvent(e);
            if (c !== null) setCtCoc(c);
        });
    }

    // 1. Background Grid (Major & Minor)
    ctx.beginPath();
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.55)' : 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 1;

    const xTicks = [1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    xTicks.forEach(c => {
        const x = getX(c);
        ctx.moveTo(x, margins.top);
        ctx.lineTo(x, margins.top + chartH);
    });

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const val = (maxY / ySteps) * i;
        const y = getY(val);
        ctx.moveTo(margins.left, y);
        ctx.lineTo(margins.left + chartW, y);
    }
    ctx.stroke();

    // 2. Theoretical Minimum Make-up Asymptote (Evaporation + Drift only, COC -> infinity)
    const minAsymptoteY = (state.E_m3h + state.D_m3h) * state.hrs * state.days;
    if (minAsymptoteY > 0 && minAsymptoteY < maxY) {
        const ay = getY(minAsymptoteY);
        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = isDark ? 'rgba(16, 185, 129, 0.45)' : 'rgba(5, 150, 105, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(margins.left, ay);
        ctx.lineTo(margins.left + chartW, ay);
        ctx.stroke();
        ctx.fillStyle = isDark ? '#34d399' : '#059669';
        ctx.font = '600 10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`Min Evap+Drift Limit: ${Math.round(minAsymptoteY).toLocaleString()} m³/yr`, margins.left + chartW - 6, ay - 6);
        ctx.restore();
    }

    // 3. Generate High-Resolution Smooth Curve Points (200 steps from COC 1.45 to 10.0)
    const smoothPts = [];
    const minCurveCoc = Math.min(1.45, Math.max(1.25, currentCoc));
    const totalSteps = 220;
    for (let i = 0; i <= totalSteps; i++) {
        // Use non-linear spacing so high-curvature region (1.45 - 3.5) has ultra-dense points
        const t = i / totalSteps;
        const c = minCurveCoc + (10.0 - minCurveCoc) * Math.pow(t, 1.35);
        const pt = evalAtCoc(c);
        smoothPts.push({ x: getX(c), y: getY(pt.my), coc: c, ...pt });
    }

    // 4. Area Gradient Fill Under Smooth Curve
    if (smoothPts.length > 1) {
        const grad = ctx.createLinearGradient(0, margins.top, 0, margins.top + chartH);
        grad.addColorStop(0, isDark ? 'rgba(129, 140, 248, 0.30)' : 'rgba(99, 102, 241, 0.24)');
        grad.addColorStop(1, isDark ? 'rgba(129, 140, 248, 0.01)' : 'rgba(99, 102, 241, 0.01)');

        ctx.beginPath();
        ctx.moveTo(smoothPts[0].x, margins.top + chartH);
        smoothPts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(smoothPts[smoothPts.length - 1].x, margins.top + chartH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // Smooth Continuous Curve Stroke
        ctx.beginPath();
        ctx.moveTo(smoothPts[0].x, smoothPts[0].y);
        for (let i = 1; i < smoothPts.length; i++) {
            ctx.lineTo(smoothPts[i].x, smoothPts[i].y);
        }
        ctx.strokeStyle = isDark ? '#818cf8' : '#4f46e5';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    // 5. Axes Frame & Labels
    ctx.strokeStyle = isDark ? '#64748b' : '#94a3b8';
    ctx.lineWidth = 1.25;
    ctx.strokeRect(margins.left, margins.top, chartW, chartH);

    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.font = '600 11px Inter, sans-serif';
    for (let i = 0; i <= ySteps; i++) {
        const val = (maxY / ySteps) * i;
        const y = getY(val);
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(Math.round(val).toLocaleString(), margins.left - 8, y);
    }

    xTicks.forEach(c => {
        const x = getX(c);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(c === 1.5 ? '1.5' : c.toString(), x, margins.top + chartH + 8);
    });

    ctx.font = 'bold 11.5px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.textAlign = 'center';
    ctx.fillText('Cycles of Concentration (COC)', margins.left + chartW / 2, margins.top + chartH + 26);

    ctx.save();
    ctx.translate(15, margins.top + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText('Annual Water (m³/year)', 0, 0);
    ctx.restore();

    // 6. Plot Standard Table Tier Markers (1.5, 2.0, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0)
    data.forEach(d => {
        const dx = getX(d.x);
        const dy = getY(d.y);
        ctx.beginPath();
        ctx.arc(dx, dy, 3.8, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isDark ? '#818cf8' : '#4f46e5';
        ctx.stroke();
    });

    // 7. Active Operating Point Marker
    const clampedCurCoc = Math.max(minCurveCoc, Math.min(10.0, currentCoc));
    const px = getX(clampedCurCoc);
    const py = getY(currentM);

    // Subtle dashed guide lines for active COC
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = isDark ? 'rgba(129, 140, 248, 0.5)' : 'rgba(79, 70, 229, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(px, margins.top + chartH);
    ctx.lineTo(px, py);
    ctx.lineTo(margins.left, py);
    ctx.stroke();
    ctx.restore();

    // Outer glow + solid active dot
    ctx.beginPath();
    ctx.arc(px, py, 9, 0, 2 * Math.PI);
    ctx.fillStyle = isDark ? 'rgba(129, 140, 248, 0.25)' : 'rgba(79, 70, 229, 0.20)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(px, py, 5.5, 0, 2 * Math.PI);
    ctx.fillStyle = isDark ? '#a5b4fc' : '#4f46e5';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
    ctx.stroke();

    // 8. Interactive Hover Crosshair & Floating Data Tooltip
    const targetCoc = state.hoverCoc !== null ? state.hoverCoc : null;
    if (targetCoc !== null) {
        const hInfo = evalAtCoc(targetCoc);
        const hx = getX(hInfo.coc);
        const hy = getY(hInfo.my);

        // Hover crosshair lines
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(hx, margins.top);
        ctx.lineTo(hx, margins.top + chartH);
        ctx.moveTo(margins.left, hy);
        ctx.lineTo(margins.left + chartW, hy);
        ctx.stroke();
        ctx.restore();

        // Hover node marker
        ctx.beginPath();
        ctx.arc(hx, hy, 6.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#06b6d4';
        ctx.fill();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.stroke();

        // Floating Tooltip Card
        const isActiveTier = Math.abs(hInfo.coc - currentCoc) < 0.08;
        const line1 = `COC: ${hInfo.coc.toFixed(1)}${isActiveTier ? ' (Active)' : ''}`;
        const line2 = `Daily: ${hInfo.md.toFixed(1)} m³/day`;
        const line3 = `Annual: ${Math.round(hInfo.my).toLocaleString('en-US')} m³/yr`;
        const line4 = `Blowdown: ${hInfo.bd.toFixed(1)} m³/day`;

        ctx.font = 'bold 11.5px Inter, sans-serif';
        const w1 = ctx.measureText(line1).width;
        ctx.font = '600 11px Inter, sans-serif';
        const boxW = Math.max(w1, ctx.measureText(line2).width, ctx.measureText(line3).width, ctx.measureText(line4).width) + 24;
        const boxH = 78;

        let tx = hx + 14;
        if (tx + boxW > width - margins.right) tx = hx - boxW - 14;
        let ty = hy - boxH - 10;
        if (ty < margins.top + 4) ty = Math.min(margins.top + chartH - boxH - 4, hy + 12);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.roundRect(tx, ty, boxW, boxH, 8);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 11.5px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
        ctx.fillText(line1, tx + 11, ty + 8);

        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
        ctx.fillText(line2, tx + 11, ty + 26);
        ctx.fillText(line3, tx + 11, ty + 43);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fillText(line4, tx + 11, ty + 60);
    } else {
        // Default Callout Pill on Active Operating Point when not hovering
        const pillText = `COC ${currentCoc.toFixed(1)}: ${(state.currentMd || (currentM / (state.days || 365))).toFixed(1)} m³/d (${Math.round(currentM).toLocaleString()} m³/yr)`;
        ctx.font = 'bold 11px Inter, sans-serif';
        const pw = ctx.measureText(pillText).width + 16;
        let bx = px + 10;
        if (bx + pw > margins.left + chartW - 4) bx = px - pw - 10;
        const by = Math.max(margins.top + 6, py - 28);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.90)' : 'rgba(255, 255, 255, 0.94)';
        ctx.strokeStyle = isDark ? '#818cf8' : '#4f46e5';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(bx, by, pw, 22, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDark ? '#e0e7ff' : '#312e81';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(pillText, bx + 8, by + 11);
    }

    ctx.restore();
}



function drawRoiChart(canvasId, cA, cB, oA, oB, curr) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width > 120 ? rect.width : 800;
    const height = rect.height > 120 ? rect.height : 300;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
    }

    window._roiChartState = { cA, cB, oA, oB, curr, hoverYr: window._roiChartState?.hoverYr ?? null };

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const isDark = document.documentElement.classList.contains('dark');
    const margins = { top: 42, bottom: 34, left: 76, right: 26 };
    const chartW = width - margins.left - margins.right;
    const chartH = height - margins.top - margins.bottom;

    const years = 10;
    const maxCost = Math.max(1000, Math.max(cA + oA * years, cB + oB * years) * 1.1);

    const getX = (yr) => margins.left + (yr / years) * chartW;
    const getY = (val) => margins.top + chartH - (val / maxCost) * chartH;

    if (!canvas.dataset.hoverBound) {
        canvas.dataset.hoverBound = 'true';
        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('mousemove', (e) => {
            const r = canvas.getBoundingClientRect();
            const mx = e.clientX - r.left;
            const my = e.clientY - r.top;
            const cw = r.width - margins.left - margins.right;
            if (mx < margins.left - 8 || mx > r.width - margins.right + 8 || my < margins.top - 8 || my > r.height - margins.bottom + 8) {
                if (window._roiChartState.hoverYr !== null) {
                    window._roiChartState.hoverYr = null;
                    const s = window._roiChartState;
                    drawRoiChart(canvasId, s.cA, s.cB, s.oA, s.oB, s.curr);
                }
                return;
            }
            let yr = Math.max(0, Math.min(years, ((mx - margins.left) / cw) * years));
            if (Math.abs(yr - Math.round(yr)) < 0.18) yr = Math.round(yr);
            else yr = Math.round(yr * 10) / 10;
            if (window._roiChartState.hoverYr !== yr) {
                window._roiChartState.hoverYr = yr;
                const s = window._roiChartState;
                drawRoiChart(canvasId, s.cA, s.cB, s.oA, s.oB, s.curr);
            }
        });
        canvas.addEventListener('mouseleave', () => {
            if (window._roiChartState && window._roiChartState.hoverYr !== null) {
                window._roiChartState.hoverYr = null;
                const s = window._roiChartState;
                drawRoiChart(canvasId, s.cA, s.cB, s.oA, s.oB, s.curr);
            }
        });
    }

    // Grid
    ctx.beginPath();
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= years; i++) {
        const x = getX(i);
        ctx.moveTo(x, margins.top); ctx.lineTo(x, height - margins.bottom);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.fillText(`Yr ${i}`, x, height - margins.bottom + 8);
    }
    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
        const val = (maxCost / ySteps) * i;
        const y = getY(val);
        ctx.moveTo(margins.left, y); ctx.lineTo(width - margins.right, y);
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        ctx.fillText(`${curr}${(val / 1000).toFixed(0)}k`, margins.left - 8, y);
    }
    ctx.stroke();

    // Shaded Net Savings Zone after ROI Break-even
    const premium = cB - cA;
    const savings = oA - oB;
    let intersectYr = null;
    if (premium > 0 && savings > 0 && (premium / savings) <= years) {
        intersectYr = premium / savings;
        ctx.beginPath();
        ctx.moveTo(getX(intersectYr), getY(cA + oA * intersectYr));
        ctx.lineTo(getX(years), getY(cA + oA * years));
        ctx.lineTo(getX(years), getY(cB + oB * years));
        ctx.closePath();
        ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.12)';
        ctx.fill();
    }

    // Chiller A Line & Nodes
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(cA));
    ctx.lineTo(getX(years), getY(cA + oA * years));
    ctx.strokeStyle = isDark ? '#94a3b8' : '#64748b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Chiller B Line & Nodes
    ctx.beginPath();
    ctx.moveTo(getX(0), getY(cB));
    ctx.lineTo(getX(years), getY(cB + oB * years));
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.stroke();

    for (let i = 0; i <= years; i++) {
        ctx.beginPath();
        ctx.arc(getX(i), getY(cA + oA * i), 3, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? '#94a3b8' : '#64748b';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(getX(i), getY(cB + oB * i), 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
    }

    // Intersection point (ROI)
    if (intersectYr !== null) {
        const ix = getX(intersectYr);
        const iy = getY(cA + oA * intersectYr);

        ctx.beginPath();
        ctx.moveTo(ix, iy + 8);
        ctx.lineTo(ix, height - margins.bottom);
        ctx.strokeStyle = '#10b981';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(ix, iy, 6.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.stroke();
    }

    // Legend
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
    ctx.fillText('● Chiller A (Baseline)', margins.left + 8, margins.top - 14);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('● Chiller B (Proposed)', margins.left + 150, margins.top - 14);

    // Hover Tooltip
    const hYr = window._roiChartState?.hoverYr;
    if (hYr !== null && hYr !== undefined) {
        const hx = getX(hYr);
        const costA = cA + oA * hYr;
        const costB = cB + oB * hYr;
        const netDiff = costA - costB;
        const hyA = getY(costA);
        const hyB = getY(costB);

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? '#e2e8f0' : '#334155';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(hx, margins.top);
        ctx.lineTo(hx, height - margins.bottom);
        ctx.stroke();
        ctx.restore();

        [[hx, hyA, isDark ? '#94a3b8' : '#475569'], [hx, hyB, '#ef4444']].forEach(([px, py, col]) => {
            ctx.beginPath();
            ctx.arc(px, py, 5.5, 0, 2 * Math.PI);
            ctx.fillStyle = col;
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = isDark ? '#0f172a' : '#ffffff';
            ctx.stroke();
        });

        const l1 = `Year ${hYr.toFixed(1)}`;
        const l2 = `Chiller A: ${curr}${Math.round(costA).toLocaleString()}`;
        const l3 = `Chiller B: ${curr}${Math.round(costB).toLocaleString()}`;
        const l4 = netDiff >= 0
            ? `Net Savings: +${curr}${Math.round(netDiff).toLocaleString()}`
            : `Unrecovered Capex: -${curr}${Math.round(Math.abs(netDiff)).toLocaleString()}`;

        ctx.font = '600 11px Inter, sans-serif';
        const bw = Math.max(ctx.measureText(l2).width, ctx.measureText(l3).width, ctx.measureText(l4).width) + 22;
        const bh = 76;
        let tx = hx + 14;
        if (tx + bw > width - margins.right) tx = hx - bw - 14;
        const ty = Math.max(margins.top + 6, Math.min(hyA, hyB) - 20);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = netDiff >= 0 ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.roundRect(tx, ty, bw, bh, 7);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 11.5px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(l1, tx + 10, ty + 8);
        ctx.font = '600 11px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#cbd5e1' : '#475569';
        ctx.fillText(l2, tx + 10, ty + 25);
        ctx.fillStyle = '#ef4444';
        ctx.fillText(l3, tx + 10, ty + 41);
        ctx.fillStyle = netDiff >= 0 ? '#10b981' : '#f59e0b';
        ctx.fillText(l4, tx + 10, ty + 57);
    }

    ctx.restore();
}



function drawWsfuChart(totalWsfu, currentGpm, activeCurve) {
    const canvas = document.getElementById('wsfuChart');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const logicalW = rect.width > 100 ? rect.width : 700;
    const logicalH = rect.height > 100 ? rect.height : 300;
    if (canvas.width !== Math.round(logicalW * dpr) || canvas.height !== Math.round(logicalH * dpr)) {
        canvas.width = Math.round(logicalW * dpr);
        canvas.height = Math.round(logicalH * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.classList.contains('dark');
    ctx.clearRect(0, 0, logicalW, logicalH);

    const margins = { left: 56, right: 28, top: 26, bottom: 42 };
    const w = logicalW - margins.left - margins.right;
    const h = logicalH - margins.top - margins.bottom;

    const maxW = Math.max(250, Math.ceil((totalWsfu * 1.25) / 50) * 50);
    const calcA = (u) => u <= 0 ? 0 : (10 + 0.25 * u + 0.00008 * Math.pow(u, 1.9));
    const calcB = (u) => u <= 0 ? 0 : (5 + 0.18 * u + 0.00004 * Math.pow(u, 1.9));
    const maxG = Math.max(80, Math.ceil(calcA(maxW) * 1.1 / 20) * 20);

    const getX = (u) => margins.left + (u / maxW) * w;
    const getY = (g) => margins.top + h - (g / maxG) * h;

    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.55)' : 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i <= 5; i++) {
        const u = (maxW / 5) * i;
        const x = getX(u);
        ctx.moveTo(x, margins.top);
        ctx.lineTo(x, margins.top + h);
    }
    for (let j = 0; j <= 4; j++) {
        const g = (maxG / 4) * j;
        const y = getY(g);
        ctx.moveTo(margins.left, y);
        ctx.lineTo(margins.left + w, y);
    }
    ctx.stroke();

    ctx.strokeStyle = isDark ? '#94a3b8' : '#334155';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(margins.left, margins.top, w, h);

    ctx.beginPath();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = activeCurve === 'A' ? 3 : 1.8;
    for (let u = 0; u <= maxW; u += maxW / 80) {
        const x = getX(u), y = getY(calcA(u));
        if (u === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = activeCurve === 'B' ? 3 : 1.8;
    for (let u = 0; u <= maxW; u += maxW / 80) {
        const x = getX(u), y = getY(calcB(u));
        if (u === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const u = (maxW / 5) * i;
        ctx.fillText(Math.round(u).toString(), getX(u), margins.top + h + 16);
    }
    ctx.fillText('Water Supply Fixture Units (WSFU)', margins.left + w / 2, margins.top + h + 34);

    ctx.textAlign = 'right';
    for (let j = 0; j <= 4; j++) {
        const g = (maxG / 4) * j;
        ctx.fillText(`${Math.round(g)} GPM`, margins.left - 6, getY(g) + 4);
    }

    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ef4444';
    ctx.fillText('● Curve A: Flush Valves', margins.left + 12, margins.top + 18);
    ctx.fillStyle = '#06b6d4';
    ctx.fillText('● Curve B: Flush Tanks', margins.left + 160, margins.top + 18);

    window._wsfuChartState = { totalWsfu, currentGpm, activeCurve, hoverU: window._wsfuChartState?.hoverU ?? null };
    if (!canvas.dataset.hoverBound) {
        canvas.dataset.hoverBound = 'true';
        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('mousemove', (e) => {
            const r = canvas.getBoundingClientRect();
            const mx = e.clientX - r.left;
            const my = e.clientY - r.top;
            const cw = r.width - margins.left - margins.right;
            if (mx < margins.left || mx > r.width - margins.right || my < margins.top || my > r.height - margins.bottom) {
                if (window._wsfuChartState?.hoverU !== null) {
                    window._wsfuChartState.hoverU = null;
                    const s = window._wsfuChartState;
                    drawWsfuChart(s.totalWsfu, s.currentGpm, s.activeCurve);
                }
                return;
            }
            const s = window._wsfuChartState;
            const curMaxW = Math.max(250, Math.ceil((s.totalWsfu * 1.25) / 50) * 50);
            const u = Math.max(0, Math.min(curMaxW, Math.round(((mx - margins.left) / cw) * curMaxW)));
            if (s.hoverU !== u) {
                s.hoverU = u;
                drawWsfuChart(s.totalWsfu, s.currentGpm, s.activeCurve);
            }
        });
        canvas.addEventListener('mouseleave', () => {
            if (window._wsfuChartState && window._wsfuChartState.hoverU !== null) {
                window._wsfuChartState.hoverU = null;
                const s = window._wsfuChartState;
                drawWsfuChart(s.totalWsfu, s.currentGpm, s.activeCurve);
            }
        });
    }

    if (totalWsfu > 0 && currentGpm > 0) {
        const px = getX(totalWsfu);
        const py = getY(currentGpm);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.beginPath();
        ctx.moveTo(px, margins.top + h);
        ctx.lineTo(px, py);
        ctx.lineTo(margins.left, py);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(px, py, 6, 0, 2 * Math.PI);
        ctx.fillStyle = activeCurve === 'A' ? '#ef4444' : '#06b6d4';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.stroke();
    }

    const hU = window._wsfuChartState?.hoverU;
    if (hU !== null && hU !== undefined) {
        const hx = getX(hU);
        const gA = calcA(hU);
        const gB = calcB(hU);
        const hyA = getY(gA);
        const hyB = getY(gB);

        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isDark ? '#94a3b8' : '#475569';
        ctx.beginPath();
        ctx.moveTo(hx, margins.top);
        ctx.lineTo(hx, margins.top + h);
        ctx.stroke();
        ctx.restore();

        [[hx, hyA, '#ef4444'], [hx, hyB, '#06b6d4']].forEach(([px, py, col]) => {
            ctx.beginPath();
            ctx.arc(px, py, 4.5, 0, 2 * Math.PI);
            ctx.fillStyle = col;
            ctx.fill();
        });

        const t1 = `WSFU: ${hU} Units`;
        const t2 = `Curve A: ${gA.toFixed(1)} GPM (${(gA * 0.06309).toFixed(2)} L/s)`;
        const t3 = `Curve B: ${gB.toFixed(1)} GPM (${(gB * 0.06309).toFixed(2)} L/s)`;
        ctx.font = '600 11px Inter, sans-serif';
        const bw = Math.max(ctx.measureText(t2).width, ctx.measureText(t3).width) + 20;
        const bh = 58;
        let tx = hx + 12;
        if (tx + bw > margins.left + w) tx = hx - bw - 12;
        const ty = Math.max(margins.top + 8, Math.min(hyA, hyB) - 18);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = activeCurve === 'A' ? '#ef4444' : '#06b6d4';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(tx, ty, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(t1, tx + 10, ty + 7);
        ctx.font = '600 10.5px Inter, sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(t2, tx + 10, ty + 23);
        ctx.fillStyle = '#06b6d4';
        ctx.fillText(t3, tx + 10, ty + 39);
    }

    ctx.restore();
}



function drawFireWaterChart(duration, volSprM3, volHoseM3, volSpM3, volMarginM3, volTotalM3, volTotalGal) {
    const canvas = document.getElementById('fireWaterChart');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const logicalW = rect.width > 100 ? rect.width : 760;
    const logicalH = rect.height > 100 ? rect.height : 320;
    if (canvas.width !== Math.round(logicalW * dpr) || canvas.height !== Math.round(logicalH * dpr)) {
        canvas.width = Math.round(logicalW * dpr);
        canvas.height = Math.round(logicalH * dpr);
    }

    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(dpr, dpr);

    const isDark = document.documentElement.classList.contains('dark');
    ctx.clearRect(0, 0, logicalW, logicalH);

    const margins = { left: 64, right: 70, top: 32, bottom: 44 };
    const w = logicalW - margins.left - margins.right;
    const h = logicalH - margins.top - margins.bottom;

    const maxT = Math.max(30, duration);
    const maxV = Math.max(10, Math.ceil(volTotalM3 * 1.12 / 10) * 10);

    const getX = (t) => margins.left + (t / maxT) * w;
    const getY = (v) => margins.top + h - (v / maxV) * h;

    // Gridlines
    ctx.strokeStyle = isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const yTicks = 5;
    for (let i = 0; i <= yTicks; i++) {
        const v = (maxV / yTicks) * i;
        const y = getY(v);
        ctx.moveTo(margins.left, y);
        ctx.lineTo(margins.left + w, y);
    }
    const tStep = maxT <= 60 ? 10 : (maxT <= 120 ? 15 : 30);
    for (let t = 0; t <= maxT; t += tStep) {
        const x = getX(t);
        ctx.moveTo(x, margins.top);
        ctx.lineTo(x, margins.top + h);
    }
    ctx.stroke();

    // Stacked area fills from t = 0 to t = maxT
    const layers = [
        { label: 'Sprinkler', vEnd: volSprM3, fill: 'rgba(59, 130, 246, 0.28)', stroke: '#3b82f6' },
        { label: '+ Hose Stream', vEnd: volSprM3 + volHoseM3, fill: 'rgba(249, 115, 22, 0.25)', stroke: '#f97316' },
        { label: '+ Standpipe', vEnd: volSprM3 + volHoseM3 + volSpM3, fill: 'rgba(168, 85, 247, 0.25)', stroke: '#a855f7' },
        { label: 'Total w/ Tank Margin', vEnd: volTotalM3, fill: 'rgba(16, 185, 129, 0.22)', stroke: '#10b981' }
    ];

    let prevEnd = 0;
    layers.forEach(layer => {
        if (layer.vEnd <= prevEnd + 0.01) return;
        ctx.beginPath();
        ctx.moveTo(getX(0), getY(0));
        ctx.lineTo(getX(maxT), getY(layer.vEnd));
        ctx.lineTo(getX(maxT), getY(prevEnd));
        ctx.closePath();
        ctx.fillStyle = layer.fill;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = layer.stroke;
        ctx.lineWidth = 2.5;
        ctx.moveTo(getX(0), getY(0));
        ctx.lineTo(getX(maxT), getY(layer.vEnd));
        ctx.stroke();

        prevEnd = layer.vEnd;
    });

    // Axes Frame
    ctx.strokeStyle = isDark ? '#94a3b8' : '#334155';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margins.left, margins.top, w, h);

    // Labels
    ctx.fillStyle = isDark ? '#cbd5e1' : '#334155';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    for (let t = 0; t <= maxT; t += tStep) {
        ctx.fillText(`${t}m`, getX(t), margins.top + h + 18);
    }
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillText('Fire Duration Time (minutes)', margins.left + w / 2, margins.top + h + 36);

    // Left Y-Axis (m³) & Right Y-Axis (US Gallons)
    ctx.font = '600 11px Inter, sans-serif';
    for (let i = 0; i <= yTicks; i++) {
        const vM3 = (maxV / yTicks) * i;
        const vGal = vM3 / 0.00378541178;
        const y = getY(vM3);
        ctx.textAlign = 'right';
        ctx.fillText(`${vM3.toFixed(0)} m³`, margins.left - 8, y + 4);
        ctx.textAlign = 'left';
        ctx.fillText(`${Math.round(vGal / 100) * 100} gal`, margins.left + w + 8, y + 4);
    }

    // Final Total Endpoint Marker
    const endX = getX(maxT);
    const endY = getY(volTotalM3);
    ctx.beginPath();
    ctx.arc(endX, endY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = '#10b981';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
    ctx.stroke();

    // Callout badge
    const badgeText = `Required Tank: ${volTotalM3.toFixed(1)} m³ (${Math.round(volTotalGal).toLocaleString()} gal)`;
    ctx.font = 'bold 11px Inter, sans-serif';
    const bw = ctx.measureText(badgeText).width + 16;
    const bx = endX - bw - 12;
    const by = Math.max(margins.top + 8, endY - 12);
    ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, 22, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, bx + 8, by + 15);

    window._fwChartState = { duration, volSprM3, volHoseM3, volSpM3, volMarginM3, volTotalM3, volTotalGal, hoverT: window._fwChartState?.hoverT ?? null };
    if (!canvas.dataset.hoverBound) {
        canvas.dataset.hoverBound = 'true';
        canvas.style.cursor = 'crosshair';
        canvas.addEventListener('mousemove', (e) => {
            const r = canvas.getBoundingClientRect();
            const mx = e.clientX - r.left;
            const my = e.clientY - r.top;
            const cw = r.width - margins.left - margins.right;
            if (mx < margins.left || mx > r.width - margins.right || my < margins.top || my > r.height - margins.bottom) {
                if (window._fwChartState?.hoverT !== null) {
                    window._fwChartState.hoverT = null;
                    const s = window._fwChartState;
                    drawFireWaterChart(s.duration, s.volSprM3, s.volHoseM3, s.volSpM3, s.volMarginM3, s.volTotalM3, s.volTotalGal);
                }
                return;
            }
            const s = window._fwChartState;
            const curMaxT = Math.max(30, s.duration);
            const t = Math.max(0, Math.min(curMaxT, Math.round(((mx - margins.left) / cw) * curMaxT)));
            if (s.hoverT !== t) {
                s.hoverT = t;
                drawFireWaterChart(s.duration, s.volSprM3, s.volHoseM3, s.volSpM3, s.volMarginM3, s.volTotalM3, s.volTotalGal);
            }
        });
        canvas.addEventListener('mouseleave', () => {
            if (window._fwChartState && window._fwChartState.hoverT !== null) {
                window._fwChartState.hoverT = null;
                const s = window._fwChartState;
                drawFireWaterChart(s.duration, s.volSprM3, s.volHoseM3, s.volSpM3, s.volMarginM3, s.volTotalM3, s.volTotalGal);
            }
        });
    }

    const hT = window._fwChartState?.hoverT;
    if (hT !== null && hT !== undefined) {
        const frac = hT / maxT;
        const hx = getX(hT);
        const vTotAtT = volTotalM3 * frac;
        const vSprAtT = volSprM3 * frac;
        const vHoseAtT = volHoseM3 * frac;
        const hy = getY(vTotAtT);

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.beginPath();
        ctx.moveTo(hx, margins.top);
        ctx.lineTo(hx, margins.top + h);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(hx, hy, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#10b981';
        ctx.fill();

        const l1 = `Elapsed: ${hT} min`;
        const l2 = `Total: ${vTotAtT.toFixed(1)} m³ (${Math.round(volTotalGal * frac).toLocaleString()} gal)`;
        const l3 = `Sprinkler: ${vSprAtT.toFixed(1)} m³ | Hose: ${vHoseAtT.toFixed(1)} m³`;
        ctx.font = '600 10.5px Inter, sans-serif';
        const bw = Math.max(ctx.measureText(l2).width, ctx.measureText(l3).width) + 18;
        const bh = 54;
        let tx = hx + 12;
        if (tx + bw > margins.left + w) tx = hx - bw - 12;
        const ty = Math.max(margins.top + 28, hy - 30);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(tx, ty, bw, bh, 6);
        ctx.fill();
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.fillText(l1, tx + 9, ty + 6);
        ctx.fillStyle = '#10b981';
        ctx.fillText(l2, tx + 9, ty + 22);
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
        ctx.fillText(l3, tx + 9, ty + 37);
    }

    ctx.restore();
}

function drawPueChart(canvasId, curvePoints, activePoint) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !Array.isArray(curvePoints) || curvePoints.length === 0) return;
    bindCanvasTouchBridge(canvas);

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const logicalW = rect.width > 100 ? rect.width : 1000;
    const logicalH = rect.height > 100 ? rect.height : 380;
    if (canvas.width !== Math.round(logicalW * dpr) || canvas.height !== Math.round(logicalH * dpr)) {
        canvas.width = Math.round(logicalW * dpr);
        canvas.height = Math.round(logicalH * dpr);
    }

    const ctx = canvas.getContext('2d');
    const isDark = document.documentElement.classList.contains('dark');

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalW, logicalH);

    const margins = { top: 34, right: 64, bottom: 48, left: 68 };
    const w = logicalW - margins.left - margins.right;
    const h = logicalH - margins.top - margins.bottom;

    const minX = 10, maxX = 100;
    const rawMaxPue = Math.max(...curvePoints.map(p => p.pue), 1.85);
    const minY = 1.00;
    const maxY = Math.max(1.80, Math.ceil(rawMaxPue * 10) / 10 + 0.10);

    const getX = (lf) => margins.left + ((lf - minX) / (maxX - minX)) * w;
    const getY = (val) => margins.top + h - ((val - minY) / (maxY - minY)) * h;

    // 1. Background Efficiency Tier Bands
    const tiers = [
        { from: 1.00, to: 1.20, label: 'World-Class / Hyperscale (≤ 1.20)', fill: isDark ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.07)', text: '#10b981' },
        { from: 1.20, to: 1.40, label: 'High-Efficiency Modern DC (1.21–1.40)', fill: isDark ? 'rgba(20, 184, 166, 0.07)' : 'rgba(20, 184, 166, 0.06)', text: '#14b8a6' },
        { from: 1.40, to: 1.65, label: 'Standard Enterprise DC (1.41–1.65)', fill: isDark ? 'rgba(245, 158, 11, 0.07)' : 'rgba(245, 158, 11, 0.06)', text: '#f59e0b' },
        { from: 1.65, to: maxY, label: 'Legacy Facility (> 1.65)', fill: isDark ? 'rgba(244, 63, 94, 0.07)' : 'rgba(244, 63, 94, 0.05)', text: '#f43f5e' }
    ];

    tiers.forEach(t => {
        if (t.from >= maxY) return;
        const yTop = getY(Math.min(maxY, t.to));
        const yBot = getY(Math.max(minY, t.from));
        ctx.fillStyle = t.fill;
        ctx.fillRect(margins.left, yTop, w, Math.max(0, yBot - yTop));

        if (yBot - yTop >= 18) {
            ctx.font = '600 10px Inter, sans-serif';
            ctx.fillStyle = t.text;
            ctx.textAlign = 'right';
            ctx.fillText(t.label, margins.left + w - 8, yTop + 13);
        }
    });

    // 2. Gridlines & Axes
    ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(148, 163, 184, 0.28)';
    ctx.lineWidth = 1;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#94a3b8' : '#475569';

    const yStep = (maxY - minY) > 1.2 ? 0.20 : 0.10;
    for (let yVal = minY; yVal <= maxY + 0.001; yVal += yStep) {
        const py = getY(yVal);
        ctx.beginPath();
        ctx.moveTo(margins.left, py);
        ctx.lineTo(margins.left + w, py);
        ctx.stroke();

        ctx.textAlign = 'right';
        ctx.fillText(yVal.toFixed(2), margins.left - 8, py + 4);

        // Right axis: DCiE (%)
        const dcie = (100 / yVal).toFixed(0) + '%';
        ctx.textAlign = 'left';
        ctx.fillText(dcie, margins.left + w + 8, py + 4);
    }

    for (let xVal = 10; xVal <= 100; xVal += 10) {
        const px = getX(xVal);
        ctx.beginPath();
        ctx.moveTo(px, margins.top);
        ctx.lineTo(px, margins.top + h);
        ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillText(`${xVal}%`, px, margins.top + h + 18);
    }

    // Axis Titles
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#e2e8f0' : '#1e293b';
    ctx.textAlign = 'center';
    ctx.fillText('IT Equipment Load Factor (%)', margins.left + w / 2, margins.top + h + 38);

    ctx.save();
    ctx.translate(18, margins.top + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Power Usage Effectiveness (PUE)', 0, 0);
    ctx.restore();

    ctx.save();
    ctx.translate(logicalW - 14, margins.top + h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('DCiE Efficiency (%)', 0, 0);
    ctx.restore();

    // 3. Draw Partial Cooling PUE (pPUE) Dashed Curve
    ctx.beginPath();
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.2;
    ctx.setLineDash([6, 4]);
    curvePoints.forEach((pt, idx) => {
        const px = getX(pt.lfPct);
        const py = getY(Math.min(maxY, pt.pPUE));
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Draw Total Facility PUE Solid Curve + Area Fill
    const grad = ctx.createLinearGradient(0, margins.top, 0, margins.top + h);
    grad.addColorStop(0, 'rgba(139, 92, 246, 0.26)');
    grad.addColorStop(1, 'rgba(139, 92, 246, 0.02)');

    ctx.beginPath();
    curvePoints.forEach((pt, idx) => {
        const px = getX(pt.lfPct);
        const py = getY(Math.min(maxY, pt.pue));
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.lineTo(getX(curvePoints[curvePoints.length - 1].lfPct), margins.top + h);
    ctx.lineTo(getX(curvePoints[0].lfPct), margins.top + h);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.strokeStyle = '#8b5cf6';
    ctx.lineWidth = 3.2;
    curvePoints.forEach((pt, idx) => {
        const px = getX(pt.lfPct);
        const py = getY(Math.min(maxY, pt.pue));
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // 5. Active Operating Point Marker
    if (activePoint) {
        const ax = getX(activePoint.lfPct);
        const ay = getY(Math.min(maxY, activePoint.pue));

        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(ax, margins.top + h);
        ctx.lineTo(ax, ay);
        ctx.lineTo(margins.left, ay);
        ctx.stroke();
        ctx.restore();

        ctx.beginPath();
        ctx.arc(ax, ay, 9, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(ax, ay, 5.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#8b5cf6';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.stroke();

        const callout = `Operating Point: ${activePoint.lfPct.toFixed(0)}% Load → PUE ${activePoint.pue.toFixed(2)} (pPUE ${activePoint.pPUE.toFixed(2)})`;
        ctx.font = 'bold 11px Inter, sans-serif';
        const cw = ctx.measureText(callout).width + 16;
        let cx = ax + 12;
        if (cx + cw > margins.left + w) cx = ax - cw - 12;
        const cy = Math.max(margins.top + 8, ay - 28);

        ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)';
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.roundRect(cx, cy, cw, 22, 5);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.textAlign = 'left';
        ctx.fillText(callout, cx + 8, cy + 15);
    }

    // 6. Interactive Hover & Click-to-Select Load Factor
    window._pueChartState = {
        curvePoints,
        activePoint,
        hoverLf: window._pueChartState?.hoverLf ?? null
    };

    if (!canvas.dataset.pueBound) {
        canvas.dataset.pueBound = 'true';
        canvas.style.cursor = 'pointer';

        canvas.addEventListener('mousemove', (e) => {
            const r = canvas.getBoundingClientRect();
            const mx = e.clientX - r.left;
            const my = e.clientY - r.top;
            const cw = r.width - margins.left - margins.right;
            if (mx < margins.left || mx > r.width - margins.right || my < margins.top || my > r.height - margins.bottom) {
                if (window._pueChartState?.hoverLf !== null) {
                    window._pueChartState.hoverLf = null;
                    drawPueChart(canvasId, window._pueChartState.curvePoints, window._pueChartState.activePoint);
                }
                return;
            }
            const rawLf = minX + ((mx - margins.left) / cw) * (maxX - minX);
            const snappedLf = Math.max(10, Math.min(100, Math.round(rawLf / 2) * 2));
            if (window._pueChartState.hoverLf !== snappedLf) {
                window._pueChartState.hoverLf = snappedLf;
                drawPueChart(canvasId, window._pueChartState.curvePoints, window._pueChartState.activePoint);
            }
        });

        canvas.addEventListener('mouseleave', () => {
            if (window._pueChartState && window._pueChartState.hoverLf !== null) {
                window._pueChartState.hoverLf = null;
                drawPueChart(canvasId, window._pueChartState.curvePoints, window._pueChartState.activePoint);
            }
        });

        canvas.addEventListener('click', () => {
            const hLf = window._pueChartState?.hoverLf;
            if (hLf && typeof setPueLoadFactor === 'function') {
                setPueLoadFactor(hLf);
            }
        });
    }

    const hLf = window._pueChartState?.hoverLf;
    if (hLf !== null && hLf !== undefined) {
        const hPt = curvePoints.find(p => Math.abs(p.lfPct - hLf) < 1.1);
        if (hPt) {
            const hx = getX(hPt.lfPct);
            const hy = getY(Math.min(maxY, hPt.pue));

            ctx.save();
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = isDark ? '#38bdf8' : '#0284c7';
            ctx.beginPath();
            ctx.moveTo(hx, margins.top);
            ctx.lineTo(hx, margins.top + h);
            ctx.stroke();
            ctx.restore();

            ctx.beginPath();
            ctx.arc(hx, hy, 4.5, 0, 2 * Math.PI);
            ctx.fillStyle = '#38bdf8';
            ctx.fill();

            const t1 = `IT Load Factor: ${hPt.lfPct.toFixed(0)}% (${hPt.pItActualKw.toFixed(0)} kW IT)`;
            const t2 = `Total PUE: ${hPt.pue.toFixed(2)} • Cooling pPUE: ${hPt.pPUE.toFixed(2)} • DCiE: ${hPt.dciePct.toFixed(1)}%`;
            const t3 = `Cooling: ${hPt.pCoolingTotalKw.toFixed(1)} kW • Elec Loss: ${hPt.pElecOverheadKw.toFixed(1)} kW (Click to set)`;

            ctx.font = '600 10.5px Inter, sans-serif';
            const bw = Math.max(ctx.measureText(t2).width, ctx.measureText(t3).width) + 18;
            const bh = 54;
            let bx = hx + 12;
            if (bx + bw > margins.left + w) bx = hx - bw - 12;
            const by = Math.max(margins.top + 6, Math.min(margins.top + h - bh - 6, hy - 28));

            ctx.fillStyle = isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.97)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(bx, by, bw, bh, 6);
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
            ctx.fillText(t1, bx + 9, by + 6);
            ctx.fillStyle = '#8b5cf6';
            ctx.fillText(t2, bx + 9, by + 22);
            ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
            ctx.fillText(t3, bx + 9, by + 37);
        }
    }

    ctx.restore();
}


