/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { Rect } from './math.js';

const townCenterImage = new Image();
townCenterImage.src = 'images/units/town_center.png';
const houseImage = new Image();
houseImage.src = 'images/units/house.png';

const kingImage = new Image();
kingImage.src = 'images/units/king.png';
const villagerImage = new Image();
villagerImage.src = 'images/units/villager.png';
const soldierImage = new Image();
soldierImage.src = 'images/units/soldier.png';
const knightImage = new Image();
knightImage.src = 'images/units/knight.png';

const tree1Image = new Image();
tree1Image.src = 'images/units/tree1.png';
const tree2Image = new Image();
tree2Image.src = 'images/units/tree2.png';
const bushesImage = new Image();
bushesImage.src = 'images/units/bushes.png';
const stoneImage = new Image();
stoneImage.src = 'images/units/stone.png';
const goldImage = new Image();
goldImage.src = 'images/units/gold.png';

export const unitTypes = {
    // Units
    king: { image: kingImage, name: 'King', boxScale: 0.5, health: 100, movable: true, speed: 4 },
    villager: { image: villagerImage, name: 'Villager', boxScale: 0.5, health: 50, movable: true, speed: 2 },
    soldier: { image: soldierImage, name: 'Soldier', boxScale: 0.5, health: 75, movable: true, speed: 2 },
    knight: { image: knightImage, name: 'Knight', boxScale: 0.5, health: 150, movable: true, speed: 2 },

    // Resources
    tree1: { image: tree1Image, name: 'Tree', boxScale: 0.8, health: 100, givesResource: 'Wood', movable: false },
    tree2: { image: tree2Image, name: 'Tree', boxScale: 0.8, health: 100, givesResource: 'Wood', movable: false },
    bushes: { image: bushesImage, name: 'Bushes', boxScale: 0.5, health: 100, givesResource: 'Food', movable: false },
    stone: { image: stoneImage, name: 'Stone', boxScale: 0.8, health: 200, givesResource: 'Stone', movable: false },
    gold: { image: goldImage, name: 'Gold', boxScale: 0.8, health: 200, givesResource: 'Gold', movable: false },

    // Buildings
    townCenter: { image: townCenterImage, name: 'Town Center', boxScale: 1, health: 1000, movable: false },
    house: { image: houseImage, name: 'House', boxScale: 1, health: 500, movable: false },
};

export default class Unit {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.player = player;
        this.health = unitTypes[type].health;
    }

    update(delta, units, map) {
        const unitType = unitTypes[this.type];
        if (unitType.movable && this.target) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 0.01) {
                const speed = unitType.speed * delta;
                let newX = this.x + (dx / distance) * speed;
                let newY = this.y + (dy / distance) * speed;

                // Check map bounds
                if (newX < 0) newX = 0;
                if (newY < 0) newY = 0;
                if (newX >= map.width) newX = map.width;
                if (newY >= map.height) newY = map.height;

                // Check unit collisions
                let canMove = true;
                const boxSize = unitType.boxScale;
                for (const other of units) {
                    if (other !== this) {
                        const otherType = unitTypes[other.type];
                        const otherBox = otherType.boxScale / 2;
                        const dx = Math.abs(newX - other.x);
                        const dy = Math.abs(newY - other.y);
                        if (dx < (boxSize + otherBox) / 2 && dy < (boxSize + otherBox) / 2) {
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

    draw(ctx, camera, isSelected) {
        // Draw unit image
        const unitType = unitTypes[this.type];
        ctx.drawImage(
            unitType.image,
            window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize - camera.tileSize / 2,
            window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize - camera.tileSize / 2,
            camera.tileSize,
            camera.tileSize
        );

        if (isSelected) {
            const boxSize = camera.tileSize * unitType.boxScale;

            // Draw health bar
            const healthBarWidth = boxSize / 2;
            const healthBarHeight = boxSize * 0.05;
            const healthBarRect = new Rect(
                window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize - boxSize / 2 + healthBarWidth / 2,
                window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize - boxSize / 2 - healthBarHeight - 8,
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
                window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize - boxSize / 2 + 1,
                window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize - boxSize / 2 + 1,
                boxSize,
                boxSize,
                boxSize / 4
            );
            ctx.stroke();
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.roundRect(
                window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize - boxSize / 2,
                window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize - boxSize / 2,
                boxSize,
                boxSize,
                boxSize / 4
            );
            ctx.stroke();
        }
    }
}
