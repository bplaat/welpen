/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

/*

TODO:
- Add building actions
- Add building gather point
- Add unit actions
- Add villager actions

- Add unit path finding
- Add villager gather

- Add enemies spawn with wave system
- Add unit target other unit
- Add unit attack

*/

import Minimap from './minimap.js';
import Map from './map.js';
import Unit, { unitTypes } from './unit.js';
import Controls, { Camera } from './controls.js';
import { Button, Menu } from './ui.js';
import { Rect } from './math.js';
import { img } from './utils.js';

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
    static TYPE_NATURE = 0;
    static TYPE_PLAYER = 1;
    static TYPE_CPU = 2;

    static _idCounter = 0;

    constructor(type, name, color) {
        this.id = Player._idCounter++;
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

    static fromJSON(json) {
        const player = new Player(json.type, json.name, json.color);
        player.id = json.id;
        player.food = json.food;
        player.wood = json.wood;
        player.gold = json.gold;
        player.stone = json.stone;
        player.score = json.score;
        player.population = json.population;
        player.populationLimit = json.populationLimit;
        return player;
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            name: this.name,
            color: this.color,
            food: this.food,
            wood: this.wood,
            gold: this.gold,
            stone: this.stone,
            score: this.score,
            population: this.population,
            populationLimit: this.populationLimit,
        };
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

        // Calculate population limit
        this.populationLimit = 0;
        for (const unit of units) {
            const unitType = unitTypes[unit.type];
            if (unit.player === this && unitType.populationLimit !== undefined) {
                this.populationLimit += unitType.populationLimit;
            }
        }
    }
}

const actionImages = {
    build: img('images/actions/build.png'),
    repair: img('images/actions/repair.png'),
    kill: img('images/actions/kill.png'),
    stop: img('images/actions/stop.png'),
};

// MARK: Game state
class GameState {
    static generate(seed) {
        const state = new GameState();
        state.players = [
            new Player('nature', 'Nature', 'nature'),
            new Player('player', 'Player', 'blue'),
            new Player('cpu', 'King Evil', 'red'),
        ];
        state.units = [];
        state.map = Map.generate(
            64,
            64,
            seed,
            state.units,
            state.players.find((p) => p.type === 'nature')
        );

        // Generate player start position
        const player = state.players.find((p) => p.type === 'player');
        const playerStartSpot = state.map.findStartPosition(state.units, true);
        state.units.push(new Unit(playerStartSpot.x, playerStartSpot.y + 1, 'townCenter', player));
        state.units.push(new Unit(playerStartSpot.x, playerStartSpot.y - 1, 'king', player));
        state.units.push(new Unit(playerStartSpot.x - 1, playerStartSpot.y + 1.5, 'villager', player));
        state.units.push(new Unit(playerStartSpot.x, playerStartSpot.y + 1.5, 'villager', player));
        state.units.push(new Unit(playerStartSpot.x + 1, playerStartSpot.y + 1.5, 'villager', player));
        state.units.push(new Unit(playerStartSpot.x, playerStartSpot.y + 2, 'scout', player));
        state.camera = new Camera(playerStartSpot.x, playerStartSpot.y, 4);

        // Generate CPU start position
        const cpu = state.players.find((p) => p.type === 'cpu');
        const cpuStartSpot = state.map.findStartPosition(state.units, false);
        state.units.push(new Unit(cpuStartSpot.x, cpuStartSpot.y, 'tower', cpu));
        state.units.push(new Unit(cpuStartSpot.x - 1, cpuStartSpot.y + 1, 'spearman', cpu));
        state.units.push(new Unit(cpuStartSpot.x, cpuStartSpot.y + 1, 'king', cpu));
        state.units.push(new Unit(cpuStartSpot.x + 1, cpuStartSpot.y + 1, 'spearman', cpu));

        return state;
    }

    static load() {
        const state = new GameState();
        const json = JSON.parse(localStorage.getItem('save'));
        state.players = json.players.map((p) => Player.fromJSON(p));
        state.units = json.units.map((u) => Unit.fromJSON(u, state.players));
        state.map = Map.fromJSON(json.map);
        state.camera = Camera.fromJSON(json.camera);
        return state;
    }

    save() {
        localStorage.setItem(
            'save',
            JSON.stringify({
                players: this.players.map((p) => p.toJSON()),
                units: this.units.map((u) => u.toJSON()),
                map: this.map.toJSON(),
                camera: this.camera.toJSON(),
            })
        );
    }
}

