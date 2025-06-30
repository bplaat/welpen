/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { Rect, Random, Point } from './math.ts';
import { DEBUG, Player } from './main.ts';
import { img } from './utils.ts';
import type Map from './map.ts';
import type { Camera } from './controls.ts';

const unitImages: { [key: string]: { [key: string]: HTMLImageElement } } = {
    nature: {
        bushes: img('images/units/nature/bushes.png'),
        tree1: img('images/units/nature/tree1.png'),
        tree2: img('images/units/nature/tree2.png'),
        stone: img('images/units/nature/stone.png'),
        gold: img('images/units/nature/gold.png'),
    },
    blue: {
        villager1: img('images/units/blue/villager1.png'),
        villager2: img('images/units/blue/villager2.png'),
        king: img('images/units/blue/king.png'),
        spearman: img('images/units/blue/spearman.png'),
        knight: img('images/units/blue/knight.png'),
        monk: img('images/units/blue/monk.png'),
        scout: img('images/units/blue/scout.png'),
        townCenter: img('images/units/blue/town_center.png'),
        house: img('images/units/blue/house.png'),
        barracks: img('images/units/blue/barracks.png'),
        storeHouse: img('images/units/blue/store_house.png'),
        church: img('images/units/blue/church.png'),
        tower: img('images/units/blue/tower.png'),
    },
    red: {
        villager1: img('images/units/red/villager1.png'),
        villager2: img('images/units/red/villager2.png'),
        king: img('images/units/red/king.png'),
        spearman: img('images/units/red/spearman.png'),
        knight: img('images/units/red/knight.png'),
        monk: img('images/units/red/monk.png'),
        scout: img('images/units/red/scout.png'),
        townCenter: img('images/units/red/town_center.png'),
        house: img('images/units/red/house.png'),
        barracks: img('images/units/red/barracks.png'),
        storeHouse: img('images/units/red/store_house.png'),
        church: img('images/units/red/church.png'),
        tower: img('images/units/red/tower.png'),
    },
};

export interface UnitAction {
    x: number;
    y: number;
    image: string;
    name: string;
    cost?: { [resource: string]: number };
}

export enum UnitTypeType {
    Unit,
    Resource,
    Building,
}

export interface UnitType {
    type: UnitTypeType;
    name: string;
    width: number;
    height: number;
    anchor: { x: number; y: number };
    collision: { x: number; y: number; w: number; h: number };
    health?: number;
    speed?: number;
    lineOfSight?: number;
    givesResource?: string;
    population?: number;
    populationLimit?: number;
    actions?: UnitAction[];
}

