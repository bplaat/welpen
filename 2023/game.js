import { PerspectiveCamera, Object3D, Matrix4, Vector4, radians, rand } from './math.js';

// Consts
const DEBUG = window.location.host == '127.0.0.1:5500';

// Canvas
const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
const gl = canvas.getContext('webgl');
const vertexArrayExtension = gl.getExtension('OES_vertex_array_object');

// Stats
const stats = new Stats();
stats.dom.style.top = '';
stats.dom.style.left = '';
stats.dom.style.right = '16px';
stats.dom.style.bottom = '16px';
document.body.appendChild(stats.dom);

// Camera
const camera = new PerspectiveCamera(radians(75), gl.canvas.clientWidth / gl.canvas.clientHeight, 0.1, 10000);
camera.position.y = 2;
camera.updateMatrix();

function resize() {
    canvas.width = window.innerWidth * window.devicePixelRatio;
    canvas.height = window.innerHeight * window.devicePixelRatio;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    camera.aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    camera.updateMatrix();
}
resize();
window.addEventListener('resize', resize);

// Shader
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program;
    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

const vertexShaderSource = `attribute vec4 a_position;
attribute vec2 a_texture_position;
uniform mat4 u_matrix;
uniform mat4 u_camera;
varying vec2 v_texture_position;
void main() {
   gl_Position = u_camera * u_matrix * a_position;
   v_texture_position = a_texture_position;
}`;

const fragmentShaderSource = `precision mediump float;
varying vec2 v_texture_position;
uniform sampler2D u_texture;
uniform vec2 u_texture_repeat;
uniform vec4 u_color;
void main() {
    gl_FragColor = texture2D(u_texture, v_texture_position * u_texture_repeat) * u_color;
}`;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

const positionAttribute = gl.getAttribLocation(program, 'a_position');
const texturePositionAttribute = gl.getAttribLocation(program, 'a_texture_position');
const cameraUniform = gl.getUniformLocation(program, 'u_camera');
const matrixUniform = gl.getUniformLocation(program, 'u_matrix');
const textureRepeatUniform = gl.getUniformLocation(program, 'u_texture_repeat');
const colorUniform = gl.getUniformLocation(program, 'u_color');

// Plane Vertex Array
const planeVertexArray = vertexArrayExtension.createVertexArrayOES();
vertexArrayExtension.bindVertexArrayOES(planeVertexArray);

const planeBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, planeBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    // Vertex position, Texture position
    -0.5, -0.5, 0, 0, 1,
    0.5, -0.5, 0, 1, 1,
    0.5, 0.5, 0, 1, 0,

    -0.5, -0.5, 0, 0, 1,
    0.5, 0.5, 0, 1, 0,
    -0.5, 0.5, 0, 0, 0
]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionAttribute);
gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 5 * 4, 0);
gl.enableVertexAttribArray(texturePositionAttribute);
gl.vertexAttribPointer(texturePositionAttribute, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

// Box Vertex Array
const boxVertexArray = vertexArrayExtension.createVertexArrayOES();
vertexArrayExtension.bindVertexArrayOES(boxVertexArray);

const boxBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, boxBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    // Vertex position, Texture position
    -0.5, -0.5, -0.5, 1, 1, // Front face
    0.5, -0.5, -0.5, 0, 1,
    0.5, 0.5, -0.5, 0, 0,
    -0.5, -0.5, -0.5, 1, 1,
    -0.5, 0.5, -0.5, 1, 0,
    0.5, 0.5, -0.5, 0, 0,

    -0.5, -0.5, 0.5, 0, 1, // Back face
    0.5, -0.5, 0.5, 1, 1,
    0.5, 0.5, 0.5, 1, 0,
    -0.5, -0.5, 0.5, 0, 1,
    -0.5, 0.5, 0.5, 0, 0,
    0.5, 0.5, 0.5, 1, 0,

    -0.5, -0.5, -0.5, 0, 1, // Left face
    -0.5, -0.5, 0.5, 1, 1,
    -0.5, 0.5, 0.5, 1, 0,
    -0.5, -0.5, -0.5, 0, 1,
    -0.5, 0.5, -0.5, 0, 0,
    -0.5, 0.5, 0.5, 1, 0,

    0.5, -0.5, -0.5, 1, 1, // Right face
    0.5, -0.5, 0.5, 0, 1,
    0.5, 0.5, 0.5, 0, 0,
    0.5, -0.5, -0.5, 1, 1,
    0.5, 0.5, -0.5, 1, 0,
    0.5, 0.5, 0.5, 0, 0,

    -0.5, -0.5, -0.5, 0, 1, // Bottom face
    0.5, -0.5, -0.5, 1, 1,
    0.5, -0.5, 0.5, 1, 0,
    -0.5, -0.5, -0.5, 0, 1,
    -0.5, -0.5, 0.5, 0, 0,
    0.5, -0.5, 0.5, 1, 0,

    -0.5, 0.5, 0.5, 1, 0, // Top face
    0.5, 0.5, 0.5, 0, 0,
    0.5, 0.5, -0.5, 0, 1,
    -0.5, 0.5, 0.5, 1, 0,
    -0.5, 0.5, -0.5, 1, 1,
    0.5, 0.5, -0.5, 0, 1
]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionAttribute);
gl.vertexAttribPointer(positionAttribute, 3, gl.FLOAT, false, 5 * 4, 0);
gl.enableVertexAttribArray(texturePositionAttribute);
gl.vertexAttribPointer(texturePositionAttribute, 2, gl.FLOAT, false, 5 * 4, 3 * 4);

// Textures
const blankTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, blankTexture);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

class Sound {
    constructor(url) {
        this.channels = [];
        this.number = 10;
        this.index = 0;
        for (let i = 0; i < this.number; i++) {
            this.channels.push(new Audio(url));
        }
    }

    play() {
        this.channels[this.index++].play();
        this.index = this.index < this.number ? this.index : 0;
    }
}

