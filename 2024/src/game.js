/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

/*

TODO:
- Add unit actions
    - Villager build
    - Town center train villager
    - Barracks train soldier, knight
- Add unit path finding
- Add enemies spawn with wave system
- Add unit target other unit
- Add villager gather
- Add unit attack

*/

import Minimap from './minimap.js';
import Map from './map.js';
import Unit, { unitTypes } from './unit.js';
import Controls, { Camera } from './controls.js';
import { Button, Menu } from './ui.js';

// MARK: Debug flag
export let DEBUG = window.location.origin !== 'https://bplaat.github.io';
export function setDebug(value) {
    DEBUG = value;
}

// MARK: Canvas
class Canvas {
    constructor() {
        this.element = document.createElement('canvas');
        this.ctx = this.element.getContext('2d');
        document.body.appendChild(this.element);
        this.onResize();
        window.addEventListener('resize', this.onResize.bind(this));
    }

    onResize() {
        this.element.width = window.innerWidth * window.devicePixelRatio;
        this.element.height = window.innerHeight * window.devicePixelRatio;
        this.element.style.width = `${window.innerWidth}px`;
        this.element.style.height = `${window.innerHeight}px`;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
}
const canvas = new Canvas();

// MARK: Player
class Player {
    constructor(type, name, color) {
        this.type = type;
        this.name = name;
        this.color = color;
        this.food = 250;
        this.wood = 250;
        this.gold = 0;
        this.stone = 0;
        this.score = 0;

        this.population = 0;
        this.populationLimit = 0;
    }

