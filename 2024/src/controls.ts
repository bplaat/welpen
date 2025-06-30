/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import type { Player } from './main.ts';
import { Point, Rect } from './math.ts';
import Map from './map.ts';
import Unit, { TargetType, unitTypes, UnitTypeType } from './unit.ts';

const TILE_SIZES = [12, 16, 24, 32, 48, 64];

export class Camera extends Point {
    zoomLevel: number;

    constructor(x: number, y: number, zoomLevel: number) {
        super(x, y);
        this.zoomLevel = Math.max(0, Math.min(TILE_SIZES.length - 1, zoomLevel));
    }

    get tileSize() {
        return TILE_SIZES[this.zoomLevel];
    }

    static fromJSON(json: any) {
        return new Camera(json.x, json.y, json.zoomLevel);
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            zoomLevel: this.zoomLevel,
        };
    }
}

export default class Controls {
    camera: Camera;
    map: Map;
    player: Player;
    units: Unit[];
    isDragging: boolean;
    dragStart?: Point;
    dragCurrent?: Point;
    selectedUnits: Unit[];
    lastClickTime: number;
    pressedKeys: { [key: string]: boolean };

    constructor(camera: Camera, map: Map, player: Player, units: Unit[]) {
        this.camera = camera;
        this.map = map;
        this.player = player;
        this.units = units;
        this.isDragging = false;
        this.selectedUnits = [];
        this.lastClickTime = 0;
        this.pressedKeys = {};
    }

    onKeyDown(event: KeyboardEvent) {
        this.pressedKeys[event.key] = true;
        return true;
    }

    onKeyUp(event: KeyboardEvent) {
        this.pressedKeys[event.key] = false;
        return true;
    }

    onMouseDown(event: MouseEvent) {
        if (event.button === 0) {
            this.isDragging = true;
            this.dragStart = new Point(event.clientX, event.clientY);
            this.dragCurrent = this.dragStart;
            return true;
        }
        return false;
    }

    onMouseMove(event: MouseEvent) {
        if (this.isDragging) {
            this.dragCurrent = new Point(event.clientX, event.clientY);
            return true;
        }
        return false;
    }

    onMouseUp(event: MouseEvent) {
        if (this.isDragging) {
            this.isDragging = false;
            const singleClick = this.dragStart!.distanceTo(this.dragCurrent!) < 2;

            // Select all units in drag rect
            const selectedRect = new Rect(
                Math.min(this.dragStart!.x, this.dragCurrent!.x),
                Math.min(this.dragStart!.y, this.dragCurrent!.y),
                Math.abs(this.dragCurrent!.x - this.dragStart!.x),
                Math.abs(this.dragCurrent!.y - this.dragStart!.y)
            );
            this.selectedUnits = [];
            for (const unit of this.units) {
                const unitType = unitTypes[unit.type];
                if (!singleClick && (unit.player !== this.player || unitType.type !== UnitTypeType.Unit)) continue;
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

            // Support unit double click selection
            if (singleClick && performance.now() - this.lastClickTime < 300 && this.selectedUnits.length > 0) {
                const selectedType = this.selectedUnits[0].type;
                this.selectedUnits = this.units.filter((unit) => {
                    if (unit.type !== selectedType || unit.player !== this.player) return false;
                    const unitType = unitTypes[unit.type];
                    const collisionRect = new Rect(
                        window.innerWidth / 2 +
                            (unit.x - this.camera.x - unitType.width / 2 + unitType.collision.x) * this.camera.tileSize,
                        window.innerHeight / 2 +
                            (unit.y - this.camera.y - unitType.height + unitType.collision.y) * this.camera.tileSize,
                        unitType.collision.w * this.camera.tileSize,
                        unitType.collision.h * this.camera.tileSize
                    );
                    return collisionRect.intersects(new Rect(0, 0, window.innerWidth, window.innerHeight));
                });
            }

            this.lastClickTime = performance.now();
            return true;
        }

        if (event.button === 2 && this.selectedUnits.length > 0) {
            const targetPoint = new Point(
                (event.clientX - window.innerWidth / 2 + this.camera.x * this.camera.tileSize) / this.camera.tileSize,
                (event.clientY - window.innerHeight / 2 + this.camera.y * this.camera.tileSize) / this.camera.tileSize
            );

            // Find nearest intersecting unit
            let targetUnit = null;
            for (const unit of this.units) {
                const unitType = unitTypes[unit.type];
                const collisionRect = new Rect(
                    unit.x - unitType.width / 2 + unitType.collision.x,
                    unit.y - unitType.height + unitType.collision.y,
                    unitType.collision.w,
                    unitType.collision.h
                );
                if (collisionRect.contains(targetPoint)) {
                    targetUnit = unit;
                    break;
                }
            }

            for (const unit of this.selectedUnits) {
                const unitType = unitTypes[unit.type];
                if (unitType.type === UnitTypeType.Unit) {
                    if (targetUnit) {
                        unit.target = { type: TargetType.Unit, unit: targetUnit };
                    } else {
                        unit.target = { type: TargetType.Point, point: targetPoint };
                    }
                }
            }
            return true;
        }
        return false;
    }

    onWheel(event: WheelEvent) {
        const delta = event.deltaY < 0 ? 1 : -1;

        const cursorWorldX = (event.clientX - window.innerWidth / 2) / this.camera.tileSize + this.camera.x;
        const cursorWorldY = (event.clientY - window.innerHeight / 2) / this.camera.tileSize + this.camera.y;

        this.camera.zoomLevel = Math.max(0, Math.min(TILE_SIZES.length - 1, this.camera.zoomLevel + delta));

        this.camera.x = cursorWorldX - (event.clientX - window.innerWidth / 2) / this.camera.tileSize;
        this.camera.y = cursorWorldY - (event.clientY - window.innerHeight / 2) / this.camera.tileSize;
        return true;
    }

    update(delta: number) {
        const cameraSpeed = (1 / (this.camera.zoomLevel + 1)) * 30;
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

    draw(ctx: CanvasRenderingContext2D) {
        if (this.isDragging) {
            ctx.strokeStyle = '#777';
            ctx.lineWidth = 1;
            const dragStart = this.dragStart!;
            const dragCurrent = this.dragCurrent!;
            ctx.strokeRect(
                Math.min(dragStart.x, dragCurrent.x) + 1,
                Math.min(dragStart.y, dragCurrent.y) + 1,
                Math.abs(dragCurrent.x - dragStart.x),
                Math.abs(dragCurrent.y - dragStart.y)
            );
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(
                Math.min(dragStart.x, dragCurrent.x),
                Math.min(dragStart.y, dragCurrent.y),
                Math.abs(dragCurrent.x - dragStart.x),
                Math.abs(dragCurrent.y - dragStart.y)
            );
        }
    }
}