function loadTexture(url, transparent, flipY = false, repeat = false) {
    const image = new Image();
    image.src = url;
    let texture = gl.createTexture();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (!repeat) {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        gl.texImage2D(gl.TEXTURE_2D, 0, transparent ? gl.RGBA : gl.RGB, transparent ? gl.RGBA : gl.RGB, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    return texture;
}

const healSound = new Sound('./sounds/heal.wav');
const diedSound = new Sound('./sounds/died.wav');
const hitSound = new Sound('./sounds/hit.wav');
const shootSound = new Sound('./sounds/shoot.wav');

const grassTexture = loadTexture('./images/grass.jpg', false, false, true);
const crateTexture = loadTexture('./images/crate.jpg', false);
const treeTexture = loadTexture('./images/tree.png', true);
const sunflowerTexture = loadTexture('./images/sunflower.png', true);
const roseTexture = loadTexture('./images/rose.png', true);
const soldierTexture = loadTexture('./images/soldier.png', true);
const gunTexture = loadTexture('./images/gun.png', true, true);
const bushsesTexture = loadTexture('./images/bushes.png', true);
const chickenTexture = loadTexture('./images/chicken.png', true);
const streetlightTexture = loadTexture('./images/streetlight.png', true);
const statueTexture = loadTexture('./images/statue.png', true);
const catTexture = loadTexture('./images/cat.png', true);
const dogTexture = loadTexture('./images/dog.png', true);
const medkitTexture = loadTexture('./images/medkit.png', true);

// World
const world = {
    width: 1000,
    height: 1000
};

// Objects
const objects = [];

function sortObjects() {
    objects.sort((a, b) => {
        return camera.position.distFlat(b.position) - camera.position.distFlat(a.position);
    });
}

class Plane extends Object3D {
    constructor() {
        super();
        this.color = { r: 1, g: 1, b: 1, a: 1 };
        this.textureRepeat = { x: 1, y: 1 };
        this.transparent = false;
    }

    update(delta) { }

    render() {
        vertexArrayExtension.bindVertexArrayOES(planeVertexArray);
        if (this.transparent) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform2f(textureRepeatUniform, this.textureRepeat.x, this.textureRepeat.y);
        gl.uniformMatrix4fv(matrixUniform, false, this.matrix.elements);
        gl.uniform4f(colorUniform, this.color.r, this.color.g, this.color.b, this.color.a);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (this.transparent) gl.disable(gl.BLEND);
    }
}

class Sprite extends Plane {
    constructor() {
        super();
    }

    update(delta) {
        this.rotation.y = Math.atan2(camera.position.x - this.position.x, camera.position.z - this.position.z);
        this.updateMatrix();
    }
}

class Box extends Object3D {
    constructor() {
        super();
        this.color = { r: 1, g: 1, b: 1, a: 1 };
        this.textureRepeat = { x: 1, y: 1 };
        this.transparent = false;
    }

    update(delta) { }

    render() {
        vertexArrayExtension.bindVertexArrayOES(boxVertexArray);
        if (this.transparent) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform2f(textureRepeatUniform, this.textureRepeat.x, this.textureRepeat.y);
        gl.uniformMatrix4fv(matrixUniform, false, this.matrix.elements);
        gl.uniform4f(colorUniform, this.color.r, this.color.g, this.color.b, this.color.a);
        gl.drawArrays(gl.TRIANGLES, 0, 36);
        if (this.transparent) gl.disable(gl.BLEND);
    }
}

// Ground
const ground = new Plane();
ground.texture = grassTexture;
ground.rotation.x = -Math.PI / 2;
ground.scale.x = world.width;
ground.scale.y = world.height;
ground.textureRepeat.x = world.width;
ground.textureRepeat.y = world.height;
ground.updateMatrix();

// Crates
class Crate extends Box {
    constructor() {
        super();
        this.texture = crateTexture;
        this.position.y = this.scale.y / 2;
    }
}

for (let i = 0; i < 50; i++) {
    const crate = new Crate();
    crate.position.x = rand(-world.width / 2, world.height / 2);
    crate.position.z = rand(-world.width / 2, world.height / 2);
    crate.updateMatrix();
    objects.push(crate);
}

// StreetLights
class StreetLight extends Sprite {
    constructor() {
        super();
        this.texture = streetlightTexture;
        this.transparent = true;
        this.scale.x = 5;
        this.scale.y = 5;
        this.position.y = this.scale.y / 2;
    }
}

for (let i = 0; i < 50; i++) {
    const streetlight = new StreetLight();
    streetlight.position.x = rand(-world.width / 2, world.height / 2);
    streetlight.position.z = rand(-world.width / 2, world.height / 2);
    streetlight.updateMatrix();
    objects.push(streetlight);
}

// Statues
class Statue extends Sprite {
    constructor() {
        super();
        this.texture = statueTexture;
        this.transparent = true;
        this.scale.x = 5;
        this.scale.y = 5;
        this.position.y = this.scale.y / 2;
    }
}

for (let i = 0; i < 50; i++) {
    const statue = new Statue();
    statue.position.x = rand(-world.width / 2, world.height / 2);
    statue.position.z = rand(-world.width / 2, world.height / 2);
    statue.updateMatrix();
    objects.push(statue);
}

// Medkits
class Medkit extends Sprite {
    constructor() {
        super();
        this.texture = medkitTexture;
        this.transparent = true;
        this.position.y = this.scale.y / 2;
        this.deleted = false;
    }

    update() {
        if (this.deleted) return;
        super.update();

        if (this.position.dist(camera.position) < this.scale.x * 2) {
            health += rand(25, 50);
            healSound.play();
            if (health > maxHealth) health = maxHealth;
            this.deleted = true;
        }
    }

    render() {
        if (!this.deleted) {
            super.render();
        }
    }
}

for (let i = 0; i < 25; i++) {
    const medkit = new Medkit();
    medkit.position.x = rand(-world.width / 2, world.height / 2);
    medkit.position.z = rand(-world.width / 2, world.height / 2);
    medkit.updateMatrix();
    objects.push(medkit);
}

// Trees
class Tree extends Sprite {
    constructor() {
        super();
        this.texture = treeTexture;
        this.transparent = true;
        this.scale.x = 8;
        this.scale.y = 8;
        this.position.y = this.scale.y / 2;
    }
}

class Bushes extends Sprite {
    constructor() {
        super();
        this.texture = bushsesTexture;
        this.transparent = true;
        this.scale.x = 2;
        this.scale.y = 2;
        this.position.y = this.scale.y / 2;
    }
}

for (let i = 0; i < 1500; i++) {
    const object = rand(1, 2) == 1 ? new Tree() : new Bushes();
    object.position.x = rand(-world.width / 2, world.height / 2);
    object.position.z = rand(-world.width / 2, world.height / 2);
    object.updateMatrix();
    objects.push(object);
}

// Flowers
class Sunflower extends Sprite {
    constructor() {
        super();
        this.texture = sunflowerTexture;
        this.transparent = true;
        this.position.y = this.scale.y / 2;
    }
}

class Rose extends Sprite {
    constructor() {
        super();
        this.texture = roseTexture;
        this.transparent = true;
        this.position.y = this.scale.y / 2;
    }
}

for (let i = 0; i < 1000; i++) {
    const flower = rand(1, 2) == 1 ? new Sunflower() : new Rose();
    flower.position.x = rand(-world.width / 2, world.height / 2);
    flower.position.z = rand(-world.width / 2, world.height / 2);
    flower.updateMatrix();
    objects.push(flower);
}

// Unit
class Unit extends Sprite {
    constructor() {
        super();
        this.deleted = false;
    }

    update(delta) {
        if (this.deleted) return;
        super.update(delta);

        this.position.x += Math.sign(this.target.x - this.position.x) * this.speed * delta;
        this.position.z += Math.sign(this.target.z - this.position.z) * this.speed * delta;
        if (this.position.x < -world.width / 2) this.position.x = -world.width / 2;
        if (this.position.x > world.width / 2) this.position.x = world.width / 2;
        if (this.position.z < -world.height / 2) this.position.z = -world.height / 2;
        if (this.position.z > world.height / 2) this.position.z = world.height / 2;

        if (this.target.distFlat(this.position) < 0.5) {
            this.target = this.position.clone().add(new Vector4(rand(-20, 20), 0, rand(-20, 20), 0));
        }
    }

    damage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.deleted = true;
            diedSound.play();
            updateScore(score + 100);
        }
    }

    render() {
        if (this.deleted) return;
        super.render();

        // Draw health bar
        if (this.health != this.maxHealth) {
            vertexArrayExtension.bindVertexArrayOES(planeVertexArray);
            gl.bindTexture(gl.TEXTURE_2D, blankTexture);
            gl.uniform2f(textureRepeatUniform, 1, 1);

            // Red part
            const redPart = new Object3D();
            redPart.position = this.position.clone().add(new Vector4(0, this.scale.y / 3 * 2, 0, 0));
            redPart.scale.y = 0.1;
            redPart.rotation.y = Math.atan2(camera.position.x - redPart.position.x, camera.position.z - redPart.position.z);
            redPart.updateMatrix();
            gl.uniformMatrix4fv(matrixUniform, false, redPart.matrix.elements);
            gl.uniform4f(colorUniform, 1, 0, 0, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 6);

            // Green part
            const greenPart = new Object3D();
            greenPart.position = this.position.clone().add(new Vector4(0, this.scale.y / 3 * 2, 0, 0));

            const update = new Vector4();
            update.z = 0.01;
            update.mul(Matrix4.rotateY(camera.rotation.y));
            greenPart.position.add(update);

            greenPart.scale.x = this.health / this.maxHealth * this.scale.x;
            greenPart.scale.y = 0.1;
            greenPart.rotation.y = Math.atan2(camera.position.x - greenPart.position.x, camera.position.z - greenPart.position.z);
            greenPart.updateMatrix();
            gl.uniformMatrix4fv(matrixUniform, false, greenPart.matrix.elements);
            gl.uniform4f(colorUniform, 0, 1, 0, 1);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
    }
}

// Chickens
class Chicken extends Unit {
    constructor() {
        super();
        this.texture = chickenTexture;
        this.transparent = true;
        this.position.y = this.scale.y / 2;
        this.maxHealth = 50;
        this.health = this.maxHealth;
        this.speed = 1;
    }
}

for (let i = 0; i < 250; i++) {
    const chicken = new Chicken();
    chicken.position.x = rand(-world.width / 2, world.height / 2);
    chicken.position.z = rand(-world.width / 2, world.height / 2);
    chicken.target = chicken.position.clone().add(new Vector4(rand(-10, 10), 0, rand(-10, 10), 0));
    chicken.updateMatrix();
    objects.push(chicken);
}

// Dogs
class Dog extends Unit {
    constructor() {
        super();
        this.texture = dogTexture;
        this.transparent = true;
        this.position.y = this.scale.y / 2;
        this.maxHealth = 50;
        this.health = this.maxHealth;
        this.speed = 1;
    }
}

for (let i = 0; i < 250; i++) {
    const dog = new Dog();
    dog.position.x = rand(-world.width / 2, world.height / 2);
    dog.position.z = rand(-world.width / 2, world.height / 2);
    dog.target = dog.position.clone().add(new Vector4(rand(-10, 10), 0, rand(-10, 10), 0));
    dog.updateMatrix();
    objects.push(dog);
}

// Cats
class Cat extends Unit {
    constructor() {
        super();
        this.texture = catTexture;
        this.transparent = true;
        this.position.y = this.scale.y / 2;
        this.maxHealth = 50;
        this.health = this.maxHealth;
        this.speed = 1;
    }
}

for (let i = 0; i < 250; i++) {
    const cat = new Cat();
    cat.position.x = rand(-world.width / 2, world.height / 2);
    cat.position.z = rand(-world.width / 2, world.height / 2);
    cat.target = cat.position.clone().add(new Vector4(rand(-10, 10), 0, rand(-10, 10), 0));
    cat.updateMatrix();
    objects.push(cat);
}

// Soldiers
class Soldier extends Unit {
    constructor() {
        super();
        this.texture = soldierTexture;
        this.transparent = true;
        this.scale.x = 1.25;
        this.scale.y = 2.5;
        this.position.y = this.scale.y / 2;

        this.maxHealth = 100;
        this.health = this.maxHealth;
        this.speed = 3;

        this.shootTimeout = 0;
    }

    update(delta) {
        super.update(delta);

        // Soldier shoot bullet
        if (performance.now() > this.shootTimeout && this.position.dist(camera.position) < 20) {
            this.shootTimeout = performance.now() + 1 * 1000;

            const bullet = new Bullet();
            bullet.enemy = true;
            bullet.position = this.position.clone();
            bullet.rotation.y = this.rotation.y - radians(180);
            bullet.updateMatrix();
            objects.push(bullet);
            shootSound.play();
        }
    }
}

for (let i = 0; i < 250; i++) {
    const soldier = new Soldier();
    soldier.position.x = rand(-world.width / 2, world.height / 2);
    soldier.position.z = rand(-world.width / 2, world.height / 2);
    soldier.target = soldier.position.clone().add(new Vector4(rand(-20, 20), 0, rand(-20, 20), 0));
    soldier.updateMatrix();
    objects.push(soldier);
}

// Bullet
class Bullet extends Box {
    constructor() {
        super();
        this.texture = blankTexture;
        this.color = { r: 0, g: 0, b: 0, a: 1 };
        this.scale.x = 0.1;
        this.scale.y = 0.1;
        this.scale.z = 0.1;
        this.deleted = false;
        this.enemy = false;
        this.stopTimeout = performance.now() + 5 * 1000;
    }

    update(delta) {
        if (this.deleted) return;

        if (performance.now() > this.stopTimeout) {
            this.deleted = true;
        }

        const update = new Vector4();
        const moveSpeed = 150;
        update.z -= moveSpeed * delta;
        update.mul(Matrix4.rotateX(this.rotation.x));
        update.mul(Matrix4.rotateY(this.rotation.y));
        this.position.add(update);
        this.updateMatrix();

        if (this.enemy) {
            if (this.position.dist(camera.position) < 5) {
                health -= rand(5, 10);
                hitSound.play();
                if (health < 0) health = 0;
                if (health == 0) {
                    alert('You died!');
                    diedSound.play();
                    window.location.href = '/2023/';
                }
            }
        } else {
            for (const unit of objects) {
                if (unit instanceof Unit) {
                    if (this.position.dist(unit.position) < unit.scale.y) {
                        unit.damage(rand(10, 20));
                        this.deleted = true;
                        break;
                    }
                }
            }
        }
    }

    render() {
        if (!this.deleted) {
            super.render();
        }
    }
}

// Health
const maxHealth = 100;
let health = maxHealth;

// Score
const scoreLabel = document.getElementById('score');
const highscoreLabel = document.getElementById('highscore');
let score = 0;
let highscore = 0;
if (localStorage.getItem('highscore') != null) {
    highscore = parseInt(localStorage.getItem('highscore'), 10);
}
function updateScore(newScore) {
    score = newScore;
    if (score > highscore) {
        highscore = score;
        localStorage.setItem('highscore', highscore)
    }
    scoreLabel.textContent = `Score: ${score.toFixed(0)}`;
    highscoreLabel.textContent = `High Score: ${highscore.toFixed(0)}`;
}

// Controls
const keys = {};
window.addEventListener('keydown', (event) => {
    keys[event.key] = true;
});
window.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});
window.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});

