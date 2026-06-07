/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

export interface CubeComponent {
    type: 'cube';
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number, number];
    texture: string;
    transparent: boolean;
}

export interface BillboardComponent {
    type: 'billboard';
    position: [number, number, number];
    size: [number, number];
    texture: string;
    transparent: boolean;
}

export interface PlaneComponent {
    type: 'plane';
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number];
    texture: string;
    transparent: boolean;
}

export interface CylinderComponent {
    type: 'cylinder';
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number, number]; // XYZ scale of unit cylinder (diameter=1, height=1)
    texture: string;
    transparent: boolean;
}

export interface SphereComponent {
    type: 'sphere';
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number, number]; // XYZ scale of unit sphere (diameter=1)
    texture: string;
    transparent: boolean;
}

export interface SpriteComponent {
    type: 'sprite';
    position: [number, number, number];
    size: [number, number]; // width, height
    texture: string;
    transparent: boolean;
}

export type Component =
    | CubeComponent
    | BillboardComponent
    | PlaneComponent
    | CylinderComponent
    | SphereComponent
    | SpriteComponent;

export interface ObjectDef {
    id: string;
    name: string;
    components: Component[];
}

export interface ObjectInstance {
    id: string;
    defId: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
}

export interface TerrainLayer {
    name: string;
    texture: string;
    repeat: number;
}

export interface Terrain {
    width: number;
    depth: number;
    cellSize: number;
    heights: number[];
    texture: string;
    layers: TerrainLayer[];
    layerWeights: number[][];
}

export interface Sky {
    color: string;
    texture: string | null;
}

export interface Light {
    ambientColor: string;
    ambientIntensity: number;
    sunColor: string;
    sunIntensity: number;
    sunPosition: [number, number, number];
    shadows: boolean;
}

export interface GameMap {
    name: string;
    sky: Sky;
    light: Light;
    terrain: Terrain;
    objectDefs: ObjectDef[];
    objects: ObjectInstance[];
}
