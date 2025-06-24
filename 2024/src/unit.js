/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { Rect, Random } from './math.js';
import { DEBUG } from './game.js';

const villager1Image = new Image();
villager1Image.src = 'images/units/blue/villager1.png';
const villager2Image = new Image();
villager2Image.src = 'images/units/blue/villager2.png';
const kingImage = new Image();
kingImage.src = 'images/units/blue/king.png';
const soldierImage = new Image();
soldierImage.src = 'images/units/blue/soldier.png';
const knightImage = new Image();
knightImage.src = 'images/units/blue/knight.png';
const townCenterImage = new Image();
townCenterImage.src = 'images/units/blue/town_center.png';
const houseImage = new Image();
houseImage.src = 'images/units/blue/house.png';
const barracksImage = new Image();
barracksImage.src = 'images/units/blue/barracks.png';

const tree1Image = new Image();
tree1Image.src = 'images/units/nature/tree1.png';
const tree2Image = new Image();
tree2Image.src = 'images/units/nature/tree2.png';
const bushesImage = new Image();
bushesImage.src = 'images/units/nature/bushes.png';
const stoneImage = new Image();
stoneImage.src = 'images/units/nature/stone.png';
const goldImage = new Image();
goldImage.src = 'images/units/nature/gold.png';

export const unitTypes = {
    // Units
    villager: {
        images: [villager1Image, villager2Image],
        name: 'Villager',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 50,
        movable: true,
        speed: 2,
        lineOfSight: 3,
    },
    king: {
        image: kingImage,
        name: 'King',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 100,
        movable: true,
        speed: 6,
        lineOfSight: 5,
    },
    soldier: {
        image: soldierImage,
        name: 'Soldier',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 75,
        movable: true,
        speed: 2,
        lineOfSight: 4,
    },
    knight: {
        image: knightImage,
        name: 'Knight',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.35, y: 0.625, w: 0.3, h: 0.4 },
        health: 150,
        movable: true,
        speed: 2,
        lineOfSight: 4,
    },

    // Resources
    tree1: {
        image: tree1Image,
        name: 'Tree',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.8 },
        collision: { x: 0.35, y: 0.35, w: 0.3, h: 0.675 },
        health: 100,
        givesResource: 'Wood',
        movable: false,
    },
    tree2: {
        image: tree2Image,
        name: 'Tree',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.8 },
        collision: { x: 0.3, y: 0.325, w: 0.4, h: 0.7 },
        health: 100,
        givesResource: 'Wood',
        movable: false,
    },
    bushes: {
        image: bushesImage,
        name: 'Bushes',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.6 },
        collision: { x: 0.35, y: 0.675, w: 0.3, h: 0.35 },
        health: 100,
        givesResource: 'Food',
        movable: false,
    },
    stone: {
        image: stoneImage,
        name: 'Stone',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.2, y: 0.55, w: 0.6, h: 0.575 },
        health: 200,
        givesResource: 'Stone',
        movable: false,
    },
    gold: {
        image: goldImage,
        name: 'Gold',
        width: 1,
        height: 1,
        anchor: { x: 0.5, y: 0.675 },
        collision: { x: 0.2, y: 0.55, w: 0.6, h: 0.575 },
        health: 200,
        givesResource: 'Gold',
        movable: false,
    },

    // Buildings
    townCenter: {
        image: townCenterImage,
        name: 'Town Center',
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1.93 },
        collision: { x: 0.3, y: 0.15, w: 1.4, h: 1.85 },
        health: 1000,
        movable: false,
        lineOfSight: 8,
    },
    house: {
        image: houseImage,
        name: 'House',
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1.75 },
        collision: { x: 0.3, y: 0.5, w: 1.4, h: 1.5 },
        health: 500,
        movable: false,
        lineOfSight: 6,
    },
    barracks: {
        image: barracksImage,
        name: 'Barracks',
        width: 2,
        height: 2,
        anchor: { x: 1, y: 1.75 },
        collision: { x: 0.2, y: 0.5, w: 1.6, h: 1.5 },
        health: 600,
        movable: false,
        lineOfSight: 6,
    },
};

const random = new Random(Date.now());

export default class Unit {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type;
        if (this.type == 'villager') {
            this.variant = random.nextInt(0, 1);
        }
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
        const unitType = unitTypes[this.type];
        if (this.type === 'villager') {
            return unitType.images[this.variant];
        }
        return unitType.image;
    }

    draw(ctx, camera, isSelected) {
        // Draw unit image
        const unitType = unitTypes[this.type];
        ctx.drawImage(
            this.image(),
            window.innerWidth / 2 + (this.x - camera.x - unitType.anchor.x) * camera.tileSize,
            window.innerHeight / 2 + (this.y - camera.y - unitType.anchor.y) * camera.tileSize,
            unitType.width * camera.tileSize,
            unitType.height * camera.tileSize
        );

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
