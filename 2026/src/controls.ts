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
const RUN_SPEED = 9;
const MOUSE_SENSITIVITY = 0.002;
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
    private facingYaw = 0;
    private targetFacingYaw = 0;

    constructor(
        camera: THREE.PerspectiveCamera,
        domElement: HTMLElement,
        terrain: Terrain,
        character: CharacterController,
    ) {
        this.camera = camera;
        this.domElement = domElement;
        this.terrain = terrain;
        this.character = character;
        this.loadFromStorage();
        // Snap player to terrain on startup
        this.playerPos.y = getTerrainY(this.terrain, this.playerPos.x, this.playerPos.z) + PLAYER_HEIGHT;
        this.facingYaw = this.yaw;
        this.targetFacingYaw = this.yaw;
        this.bindEvents();
        // When jump animation finishes, return to idle/walk/run
        this.character.onJumpFinished = () => {
            this.jumping = false;
        };
        this.updateCamera();
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return;
            const s = JSON.parse(raw) as { x: number; z: number; yaw: number; pitch: number };
            this.playerPos.x = s.x;
            this.playerPos.z = s.z;
            this.yaw = s.yaw;
            this.pitch = s.pitch;
        } catch {
            /* ignore */
        }
    }

    private saveToStorage(): void {
        localStorage.setItem(
            LS_KEY,
            JSON.stringify({
                x: this.playerPos.x,
                z: this.playerPos.z,
                yaw: this.yaw,
                pitch: this.pitch,
            }),
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
            if (e.code === 'Space' && this.grounded && this.locked) {
                this.verticalVel = JUMP_VELOCITY;
                this.grounded = false;
                this.jumping = true;
                // Speed jump playback up so the animation reaches the apex sooner.
                this.character.setState('jump', (JUMP_VELOCITY / Math.abs(GRAVITY)) * 1.25);
            }
        });
        document.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys.delete(e.code);
        });
    }

    private updateCamera(): void {
        const groundY = getTerrainY(this.terrain, this.playerPos.x, this.playerPos.z);
        // Character feet follow the actual player Y (rises during jump)
        const feetY = this.playerPos.y - PLAYER_HEIGHT;
        // Camera pivot tracks the player center with a height offset
        const pivotY = this.playerPos.y + CAMERA_HEIGHT_OFFSET;

        // Orbit camera behind player
        const camX = this.playerPos.x + Math.sin(this.yaw) * CAMERA_DISTANCE * Math.cos(this.pitch);
        const camY = pivotY + Math.sin(this.pitch) * CAMERA_DISTANCE;
        const camZ = this.playerPos.z + Math.cos(this.yaw) * CAMERA_DISTANCE * Math.cos(this.pitch);

        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(this.playerPos.x, pivotY, this.playerPos.z);

        // Character group sits at feet position
        this.character.group.position.set(this.playerPos.x, feetY, this.playerPos.z);
        this.character.group.rotation.y = this.facingYaw;

        // Prevent character from sinking below terrain (clamp feet to ground)
        if (feetY < groundY) {
            this.character.group.position.y = groundY;
        }
    }

    update(delta: number): void {
        if (!this.locked) {
            this.character.update(delta);
            this.updateCamera();
            return;
        }

        const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
        const movingW = this.keys.has('KeyW');
        const movingS = this.keys.has('KeyS');
        const movingA = this.keys.has('KeyA');
        const movingD = this.keys.has('KeyD');
        const moving = movingW || movingS || movingA || movingD;

        if (moving) {
            const speed = (boost ? RUN_SPEED : WALK_SPEED) * delta;
            const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
            const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

            const moveDir = new THREE.Vector3();
            if (movingW) moveDir.addScaledVector(forward, 1);
            if (movingS) moveDir.addScaledVector(forward, -1);
            if (movingA) moveDir.addScaledVector(right, -1);
            if (movingD) moveDir.addScaledVector(right, 1);

            if (moveDir.lengthSq() > 0) {
                moveDir.normalize();
                this.playerPos.x += moveDir.x * speed;
                this.playerPos.z += moveDir.z * speed;
                this.targetFacingYaw = Math.atan2(moveDir.x, moveDir.z);
            }

            if (!this.jumping) this.character.setState(boost ? 'run' : 'walk');
        } else {
            if (!this.jumping) this.character.setState('idle');
        }

        // Vertical: gravity + jump
        this.prevVerticalVel = this.verticalVel;
        this.verticalVel += GRAVITY * delta;
        this.playerPos.y += this.verticalVel * delta;

        // Detect arc peak: was going up, now going down -> reverse jump animation
        if (this.jumping && this.prevVerticalVel > 0 && this.verticalVel <= 0) {
            this.character.reverseJump();
        }

        this.facingYaw += shortestAngleDelta(this.facingYaw, this.targetFacingYaw) * Math.min(1, TURN_SPEED * delta);

        // Ground collision
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

    isLocked(): boolean {
        return this.locked;
    }
}
