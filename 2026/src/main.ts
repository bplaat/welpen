/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import './game.css';
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

    // --- Touch controls ---
    const joystickZone = document.getElementById('joystick-zone') as HTMLElement;
    const joystickBase = document.getElementById('joystick-base') as HTMLElement;
    const joystickThumb = document.getElementById('joystick-thumb') as HTMLElement;
    const lookZone = document.getElementById('look-zone') as HTMLElement;
    const btnJump = document.getElementById('btn-jump') as HTMLElement;

    const JOYSTICK_MAX = 44;
    let joystickId = -1;
    let joystickCx = 0, joystickCy = 0;
    let lookId = -1;
    let lookPx = 0, lookPy = 0;

    function resetJoystick(): void {
        joystickBase.style.left = '';
        joystickBase.style.top = '';
        joystickThumb.style.transform = 'translate(-50%, -50%)';
        controls.setTouchMove(0, 0);
    }

    joystickZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]!;
            if (joystickId !== -1) continue;
            joystickId = t.identifier;
            joystickCx = t.clientX;
            joystickCy = t.clientY;
            joystickBase.style.left = t.clientX + 'px';
            joystickBase.style.top = t.clientY + 'px';
            joystickBase.style.display = 'block';
            controls.activateTouch();
        }
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]!;
            if (t.identifier !== joystickId) continue;
            const dx = t.clientX - joystickCx;
            const dy = t.clientY - joystickCy;
            const len = Math.sqrt(dx * dx + dy * dy);
            const clamped = Math.min(len, JOYSTICK_MAX);
            const nx = len > 0 ? dx / len : 0;
            const ny = len > 0 ? dy / len : 0;
            joystickThumb.style.transform = `translate(calc(-50% + ${nx * clamped}px), calc(-50% + ${ny * clamped}px))`;
            const mag = Math.min(len / JOYSTICK_MAX, 1);
            controls.setTouchMove(nx * mag, -ny * mag);
        }
    }, { passive: false });

    function onJoystickEnd(e: TouchEvent): void {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i]!.identifier !== joystickId) continue;
            joystickId = -1;
            resetJoystick();
        }
    }
    joystickZone.addEventListener('touchend', onJoystickEnd, { passive: false });
    joystickZone.addEventListener('touchcancel', onJoystickEnd, { passive: false });

    lookZone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]!;
            if (lookId !== -1) continue;
            lookId = t.identifier;
            lookPx = t.clientX;
            lookPy = t.clientY;
            controls.activateTouch();
        }
    }, { passive: false });

    lookZone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const t = e.changedTouches[i]!;
            if (t.identifier !== lookId) continue;
            controls.addLookDelta(t.clientX - lookPx, t.clientY - lookPy);
            lookPx = t.clientX;
            lookPy = t.clientY;
        }
    }, { passive: false });

    function onLookEnd(e: TouchEvent): void {
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i]!.identifier === lookId) lookId = -1;
        }
    }
    lookZone.addEventListener('touchend', onLookEnd, { passive: false });
    lookZone.addEventListener('touchcancel', onLookEnd, { passive: false });

    btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        controls.triggerJump();
        controls.activateTouch();
    }, { passive: false });

    // --- HUD: instructions ---
    const instructions = document.getElementById('instructions');
    let instructionsHidden = false;

    // --- HUD: region name ---
    let currentRegionIdx = -1;
    let regionHideTimeoutId = 0;
    const regionEl = document.getElementById('region-name')!;

    // --- HUD: stats ---
    const statsEl = document.getElementById('stats') as HTMLElement;
    let statsFrames = 0;
    let statsTime = 0;

    // --- Render loop ---
    let lastTime = performance.now();
    function frame(): void {
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

        statsFrames++;
        statsTime += delta;
        if (statsTime >= 0.5) {
            const fps = Math.round(statsFrames / statsTime);
            const calls = ctx.renderer.info.render.calls;
            const tris = ctx.renderer.info.render.triangles;
            statsEl.textContent = `${fps} fps | ${calls} draw | ${tris >= 1000 ? (tris / 1000).toFixed(0) + 'k' : tris} tris`;
            statsFrames = 0;
            statsTime = 0;
        }
    }
    frame();
}

main().catch(console.error);
