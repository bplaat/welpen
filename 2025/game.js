/*
 * Copyright (c) 2021 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const WIDTH = 1024;
const HEIGHT = 768;
function resize() {
    canvas.width = WIDTH * window.devicePixelRatio;
    canvas.height = HEIGHT * window.devicePixelRatio;
    canvas.style.width = WIDTH + 'px';
    canvas.style.height = HEIGHT + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
window.addEventListener('resize', resize);
resize();

const map = [
    '####%###############%###########',
    '#@                            @#',
    '#          @        @          #',
    '#     ###########         ######',
    '#                            % #',
    '####            @      @       #',
    '#       @             ###      #',
    '#    #######                  @#',
    '#      %                   #####',
    '#                 @            #',
    '#   @          #######         #',
    '#            ##       ##    @  #',
    '#        @                     #',
    '#      #####     @       @     #',
    '#                      ####    #',
    '#           @                  #',
    '#   @     #####                #',
    '#                  @       @   #',
    '#                 ####         #',
    '#    #####     !               #',
    '#                        @     #',
    '#                      ####    #',
    '% @ #         ###            @ %',
    '################################',
].map((row) => row.split(''));

function findTile(map, tile) {
    let tiles = [];
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === tile) {
                tiles.push({ x, y });
            }
        }
    }
    return tiles;
}

function isTile(x, y, tile = '#') {
    const tileX = Math.floor(x / 32);
    const tileY = Math.floor(y / 32);
    if (tileY < 0 || tileY >= map.length || tileX < 0 || tileX >= map[0].length) return true;
    return map[tileY][tileX] === tile;
}

const playerStart = findTile(map, '!');
let time = 5 * 60;
let gold = 0;
let inPortal = false;
const player = {
    x: playerStart[0].x * 32,
    y: playerStart[0].y * 32,
    width: 16,
    height: 32,
    speed: 10,
};

const keys = {};
window.addEventListener('keydown', (event) => {
    keys[event.code] = true;
});
window.addEventListener('keyup', (event) => {
    keys[event.code] = false;
});

function update(delta) {
    time -= delta;
    if (time < 0) {
        alert('Game over!');
        window.location.reload();
    }
    if (gold >= 200) {
        alert('You won!');
        window.location.reload();
    }

    // Mario-style movement: left/right walk, up is jump
    const speed = player.speed * 32 * delta;
    let dx = 0;

    // Horizontal movement
    if (keys['KeyA'] || keys['ArrowLeft']) dx -= speed;
    if (keys['KeyD'] || keys['ArrowRight']) dx += speed;

    // Jumping
    if (!player.vy) player.vy = 0;
    if (!player.onGround) player.onGround = false;

    // Apply gravity
    player.vy += 0.5; // gravity strength

    // Jump if on ground and up is pressed
    if ((keys['KeyW'] || keys['ArrowUp']) && player.onGround) {
        player.vy = -13; // jump strength
        player.onGround = false;
    }

    // Calculate new position
    let newX = player.x + dx;
    let newY = player.y + player.vy;

    // Check X movement
    if (
        !isTile(newX, player.y) &&
        !isTile(newX + player.width - 1, player.y) &&
        !isTile(newX, player.y + player.height - 1) &&
        !isTile(newX + player.width - 1, player.y + player.height - 1)
    ) {
        player.x = newX;
    }

    // Check Y movement
    if (
        !isTile(player.x, newY) &&
        !isTile(player.x + player.width - 1, newY) &&
        !isTile(player.x, newY + player.height - 1) &&
        !isTile(player.x + player.width - 1, newY + player.height - 1)
    ) {
        player.y = newY;
        player.onGround = false;
    } else {
        // Hit ground or ceiling
        if (player.vy > 0) {
            player.onGround = true;
            inPortal = false;
        }
        player.vy = 0;
    }

    // Gold
    if (isTile(player.x, player.y, '@')) {
        gold += 10;
        map[Math.floor(player.y / 32)][Math.floor(player.x / 32)] = ' ';
    }

    // Portals
    if (!inPortal && isTile(player.x, player.y, '%') && isTile(player.x + player.width - 1, player.y, '%')) {
        inPortal = true;
        const portals = findTile(map, '%');
        portals.sort(() => Math.random() - 0.5);
        const randomPortal = portals[0];
        player.x = randomPortal.x * 32;
        player.y = randomPortal.y * 32;
    }
}

function draw(ctx) {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Draw map
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const tile = map[y][x];
            if (tile === ' ' || tile === '!') continue;
            if (tile === '#') ctx.fillStyle = 'gray';
            if (tile === '@') ctx.fillStyle = 'yellow';
            if (tile === '%') ctx.fillStyle = 'magenta';
            ctx.fillRect(x * 32, y * 32, 32, 32);
        }
    }

    // Draw player
    ctx.fillStyle = 'blue';
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Draw time in left top corner
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    const realTime = Math.floor(time);
    ctx.fillText(`Time: ${Math.floor(realTime / 60)}:${(realTime % 60).toString().padStart(2, '0')}`, 10, 20);

    // Draw gold in right top corner
    ctx.fillText(`Gold: ${Math.floor(gold)}`, WIDTH - 100, 20);
}

let lastTime = performance.now();
function loop() {
    requestAnimationFrame(loop);
    const newTime = performance.now();
    update((newTime - lastTime) / 1000);
    lastTime = newTime;
    draw(ctx);
}
loop();
