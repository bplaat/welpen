/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';
import { getTerrainY } from './renderer.ts';
import type { CharacterController } from './character.ts';
import type { Terrain } from './types.ts';

const WALK_SPEED = 6;
const RUN_SPEED = 10;
const MOUSE_SENSITIVITY = 0.002;
const TOUCH_LOOK_SENSITIVITY = 0.003;
const PITCH_MIN = -0.4;
const PITCH_MAX = 0.8;
const PLAYER_HEIGHT = 1.1;
const GRAVITY = -22;
const JUMP_VELOCITY = 9;
const CAMERA_DISTANCE = 3.5;
const CAMERA_HEIGHT_OFFSET = 1;
const TURN_SPEED = 12;
const LS_KEY = 'wildwest_tps';

function shortestAngleDelta(from: number, to: number): number {
    return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export class ThirdPersonControls {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private terrain: Terrain;
    private character: CharacterController;
    private locked = false;
    private keys = new Set<string>();
    private yaw = 0;
    private pitch = 0.3;
    private verticalVel = 0;
    private grounded = true;
    private jumping = false;
    private prevVerticalVel = 0;
    private playerPos = new THREE.Vector3(0, 0, 20);
    private readonly defaultPos: THREE.Vector3;
    private facingYaw = 0;
    private targetFacingYaw = 0;

    // Touch input state
    private touchActive = false;
    private touchMoveX = 0;
    private touchMoveY = 0;
    private touchLookDX = 0;
    private touchLookDY = 0;

    // Scratch vectors to avoid per-frame allocations
    private readonly _fwd = new THREE.Vector3();
    private readonly _right = new THREE.Vector3();
    private readonly _move = new THREE.Vector3();

    constructor(
        camera: THREE.PerspectiveCamera,
        domElement: HTMLElement,
        terrain: Terrain,
        character: CharacterController,
        spawnPos?: [number, number, number]
    ) {
        this.camera = camera;
        this.domElement = domElement;
        this.terrain = terrain;
        this.character = character;
        this.defaultPos = spawnPos ? new THREE.Vector3(spawnPos[0], 0, spawnPos[2]) : new THREE.Vector3(0, 0, 20);
        this.loadFromStorage();
        this.playerPos.y = getTerrainY(this.terrain, this.playerPos.x, this.playerPos.z) + PLAYER_HEIGHT;
        this.facingYaw = this.yaw;
        this.targetFacingYaw = this.yaw;
        this.bindEvents();
        this.character.onJumpFinished = () => {
            this.jumping = false;
        };
        this.updateCamera();
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const s = JSON.parse(raw) as { x: number; z: number; yaw: number; pitch: number };
                this.playerPos.x = s.x;
                this.playerPos.z = s.z;
                this.yaw = s.yaw;
                this.pitch = s.pitch;
                return;
            }
        } catch {
            /* ignore */
        }
        this.playerPos.x = this.defaultPos.x;
        this.playerPos.z = this.defaultPos.z;
    }

    private saveToStorage(): void {
        localStorage.setItem(
            LS_KEY,
            JSON.stringify({
                x: this.playerPos.x,
                z: this.playerPos.z,
                yaw: this.yaw,
                pitch: this.pitch,
            })
        );
    }

    private bindEvents(): void {
        this.domElement.addEventListener('click', () => {
            this.domElement.requestPointerLock();
        });
        document.addEventListener('pointerlockchange', () => {
            this.locked = document.pointerLockElement === this.domElement;
        });
        document.addEventListener('mousemove', (e: MouseEvent) => {
            if (!this.locked) return;
            this.yaw -= e.movementX * MOUSE_SENSITIVITY;
            this.pitch -= e.movementY * MOUSE_SENSITIVITY;
            this.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.pitch));
        });
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            this.keys.add(e.code);
            if (e.code === 'Space' && this.grounded && this.isLocked()) {
                this.doJump();
            }
        });
        document.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys.delete(e.code);
        });
    }

    private doJump(): void {
        this.verticalVel = JUMP_VELOCITY;
        this.grounded = false;
        this.jumping = true;
        this.character.setState('jump', (JUMP_VELOCITY / Math.abs(GRAVITY)) * 1.25);
    }

    private updateCamera(): void {
        const feetY = this.playerPos.y - PLAYER_HEIGHT;
        const pivotY = this.playerPos.y + CAMERA_HEIGHT_OFFSET;
        const camX = this.playerPos.x + Math.sin(this.yaw) * CAMERA_DISTANCE * Math.cos(this.pitch);
        const camY = pivotY + Math.sin(this.pitch) * CAMERA_DISTANCE;
        const camZ = this.playerPos.z + Math.cos(this.yaw) * CAMERA_DISTANCE * Math.cos(this.pitch);
        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(this.playerPos.x, pivotY, this.playerPos.z);
        this.character.group.position.set(this.playerPos.x, feetY, this.playerPos.z);
        this.character.group.rotation.y = this.facingYaw;
        const groundY = getTerrainY(this.terrain, this.playerPos.x, this.playerPos.z);
        if (feetY < groundY) this.character.group.position.y = groundY;
    }

    // --- Public touch API ---

    activateTouch(): void {
        this.touchActive = true;
    }

    setTouchMove(x: number, y: number): void {
        this.touchMoveX = x;
        this.touchMoveY = y;
    }

    addLookDelta(dx: number, dy: number): void {
        this.touchLookDX += dx;
        this.touchLookDY += dy;
    }

    triggerJump(): void {
        if (this.grounded) this.doJump();
    }

    isLocked(): boolean {
        return this.locked || this.touchActive;
    }

    // ---

    update(delta: number): void {
        if (!this.locked && !this.touchActive) {
            this.character.update(delta);
            this.updateCamera();
            return;
        }

        // Apply accumulated touch look delta
        if (this.touchLookDX !== 0 || this.touchLookDY !== 0) {
            this.yaw -= this.touchLookDX * TOUCH_LOOK_SENSITIVITY;
            this.pitch -= this.touchLookDY * TOUCH_LOOK_SENSITIVITY;
            this.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.pitch));
            this.touchLookDX = 0;
            this.touchLookDY = 0;
        }

        // Combine keyboard + joystick input
        let fwd = this.touchMoveY;
        let strafe = this.touchMoveX;
        if (this.keys.has('KeyW')) fwd = Math.min(1, fwd + 1);
        if (this.keys.has('KeyS')) fwd = Math.max(-1, fwd - 1);
        if (this.keys.has('KeyA')) strafe = Math.max(-1, strafe - 1);
        if (this.keys.has('KeyD')) strafe = Math.min(1, strafe + 1);

        const inputLenSq = fwd * fwd + strafe * strafe;
        const moving = inputLenSq > 0.0001;

        // Auto-sprint when joystick is pushed past 75% or shift held
        const touchMag = Math.sqrt(this.touchMoveX * this.touchMoveX + this.touchMoveY * this.touchMoveY);
        const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || touchMag > 0.75;

        if (moving) {
            const inputLen = Math.sqrt(inputLenSq);
            const speed = (boost ? RUN_SPEED : WALK_SPEED) * delta;

            this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
            this._right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

            this._move.set(0, 0, 0);
            this._move.addScaledVector(this._fwd, fwd / inputLen);
            this._move.addScaledVector(this._right, strafe / inputLen);

            if (this._move.lengthSq() > 0) {
                this._move.normalize();
                this.playerPos.x += this._move.x * speed;
                this.playerPos.z += this._move.z * speed;
                this.targetFacingYaw = Math.atan2(this._move.x, this._move.z);
            }

            const halfW = ((this.terrain.width - 1) * this.terrain.cellSize) / 2;
            const halfD = ((this.terrain.depth - 1) * this.terrain.cellSize) / 2;
            this.playerPos.x = Math.max(-halfW, Math.min(halfW, this.playerPos.x));
            this.playerPos.z = Math.max(-halfD, Math.min(halfD, this.playerPos.z));

            if (!this.jumping) this.character.setState(boost ? 'run' : 'walk');
        } else {
            if (!this.jumping) this.character.setState('idle');
        }

        this.prevVerticalVel = this.verticalVel;
        this.verticalVel += GRAVITY * delta;
        this.playerPos.y += this.verticalVel * delta;

        if (this.jumping && this.prevVerticalVel > 0 && this.verticalVel <= 0) {
            this.character.reverseJump();
        }

        this.facingYaw += shortestAngleDelta(this.facingYaw, this.targetFacingYaw) * Math.min(1, TURN_SPEED * delta);

        const groundY = getTerrainY(this.terrain, this.playerPos.x, this.playerPos.z);
        const groundLevel = groundY + PLAYER_HEIGHT;
        if (this.playerPos.y <= groundLevel) {
            this.playerPos.y = groundLevel;
            this.verticalVel = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        this.character.update(delta);
        this.updateCamera();
        this.saveToStorage();
    }
}