    update(units) {
        // Calculate population based on units
        this.population = 0;
        for (const unit of units) {
            const unitType = unitTypes[unit.type];
            if (unitType.population !== undefined && unit.player === this) {
                this.population += unitType.population;
            }
        }

        // Calculate population limit based on houses
        this.populationLimit = 0;
        for (const unit of units) {
            if (unit.player === this && unit.type === 'house') {
                this.populationLimit += 5;
            }
        }
    }
}

// MARK: Game state
const naturePlayer = new Player('nature', 'Nature', 'nature');
const player = new Player('player', 'Player', 'blue');
const enemy = new Player('cpu', 'King Evil', 'red');
const players = [naturePlayer, player, enemy];

const units = [];
const map = new Map(64, 64, Date.now());
map.generate(units, naturePlayer);

// FIXME: Random start base
const playerStartSpot = map.findStartPosition(units);
units.push(new Unit(playerStartSpot.x, playerStartSpot.y - 1, 'villager', player));
units.push(new Unit(playerStartSpot.x + 1, playerStartSpot.y - 1, 'villager', player));
units.push(new Unit(playerStartSpot.x + 2, playerStartSpot.y - 1, 'king', player));
units.push(new Unit(playerStartSpot.x + 2, playerStartSpot.y - 1 + 0.5, 'king', player));
units.push(new Unit(playerStartSpot.x + 3, playerStartSpot.y - 1, 'spearman', player));
units.push(new Unit(playerStartSpot.x + 3, playerStartSpot.y - 1 + 0.5, 'spearman', player));
units.push(new Unit(playerStartSpot.x + 4, playerStartSpot.y - 1, 'knight', player));
units.push(new Unit(playerStartSpot.x + 4, playerStartSpot.y - 1 + 0.5, 'knight', player));
units.push(new Unit(playerStartSpot.x + 5, playerStartSpot.y - 1, 'scout', player));
units.push(new Unit(playerStartSpot.x + 5, playerStartSpot.y - 1 + 0.5, 'monk', player));

units.push(new Unit(playerStartSpot.x, playerStartSpot.y + 2, 'house', player));
units.push(new Unit(playerStartSpot.x + 2, playerStartSpot.y + 2, 'townCenter', player));
units.push(new Unit(playerStartSpot.x + 4, playerStartSpot.y + 2, 'barracks', player));
units.push(new Unit(playerStartSpot.x, playerStartSpot.y + 5, 'storeHouse', player));
units.push(new Unit(playerStartSpot.x + 2, playerStartSpot.y + 5, 'church', player));
units.push(new Unit(playerStartSpot.x + 4, playerStartSpot.y + 5, 'tower', player));

const camera = new Camera(playerStartSpot.x + 2, playerStartSpot.y + 2, 4);
const controls = new Controls(camera, map, player, units);

const menu = new Menu();
if (!DEBUG) menu.show();

const menuButton = new Button('Menu', () => menu.show(), window.innerWidth - 150, 0, 150, 32);
const minimap = new Minimap(map, units, camera, controls);

// MARK: Event listeners
window.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('resize', (event) => {
    menuButton.rect.x = window.innerWidth - 150;
    menu.onResize();
    minimap.onResize();
});
window.addEventListener('keydown', (event) => {
    if (controls.onKeyDown(event)) return;
});
window.addEventListener('keyup', (event) => {
    if (controls.onKeyUp(event)) return;
});
window.addEventListener('mousedown', (event) => {
    event.preventDefault();
    if (menu.onMouseDown(event)) return;
    if (menuButton.onMouseDown(event)) return;
    if (minimap.onMouseDown(event)) return;
    if (controls.onMouseDown(event)) return;
});
window.addEventListener('mousemove', (event) => {
    event.preventDefault();
    if (menu.onMouseMove(event)) return;
    if (menuButton.onMouseMove(event)) return;
    if (minimap.onMouseMove(event)) return;
    if (controls.onMouseMove(event)) return;
});
window.addEventListener('mouseup', (event) => {
    event.preventDefault();
    if (menu.onMouseUp(event)) return;
    if (menuButton.onMouseUp(event)) return;
    if (minimap.onMouseUp(event)) return;
    if (controls.onMouseUp(event)) return;
});
window.addEventListener('wheel', (event) => {
    if (controls.onWheel(event)) return;
});

// MARK: Game loop
function update(delta) {
    for (const player of players) {
        player.update(units);
    }
    for (const unit of units) {
        unit.update(delta, units, map);
    }
    map.update(units);
    minimap.update();
    controls.update(delta);
}

function render(ctx) {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Draw map and units
    map.drawTerrain(ctx, controls.camera);
    const sortedUnits = units.slice().sort((a, b) => a.y - b.y);
    for (const unit of sortedUnits) {
        const tileX = Math.floor(unit.x);
        const tileY = Math.floor(unit.y);

        if (!DEBUG && map.explored[tileY * map.width + tileX] === 0) {
            continue;
        }
        if (
            map.sight[tileY * map.width + tileX] === 0 &&
            unit.player.name !== 'Player' &&
            unit.player.name !== 'Nature'
        ) {
            continue;
        }

        const isSelected = controls.selectedUnits.includes(unit);
        unit.draw(ctx, controls.camera, isSelected);
    }
    map.drawFog(ctx, controls.camera);

    // Draw HUD
    {
        ctx.font = '16px Arial';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        // Draw resources
        const width = 600;
        const x = window.innerWidth / 2 - width / 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, 0, width, 32);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Food: ${player.food}`, x + 10, 8);
        ctx.fillText(`Wood: ${player.wood}`, x + 100, 8);
        ctx.fillText(`Gold: ${player.gold}`, x + 200, 8);
        ctx.fillText(`Stone: ${player.stone}`, x + 300, 8);
        ctx.fillText(`Population: ${player.population} / ${player.populationLimit}`, x + 400, 8);

        menuButton.render(ctx);
        minimap.render(ctx);

        // Draw selected units information
        if (controls.selectedUnits.length == 1) {
            const unit = controls.selectedUnits[0];
            const unitType = unitTypes[unit.type];

            const width = 8 + 64 + 16 + 240;
            const x = window.innerWidth / 2 - width / 2;
            const y = window.innerHeight - 80;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, width, 80);
            ctx.drawImage(unit.image(), x + 8, y + 8, 64, 64);
            ctx.fillStyle = unit.player.color;
            ctx.textAlign = 'left';
            ctx.fillText(`${unitType.name} (${unit.player.name})`, x + 8 + 64 + 16, y + 24);
            ctx.fillStyle = '#fff';
            ctx.fillText(
                `${unitType.givesResource ?? 'Health'}: ${unit.health} / ${unitType.health}`,
                x + 8 + 64 + 16,
                y + 24 + 16 + 8
            );
        }
        if (controls.selectedUnits.length > 1) {
            const maxColumns = 8;
            const columns = Math.min(maxColumns, controls.selectedUnits.length);
            const rows = Math.ceil(controls.selectedUnits.length / columns);
            const unitSize = 48;
            const padding = 8;
            const width = columns * (unitSize + padding) + padding;
            const height = rows * (unitSize + padding) + padding;
            const x = window.innerWidth / 2 - width / 2;
            const y = window.innerHeight - height;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, width, height);

            for (let i = 0; i < controls.selectedUnits.length; i++) {
                const unit = controls.selectedUnits[i];
                const unitType = unitTypes[unit.type];
                const col = i % columns;
                const row = Math.floor(i / columns);
                const unitX = x + padding + col * (unitSize + padding);
                const unitY = y + padding + row * (unitSize + padding);
                ctx.drawImage(unit.image(), unitX, unitY, unitSize, unitSize);
            }
        }

        // Draw player scores
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'right';
        const sortedPlayers = players.slice().sort((a, b) => b.score - a.score);
        for (let i = 0; i < sortedPlayers.length; i++) {
            const x = window.innerWidth - 150;
            const y = window.innerHeight - (i + 1) * 32;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, 160, 32);

            ctx.fillStyle = `#${Minimap.PLAYER_COLORS[sortedPlayers[i].color].toString(16).padStart(6, '0')}`;
            ctx.fillText(`${sortedPlayers[i].name}: ${Math.floor(sortedPlayers[i].score)}`, x + 150 - 8, y + 8);
        }

        // Draw controls
        controls.draw(ctx);

        // Draw menu
        menu.render(ctx);
    }
}

let lastTime = performance.now();
function loop() {
    window.requestAnimationFrame(loop);
    const time = performance.now();
    update((time - lastTime) / 1000);
    lastTime = time;
    render(canvas.ctx);
}
loop();
