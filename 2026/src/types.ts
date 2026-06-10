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
    id: string; // UUIDv7 string
    name?: string;
    components: Component[];
}

export interface ObjectInstance {
    id: string; // UUIDv7 string
    name?: string;
    defId: string;
    position: [number, number, number];
    rotation: [number, number, number]; // used by regular object defs
    scale: [number, number, number]; // used by regular object defs
    radius?: number; // used by BUILTIN_DEF_CIRCLE
    points?: [number, number, number][]; // used by BUILTIN_DEF_SPLINE / BUILTIN_DEF_POLYGON
}

export interface TerrainLayer {
    id: string; // UUIDv7 string
    name?: string;
    texture: string;
    repeat: number;
}

export interface Region {
    id: string; // UUIDv7 string
    name?: string;
}

export interface Terrain {
    width: number;
    depth: number;
    cellSize: number;
    heights: number[];
    texture: string;
    layers: TerrainLayer[];
    layerWeights: number[][];
    regionMap: number[];
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
    id: string; // UUIDv7 string (world ID)
    name?: string;
    sky: Sky;
    light: Light;
    terrain: Terrain;
    objectDefs: ObjectDef[];
    regions: Region[];
    objects: ObjectInstance[];
}
