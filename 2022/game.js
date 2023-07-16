// Utils
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Game canvas
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let width, height, scale;
function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    scale = window.devicePixelRatio;
    canvas.width = width * scale;
    canvas.height = height * scale;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(scale, scale);
}
resize();
window.addEventListener('resize', resize);

// Load images
const pistolImage = new Image();
pistolImage.src = 'images/pistol.webp';
const bulletImage = new Image();
bulletImage.src = 'images/bullet.webp';
const medkitImage = new Image();
medkitImage.src = 'images/medkit.webp';
const goalImage = new Image();
goalImage.src = 'images/goal.webp';

// Init game state
const player = {
    x: rand(-500, 500),
    y: rand(-500, 500),
    health: 100,
    currentHealth: 100,
    speed: 50,
    score: 0,
    vx: 0,
    vy: 0,
    hasGun: false
};
const camera = { x: 0, y: 0 };

// Objects
let objects = [];
let objectsCounter = 1;
for (let i = 0; i < 1000; i++) {
    objects.push({
        id: objectsCounter++,
        type: 'nature',
        emoji: ['🌲', '🪨', '🧌'][rand(0, 1)],
        size: 0.15,
        x: rand(-5000, 5000),
        y: rand(-5000, 5000)
    });
}
for (let i = 0; i < 50; i++) {
    objects.push({
        id: objectsCounter++,
        type: 'medkit',
        size: 0.1,
        x: rand(-5000, 5000),
        y: rand(-5000, 5000)
    });
}
for (let i = 0; i < 25; i++) {
    objects.push({
        id: objectsCounter++,
        type: 'goal',
        size: 0.25,
        x: rand(-5000, 5000),
        y: rand(-5000, 5000)
    });
}
for (let i = 0; i < 50; i++) {
    objects.push({
        id: objectsCounter++,
        type: 'enemy',
        emoji: '🧌',
        size: 0.15,
        x: rand(-5000, 5000),
        y: rand(-5000, 5000),
        currentHealth: 75,
        health: 75
    });
}
objects.push({
    id: objectsCounter++,
    type: 'football',
    emoji: '⚽',
    size: 0.075,
    x: player.x + [-1, 1][rand(0, 1)] * rand(200, 500),
    y: player.y + [-1, 1][rand(0, 1)] * rand(200, 500),
    vx: 0,
    vy: 0
});
objects.push({
    id: objectsCounter++,
    type: 'gun',
    size: 0.075,
    x: player.x + [-1, 1][rand(0, 1)] * rand(200, 500),
    y: player.y + [-1, 1][rand(0, 1)] * rand(200, 500)
});

// Controls
const keys = {};
window.addEventListener('keydown', event => keys[event.key] = true);
window.addEventListener('keyup', event => keys[event.key] = false);

const mouse = { x: 0, y: 0 };
window.addEventListener('mousemove', event => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
});
window.addEventListener('mousedown', event => {
    if (player.hasGun) {
        const x = player.x - Math.floor(width * 0.025) - camera.x + width / 2;
        const y = player.y + Math.floor(width * 0.025) - camera.y + height / 2;
        objects.push({
            id: objectsCounter++,
            type: 'bullet',
            emoji: 'X',
            size: 0.05,
            x: player.x,
            y: player.y,
            angle: Math.atan2(mouse.y - y, mouse.x - x) - Math.PI,
            speed: rand(650, 750),
            time: performance.now()
        });
    }
});
window.addEventListener('contextmenu', event => {
    event.preventDefault();
});

// Loop funcs
function update(delta) {
    if (player.currentHealth == 0) return;

    // Update player
    const change = { x: 0, y: 0 };
    if (keys['w'] || keys['ArrowUp']) change.y = -player.speed * delta;
    if (keys['a'] || keys['ArrowLeft']) change.x = -player.speed * delta;
    if (keys['s'] || keys['ArrowDown']) change.y = player.speed * delta;
    if (keys['d'] || keys['ArrowRight']) change.x = player.speed * delta;
    player.vx += change.x;
    player.vy += change.y;
    player.x += player.vx;
    player.y += player.vy;
    player.vx *= 0.9;
    player.vy *= 0.9;
    camera.x = player.x;
    camera.y = player.y;

    // Update objects
    for (const object of objects) {
        if (object.type == 'enemy') {
            if (Math.sqrt((object.x - player.x) ** 2 + (object.y - player.y) ** 2) <= width * object.size / 2) {
                player.currentHealth -= 20 * delta;
                player.currentHealth = Math.max(0, player.currentHealth);
            }
            else if (Math.sqrt((object.x - player.x) ** 2 + (object.y - player.y) ** 2) < 500) {
                object.x -= Math.sign(object.x - player.x) * 300 * delta;
                object.y -= Math.sign(object.y - player.y) * 300 * delta;
            }
        }

        if (object.type == 'football') {
            if (Math.sqrt((object.x - player.x) ** 2 + (object.y - player.y) ** 2) <= width * object.size) {
                object.vx = change.x * 5 * rand(3, rand(5, 8));
                object.vy = change.y * 5 * rand(3, rand(5, 8));
            }
            object.x += object.vx;
            object.y += object.vy;
            object.vx *= 0.9;
            object.vy *= 0.9;
        }

        if (object.type == 'gun') {
            if (Math.sqrt((object.x - player.x) ** 2 + (object.y - player.y) ** 2) <= width * object.size) {
                objects = objects.filter(otherObject => otherObject.id != object.id);
                player.hasGun = true;
            }
        }

        if (object.type == 'medkit') {
            if (Math.sqrt((object.x - player.x) ** 2 + (object.y - player.y) ** 2) <= width * object.size) {
                objects = objects.filter(otherObject => otherObject.id != object.id);
                player.currentHealth += 25;
                if (player.currentHealth > player.health) player.currentHealth = player.health;
            }
        }

        if (object.type == 'goal') {
            const football = objects.find(otherObject => otherObject.type == 'football');
            if (Math.sqrt((object.x - football.x) ** 2 + (object.y - football.y) ** 2) <= width * object.size) {
                objects = objects.filter(otherObject => otherObject.id != object.id);
                player.score++;
            }
        }

        if (object.type == 'bullet') {
            object.x += object.speed * Math.cos(object.angle - Math.PI) * delta;
            object.y += object.speed * Math.sin(object.angle - Math.PI) * delta;
            if (performance.now() - object.time >= 10 * 1000) {
                objects = objects.filter(otherObject => otherObject.id != object.id);
            }

            for (const otherObject of objects) {
                if (otherObject.type == 'enemy') {
                    if (Math.sqrt((otherObject.x - object.x) ** 2 + (otherObject.y - object.y) ** 2) <= width * object.size * 1.5) {
                        objects = objects.filter(otherObject => otherObject.id != object.id);
                        otherObject.currentHealth -= 25;
                        if (otherObject.currentHealth < 0) {
                            objects = objects.filter(otherOtherObject => otherOtherObject.id != otherObject.id);
                        }
                    }
                }
            }
        }
    }
}