export const unitTypes: { [key: string]: UnitType } = {
    // Units
    villager: {
        type: UnitTypeType.Unit,
        name: 'Villager',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.875 },
        collision: { x: 0.25, y: 0.25, w: 0.5, h: 0.75 },
        health: 50,
        speed: 2,
        lineOfSight: 4,
        population: 1,
    },
    king: {
        type: UnitTypeType.Unit,
        name: 'King',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.875 },
        collision: { x: 0.25, y: 0.25, w: 0.5, h: 0.75 },
        health: 100,
        speed: 4,
        lineOfSight: 6,
        population: 0,
    },
    spearman: {
        type: UnitTypeType.Unit,
        name: 'Spearman',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.875 },
        collision: { x: 0.25, y: 0.25, w: 0.5, h: 0.75 },
        health: 75,
        speed: 2,
        lineOfSight: 4,
        population: 1,
    },
    knight: {
        type: UnitTypeType.Unit,
        name: 'Knight',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.875 },
        collision: { x: 0.25, y: 0.25, w: 0.5, h: 0.75 },
        health: 150,
        speed: 2,
        lineOfSight: 4,
        population: 2,
    },
    scout: {
        type: UnitTypeType.Unit,
        name: 'Scout',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.875 },
        collision: { x: 0.25, y: 0.25, w: 0.5, h: 0.75 },
        health: 150,
        speed: 6,
        lineOfSight: 8,
        population: 1,
    },
    monk: {
        type: UnitTypeType.Unit,
        name: 'Monk',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.875 },
        collision: { x: 0.25, y: 0.25, w: 0.5, h: 0.75 },
        health: 150,
        speed: 2,
        lineOfSight: 5,
        population: 1,
    },

    // Resources
    tree: {
        type: UnitTypeType.Resource,
        name: 'Tree',
        width: 1,
        height: 2,
        anchor: { x: 0.5, y: 2 },
        collision: { x: 0, y: 0, w: 1, h: 2 },
        health: 100,
        givesResource: 'Wood',
    },
    bushes: {
        type: UnitTypeType.Resource,
        name: 'Bushes',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 1 },
        collision: { x: 0, y: 0, w: 1, h: 1 },
        health: 100,
        givesResource: 'Food',
    },
    stone: {
        type: UnitTypeType.Resource,
        name: 'Stone',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 1 },
        collision: { x: 0, y: 0, w: 1, h: 1 },
        health: 200,
        givesResource: 'Stone',
    },
    gold: {
        type: UnitTypeType.Resource,
        name: 'Gold',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 1 },
        collision: { x: 0, y: 0, w: 1, h: 1 },
        health: 200,
        givesResource: 'Gold',
    },

    // Buildings
    townCenter: {
        type: UnitTypeType.Building,
        name: 'Town Center',
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1.93 },
        collision: { x: 0.3, y: 0.15, w: 1.4, h: 1.85 },
        health: 1000,
        lineOfSight: 8,
        actions: [
            { x: 0, y: 0, image: 'villager', name: 'Villager', cost: { food: 50 } },
            { x: 1, y: 0, image: 'scout', name: 'Scout', cost: { food: 100 } },
        ],
        populationLimit: 10,
    },
    house: {
        type: UnitTypeType.Building,
        name: 'House',
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1.75 },
        collision: { x: 0.3, y: 0.5, w: 1.4, h: 1.5 },
        health: 250,
        lineOfSight: 6,
        actions: [],
        populationLimit: 5,
    },
    barracks: {
        type: UnitTypeType.Building,
        name: 'Barracks',
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1.75 },
        collision: { x: 0.2, y: 0.5, w: 1.6, h: 1.5 },
        health: 600,
        lineOfSight: 6,
        actions: [
            { x: 0, y: 0, image: 'spearman', name: 'Spearman', cost: { wood: 50, food: 50 } },
            { x: 1, y: 0, image: 'knight', name: 'Knight', cost: { food: 100, gold: 75 } },
        ],
    },
    storeHouse: {
        type: UnitTypeType.Building,
        name: 'Store House',
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1.95 },
        collision: { x: 0.1, y: 0.1, w: 1.8, h: 1.9 },
        health: 500,
        lineOfSight: 6,
        actions: [],
    },
    church: {
        type: UnitTypeType.Building,
        name: 'Church',
        width: 2,
        height: 4,
        anchor: { x: 1, y: 3.1 },
        collision: { x: 0.3, y: 1.75, w: 1.4, h: 2.3 },
        health: 600,
        lineOfSight: 6,
        actions: [{ x: 0, y: 0, image: 'monk', name: 'Monk', cost: { food: 100, gold: 200 } }],
    },
    tower: {
        type: UnitTypeType.Building,
        name: 'Tower',
        width: 2,
        height: 4,
        anchor: { x: 0.5, y: 3.3 },
        collision: { x: 0.3, y: 1.4, w: 1.4, h: 2.6 },
        health: 800,
        lineOfSight: 12,
        actions: [],
    },
};

export enum TargetType {
    Unit,
    Point,
}

export interface Target {
    type: TargetType;
    unit?: Unit;
    point?: Point;
}

const random = new Random(Date.now());

export default class Unit extends Point {
    id: string;
    type: string;
    variant?: number;
    player: Player;
    health: number;
    flipX: boolean;
    target?: Target;

    constructor(x: number, y: number, type: string, player: Player, variant?: number) {
        super(x, y);
        this.id = crypto.randomUUID();
        this.type = type;
        if (this.type === 'villager' || this.type === 'tree') {
            this.variant = variant !== undefined ? variant : random.nextInt(1, 2);
        }
        this.player = player;
        this.health = unitTypes[type].health!;
        this.flipX = false;
    }

