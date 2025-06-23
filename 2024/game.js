import PerlinNoise from './noise.js';

// Canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
resize();
window.addEventListener('resize', resize);

// MARK: Random
let seed = Date.now();
function random() {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

function rand(min, max) {
    return Math.floor(random() * (max - min + 1)) + min;
}

// MARK: Images
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

// MARK: Camera and Controls
const TILE_SIZES = [32, 48, 64, 96, 128, 192, 256, 384, 512];
class Camera {
    constructor(x, y, zoomLevel) {
        this.x = x;
        this.y = y;
        this.zoomLevel = zoomLevel;
        this.tileSize = TILE_SIZES[this.zoomLevel];
    }
}

class Controls {
    constructor(camera, map, player, units) {
        this.camera = camera;
        this.map = map;
        this.player = player;
        this.units = units;

        this.isDragging = false;
        this.dragRect = { left: 0, top: 0, right: 0, bottom: 0 };
        this.selectedUnits = [];

        this.pressedKeys = {};

        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
        canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
        canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
        canvas.addEventListener('wheel', this.onWheel.bind(this));
    }

    onKeyDown(event) {
        this.pressedKeys[event.key] = true;
    }

    onKeyUp(event) {
        this.pressedKeys[event.key] = false;
    }

    onMouseDown(event) {
        event.preventDefault();
        if (event.button === 0) {
            this.isDragging = true;
            this.dragRect.left = this.dragRect.right = event.clientX;
            this.dragRect.top = this.dragRect.bottom = event.clientY;
        }
    }

    onMouseMove(event) {
        event.preventDefault();
        if (this.isDragging) {
            this.dragRect.right = event.clientX;
            this.dragRect.bottom = event.clientY;
        }
    }

    onMouseUp(event) {
        event.preventDefault();
        if (this.isDragging) {
            this.isDragging = false;

            // Select all units in drag rect
            let singleClick = this.dragRect.left == this.dragRect.right && this.dragRect.top == this.dragRect.bottom;

            this.selectedUnits = [];
            const left = Math.min(this.dragRect.left, this.dragRect.right);
            const right = Math.max(this.dragRect.left, this.dragRect.right);
            const top = Math.min(this.dragRect.top, this.dragRect.bottom);
            const bottom = Math.max(this.dragRect.top, this.dragRect.bottom);
            for (const unit of this.units) {
                const unitType = unitTypes[unit.type];
                if (!singleClick && (unit.player !== this.player || !unitType.movable)) continue;
                const boxSize = camera.tileSize * unitType.boxScale;
                const unitX = window.innerWidth / 2 + (unit.x - this.camera.x) * this.camera.tileSize - boxSize / 2;
                const unitY = window.innerHeight / 2 + (unit.y - this.camera.y) * this.camera.tileSize - boxSize / 2;
                const unitSize = boxSize;
                if (!(left > unitX + unitSize || right < unitX || top > unitY + unitSize || bottom < unitY)) {
                    this.selectedUnits.push(unit);
                    if (singleClick) break;
                }
            }
        }
        if (event.button === 2 && this.selectedUnits.length > 0) {
            for (const unit of this.selectedUnits) {
                const unitType = unitTypes[unit.type];
                if (unitType.movable) {
                    const targetX =
                        (event.clientX - window.innerWidth / 2 + this.camera.x * this.camera.tileSize) /
                        this.camera.tileSize;
                    const targetY =
                        (event.clientY - window.innerHeight / 2 + this.camera.y * this.camera.tileSize) /
                        this.camera.tileSize;
                    unit.targetX = targetX;
                    unit.targetY = targetY;
                }
            }
        }
    }

    onWheel(event) {
        event.preventDefault();
        const delta = event.deltaY < 0 ? 1 : -1;
        this.camera.zoomLevel = Math.max(0, Math.min(TILE_SIZES.length - 1, this.camera.zoomLevel + delta));
        this.camera.tileSize = TILE_SIZES[this.camera.zoomLevel];
    }

    update(delta) {
        const cameraSpeed = (1 / (this.camera.zoomLevel + 1)) * 20;
        if (this.pressedKeys['ArrowLeft'] || this.pressedKeys['a']) {
            this.camera.x -= cameraSpeed * delta;
        }
        if (this.pressedKeys['ArrowRight'] || this.pressedKeys['d']) {
            this.camera.x += cameraSpeed * delta;
        }
        if (this.pressedKeys['ArrowUp'] || this.pressedKeys['w']) {
            this.camera.y -= cameraSpeed * delta;
        }
        if (this.pressedKeys['ArrowDown'] || this.pressedKeys['s']) {
            this.camera.y += cameraSpeed * delta;
        }
        if (this.camera.x < 0) this.camera.x = 0;
        if (this.camera.y < 0) this.camera.y = 0;
        if (this.camera.x > this.map.width) this.camera.x = this.map.width;
        if (this.camera.y > this.map.height) this.camera.y = this.map.height;
    }

    draw(ctx) {
        if (this.isDragging) {
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                Math.min(this.dragRect.left, this.dragRect.right),
                Math.min(this.dragRect.top, this.dragRect.bottom),
                Math.abs(this.dragRect.right - this.dragRect.left),
                Math.abs(this.dragRect.bottom - this.dragRect.top)
            );
        }
    }
}

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

