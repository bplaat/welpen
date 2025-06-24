/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { Point, Rect } from './math.js';
import { DEBUG, setDebug, resetState, saveState } from './game.js';

export class Label {
    constructor(text, x = 0, y = 0, width = 0, height = 0, font = '16px Arial', textColor = '#fff') {
        this.rect = new Rect(x, y, width, height);
        this.text = text;
        this.font = font;
        this.textColor = textColor;
    }

    render(ctx) {
        ctx.fillStyle = this.textColor;
        ctx.font = this.font;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.text, this.rect.x + this.rect.width / 2, this.rect.y + this.rect.height / 2);
    }
}

export class Button extends Label {
    constructor(text, onClick, x = 0, y = 0, width = 0, height = 0, font = '16px Arial', textColor = '#fff') {
        super(text, x, y, width, height, font, textColor);
        this.clickStarted = false;
        this.hovered = false;
        this.onClick = onClick;
    }

    onMouseDown(event) {
        const point = new Point(event.clientX, event.clientY);
        if (this.rect.contains(point)) {
            this.clickStarted = true;
            return true;
        }
        return false;
    }

    onMouseMove(event) {
        const point = new Point(event.clientX, event.clientY);
        if (this.rect.contains(point)) {
            this.hovered = true;
            return true;
        }
        this.hovered = false;
        return false;
    }

    onMouseUp(event) {
        const point = new Point(event.clientX, event.clientY);
        if (this.clickStarted && this.rect.contains(point)) {
            this.clickStarted = false;
            this.onClick();
            return true;
        }
        return false;
    }

    render(ctx) {
        ctx.fillStyle = this.hovered ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);

        super.render(ctx);

        ctx.strokeStyle = this.clickStarted ? '#fff' : '#aaa';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.rect.x, this.rect.y, this.rect.width, this.rect.height);
    }
}

export class Menu {
    constructor() {
        this.visible = false;
        this.elements = [
            new Label('Welpen Game 2024: Ridders', 0, 0, 0, 0, '32px Arial'),
            new Button('Play Ridders', () => this.hide()),
            new Button('Save map', () => saveState()),
            new Button(DEBUG ? 'Disable debug' : 'Enable debug', function () {
                setDebug(!DEBUG);
                this.text = DEBUG ? 'Disable debug' : 'Enable debug';
            }),
            new Button('Reset map', () => {
                resetState();
                this.hide();
            }),
            new Label('Made by Bagheera', 0, 0, 0, 0, 'italic 16px Arial'),
        ];
        this.onResize();
    }

    show() {
        this.visible = true;
    }

    hide() {
        this.visible = false;
    }

    onResize() {
        const elementWidth = 300;
        const elementHeight = 64;
        const spacing = 32;
        const centerX = window.innerWidth / 2 - elementWidth / 2;
        const centerY = window.innerHeight / 2 - (this.elements.length * (elementHeight + spacing) - spacing) / 2;
        for (let i = 0; i < this.elements.length; i++) {
            const element = this.elements[i];
            element.rect.x = centerX;
            element.rect.y = centerY + i * (elementHeight + spacing);
            element.rect.width = elementWidth;
            element.rect.height = elementHeight;
        }
    }

    onMouseDown(event) {
        if (!this.visible) return false;
        for (const element of this.elements) {
            if (element instanceof Button && element.onMouseDown(event)) {
                return true;
            }
        }
        return true;
    }

    onMouseMove(event) {
        if (!this.visible) return false;
        for (const element of this.elements) {
            if (element instanceof Button && element.onMouseMove(event)) {
                return true;
            }
        }
        return true;
    }

    onMouseUp(event) {
        if (!this.visible) return false;
        for (const element of this.elements) {
            if (element instanceof Button && element.onMouseUp(event)) {
                return true;
            }
        }
        this.hide();
        return true;
    }

    render(ctx) {
        if (!this.visible) return;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

        for (const element of this.elements) {
            element.render(ctx);
        }
    }
}
