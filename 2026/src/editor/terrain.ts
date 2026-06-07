/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';
import type { ObjectInstance, Terrain } from '../types.ts';
import { getTerrainY, updateTerrainGeometry } from '../renderer.ts';

const RAISE_SPEED = 3;
const SNAP_THRESHOLD = 0.4; // snap if instance Y is within this many units of terrain Y

export class TerrainEditor {
    private terrain: Terrain;
    private terrainMesh: THREE.Mesh;
    private raycaster = new THREE.Raycaster();
    private brushIndicator: THREE.Mesh;

    constructor(terrain: Terrain, terrainMesh: THREE.Mesh, scene: THREE.Scene) {
        this.terrain = terrain;
        this.terrainMesh = terrainMesh;

        const geo = new THREE.CircleGeometry(1, 32);
        geo.rotateX(-Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            side: THREE.DoubleSide,
        });
        this.brushIndicator = new THREE.Mesh(geo, mat);
        this.brushIndicator.visible = false;
        this.brushIndicator.renderOrder = 1;
        scene.add(this.brushIndicator);
    }

    setMesh(mesh: THREE.Mesh, terrain: Terrain): void {
        this.terrainMesh = mesh;
        this.terrain = terrain;
    }

    showBrush(show: boolean): void {
        this.brushIndicator.visible = show;
    }

    onMouseMove(
        e: MouseEvent,
        camera: THREE.PerspectiveCamera,
        canvas: HTMLCanvasElement,
        brushSize: number
    ): THREE.Vector3 | null {
        const rect = canvas.getBoundingClientRect();
        const ndc = new THREE.Vector2(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            -((e.clientY - rect.top) / rect.height) * 2 + 1
        );
        this.raycaster.setFromCamera(ndc, camera);
        const hits = this.raycaster.intersectObject(this.terrainMesh);
        if (hits.length === 0) {
            this.brushIndicator.visible = false;
            return null;
        }
        const pt = hits[0]!.point;
        this.brushIndicator.position.set(pt.x, pt.y + 0.05, pt.z);
        this.brushIndicator.scale.set(brushSize, 1, brushSize);
        this.brushIndicator.visible = true;
        return pt;
    }

    applyBrush(
        hitPoint: THREE.Vector3,
        raise: boolean,
        brushSize: number,
        delta: number,
        instances: ObjectInstance[],
        objectGroups: Map<string, THREE.Group>
    ): void {
        const { width, depth, cellSize, heights } = this.terrain;
        const halfW = ((width - 1) * cellSize) / 2;
        const halfD = ((depth - 1) * cellSize) / 2;
        const speed = (raise ? RAISE_SPEED : -RAISE_SPEED) * delta;

        for (let z = 0; z < depth; z++) {
            for (let x = 0; x < width; x++) {
                const wx = x * cellSize - halfW;
                const wz = z * cellSize - halfD;
                const dist = Math.sqrt((wx - hitPoint.x) ** 2 + (wz - hitPoint.z) ** 2);
                if (dist < brushSize) {
                    heights[z * width + x]! += speed * (1 - dist / brushSize);
                }
            }
        }
        updateTerrainGeometry(this.terrainMesh, this.terrain);

        // Snap nearby grounded objects to new terrain height
        for (const inst of instances) {
            const [ix, iy, iz] = inst.position;
            const terrainY = getTerrainY(this.terrain, ix, iz);
            if (Math.abs(iy - terrainY) <= SNAP_THRESHOLD) {
                inst.position[1] = terrainY;
                const group = objectGroups.get(inst.id);
                if (group) group.position.y = terrainY;
            }
        }
    }

    dispose(): void {
        this.brushIndicator.removeFromParent();
        this.brushIndicator.geometry.dispose();
    }
}