let gunUpTimout = 0;
let lock = false;
let yaw = 0;
let pitch = 0;
window.addEventListener('mousedown', (event) => {
    if (!lock) {
        canvas.requestPointerLock();
    }
});
window.addEventListener('mouseup', (event) => {
    if (lock) {
        gunUpTimout = performance.now() + 50;
        const bullet = new Bullet();
        bullet.position = camera.position.clone();
        bullet.rotation.x = camera.rotation.x;
        bullet.rotation.y = camera.rotation.y;
        bullet.updateMatrix();
        objects.push(bullet);
        shootSound.play();
    }
})

document.addEventListener('pointerlockchange', function () {
    lock = document.pointerLockElement == canvas;
});

window.addEventListener('mousemove', (event) => {
    if (lock) {
        yaw -= event.movementX * 0.004;
        pitch -= event.movementY * 0.004;
        if (pitch > radians(90)) pitch = radians(90);
        if (pitch < -radians(90)) pitch = -radians(90);

        camera.rotation.x = -pitch;
        camera.rotation.y = -yaw;
        camera.updateMatrix();
    }
});

// Update
function update(delta) {
    // Controls
    if (keys['w'] || keys['a'] || keys['d'] || keys['s'] || keys[' '] || keys['Shift']) {
        const update = new Vector4();
        const moveSpeed = camera.position.y == 2 ? 20 : 75;
        if (keys['w']) update.z -= moveSpeed * delta;
        if (keys['s']) update.z += moveSpeed * delta;
        if (keys['a']) update.x -= moveSpeed * delta;
        if (keys['d']) update.x += moveSpeed * delta;
        if (DEBUG) {
            if (keys[' ']) update.y += moveSpeed * delta;
            if (keys['Shift']) update.y -= moveSpeed * delta;
        }
        update.mul(Matrix4.rotateY(camera.rotation.y));
        camera.position.add(update);
        if (camera.position.x < -world.width / 2) camera.position.x = -world.width / 2;
        if (camera.position.x > world.width / 2) camera.position.x = world.width / 2;
        if (camera.position.y < 2) camera.position.y = 2;
        if (camera.position.z < -world.height / 2) camera.position.z = -world.height / 2;
        if (camera.position.z > world.height / 2) camera.position.z = world.height / 2;
        camera.updateMatrix();
    }

    // Update objects
    for (const object of objects) {
        object.update(delta);
    }

    // Sort objects
    sortObjects();

    // Increase score
    updateScore(score + 10 * delta);
}

