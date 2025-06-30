/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

export class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }

    equals(otherPoint: Point): boolean {
        return this.x === otherPoint.x && this.y === otherPoint.y;
    }

    distanceTo(otherPoint: Point): number {
        return Math.sqrt((this.x - otherPoint.x) ** 2 + (this.y - otherPoint.y) ** 2);
    }
}

export class Rect {
    x: number;
    y: number;
    width: number;
    height: number;

    constructor(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }

    contains(point: Point): boolean {
        return (
            point.x >= this.x && point.x <= this.x + this.width && point.y >= this.y && point.y <= this.y + this.height
        );
    }

    intersects(otherRect: Rect): boolean {
        return !(
            otherRect.x > this.x + this.width ||
            otherRect.x + otherRect.width < this.x ||
            otherRect.y > this.y + this.height ||
            otherRect.y + otherRect.height < this.y
        );
    }
}

export class Random {
    seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        const x = Math.sin(this.seed++) * 10000;
        return x - Math.floor(x);
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() * (max - min + 1)) + min;
    }
}