let state, controls, minimap;
function updateState() {
    controls = new Controls(
        state.camera,
        state.map,
        state.players.find((p) => p.type === 'player'),
        state.units
    );
    minimap = new Minimap(state.map, state.units, state.camera, controls);
}
export function resetState() {
    state = GameState.generate(Date.now());
    state.save();
    updateState();
}
export function saveState() {
    state.save();
}
if (localStorage.getItem('save')) {
    state = GameState.load();
    updateState();
} else {
    resetState();
}

const menu = new Menu();
if (!DEBUG) menu.show();
const menuButton = new Button('Menu', () => menu.show(), window.innerWidth - 150, 0, 150, 32);

// MARK: Event listeners
window.addEventListener('contextmenu', (event) => event.preventDefault());
window.addEventListener('resize', (event) => {
    menuButton.rect.x = window.innerWidth - 150;
    menu.onResize();
    minimap.onResize();
});
window.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        state.save();
        return;
    }
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
    for (const player of state.players) {
        player.update(state.units);
    }
    for (const unit of state.units) {
        unit.update(delta, state.units, state.map);
    }
    state.map.update(state.units);
    minimap.update();
    controls.update(delta);
}

function render(ctx) {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Draw map and units
    state.map.drawTerrain(ctx, controls.camera);
    const sortedUnits = state.units.slice().sort((a, b) => a.y - b.y);
    for (const unit of sortedUnits) {
        const unitType = unitTypes[unit.type];
        const tileX = Math.floor(unit.x);
        const tileY = Math.floor(unit.y);

        if (!DEBUG && state.map.explored[tileY * state.map.width + tileX] === 0) {
            continue;
        }
        if (
            state.map.sight[tileY * state.map.width + tileX] === 0 &&
            unit.player.type === 'cpu' &&
            unitType.type === 'unit'
        ) {
            continue;
        }

        const isSelected = controls.selectedUnits.includes(unit);
        unit.draw(ctx, controls.camera, isSelected);
    }
    state.map.drawFog(ctx, controls.camera);

    // Draw HUD
    ctx.font = '16px Arial';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    // Draw resources
    const player = state.players.find((p) => p.type === 'player');
    const width = 640;
    const x = window.innerWidth / 2 - width / 2;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x, 0, width, 32);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Wood: ${player.wood}`, x + 10, 8);
    ctx.fillText(`Food: ${player.food}`, x + 120, 8);
    ctx.fillText(`Gold: ${player.gold}`, x + 240, 8);
    ctx.fillText(`Stone: ${player.stone}`, x + 360, 8);
    ctx.fillText(`Population: ${player.population} / ${player.populationLimit}`, x + 480, 8);

    menuButton.render(ctx);
    minimap.render(ctx);

    // Draw selected units information
    if (controls.selectedUnits.length == 1) {
        const unit = controls.selectedUnits[0];
        const unitType = unitTypes[unit.type];

        const width = 640;
        const height = (48 + 8) * 3 + 8;
        const rect = new Rect(window.innerWidth / 2 - width / 2, window.innerHeight - height, width, height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        // Draw actions
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 4; x++) {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(rect.x + x * (48 + 8) + 8, rect.y + y * (48 + 8) + 8, 48, 48);
            }
        }
        if (unitType.type === 'building') {
            for (const action of unitType.actions) {
            }
        }

        // // Draw unit information
        // ctx.drawImage(unit.image(), rect.x + 8, rect.y + 8, 64 * unitType.width, 64 * unitType.height);

        // ctx.textAlign = 'left';
        // ctx.fillStyle = `#${Minimap.PLAYER_COLORS[unit.player.color].toString(16).padStart(6, '0')}`;
        // ctx.fillText(`${unitType.name} (${unit.player.name})`, x + 8 + 64 + 16, y + 24);

        // ctx.fillStyle = '#fff';
        // ctx.fillText(
        //     `${unitType.givesResource ?? 'Health'}: ${unit.health} / ${unitType.health}`,
        //     x + 8 + 64 + 16,
        //     y + 24 + 16 + 8
        // );
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
    ctx.textAlign = 'left';
    const sortedPlayers = state.players
        .slice()
        .filter((player) => player.type != 'nature')
        .sort((a, b) => b.score - a.score);
    for (let i = 0; i < sortedPlayers.length; i++) {
        const x = window.innerWidth - 150;
        const y = window.innerHeight - (i + 1) * 32;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, y, 160, 32);

        ctx.fillStyle = `#${Minimap.PLAYER_COLORS[sortedPlayers[i].color].toString(16).padStart(6, '0')}`;
        ctx.fillText(`${sortedPlayers[i].name}: ${Math.floor(sortedPlayers[i].score)}`, x + 8, y + 16);
    }

    // Draw controls
    controls.draw(ctx);

    // Draw menu
    menu.render(ctx);
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
