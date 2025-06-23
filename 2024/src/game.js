/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

/*

TODO:
- Add units to minimap
- Add unit target other unit
- Add path finding
- Add population limit
 - House increase population limit
- Add unit actions
    - Villager build
    - Town center train villager
    - Barracks train soldier, knight
- Add enemies spawn village attack

*/

import Minimap from './minimap.js';
import Map from './map.js';
import Unit, { unitTypes } from './unit.js';
import Controls, { Camera } from './controls.js';

// MARK: Canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

window.addEventListener('contextmenu', (event) => event.preventDefault());

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
resize();
window.addEventListener('resize', resize);

// MARK: Player
class Player {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.food = 250;
        this.wood = 250;
        this.gold = 0;
        this.stone = 0;
        this.score = 0;
    }
}

// MARK: Game state
const player = new Player('Player', '#26f');
const gaiaPlayer = new Player('Gaia', '#aaa');
const enemy = new Player('Enemy', '#f00');
const players = [gaiaPlayer, player, enemy];

const units = [];
const map = new Map(64, 64, Date.now());
map.generate(units, gaiaPlayer);

const playerStartSpot = map.findStartPosition(units);
units.push(new Unit(playerStartSpot.x, playerStartSpot.y, 'king', player));
units.push(new Unit(playerStartSpot.x + 1, playerStartSpot.y + 2, 'villager', player));
units.push(new Unit(playerStartSpot.x + 1, playerStartSpot.y, 'soldier', player));
units.push(new Unit(playerStartSpot.x + 1.5, playerStartSpot.y, 'knight', player));
units.push(new Unit(playerStartSpot.x + 1, playerStartSpot.y + 1, 'townCenter', player));
units.push(new Unit(playerStartSpot.x, playerStartSpot.y + 1, 'house', player));

const camera = new Camera(playerStartSpot.x, playerStartSpot.y, 4);
const controls = new Controls(camera, map, player, units);
const minimap = new Minimap(map, units, camera);

// MARK: Event listeners
window.addEventListener('keydown', (event) => {
    if (controls.onKeyDown(event)) return;
});
window.addEventListener('keyup', (event) => {
    if (controls.onKeyUp(event)) return;
});
window.addEventListener('mousedown', (event) => {
    event.preventDefault();
    if (minimap.onMouseDown(event)) return;
    if (controls.onMouseDown(event)) return;
});
window.addEventListener('mousemove', (event) => {
    event.preventDefault();
    if (minimap.onMouseMove(event)) return;
    if (controls.onMouseMove(event)) return;
});
window.addEventListener('mouseup', (event) => {
    event.preventDefault();
    if (minimap.onMouseUp(event)) return;
    if (controls.onMouseUp(event)) return;
});
window.addEventListener('wheel', (event) => {
    if (controls.onWheel(event)) return;
});

// MARK: Game loop
function update(delta) {
    for (const unit of units) {
        unit.update(delta, units, map);
    }
    for (const player of players) {
        player.score += 1 * delta;
    }
    controls.update(delta);
}

function render() {
    ctx.fillStyle = '#333';
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    // Draw map and units
    map.draw(ctx, controls.camera);
    const sortedUnits = units.slice().sort((a, b) => a.y - b.y);
    for (const unit of sortedUnits) {
        const isSelected = controls.selectedUnits.includes(unit);
        unit.draw(ctx, controls.camera, isSelected);
    }

    // Draw HUD
    {
        ctx.font = '16px Arial';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        // Draw game title
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, 230, 32);
        ctx.fillStyle = '#fff';
        ctx.fillText('Welpen Game 2024: Ridders', 8, 8);

        // Draw resources
        const width = 400;
        const x = window.innerWidth / 2 - width / 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x, 0, width, 32);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Food: ${player.food}`, x + 10, 8);
        ctx.fillText(`Wood: ${player.wood}`, x + 100, 8);
        ctx.fillText(`Gold: ${player.gold}`, x + 200, 8);
        ctx.fillText(`Stone: ${player.stone}`, x + 300, 8);

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
            ctx.drawImage(unitType.image, x + 8, y + 8, 64, 64);
            ctx.fillStyle = unit.player.color;
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
                ctx.drawImage(unitType.image, unitX, unitY, unitSize, unitSize);
            }
        }

        // Draw player scores
        const sortedPlayers = players
            .slice()
            .filter((player) => player.name != 'Gaia')
            .sort((a, b) => b.score - a.score);
        for (let i = 0; i < sortedPlayers.length; i++) {
            const x = window.innerWidth - 150;
            const y = window.innerHeight - (i + 1) * 32;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(x, y, 160, 32);
            ctx.fillStyle = sortedPlayers[i].color;
            ctx.fillText(`${sortedPlayers[i].name}: ${Math.floor(sortedPlayers[i].score)}`, x + 8, y + 8);
        }

        // Draw controls
        controls.draw(ctx);
    }
}

let lastTime = performance.now();
function loop() {
    window.requestAnimationFrame(loop);
    const time = performance.now();
    update((time - lastTime) / 1000);
    lastTime = time;
    render();
}
loop();