    static fromJSON(json: any, players: Player[], units: Unit[]) {
        const player = players.find((p) => p.id === json.player_id)!;
        const unit = new Unit(json.x, json.y, json.type, player);
        unit.id = json.id;
        unit.variant = json.variant;
        unit.health = json.health;
        if (json.target) {
            if (json.target.type === 'unit') {
                unit.target = {
                    type: TargetType.Unit,
                    unit: units.find((u) => u.id === json.target.unit_id),
                };
            } else if (json.target.type === 'point') {
                unit.target = { type: TargetType.Point, point: new Point(json.target.point.x, json.target.point.y) };
            }
        } else {
            unit.target = undefined;
        }
        unit.flipX = json.flipX;
        return unit;
    }

    toJSON() {
        let target = null;
        if (this.target) {
            if (this.target.type === TargetType.Unit) {
                target = { type: 'unit', unit_id: this.target.unit!.id };
            } else if (this.target.type === TargetType.Point) {
                target = { type: 'point', point: { x: this.target.point!.x, y: this.target.point!.y } };
            }
        }
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            variant: this.variant,
            player_id: this.player.id,
            health: this.health,
            target,
            flipX: this.flipX,
        };
    }

    update(delta: number, units: Unit[], map: Map) {
        const unitType = unitTypes[this.type];
        if (unitType.type === UnitTypeType.Unit && this.target) {
            const targetX = this.target.type === TargetType.Unit ? this.target.unit!.x : this.target.point!.x;
            const targetY = this.target.type === TargetType.Unit ? this.target.unit!.y : this.target.point!.y;
            const dx = targetX - this.x;
            const dy = targetY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0.01) {
                const speed = unitType.speed! * delta;
                let newX = this.x + (dx / distance) * speed;
                let newY = this.y + (dy / distance) * speed;

                this.flipX = dx < 0;

                // Check map bounds
                if (newX < 0) newX = 0;
                if (newY < 0) newY = 0;
                if (newX >= map.width) newX = map.width;
                if (newY >= map.height) newY = map.height;

                // Check terrain collisions
                const tileX = Math.floor(newX);
                const tileY = Math.floor(newY);
                if (map.terrain[tileY * map.width + tileX] <= 1) {
                    newX = this.x;
                    newY = this.y;
                }

                // Check unit collisions
                let canMove = true;
                for (const other of units) {
                    if (other !== this) {
                        const otherType = unitTypes[other.type];
                        const collisionBox = new Rect(
                            newX - unitType.width / 2 + unitType.collision.x,
                            newY - unitType.height + unitType.collision.y,
                            unitType.collision.w,
                            unitType.collision.h
                        );
                        const otherCollisionBox = new Rect(
                            other.x - otherType.width / 2 + otherType.collision.x,
                            other.y - otherType.height + otherType.collision.y,
                            otherType.collision.w,
                            otherType.collision.h
                        );
                        if (collisionBox.intersects(otherCollisionBox)) {
                            canMove = false;
                            break;
                        }
                    }
                }

                if (canMove) {
                    this.x = newX;
                    this.y = newY;
                }

                // Check if reached target
                if (Math.abs(this.x - this.target.point!.x) < 0.1 && Math.abs(this.y - this.target.point!.y) < 0.1) {
                    this.target = undefined;
                }
            }
        }
    }

    image() {
        if (this.type === 'villager' || this.type === 'tree') {
            return unitImages[this.player.color][`${this.type}${this.variant}`];
        }
        return unitImages[this.player.color][this.type];
    }

    draw(ctx: CanvasRenderingContext2D, camera: Camera, isSelected: boolean) {
        const windowRect = new Rect(0, 0, window.innerWidth, window.innerHeight);
        const unitType = unitTypes[this.type];
        const collisionRect = new Rect(
            window.innerWidth / 2 + (this.x - camera.x - unitType.width / 2 + unitType.collision.x) * camera.tileSize,
            window.innerHeight / 2 + (this.y - camera.y - unitType.height + unitType.collision.y) * camera.tileSize,
            unitType.collision.w * camera.tileSize,
            unitType.collision.h * camera.tileSize
        );
        if (!windowRect.intersects(collisionRect)) return;

        // Draw unit image
        if (this.flipX) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.drawImage(
                this.image(),
                -(window.innerWidth / 2 + (this.x - camera.x + unitType.anchor.x) * camera.tileSize),
                window.innerHeight / 2 + (this.y - camera.y - unitType.anchor.y) * camera.tileSize,
                unitType.width * camera.tileSize,
                unitType.height * camera.tileSize
            );
            ctx.restore();
        } else {
            ctx.drawImage(
                this.image(),
                window.innerWidth / 2 + (this.x - camera.x - unitType.anchor.x) * camera.tileSize,
                window.innerHeight / 2 + (this.y - camera.y - unitType.anchor.y) * camera.tileSize,
                unitType.width * camera.tileSize,
                unitType.height * camera.tileSize
            );
        }

        if (DEBUG) {
            // Draw unit collision box
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 1;
            ctx.strokeRect(collisionRect.x, collisionRect.y, collisionRect.width, collisionRect.height);

            // Draw unit anchor point
            ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.fillRect(
                window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize - camera.tileSize / 20 / 2,
                window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize - camera.tileSize / 20 / 2,
                camera.tileSize / 20,
                camera.tileSize / 20
            );

            if (this.target) {
                const targetX = this.target.type === TargetType.Unit ? this.target.unit!.x : this.target.point!.x;
                const targetY = this.target.type === TargetType.Unit ? this.target.unit!.y : this.target.point!.y;

                // Draw line to target
                ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
                ctx.beginPath();
                ctx.moveTo(
                    window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize,
                    window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize
                );
                // for (const point of this.target.path || []) {
                //     ctx.lineTo(
                //         window.innerWidth / 2 + (point.x + 0.5 - camera.x) * camera.tileSize,
                //         window.innerHeight / 2 + (point.y + 0.5 - camera.y) * camera.tileSize
                //     );
                // }
                ctx.lineTo(
                    window.innerWidth / 2 + (targetX - camera.x) * camera.tileSize,
                    window.innerHeight / 2 + (targetY - camera.y) * camera.tileSize
                );
                ctx.stroke();

                // Draw target point
                ctx.fillRect(
                    window.innerWidth / 2 + (targetX - camera.x) * camera.tileSize - camera.tileSize / 20 / 2,
                    window.innerHeight / 2 + (targetY - camera.y) * camera.tileSize - camera.tileSize / 20 / 2,
                    camera.tileSize / 20,
                    camera.tileSize / 20
                );
            }
        }

        if (isSelected) {
            const padding = collisionRect.width * 0.2;

            // Draw health bar
            const healthBarWidth = collisionRect.width;
            const healthBarHeight = collisionRect.height * 0.05;
            const healthBarRect = new Rect(
                collisionRect.x,
                collisionRect.y - padding * 1.5 - healthBarHeight,
                healthBarWidth,
                healthBarHeight
            );
            ctx.fillStyle = '#000';
            ctx.fillRect(healthBarRect.x - 1, healthBarRect.y - 1, healthBarRect.width + 2, healthBarRect.height + 2);
            ctx.fillStyle = '#777';
            ctx.fillRect(healthBarRect.x - 1, healthBarRect.y - 1, healthBarRect.width, healthBarRect.height);
            ctx.fillStyle = '#f00';
            ctx.fillRect(healthBarRect.x, healthBarRect.y, healthBarRect.width, healthBarRect.height);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(
                healthBarRect.x,
                healthBarRect.y,
                healthBarRect.width * (this.health / unitTypes[this.type].health!),
                healthBarRect.height
            );

            // Draw selection outline
            ctx.strokeStyle = '#777';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(
                collisionRect.x - padding + 1,
                collisionRect.y - padding + 1,
                collisionRect.width + padding * 2,
                collisionRect.height + padding * 2,
                collisionRect.width / 8
            );
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(
                collisionRect.x - padding,
                collisionRect.y - padding,
                collisionRect.width + padding * 2,
                collisionRect.height + padding * 2,
                collisionRect.width / 8
            );
            ctx.stroke();
        }
    }
}
