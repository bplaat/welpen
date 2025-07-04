/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { Rect, Point } from './math.ts';
import { DEBUG, PlayerType } from './main.ts';
import Unit, { TargetType, unitTypes, UnitTypeType } from './unit.ts';
import type { Camera } from './controls.ts';
import type Controls from './controls.ts';
import Map from './map.ts';

export default class Minimap {
    static SIZE = 256;
    static PADDING = 8;
    static PLAYER_COLORS: { [key: string]: number } = {
        nature: 0xaaaaaa,
        blue: 0x157df8,
        red: 0xf6583c,
    };

    map: Map;
    units: Unit[];
    camera: Camera;
    controls: Controls;
    mouseDown: boolean;
    minimap: Uint32Array;

    rect: Rect;
    minimapRect: Rect;

    constructor(map: Map, units: Unit[], camera: Camera, controls: Controls) {
        this.map = map;
        this.units = units;
        this.camera = camera;
        this.controls = controls;
        this.mouseDown = false;
        this.minimap = new Uint32Array(this.map.width * this.map.height);
        this.rect = new Rect(0, 0, 0, 0);
        this.minimapRect = new Rect(0, 0, 0, 0);
        this.update();
        this.onResize();
    }

    update() {
        // Mark tiles
        this.minimap.fill(0x222222);
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (DEBUG || this.map.explored[y * this.map.width + x] === 1) {
                    const tile = this.map.terrain[y * this.map.width + x];
                    if (tile === 0 || tile === 1) this.minimap[y * this.map.width + x] = 0xa6e1f5;
                    if (tile === 2 || tile === 3) this.minimap[y * this.map.width + x] = 0xecdcb8;
                    if (tile === 4 || tile === 5) this.minimap[y * this.map.width + x] = 0x27ae60;
                }
            }
        }

        // Mark resource units
        for (const unit of this.units) {
            const index = Math.floor(unit.y) * this.map.width + Math.floor(unit.x);
            if (DEBUG || this.map.explored[index] === 1) {
                if (unit.type === 'tree') this.minimap[index] = 0x198a49;
                if (unit.type === 'bushes') this.minimap[index] = 0xa2704c;
                if (unit.type === 'stone') this.minimap[index] = 0x9ba6a6;
                if (unit.type === 'gold') this.minimap[index] = 0xffdf99;
            }
        }

        // Mark player units
        for (const unit of this.units) {
            const unitType = unitTypes[unit.type];
            const index = Math.floor(unit.y) * this.map.width + Math.floor(unit.x);
            if (unit.player.type !== PlayerType.Nature && (DEBUG || this.map.explored[index] === 1)) {
                if (this.map.sight[index] === 1 || unitType.type !== UnitTypeType.Unit) {
                    this.minimap[index] = Minimap.PLAYER_COLORS[unit.player.color];
                }
            }
        }
    }

    onResize() {
        this.rect = new Rect(
            0,
            window.innerHeight - (Minimap.SIZE + Minimap.PADDING * 2),
            Minimap.SIZE + Minimap.PADDING * 2,
            Minimap.SIZE + Minimap.PADDING * 2
        );
        this.minimapRect = new Rect(
            this.rect.x + Minimap.PADDING,
            this.rect.y + Minimap.PADDING,
            this.rect.width - Minimap.PADDING * 2,
            this.rect.height - Minimap.PADDING * 2
        );
    }

    onMouseDown(event: MouseEvent) {
        if (this.rect.contains(new Point(event.clientX, event.clientY))) {
            if (event.button === 0) {
                this.mouseDown = true;
                this.camera.x = ((event.clientX - this.minimapRect.x) / this.minimapRect.width) * this.map.width;
                this.camera.y = ((event.clientY - this.minimapRect.y) / this.minimapRect.height) * this.map.height;
            }
            return true;
        }
        return false;
    }

    onMouseMove(event: MouseEvent) {
        if (this.rect.contains(new Point(event.clientX, event.clientY))) {
            if (this.mouseDown) {
                this.camera.x = ((event.clientX - this.minimapRect.x) / this.minimapRect.width) * this.map.width;
                this.camera.y = ((event.clientY - this.minimapRect.y) / this.minimapRect.height) * this.map.height;
            }
            return true;
        }
        return false;
    }

    onMouseUp(event: MouseEvent) {
        if (this.rect.contains(new Point(event.clientX, event.clientY))) {
            if (this.mouseDown) {
                this.mouseDown = false;
            }

            if (event.button === 2) {
                const point = new Point(
                    ((event.clientX - this.minimapRect.x) / this.minimapRect.width) * this.map.width,
                    ((event.clientY - this.minimapRect.y) / this.minimapRect.height) * this.map.height
                );
                for (const unit of this.controls.selectedUnits) {
                    const unitType = unitTypes[unit.type];
                    if (unitType.type === UnitTypeType.Unit) {
                        unit.target = { type: TargetType.Point, point };
                    }
                }
            }
            return true;
        }
        return false;
    }

    render(ctx: CanvasRenderingContext2D) {
        // Render background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        this.renderMinimap(ctx);
        this.renderCameraViewport(ctx);
    }

    renderMinimap(ctx: CanvasRenderingContext2D) {
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                const color = this.minimap[y * this.map.width + x];
                const darkFactor = this.map.sight[y * this.map.width + x] === 0 ? 0.7 : 1;
                const r = Math.floor(((color >> 16) & 0xff) * darkFactor);
                const g = Math.floor(((color >> 8) & 0xff) * darkFactor);
                const b = Math.floor((color & 0xff) * darkFactor);
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillRect(
                    this.minimapRect.x + x * (Minimap.SIZE / this.map.width),
                    this.minimapRect.y + y * (Minimap.SIZE / this.map.height),
                    Minimap.SIZE / this.map.width,
                    Minimap.SIZE / this.map.height
                );
            }
        }
    }

    renderCameraViewport(ctx: CanvasRenderingContext2D) {
        const viewport = new Rect(
            this.minimapRect.x +
                ((this.camera.x - window.innerWidth / (2 * this.camera.tileSize)) / this.map.width) * Minimap.SIZE,
            this.minimapRect.y +
                ((this.camera.y - window.innerHeight / (2 * this.camera.tileSize)) / this.map.height) * Minimap.SIZE,
            (window.innerWidth / (this.camera.tileSize * this.map.width)) * Minimap.SIZE,
            (window.innerHeight / (this.camera.tileSize * this.map.height)) * Minimap.SIZE
        );
        ctx.lineWidth = 1;
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.minimapRect.x, this.minimapRect.y, this.minimapRect.width, this.minimapRect.height);
        ctx.clip();
        ctx.strokeStyle = '#777';
        ctx.strokeRect(viewport.x + 1, viewport.y + 1, viewport.width, viewport.height);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
        ctx.restore();
    }
}