// MARK: Units
const unitTypes = {
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

class Unit {
    constructor(x, y, type, player) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.player = player;
        this.health = unitTypes[type].health;
    }

    update(delta, units, map) {
        const unitType = unitTypes[this.type];
        if (unitType.movable && this.targetX) {
            const targetX = this.targetX;
            const targetY = this.targetY;

            const dx = targetX - this.x;
            const dy = targetY - this.y;
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
                if (Math.abs(this.x - targetX) < 0.1 && Math.abs(this.y - targetY) < 0.1) {
                    this.targetX = null;
                    this.targetY = null;
                }
            }
        }
    }

    draw(ctx, camera, isSelected) {
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
            const healthBarHeight = 4;
            const healthBarY =
                window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize - boxSize / 2 - healthBarHeight - 8;
            const healthBarX =
                window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize - boxSize / 2 + healthBarWidth / 2;
            ctx.fillStyle = '#f00';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            ctx.fillStyle = '#0f0';
            ctx.fillRect(
                healthBarX,
                healthBarY,
                healthBarWidth * (this.health / unitTypes[this.type].health),
                healthBarHeight
            );

            // Draw selection outline
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeRect(
                window.innerWidth / 2 + (this.x - camera.x) * camera.tileSize - boxSize / 2,
                window.innerHeight / 2 + (this.y - camera.y) * camera.tileSize - boxSize / 2,
                boxSize,
                boxSize
            );
        }
    }
}

// MARK: Map
class Map {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = new Uint8Array(width * height);
    }

    generate(units, gaiaPlayer) {
        const noise = new PerlinNoise(random);

        // Generate tiles
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const value = noise.noise(x / 20, y / 20);
                if (value < -0.5) {
                    this.tiles[y * this.width + x] = rand(0, 1);
                } else if (value < -0.3) {
                    this.tiles[y * this.width + x] = rand(2, 3);
                } else {
                    this.tiles[y * this.width + x] = rand(4, 5);
                }
            }
        }

        // Generate trees and bushes with noise-based density
        const density = 5;
        const forestNoise = new PerlinNoise(random);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Only place trees and bushes on grass tiles (4, 5)
                if (this.tiles[y * this.width + x] === 4 || this.tiles[y * this.width + x] === 5) {
                    const forestValue = forestNoise.noise((x + 4000) / 20, (y + 4000) / 20);
                    if (forestValue > 0.1) {
                        if (random() < 0.5) {
                            const offsetX = rand(0, density) / density;
                            const offsetY = rand(0, density) / density;
                            units.push(
                                new Unit(x + offsetX, y + offsetY, rand(0, 1) === 0 ? 'tree1' : 'tree2', gaiaPlayer)
                            );
                        }
                        if (random() < 0.3) {
                            const offsetX = rand(0, density) / density;
                            const offsetY = rand(0, density) / density;
                            units.push(new Unit(x + offsetX, y + offsetY, 'bushes', gaiaPlayer));
                        }
                    }
                }
            }
        }

        // Generate stones in clusters
        const stoneNoise = new PerlinNoise(random);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Only place on non-water tiles (index > 1)
                if (this.tiles[y * this.width + x] > 1) {
                    const stoneValue = stoneNoise.noise((x + 8000) / 10, (y + 8000) / 10);
                    if (stoneValue > 0.5) {
                        const offsetX = rand(0, density) / density;
                        const offsetY = rand(0, density) / density;
                        if (random() < 0.5) {
                            units.push(new Unit(x + offsetX, y + offsetY, 'stone', gaiaPlayer));
                        }
                    }
                }
            }
        }

        // Generate gold in clusters
        const goldNoise = new PerlinNoise(random);
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Only place on non-water tiles (index > 1)
                if (this.tiles[y * this.width + x] > 1) {
                    const goldValue = goldNoise.noise((x + 12000) / 8, (y + 12000) / 8);
                    if (goldValue > 0.4) {
                        const offsetX = rand(0, density) / density;
                        const offsetY = rand(0, density) / density;
                        if (random() < 0.5) {
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

// MARK: State
let startTime = Date.now();

const player = new Player('Player', '#26f');
const gaiaPlayer = new Player('Gaia', '#aaa');
const enemy = new Player('Enemy', '#f00');
const players = [gaiaPlayer, player, enemy];

const units = [];
const map = new Map(50, 50);
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

    map.draw(ctx, controls.camera);

    const sortedUnits = units.slice().sort((a, b) => a.y - b.y);
    for (const unit of sortedUnits) {
        const isSelected = controls.selectedUnits.includes(unit);
        unit.draw(ctx, controls.camera, isSelected);
    }

    {
        ctx.font = '16px Arial';
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';

        // Draw game title
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, 230, 32);
        ctx.fillStyle = '#fff';
        ctx.fillText('Welpen Game 2024: Ridders', 8, 8);

        // Draw resources
        const width = 400;
        const x = window.innerWidth / 2 - width / 2;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, 0, width, 32);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Food: ${player.food}`, x + 10, 8);
        ctx.fillText(`Wood: ${player.wood}`, x + 100, 8);
        ctx.fillText(`Gold: ${player.gold}`, x + 200, 8);
        ctx.fillText(`Stone: ${player.stone}`, x + 300, 8);

        // Draw game time
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(window.innerWidth - 100, 0, 100, 32);
        ctx.fillStyle = '#fff';
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        ctx.fillText(
            `Time: ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`,
            window.innerWidth - 100 + 8,
            8
        );

        // Draw copyright
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, window.innerHeight - 32, 180, 32);
        ctx.fillStyle = '#fff';
        ctx.fillText('Made by Bagheera :^)', 8, window.innerHeight - 24);

        // Draw selected units information
        if (controls.selectedUnits.length == 1) {
            const unit = controls.selectedUnits[0];
            const unitType = unitTypes[unit.type];

            const width = 8 + 64 + 16 + 240;
            const x = window.innerWidth / 2 - width / 2;
            const y = window.innerHeight - 80;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
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

            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
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
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
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