// Render
function render() {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(146 / 255, 226 / 255, 251 / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniformMatrix4fv(cameraUniform, false, camera.matrix.elements);
    gl.enable(gl.DEPTH_TEST);

    // Draw ground
    ground.render();

    // Draw objects
    for (const object of objects) {
        object.render();
    }

    // Draw HUD
    gl.disable(gl.DEPTH_TEST);
    gl.uniformMatrix4fv(cameraUniform, false, Matrix4.flat(window.innerWidth, window.innerHeight).elements);
    vertexArrayExtension.bindVertexArrayOES(planeVertexArray);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform2f(textureRepeatUniform, 1, 1);

    if (lock) {
        // Draw crosshair
        gl.bindTexture(gl.TEXTURE_2D, blankTexture);
        gl.uniformMatrix4fv(matrixUniform, false, Matrix4.rect((window.innerWidth - 32) / 2, (window.innerHeight - 4) / 2, 32, 4).elements);
        gl.uniform4f(colorUniform, 1, 1, 1, 0.9);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.uniformMatrix4fv(matrixUniform, false, Matrix4.rect((window.innerWidth - 4) / 2, (window.innerHeight - 32) / 2, 4, 32).elements);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Draw gun
        const gunSize = window.innerWidth >= 1024 ? 512 : 256;
        gl.bindTexture(gl.TEXTURE_2D, gunTexture);
        if (performance.now() < gunUpTimout) {
            gl.uniformMatrix4fv(matrixUniform, false, Matrix4.rect((window.innerWidth - gunSize * 0.6) / 2, window.innerHeight - gunSize * 0.6, gunSize, gunSize * 0.6).elements);
        } else {
            gl.uniformMatrix4fv(matrixUniform, false, Matrix4.rect((window.innerWidth - gunSize * 0.6) / 2, window.innerHeight - gunSize * 0.5, gunSize, gunSize * 0.5).elements);
        }
        gl.uniform4f(colorUniform, 1, 1, 1, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Draw health bar
        const healthbarSize = window.innerWidth >= 1024 ? 256 : 128;
        // Red part
        gl.bindTexture(gl.TEXTURE_2D, blankTexture);
        gl.uniformMatrix4fv(matrixUniform, false, Matrix4.rect(32, window.innerHeight - 16 - 32, healthbarSize, 16).elements);
        gl.uniform4f(colorUniform, 1, 0, 0, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

        // Green part
        gl.uniformMatrix4fv(matrixUniform, false, Matrix4.rect(32, window.innerHeight - 16 - 32, health / maxHealth * healthbarSize, 16).elements);
        gl.uniform4f(colorUniform, 0, 1, 0, 1);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    } else {
        // Draw overlay
        gl.bindTexture(gl.TEXTURE_2D, blankTexture);
        gl.uniformMatrix4fv(matrixUniform, false, Matrix4.rect(0, 0, window.innerWidth, window.innerHeight).elements);
        gl.uniform4f(colorUniform, 0, 0, 0, 0.5);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    gl.disable(gl.BLEND);
}

let lastTime = performance.now();
function loop() {
    window.requestAnimationFrame(loop);
    stats.begin();
    const time = performance.now();
    update((time - lastTime) / 1000);
    lastTime = time;
    render();
    stats.end();
}
loop();
