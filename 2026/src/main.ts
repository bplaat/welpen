/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import Stats from 'stats.js';
import { createRenderer, renderFrame } from './renderer.ts';
import { ThirdPersonControls } from './controls.ts';
import { loadMap } from './map.ts';
import { loadCharacter } from './character.ts';

async function main(): Promise<void> {
    const [map, character] = await Promise.all([loadMap(), loadCharacter()]);
    map.terrain.layers ??= [];
    map.terrain.layerWeights ??= [];
    const ctx = createRenderer(document.body, map);
    ctx.scene.add(character.group);

    const controls = new ThirdPersonControls(ctx.camera, ctx.renderer.domElement, map.terrain, character);

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
