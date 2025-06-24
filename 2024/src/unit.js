/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { Rect, Random } from './math.js';
import { DEBUG } from './game.js';
import { img } from './utils.js';

const unitImages = {
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

export const unitTypes = {
    // Units
    villager: {
        type: 'unit',
        name: 'Villager',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 50,
        speed: 2,
        lineOfSight: 4,
        population: 1,
    },
    king: {
        type: 'unit',
        name: 'King',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 100,
        speed: 4,
        lineOfSight: 6,
        population: 0,
    },
    spearman: {
        type: 'unit',
        name: 'Spearman',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 75,
        speed: 2,
        lineOfSight: 4,
        population: 1,
    },
    knight: {
        type: 'unit',
        name: 'Knight',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 150,
        speed: 2,
        lineOfSight: 4,
        population: 2,
    },
    scout: {
        type: 'unit',
        name: 'Scout',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 150,
        speed: 6,
        lineOfSight: 8,
        population: 1,
    },
    monk: {
        type: 'unit',
        name: 'Monk',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 150,
        speed: 2,
        lineOfSight: 5,
        population: 1,
    },

    // Resources
    tree: {
        type: 'resource',
        name: 'Tree',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.8 },
        collision: { x: 0.35, y: 0.35, w: 0.3, h: 0.675 },
        health: 100,
        givesResource: 'Wood',
    },
    bushes: {
        type: 'resource',
        name: 'Bushes',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.6 },
        collision: { x: 0.35, y: 0.675, w: 0.3, h: 0.35 },
        health: 100,
        givesResource: 'Food',
    },
    stone: {
        type: 'resource',
        name: 'Stone',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.2, y: 0.55, w: 0.6, h: 0.575 },
        health: 200,
        givesResource: 'Stone',
    },
    gold: {
        type: 'resource',
        name: 'Gold',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.2, y: 0.55, w: 0.6, h: 0.575 },
        health: 200,
        givesResource: 'Gold',
    },

    // Buildings
    townCenter: {
        type: 'building',
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
        type: 'building',
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
        type: 'building',
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
        type: 'building',
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
        type: 'building',
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
        type: 'building',
        name: 'Tower',
        width: 2,
        height: 4,
        anchor: { x: 1, y: 3.3 },
        collision: { x: 0.3, y: 1.4, w: 1.4, h: 2.6 },
        health: 800,
        lineOfSight: 12,
        actions: [],
    },
};

const random = new Random(Date.now());

export default class Unit {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type;
        if (this.type == 'villager' || this.type == 'tree') {
            this.variant = random.nextInt(1, 2);
        }
        this.player = player;
        this.health = unitTypes[type].health;
        this.flipX = false;
    }

    static fromJSON(json, players) {
        const player = players.find((p) => p.id === json.player_id);
        const unit = new Unit(json.x, json.y, json.type, player);
        unit.variant = json.variant;
        unit.health = json.health;
        unit.target = json.target;
        unit.flipX = json.flipX;
        return unit;
    }

    toJSON() {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            variant: this.variant,
            player_id: this.player.id,
            health: this.health,
            target: this.target ? { x: this.target.x, y: this.target.y } : null,
            flipX: this.flipX,
        };
    }

    update(delta, units, map) {
        const unitType = unitTypes[this.type];
        if (unitType.type === 'unit' && this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0.01) {
                const speed = unitType.speed * delta;
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
                if (Math.abs(this.x - this.target.x) < 0.1 && Math.abs(this.y - this.target.y) < 0.1) {
                    this.target = null;
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

    draw(ctx, camera, isSelected) {
        // Draw unit image
        const unitType = unitTypes[this.type];
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

        const collisionRect = new Rect(
            window.innerWidth / 2 + (this.x - camera.x - unitType.width / 2 + unitType.collision.x) * camera.tileSize,
            window.innerHeight / 2 + (this.y - camera.y - unitType.height + unitType.collision.y) * camera.tileSize,
            unitType.collision.w * camera.tileSize,
            unitType.collision.h * camera.tileSize
        );

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
                // Draw line to target
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.beginPath();
                ctx.moveTo(
                    window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize,
                    window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize
                );
                ctx.lineTo(
                    window.innerWidth / 2 + (this.target.x - camera.x) * camera.tileSize,
                    window.innerHeight / 2 + (this.target.y - camera.y) * camera.tileSize
                );
                ctx.stroke();

                // Draw target point
                ctx.fillRect(
                    window.innerWidth / 2 + (this.target.x - camera.x) * camera.tileSize - camera.tileSize / 20 / 2,
                    window.innerHeight / 2 + (this.target.y - camera.y) * camera.tileSize - camera.tileSize / 20 / 2,
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
                healthBarRect.width * (this.health / unitTypes[this.type].health),
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