function drawImageRotated(image, x, y, width, height, angle, flipX = false) {
    ctx.save();
    ctx.translate(x, y);
    if (flipX) ctx.scale(-1, 1);
    ctx.rotate(angle);
    ctx.drawImage(image, -width / 2, -height / 2, width / 2, height / 2);
    ctx.restore();
}

function draw() {
    ctx.fillStyle = '#ACC9B2';
    ctx.fillRect(0, 0, width, height);

    // Draw objects
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const object of objects) {
        const size = Math.floor(width * object.size);
        if (object.type == 'gun') {
            ctx.drawImage(pistolImage, object.x - camera.x + width / 2, object.y - camera.y + height / 2, size, size);
        }
        else if (object.type == 'medkit') {
            ctx.drawImage(medkitImage, object.x - camera.x + width / 2, object.y - camera.y + height / 2, size, size);
        }
        else if (object.type == 'goal') {
            ctx.drawImage(goalImage, object.x - camera.x + width / 2, object.y - camera.y + height / 2, size, size);
        }
        else if (object.type == 'bullet') {
            drawImageRotated(bulletImage, object.x - camera.x + width / 2, object.y - camera.y + height / 2, size, size, object.angle - Math.PI / 2);
        }
        else {
            ctx.font = `${size}px sans-serif`;
            ctx.fillText(object.emoji, object.x - camera.x + width / 2, object.y - camera.y + height / 2);
        }
    }

    // Draw player
    ctx.font = `${Math.floor(width * 0.1)}px sans-serif`;
    if (player.currentHealth >= 75) ctx.fillText('🙂', player.x - camera.x + width / 2, player.y - camera.y + height / 2);
    else if (player.currentHealth >= 50) ctx.fillText('😥', player.x - camera.x + width / 2, player.y - camera.y + height / 2);
    else if (player.currentHealth >= 25) ctx.fillText('😰', player.x - camera.x + width / 2, player.y - camera.y + height / 2);
    else if (player.currentHealth >= 1) ctx.fillText('🥵', player.x - camera.x + width / 2, player.y - camera.y + height / 2);
    else ctx.fillText('🪦', player.x - camera.x + width / 2, player.y - camera.y + height / 2);

    // Draw player gun
    if (player.hasGun) {
        const x = player.x - Math.floor(width * 0.05) - camera.x + width / 2;
        const y = player.y + Math.floor(width * 0.05) - camera.y + height / 2;
        const angle = mouse.x > x ? -Math.atan2(mouse.y - y, mouse.x - x) : Math.atan2(mouse.y - y, mouse.x - x) - Math.PI;
        drawImageRotated(pistolImage, x, y, Math.floor(width * 0.1), Math.floor(width * 0.1), angle, mouse.x > x);
    }

    // Draw hud
    ctx.fillStyle = '#f00';
    ctx.fillRect(32, height - 64, 256, 32);
    ctx.fillStyle = '#0f0';
    ctx.fillRect(32, height - 64, Math.floor(player.currentHealth / player.health * 256), 32);
    ctx.fillStyle = '#fff';
    ctx.font = `16px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText(`${player.currentHealth.toFixed(0)} / ${player.health.toFixed(0)}`, 40, height - 48);

    ctx.font = `${Math.floor(width * 0.02)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.fillText('Welpen Game 2022', width * 0.015, width * 0.03);
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${player.score}`, width / 2, width * 0.03);
    ctx.textAlign = 'right';
    ctx.fillText('Made by Bagheera with ❤️', width - width * 0.015, width * 0.03);

    if (player.currentHealth == 0) {
        ctx.textAlign = 'center';
        ctx.font = `${Math.floor(width * 0.05)}px sans-serif`;
        ctx.fillText('Game Over!', width / 2, height / 2);
    }
}

// Update loop
let oldTime = performance.now();
function loop() {
    window.requestAnimationFrame(loop);
    let time = performance.now();
    update((time - oldTime) / 1000);
    oldTime = time;
    draw();
}
loop();
