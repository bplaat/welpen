/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import PerlinNoise from './noise.js';
import { Random, Rect } from './math.js';
import Unit from './unit.js';
import { unitTypes } from './unit.js';
import { DEBUG } from './game.js';
import { img } from './utils.js';

const TILE_IMAGES = [
    img('images/tiles/deep_water.png'),
    img('images/tiles/water.png'),
    img('images/tiles/sand1.png'),
    img('images/tiles/sand2.png'),
    img('images/tiles/grass1.png'),
    img('images/tiles/grass2.png'),
];

export default class Map {
    constructor(width, height, seed) {
        this.width = width;
        this.height = height;
        this.seed = seed;
    }

    static generate(width, height, seed, units, naturePlayer) {
        const map = new Map(width, height, seed);
        const random = new Random(seed);
        const noise = new PerlinNoise(seed);

        // Generate terrain
        map.terrain = new Uint8Array(map.width * map.height);
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                const value = noise.noise(x / 20, y / 20);
                if (value < -0.6) {
                    map.terrain[y * map.width + x] = 0;
                } else if (value < -0.5) {
                    map.terrain[y * map.width + x] = 1;
                } else if (value < -0.3) {
                    map.terrain[y * map.width + x] = random.nextInt(2, 3);
                } else {
                    map.terrain[y * map.width + x] = random.nextInt(4, 5);
                }
            }
        }
        map.explored = new Uint8Array(map.width * map.height);
        map.sight = new Uint8Array(map.width * map.height);

        // Generate trees and bushes with noise-based density
        const density = 4;
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.terrain[y * map.width + x] === 4 || map.terrain[y * map.width + x] === 5) {
                    const forestValue = noise.noise((x + 4000) / 20, (y + 4000) / 20);
                    if (forestValue > 0.1) {
                        if (random.next() < 0.8) {
                            const offsetX = random.nextInt(0, density) / density;
                            const offsetY = random.nextInt(0, density) / density;
                            units.push(new Unit(x + offsetX, y + offsetY, 'tree', naturePlayer));
                        }
                    }
                }
            }
        }

        // Generate bushes in clusters
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.terrain[y * map.width + x] === 4 || map.terrain[y * map.width + x] === 5) {
                    const bushValue = noise.noise((x + 6000) / 15, (y + 6000) / 15);
                    if (bushValue > 0.4) {
                        const offsetX = random.nextInt(0, density) / density;
                        const offsetY = random.nextInt(0, density) / density;
                        if (random.next() < 0.2) {
                            units.push(new Unit(x + offsetX, y + offsetY, 'bushes', naturePlayer));
                        }
                    }
                }
            }
        }

        // Generate stones in clusters
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.terrain[y * map.width + x] > 1) {
                    const stoneValue = noise.noise((x + 8000) / 10, (y + 8000) / 10);
                    if (stoneValue > 0.5) {
                        const offsetX = random.nextInt(0, density) / density;
                        const offsetY = random.nextInt(0, density) / density;
                        if (random.next() < 0.5) {
                            units.push(new Unit(x + offsetX, y + offsetY, 'stone', naturePlayer));
                        }
                    }
                }
            }
        }

        // Generate gold in clusters
        for (let y = 0; y < map.height; y++) {
            for (let x = 0; x < map.width; x++) {
                if (map.terrain[y * map.width + x] > 1) {
                    const goldValue = noise.noise((x + 12000) / 8, (y + 12000) / 8);
                    if (goldValue > 0.4) {
                        const offsetX = random.nextInt(0, density) / density;
                        const offsetY = random.nextInt(0, density) / density;
                        if (random.next() < 0.5) {
                            units.push(new Unit(x + offsetX, y + offsetY, 'gold', naturePlayer));
                        }
                    }
                }
            }
        }

        return map;
    }

    static fromJSON(json) {
        const map = new Map(json.width, json.height, json.seed);
        map.terrain = new Uint8Array(json.terrain);
        map.explored = new Uint8Array(json.explored);
        map.sight = new Uint8Array(map.width * map.height);
        return map;
    }

    toJSON() {
        return {
            width: this.width,
            height: this.height,
            seed: this.seed,
            terrain: Array.from(this.terrain),
            explored: Array.from(this.explored),
        };
    }

    findStartPosition(units, stopFirst) {
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
                        const tile = this.terrain[(y + dy) * this.width + (x + dx)];
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
                    if (stopFirst) {
                        return { x: startX + 2, y: startY + 2 };
                    }
                }
            }
        }
        return { x: startX + 2, y: startY + 2 };
    }

    update(units) {
        // Generate sight map
        this.sight.fill(0);
        for (const unit of units) {
            if (unit.player.type === 'player') {
                const unitType = unitTypes[unit.type];
                const lineOfSight = unitType.lineOfSight;
                const startX = Math.max(0, Math.floor(unit.x - lineOfSight));
                const startY = Math.max(0, Math.floor(unit.y - lineOfSight));
                const endX = Math.min(this.width - 1, Math.ceil(unit.x + lineOfSight));
                const endY = Math.min(this.height - 1, Math.ceil(unit.y + lineOfSight));
                for (let y = startY; y <= endY; y++) {
                    for (let x = startX; x <= endX; x++) {
                        const dx = x - unit.x;
                        const dy = y - unit.y;
                        if (dx * dx + dy * dy <= lineOfSight * lineOfSight) {
                            this.sight[y * this.width + x] = 1;
                        }
                    }
                }
            }
        }

        // Update explored map based on sight
        for (let i = 0; i < this.explored.length; i++) {
            if (this.sight[i] === 1) {
                this.explored[i] = 1;
            }
        }
    }

    drawTerrain(ctx, camera) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 1;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileRect = new Rect(
                    Math.floor(window.innerWidth / 2 + (x - camera.x) * camera.tileSize),
                    Math.floor(window.innerHeight / 2 + (y - camera.y) * camera.tileSize),
                    Math.ceil(camera.tileSize),
                    Math.ceil(camera.tileSize)
                );
                if (DEBUG || this.explored[y * this.width + x] === 1) {
                    ctx.drawImage(
                        TILE_IMAGES[this.terrain[y * this.width + x]],
                        tileRect.x,
                        tileRect.y,
                        tileRect.width,
                        tileRect.height
                    );
                } else {
                    ctx.fillStyle = '#222';
                    ctx.fillRect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);
                }
                if (DEBUG) ctx.strokeRect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);
            }
        }
    }

    drawFog(ctx, camera) {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileRect = new Rect(
                    Math.floor(window.innerWidth / 2 + (x - camera.x) * camera.tileSize),
                    Math.floor(window.innerHeight / 2 + (y - camera.y) * camera.tileSize),
                    Math.ceil(camera.tileSize),
                    Math.ceil(camera.tileSize)
                );
                if (DEBUG || this.explored[y * this.width + x] === 1) {
                    if (this.sight[y * this.width + x] === 0) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
                        ctx.fillRect(tileRect.x, tileRect.y, tileRect.width, tileRect.height);
                    }
                }
            }
        }
    }
}
