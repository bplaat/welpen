/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import Stats from 'stats.js';
import { createRenderer, renderFrame } from './renderer.ts';
import { FPSControls } from './controls.ts';
import { loadMap } from './map.ts';

async function main(): Promise<void> {
    const map = await loadMap();
    const ctx = createRenderer(document.body, map);
    // Default start position; FPSControls will restore from localStorage or snap to terrain
    ctx.camera.position.set(0, 3, 20);

    const controls = new FPSControls(ctx.camera, ctx.renderer.domElement, ctx.terrainMesh);

    const stats = new Stats();
    stats.showPanel(0);
    stats.dom.style.position = 'fixed';
    stats.dom.style.top = '0';
    stats.dom.style.right = '0';
    stats.dom.style.left = 'auto';
    stats.dom.style.transform = 'scale(0.5)';
    stats.dom.style.transformOrigin = 'top right';
    document.body.appendChild(stats.dom);

    const instructions = document.getElementById('instructions');
    let instructionsHidden = false;

    let lastTime = performance.now();
    function frame(): void {
        stats.begin();
        requestAnimationFrame(frame);
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        controls.update(delta);
        if (!instructionsHidden && controls.isLocked()) {
            instructionsHidden = true;
            instructions?.classList.add('hidden');
        }
        renderFrame(ctx);
        stats.end();
    }
    frame();
}

main().catch(console.error);
