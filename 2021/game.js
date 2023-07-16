
const canvas = document.getElementById('canvas'),
    ctx = canvas.getContext('2d');
let player = {}, frame, frame2, stars, monsters, score, key, running;

function start() {
    player.x = canvas.width / 2, player.y = canvas.height / 2, player.size = 32,
        player.speed = 2, frame = 0, frame2 = 0, stars = [], monsters = [], score = 0, key = 's',
        running = true, pause = false;
}

function loop() {
    // Update
    if (running && !pause) {
        if (frame >= 25) {
            frame = 0;
            const star = {
                size: Math.floor(Math.random() * 24) + 16,
                character: ['⭐', '🌍', '🌑', '🌞'][Math.floor(Math.random() * 4)],
                time: Date.now() + (Math.floor(Math.random() * 10) + 10) * 1000
            };
            do {
                star.x = Math.floor(Math.random() * 800);
                star.y = Math.floor(Math.random() * 600);

                let same = false;
                for (const other_star of stars) {
                    if (Math.sqrt((other_star.x - star.x) ** 2 + (other_star.y - star.y) ** 2) < other_star.size * 2) {
                        same = true;
                        break;
                    }
                }
                if (!same && Math.sqrt((player.x - star.x) ** 2 + (player.y - star.y) ** 2) > player.size * 2) {
                    break;
                }
            } while (true);
            stars.push(star);
            player.speed += 0.010;
        } else {
            frame++;
        }

        if (frame2 >= 100) {
            frame2 = 0;
            if (score > 1000) {
                const monster = {
                    size: Math.floor(Math.random() * 16) + 16,
                    character: ['👽', '🛸', '👾'][Math.floor(Math.random() * 3)],
                    time: Date.now() + (Math.floor(Math.random() * 7.5) + 2.5) * 1000
                };
                const corner = Math.floor(Math.random() * 4);
                if (corner == 0) {
                    monster.x = 0;
                    monster.y = 0;
                }
                if (corner == 1) {
                    monster.x = canvas.width;
                    monster.y = 0;
                }
                if (corner == 2) {
                    monster.x = 0;
                    monster.y = canvas.height;
                }
                if (corner == 3) {
                    monster.x = canvas.width;
                    monster.y = canvas.height;
                }
                monsters.push(monster);
            }
        } else {
            frame2++;
        }

        if (key == 'w' || key == 'ArrowUp') {
            player.y -= player.speed;
        }
        if (key == 'a' || key == 'ArrowLeft') {
            player.x -= player.speed;
        }
        if (key == 'd' || key == 'ArrowRight') {
            player.x += player.speed;
        }
        if (key == 's' || key == 'ArrowDown') {
            player.y += player.speed;
        }
        score++;

        for (let i = 0; i < stars.length; i++) {
            const star = stars[i];
            if (
                Math.sqrt((player.x - star.x) ** 2 + (player.y - star.y) ** 2) < star.size
            ) {
                running = false;
                break;
            }

            if (Date.now() > star.time) {
                stars.splice(i--, 1);
            }
        }

        for (let i = 0; i < monsters.length; i++) {
            const monster = monsters[i];
            if (
                Math.sqrt((player.x - monster.x) ** 2 + (player.y - monster.y) ** 2) < monster.size
            ) {
                running = false;
                break;
            }

            monster.x += Math.sign(player.x - monster.x);
            monster.y += Math.sign(player.y - monster.y);

            if (Date.now() > monster.time) {
                monsters.splice(i--, 1);
            }
        }

        if (player.x < 0 || player.y < 0 || player.x > canvas.width || player.y > canvas.height) {
            running = false;
        }
    }

    // Draw
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const star of stars) {
        ctx.font = star.size + 'px sans-serif';
        ctx.fillText(star.character, star.x - star.size / 2, star.y - star.size / 2);
    }
    for (const monster of monsters) {
        ctx.font = monster.size + 'px sans-serif';
        ctx.fillText(monster.character, Math.floor(monster.x) - monster.size / 2, Math.floor(monster.y) - monster.size / 2);
    }

    ctx.font = player.size + 'px sans-serif';
    ctx.fillText(running ? '🚀' : '💥', Math.floor(player.x) - player.size / 2, Math.floor(player.y) - player.size / 2);

    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Score: ' + score, 16, 16);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!running) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '64px sans-serif ';
        ctx.fillStyle = '#fff';
        let y = (canvas.height - (64 + 16 + 24 + 16 + 24 + 16 + 24)) / 2;
        ctx.fillText('Game over!', canvas.width / 2, y);
        y += 64 + 16;
        ctx.font = '24px sans-serif';
        ctx.fillText('Score: ' + score, canvas.width / 2, y);
        y += 24 + 16;
        if (localStorage.high_score == null || score > localStorage.high_score) {
            localStorage.high_score = score;
        }
        ctx.fillText('Hoogste score: ' + localStorage.high_score, canvas.width / 2, y);
        y += 24 + 16;
        ctx.fillText('Klink om opnieuw te beginnen...', canvas.width / 2, y);
    } else if (pause) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '64px sans-serif ';
        ctx.fillStyle = '#fff';
        let y = (canvas.height - (64 + 16 + 24)) / 2;
        ctx.fillText('Pauze', canvas.width / 2, y);
        y += 64 + 16;
        ctx.font = '24px sans-serif';
        ctx.fillText('Druk op de P-toets om weer verder te gaan...', canvas.width / 2, y);
    }

    requestAnimationFrame(loop);
}

window.onkeydown = event => {
    event.preventDefault();

    if (
        event.key == 'w' || event.key == 'a' || event.key == 's' || event.key == 'd' ||
        event.key == 'ArrowUp' || event.key == 'ArrowLeft' || event.key == 'ArrowRight' || event.key == 'ArrowDown'
    ) {
        key = event.key;
    }

    if (event.key == 'p') {
        pause = !pause;
    }
};

window.onclick = () => {
    if (!running) {
        start();
    }
};

start();
requestAnimationFrame(loop);
