/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import PerlinNoise from './noise.js';
import { Random } from './math.js';
import Unit from './unit.js';

const water1Image = new Image();
water1Image.src = 'images/tiles/water1.png';
const water2Image = new Image();
water2Image.src = 'images/tiles/water2.png';
const sand1Image = new Image();
sand1Image.src = 'images/tiles/sand1.png';
const sand2Image = new Image();
sand2Image.src = 'images/tiles/sand2.png';
const grass1Image = new Image();
grass1Image.src = 'images/tiles/grass1.png';
const grass2Image = new Image();
grass2Image.src = 'images/tiles/grass2.png';
const TILE_IMAGES = [water1Image, water2Image, sand1Image, sand2Image, grass1Image, grass2Image];

export default class Map {
    constructor(width, height, seed) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.random = new Random(seed);
    }

    generate(units, gaiaPlayer) {
        const noise = new PerlinNoise(this.seed);

        // Generate tiles
        this.tiles = new Uint8Array(this.width * this.height);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const value = noise.noise(x / 20, y / 20);
                if (value < -0.5) {
                    this.tiles[y * this.width + x] = this.random.nextInt(0, 1);
                } else if (value < -0.3) {
                    this.tiles[y * this.width + x] = this.random.nextInt(2, 3);
                } else {
                    this.tiles[y * this.width + x] = this.random.nextInt(4, 5);
                }
            }
        }

        // Generate trees and bushes with noise-based density
        const density = 5;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Only place trees and bushes on grass tiles (4, 5)
                if (this.tiles[y * this.width + x] === 4 || this.tiles[y * this.width + x] === 5) {
                    const forestValue = noise.noise((x + 4000) / 20, (y + 4000) / 20);
                    if (forestValue > 0.1) {
                        if (this.random.next() < 0.5) {
                            const offsetX = this.random.nextInt(0, density) / density;
                            const offsetY = this.random.nextInt(0, density) / density;
                            units.push(
                                new Unit(
                                    x + offsetX,
                                    y + offsetY,
                                    this.random.nextInt(0, 1) === 0 ? 'tree1' : 'tree2',
                                    gaiaPlayer
                                )
                            );
                        }
                        if (this.random.next() < 0.3) {
                            const offsetX = this.random.nextInt(0, density) / density;
                            const offsetY = this.random.nextInt(0, density) / density;
                            units.push(new Unit(x + offsetX, y + offsetY, 'bushes', gaiaPlayer));
                        }
                    }
                }
            }
        }

        // Generate stones in clusters
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Only place on non-water tiles (index > 1)
                if (this.tiles[y * this.width + x] > 1) {
                    const stoneValue = noise.noise((x + 8000) / 10, (y + 8000) / 10);
                    if (stoneValue > 0.5) {
                        const offsetX = this.random.nextInt(0, density) / density;
                        const offsetY = this.random.nextInt(0, density) / density;
                        if (this.random.next() < 0.5) {
                            units.push(new Unit(x + offsetX, y + offsetY, 'stone', gaiaPlayer));
                        }
                    }
                }
            }
        }

        // Generate gold in clusters
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Only place on non-water tiles (index > 1)
                if (this.tiles[y * this.width + x] > 1) {
                    const goldValue = noise.noise((x + 12000) / 8, (y + 12000) / 8);
                    if (goldValue > 0.4) {
                        const offsetX = this.random.nextInt(0, density) / density;
                        const offsetY = this.random.nextInt(0, density) / density;
                        if (this.random.next() < 0.5) {
                            units.push(new Unit(x + offsetX, y + offsetY, 'gold', gaiaPlayer));
                        }
                    }
                }
            }
        }
    }

    findStartPosition(units) {
        let startX = 1;
        let startY = 1;
        let bestOpenArea = 0;
        const searchArea = 10;
        for (let y = 0; y < this.height - searchArea; y++) {
            for (let x = 0; x < this.width - searchArea; x++) {
                let openArea = 0;
                let hasUnits = false;
                // Check 5x5 area
                for (let dy = 0; dy < searchArea; dy++) {
                    for (let dx = 0; dx < searchArea; dx++) {
                        const tile = this.tiles[(y + dy) * this.width + (x + dx)];
                        if (tile === 4 || tile === 5) {
                            openArea++;
                        }
                        // Check for units in this position
                        for (const unit of units) {
                            if (Math.floor(unit.x) === x + dx && Math.floor(unit.y) === y + dy) {
                                hasUnits = true;
                                break;
                            }
                        }
                    }
                    if (hasUnits) break;
                }
                if (!hasUnits && openArea >= bestOpenArea) {
                    bestOpenArea = openArea;
                    startX = x;
                    startY = y;
                }
            }
        }
        return { x: startX + 2.5, y: startY + 2.5 };
    }

    draw(ctx, camera) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                ctx.drawImage(
                    TILE_IMAGES[this.tiles[y * this.width + x]],
                    window.innerWidth / 2 + (x - camera.x) * camera.tileSize,
                    window.innerHeight / 2 + (y - camera.y) * camera.tileSize,
                    camera.tileSize,
                    camera.tileSize
                );
            }
        }
    }
}
