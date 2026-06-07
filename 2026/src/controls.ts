/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';

const MOVE_SPEED = 8;
const BOOST_MULTIPLIER = 3;
const MOUSE_SENSITIVITY = 0.002;
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const PLAYER_HEIGHT = 1.7;
const GRAVITY = -22;
const JUMP_VELOCITY = 9;
const LS_KEY = 'wildwest_cam';

export class FPSControls {
    private camera: THREE.PerspectiveCamera;
    private domElement: HTMLElement;
    private terrainMesh: THREE.Mesh;
    private locked = false;
    private keys = new Set<string>();
    private yaw = 0;
    private pitch = 0;
    private verticalVel = 0;
    private grounded = true;
    private downRay = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0));

    constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, terrainMesh: THREE.Mesh) {
        this.camera = camera;
        this.domElement = domElement;
        this.terrainMesh = terrainMesh;
        this.loadFromStorage();
        this.bindEvents();
    }

    private groundY(x: number, z: number): number {
        this.downRay.ray.origin.set(x, 1000, z);
        const hits = this.downRay.intersectObject(this.terrainMesh);
        return hits.length > 0 ? hits[0]!.point.y : 0;
    }

    private loadFromStorage(): void {
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (!raw) return;
            const s = JSON.parse(raw) as { x: number; y: number; z: number; yaw: number; pitch: number };
            this.camera.position.set(s.x, s.y, s.z);
            this.yaw = s.yaw;
            this.pitch = s.pitch;
            this.applyRotation();
        } catch {
            /* ignore */
        }
    }

    private saveToStorage(): void {
        localStorage.setItem(
            LS_KEY,
            JSON.stringify({
                x: this.camera.position.x,
                y: this.camera.position.y,
                z: this.camera.position.z,
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
            this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
            this.applyRotation();
        });
        document.addEventListener('keydown', (e: KeyboardEvent) => {
            this.keys.add(e.code);
            if (e.code === 'Space' && this.grounded && this.locked) {
                this.verticalVel = JUMP_VELOCITY;
                this.grounded = false;
            }
        });
        document.addEventListener('keyup', (e: KeyboardEvent) => {
            this.keys.delete(e.code);
        });
    }

    private applyRotation(): void {
        const qYaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
        const qPitch = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), this.pitch);
        this.camera.quaternion.copy(qYaw).multiply(qPitch);
    }

    update(delta: number): void {
        if (!this.locked) return;
        const boost = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');
        const speed = MOVE_SPEED * (boost ? BOOST_MULTIPLIER : 1) * delta;

        // Horizontal movement on XZ plane
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        if (this.keys.has('KeyW')) this.camera.position.addScaledVector(forward, speed);
        if (this.keys.has('KeyS')) this.camera.position.addScaledVector(forward, -speed);
        if (this.keys.has('KeyA')) this.camera.position.addScaledVector(right, -speed);
        if (this.keys.has('KeyD')) this.camera.position.addScaledVector(right, speed);

        // Vertical: gravity + jump
        this.verticalVel += GRAVITY * delta;
        this.camera.position.y += this.verticalVel * delta;

        // Ground collision
        const ground = this.groundY(this.camera.position.x, this.camera.position.z) + PLAYER_HEIGHT;
        if (this.camera.position.y <= ground) {
            this.camera.position.y = ground;
            this.verticalVel = 0;
            this.grounded = true;
        } else {
            this.grounded = false;
        }

        this.saveToStorage();
    }

    isLocked(): boolean {
        return this.locked;
    }
}
