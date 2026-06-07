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
    map.regions ??= [];
    map.terrain.regionMap ??= new Array(map.terrain.width * map.terrain.depth).fill(-1) as number[];
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

    let currentRegionIdx = -1;
    let regionHideTimeoutId = 0;
    const regionEl = document.getElementById('region-name')!;

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

        const pos = character.group.position;
        const { width, depth, cellSize, regionMap } = map.terrain;
        const halfW = ((width - 1) * cellSize) / 2;
        const halfD = ((depth - 1) * cellSize) / 2;
        const gx = Math.max(0, Math.min(width - 1, Math.round((pos.x + halfW) / cellSize)));
        const gz = Math.max(0, Math.min(depth - 1, Math.round((pos.z + halfD) / cellSize)));
        const newRegionIdx = regionMap[gz * width + gx] ?? -1;
        if (newRegionIdx !== currentRegionIdx) {
            currentRegionIdx = newRegionIdx;
            clearTimeout(regionHideTimeoutId);
            if (newRegionIdx >= 0 && newRegionIdx < map.regions.length) {
                regionEl.textContent = map.regions[newRegionIdx]!.name;
                regionEl.style.opacity = '1';
                regionHideTimeoutId = window.setTimeout(() => { regionEl.style.opacity = '0'; }, 3000);
            } else {
                regionEl.style.opacity = '0';
            }
        }

        renderFrame(ctx);
        stats.end();
    }
    frame();
}

main().catch(console.error);
