import { Rect, Point } from './math.js';

export default class Minimap {
    SIZE = 256;
    PADDING = 8;

    constructor(map, units, camera) {
        this.map = map;
        this.units = units;
        this.camera = camera;
        this.mouseDown = false;
        this.update();

        this.rect = new Rect(
            0,
            window.innerHeight - (this.SIZE + this.PADDING * 2),
            this.SIZE + this.PADDING * 2,
            this.SIZE + this.PADDING * 2
        );
        this.minimapRect = new Rect(
            this.rect.x + this.PADDING,
            this.rect.y + this.PADDING,
            this.rect.width - this.PADDING * 2,
            this.rect.height - this.PADDING * 2
        );
    }

    update() {
        this.minimap = new Uint32Array(this.map.width * this.map.height);

        // Mark tiles
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                if (this.map.explored[y * this.map.width + x] === 0) {
                    this.minimap[y * this.map.width + x] = 0x222222;
                } else {
                    const tile = this.map.tiles[y * this.map.width + x];
                    if (tile === 0 || tile === 1) this.minimap[y * this.map.width + x] = 0xa6e1f5;
                    if (tile === 2 || tile === 3) this.minimap[y * this.map.width + x] = 0xecdcb8;
                    if (tile === 4 || tile === 5) this.minimap[y * this.map.width + x] = 0x27ae60;
                }
            }
        }

        // Mark resource units
        for (const unit of this.units) {
            const index = Math.floor(unit.y) * this.map.width + Math.floor(unit.x);
            if (this.map.explored[index] === 1) {
                if (unit.type === 'tree1' || unit.type === 'tree2') {
                    this.minimap[index] = 0x198a49;
                }
                if (unit.type === 'bushes') {
                    this.minimap[index] = 0xd2704c;
                }
                if (unit.type === 'stone') {
                    this.minimap[index] = 0x9ba6a6;
                }
                if (unit.type === 'gold') {
                    this.minimap[index] = 0xffdf99;
                }
            }
        }

        // Mark player units
        for (const unit of this.units) {
            const index = Math.floor(unit.y) * this.map.width + Math.floor(unit.x);
            if (this.map.sight[index] === 1) {
                if (unit.player.name === 'Player') {
                    this.minimap[index] = 0x157da8;
                }
                if (unit.player.name === 'Enemy') {
                    this.minimap[index] = 0xa6583c;
                }
            }
        }
    }

    onMouseDown(event) {
        if (this.rect.contains(new Point(event.clientX, event.clientY))) {
            this.mouseDown = true;
            this.camera.x = ((event.clientX - this.minimapRect.x) / this.minimapRect.width) * this.map.width;
            this.camera.y = ((event.clientY - this.minimapRect.y) / this.minimapRect.height) * this.map.height;
            return true;
        }
        return false;
    }

    onMouseMove(event) {
        if (this.rect.contains(new Point(event.clientX, event.clientY))) {
            if (this.mouseDown) {
                this.camera.x = ((event.clientX - this.minimapRect.x) / this.minimapRect.width) * this.map.width;
                this.camera.y = ((event.clientY - this.minimapRect.y) / this.minimapRect.height) * this.map.height;
            }
            return true;
        }
        return false;
    }

    onMouseUp(event) {
        if (this.rect.contains(new Point(event.clientX, event.clientY))) {
            this.mouseDown = false;
            return true;
        }
        return false;
    }

    render(ctx) {
        // Render background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        // Render minimap
        for (let y = 0; y < this.map.height; y++) {
            for (let x = 0; x < this.map.width; x++) {
                ctx.fillStyle = `#${this.minimap[y * this.map.width + x].toString(16).padStart(6, '0')}`;
                ctx.fillRect(
                    this.minimapRect.x + x * (this.SIZE / this.map.width),
                    this.minimapRect.y + y * (this.SIZE / this.map.height),
                    this.SIZE / this.map.width,
                    this.SIZE / this.map.height
                );
                if (this.map.sight[y * this.map.width + x] === 0) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
                    ctx.fillRect(
                        this.minimapRect.x + x * (this.SIZE / this.map.width),
                        this.minimapRect.y + y * (this.SIZE / this.map.height),
                        this.SIZE / this.map.width,
                        this.SIZE / this.map.height
                    );
                }
            }
        }

        // Render viewport
        const viewport = new Rect(
            this.minimapRect.x +
                ((this.camera.x - window.innerWidth / (2 * this.camera.tileSize)) / this.map.width) * this.SIZE,
            this.minimapRect.y +
                ((this.camera.y - window.innerHeight / (2 * this.camera.tileSize)) / this.map.height) * this.SIZE,
            (window.innerWidth / (this.camera.tileSize * this.map.width)) * this.SIZE,
            (window.innerHeight / (this.camera.tileSize * this.map.height)) * this.SIZE
        );
        ctx.lineWidth = 1;
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.minimapRect.x, this.minimapRect.y, this.minimapRect.width, this.minimapRect.height);
        ctx.clip();
        ctx.strokeStyle = '#777';
        ctx.strokeRect(viewport.x + 1, viewport.y + 1, viewport.width, viewport.height);
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(viewport.x, viewport.y, viewport.width, viewport.height);
        ctx.restore();
    }
}
