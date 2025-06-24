/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { Point, Rect } from './math.js';
import { unitTypes } from './unit.js';

const TILE_SIZES = [32, 48, 64, 96, 128];

export class Camera extends Point {
    constructor(x, y, zoomLevel) {
        super(x, y);
        this.zoomLevel = zoomLevel;
        this.tileSize = TILE_SIZES[this.zoomLevel];
    }
}

export default class Controls {
    constructor(camera, map, player, units) {
        this.camera = camera;
        this.map = map;
        this.player = player;
        this.units = units;

        this.isDragging = false;
        this.dragStart = null;
        this.dragCurrent = null;
        this.selectedUnits = [];

        this.pressedKeys = {};
    }

    onKeyDown(event) {
        this.pressedKeys[event.key] = true;
        return true;
    }

    onKeyUp(event) {
        this.pressedKeys[event.key] = false;
        return true;
    }

    onMouseDown(event) {
        if (event.button === 0) {
            this.isDragging = true;
            this.dragStart = new Point(event.clientX, event.clientY);
            this.dragCurrent = this.dragStart;
            return true;
        }
        return false;
    }

    onMouseMove(event) {
        if (this.isDragging) {
            this.dragCurrent = new Point(event.clientX, event.clientY);
            return true;
        }
        return false;
    }

    onMouseUp(event) {
        if (this.isDragging) {
            this.isDragging = false;

            // Select all units in drag rect
            let singleClick = this.dragStart.equals(this.dragCurrent);
            const selectedRect = new Rect(
                Math.min(this.dragStart.x, this.dragCurrent.x),
                Math.min(this.dragStart.y, this.dragCurrent.y),
                Math.abs(this.dragCurrent.x - this.dragStart.x),
                Math.abs(this.dragCurrent.y - this.dragStart.y)
            );
            this.selectedUnits = [];
            for (const unit of this.units) {
                const unitType = unitTypes[unit.type];
                if (!singleClick && (unit.player !== this.player || !unitType.movable)) continue;
                const collisionRect = new Rect(
                    window.innerWidth / 2 +
                        (unit.x - this.camera.x - unitType.width / 2 + unitType.collision.x) * this.camera.tileSize,
                    window.innerHeight / 2 +
                        (unit.y - this.camera.y - unitType.height + unitType.collision.y) * this.camera.tileSize,
                    unitType.collision.w * this.camera.tileSize,
                    unitType.collision.h * this.camera.tileSize
                );
                if (selectedRect.intersects(collisionRect)) {
                    this.selectedUnits.push(unit);
                    if (singleClick) break;
                }
            }
            return true;
        }
        if (event.button === 2 && this.selectedUnits.length > 0) {
            for (const unit of this.selectedUnits) {
                const unitType = unitTypes[unit.type];
                if (unitType.movable) {
                    unit.target = new Point(
                        (event.clientX - window.innerWidth / 2 + this.camera.x * this.camera.tileSize) /
                            this.camera.tileSize,
                        (event.clientY - window.innerHeight / 2 + this.camera.y * this.camera.tileSize) /
                            this.camera.tileSize
                    );
                }
            }
            return true;
        }
        return false;
    }

    onWheel(event) {
        const delta = event.deltaY < 0 ? 1 : -1;
        this.camera.zoomLevel = Math.max(0, Math.min(TILE_SIZES.length - 1, this.camera.zoomLevel + delta));
        this.camera.tileSize = TILE_SIZES[this.camera.zoomLevel];
        return true;
    }

    update(delta) {
        const cameraSpeed = (1 / (this.camera.zoomLevel + 1)) * 20;
        if (this.pressedKeys['ArrowLeft'] || this.pressedKeys['a']) {
            this.camera.x -= cameraSpeed * delta;
        }
        if (this.pressedKeys['ArrowRight'] || this.pressedKeys['d']) {
            this.camera.x += cameraSpeed * delta;
        }
        if (this.pressedKeys['ArrowUp'] || this.pressedKeys['w']) {
            this.camera.y -= cameraSpeed * delta;
        }
        if (this.pressedKeys['ArrowDown'] || this.pressedKeys['s']) {
            this.camera.y += cameraSpeed * delta;
        }
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.y < 0) this.camera.y = 0;
        if (this.camera.x > this.map.width) this.camera.x = this.map.width;
        if (this.camera.y > this.map.height) this.camera.y = this.map.height;
    }

    draw(ctx) {
        if (this.isDragging) {
            ctx.strokeStyle = '#777';
            ctx.lineWidth = 1;
            ctx.strokeRect(
                Math.min(this.dragStart.x, this.dragCurrent.x) + 1,
                Math.min(this.dragStart.y, this.dragCurrent.y) + 1,
                Math.abs(this.dragCurrent.x - this.dragStart.x),
                Math.abs(this.dragCurrent.y - this.dragStart.y)
            );
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(
                Math.min(this.dragStart.x, this.dragCurrent.x),
                Math.min(this.dragStart.y, this.dragCurrent.y),
                Math.abs(this.dragCurrent.x - this.dragStart.x),
                Math.abs(this.dragCurrent.y - this.dragStart.y)
            );
        }
    }
}
