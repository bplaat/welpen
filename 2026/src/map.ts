/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import type {
    GameMap,
    Component,
    CubeComponent,
    BillboardComponent,
    PlaneComponent,
    CylinderComponent,
    SphereComponent,
    SpriteComponent,
    FbxModelComponent,
    ObjectDef,
    ObjectInstance,
    TerrainLayer,
    Region,
    Terrain,
} from './types.ts';
import {
    World,
    type Component as ProtoComponent,
    type ObjectDef as ProtoObjectDef,
    type ObjectInstance as ProtoObjectInstance,
    type TerrainLayer as ProtoTerrainLayer,
    type Region as ProtoRegion,
    type Terrain as ProtoTerrain,
    type Vec2,
    type Vec3,
    type FbxModelComponent as ProtoFbxModelComponent,
} from '../src-gen/map.ts';

const MAP_FILE = 'data/map/map.bin';

// ---- UUID helpers ----

function bytesToUuid(bytes: Uint8Array): string {
    const hex = Array.from(bytes, (v) => v.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uuidToBytes(uuid: string): Uint8Array {
    const hex = uuid.replace(/-/g, '');
    const bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    return bytes;
}

// ---- Vec helpers ----

function v3(v: Vec3 | undefined): [number, number, number] {
    return [v?.x ?? 0, v?.y ?? 0, v?.z ?? 0];
}

function v2(v: Vec2 | undefined): [number, number] {
    return [v?.x ?? 0, v?.y ?? 0];
}

function toV3(v: [number, number, number]): Vec3 {
    return { x: v[0], y: v[1], z: v[2] };
}

function toV2(v: [number, number]): Vec2 {
    return { x: v[0], y: v[1] };
}

// ---- Terrain encoding ----

const HEIGHT_SCALE = 100;

function decodeHeights(bytes: Uint8Array): number[] {
    const buf = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    return Array.from(new Int16Array(buf), (v) => v / HEIGHT_SCALE);
}

function encodeHeights(heights: number[]): Uint8Array {
    return new Uint8Array(new Int16Array(heights.map((v) => Math.round(v * HEIGHT_SCALE))).buffer);
}

function decodeLayerWeights(layers: Uint8Array[]): number[][] {
    return layers.map((w) => Array.from(w).map((v) => v / 255));
}

function encodeLayerWeights(weights: number[][]): Uint8Array[] {
    return weights.map((w) => new Uint8Array(w.map((v) => Math.round(v * 255))));
}

// ---- Component conversion ----

function protoToComponent(c: ProtoComponent): Component {
    if (c.cube) {
        return {
            type: 'cube',
            position: v3(c.cube.position),
            rotation: v3(c.cube.rotation),
            scale: v3(c.cube.scale),
            texture: c.cube.texture,
            transparent: c.cube.transparent,
            repeatX: c.cube.repeatX || 1,
            repeatY: c.cube.repeatY || 1,
        } satisfies CubeComponent;
    }
    if (c.billboard) {
        return {
            type: 'billboard',
            position: v3(c.billboard.position),
            scale: v2(c.billboard.scale),
            texture: c.billboard.texture,
            transparent: c.billboard.transparent,
            repeatX: c.billboard.repeatX || 1,
            repeatY: c.billboard.repeatY || 1,
        } satisfies BillboardComponent;
    }
    if (c.plane) {
        return {
            type: 'plane',
            position: v3(c.plane.position),
            rotation: v3(c.plane.rotation),
            scale: v2(c.plane.scale),
            texture: c.plane.texture,
            transparent: c.plane.transparent,
            repeatX: c.plane.repeatX || 1,
            repeatY: c.plane.repeatY || 1,
        } satisfies PlaneComponent;
    }
    if (c.cylinder) {
        return {
            type: 'cylinder',
            position: v3(c.cylinder.position),
            rotation: v3(c.cylinder.rotation),
            scale: v3(c.cylinder.scale),
            texture: c.cylinder.texture,
            transparent: c.cylinder.transparent,
            repeatX: c.cylinder.repeatX || 1,
            repeatY: c.cylinder.repeatY || 1,
        } satisfies CylinderComponent;
    }
    if (c.sphere) {
        return {
            type: 'sphere',
            position: v3(c.sphere.position),
            rotation: v3(c.sphere.rotation),
            scale: v3(c.sphere.scale),
            texture: c.sphere.texture,
            transparent: c.sphere.transparent,
            repeatX: c.sphere.repeatX || 1,
            repeatY: c.sphere.repeatY || 1,
        } satisfies SphereComponent;
    }
    if (c.sprite) {
        return {
            type: 'sprite',
            position: v3(c.sprite.position),
            scale: v2(c.sprite.scale),
            texture: c.sprite.texture,
            transparent: c.sprite.transparent,
            repeatX: c.sprite.repeatX || 1,
            repeatY: c.sprite.repeatY || 1,
        } satisfies SpriteComponent;
    }
    if (c.fbxModel) {
        return {
            type: 'fbx',
            position: v3(c.fbxModel.position),
            rotation: v3(c.fbxModel.rotation),
            scale: v3(c.fbxModel.scale),
            model: c.fbxModel.model,
            texture: c.fbxModel.texture,
            repeatX: c.fbxModel.repeatX || 1,
            repeatY: c.fbxModel.repeatY || 1,
        } satisfies FbxModelComponent;
    }
    throw new Error('Unknown component kind in proto message');
}

function componentToProto(c: Component): ProtoComponent {
    if (c.type === 'cube') {
        return {
            cube: {
                position: toV3(c.position),
                rotation: toV3(c.rotation),
                scale: toV3(c.scale),
                texture: c.texture,
                transparent: c.transparent,
                repeatX: c.repeatX !== 1 ? c.repeatX : 0,
                repeatY: c.repeatY !== 1 ? c.repeatY : 0,
            },
        };
    }
    if (c.type === 'billboard') {
        return {
            billboard: {
                position: toV3(c.position),
                scale: toV2(c.scale),
                texture: c.texture,
                transparent: c.transparent,
                repeatX: c.repeatX !== 1 ? c.repeatX : 0,
                repeatY: c.repeatY !== 1 ? c.repeatY : 0,
            },
        };
    }
    if (c.type === 'plane') {
        return {
            plane: {
                position: toV3(c.position),
                rotation: toV3(c.rotation),
                scale: toV2(c.scale),
                texture: c.texture,
                transparent: c.transparent,
                repeatX: c.repeatX !== 1 ? c.repeatX : 0,
                repeatY: c.repeatY !== 1 ? c.repeatY : 0,
            },
        };
    }
    if (c.type === 'cylinder') {
        return {
            cylinder: {
                position: toV3(c.position),
                rotation: toV3(c.rotation),
                scale: toV3(c.scale),
                texture: c.texture,
                transparent: c.transparent,
                repeatX: c.repeatX !== 1 ? c.repeatX : 0,
                repeatY: c.repeatY !== 1 ? c.repeatY : 0,
            },
        };
    }
    if (c.type === 'sphere') {
        return {
            sphere: {
                position: toV3(c.position),
                rotation: toV3(c.rotation),
                scale: toV3(c.scale),
                texture: c.texture,
                transparent: c.transparent,
                repeatX: c.repeatX !== 1 ? c.repeatX : 0,
                repeatY: c.repeatY !== 1 ? c.repeatY : 0,
            },
        };
    }
    if (c.type === 'sprite') {
        return {
            sprite: {
                position: toV3(c.position),
                scale: toV2(c.scale),
                texture: c.texture,
                transparent: c.transparent,
                repeatX: c.repeatX !== 1 ? c.repeatX : 0,
                repeatY: c.repeatY !== 1 ? c.repeatY : 0,
            },
        };
    }
    return {
        fbxModel: {
            position: toV3(c.position),
            rotation: toV3(c.rotation),
            scale: toV3(c.scale),
            model: c.model,
            texture: c.texture,
            repeatX: c.repeatX !== 1 ? c.repeatX : 0,
            repeatY: c.repeatY !== 1 ? c.repeatY : 0,
        } satisfies ProtoFbxModelComponent,
    };
}

// ---- Entity conversion ----

function protoToDef(d: ProtoObjectDef): ObjectDef {
    return { id: bytesToUuid(d.id), name: d.name || undefined, components: d.components.map(protoToComponent) };
}

function defToProto(d: ObjectDef): ProtoObjectDef {
    return { id: uuidToBytes(d.id), name: d.name ?? '', components: d.components.map(componentToProto) };
}

function protoToInstance(o: ProtoObjectInstance): ObjectInstance {
    const inst: ObjectInstance = {
        id: bytesToUuid(o.id),
        name: o.name || undefined,
        defId: bytesToUuid(o.defId),
        position: v3(o.position),
        rotation: v3(o.rotation),
        scale: o.scale ? v3(o.scale) : [1, 1, 1],
    };
    if (o.radius !== 0) inst.radius = o.radius;
    if (o.points.length > 0) inst.points = o.points.map(v3);
    return inst;
}

function instanceToProto(o: ObjectInstance): ProtoObjectInstance {
    const isDefaultRotation = o.rotation[0] === 0 && o.rotation[1] === 0 && o.rotation[2] === 0;
    const isDefaultScale = o.scale[0] === 1 && o.scale[1] === 1 && o.scale[2] === 1;
    return {
        id: uuidToBytes(o.id),
        name: o.name ?? '',
        defId: uuidToBytes(o.defId),
        position: toV3(o.position),
        rotation: isDefaultRotation ? undefined : toV3(o.rotation),
        scale: isDefaultScale ? undefined : toV3(o.scale),
        radius: o.radius ?? 0,
        points: o.points ? o.points.map(toV3) : [],
    };
}

function protoToTerrainLayer(l: ProtoTerrainLayer): TerrainLayer {
    return {
        id: bytesToUuid(l.id),
        name: l.name || undefined,
        texture: l.texture,
        repeatX: l.repeatX || 1,
        repeatY: l.repeatY || 1,
    };
}

function terrainLayerToProto(l: TerrainLayer): ProtoTerrainLayer {
    return {
        id: uuidToBytes(l.id),
        name: l.name ?? '',
        texture: l.texture,
        repeatX: l.repeatX !== 1 ? l.repeatX : 0,
        repeatY: l.repeatY !== 1 ? l.repeatY : 0,
    };
}

function protoToRegion(r: ProtoRegion): Region {
    return { id: bytesToUuid(r.id), name: r.name || undefined };
}

function regionToProto(r: Region): ProtoRegion {
    return { id: uuidToBytes(r.id), name: r.name ?? '' };
}

function protoToTerrain(t: ProtoTerrain): Terrain {
    return {
        width: t.width,
        depth: t.depth,
        cellSize: t.cellSize,
        heights: decodeHeights(t.heights),
        texture: t.texture,
        repeatX: t.repeatX || 1,
        repeatY: t.repeatY || 1,
        layers: t.layers.map(protoToTerrainLayer),
        layerWeights: decodeLayerWeights(t.layerWeights),
        regionMap: Array.from(t.regionMap),
    };
}

function terrainToProto(t: Terrain): ProtoTerrain {
    return {
        width: t.width,
        depth: t.depth,
        cellSize: t.cellSize,
        heights: encodeHeights(t.heights),
        texture: t.texture,
        repeatX: t.repeatX !== 1 ? t.repeatX : 0,
        repeatY: t.repeatY !== 1 ? t.repeatY : 0,
        layers: t.layers.map(terrainLayerToProto),
        layerWeights: encodeLayerWeights(t.layerWeights),
        regionMap: new Uint8Array(t.regionMap),
    };
}

// ---- Top-level conversion ----

function protoToGameMap(world: World): GameMap {
    return {
        id: bytesToUuid(world.id),
        name: world.name || undefined,
        sky: { color: world.sky?.color ?? '', texture: world.sky?.texture ?? null },
        light: {
            ambientColor: world.light?.ambientColor ?? '',
            ambientIntensity: world.light?.ambientIntensity ?? 0,
            sunColor: world.light?.sunColor ?? '',
            sunIntensity: world.light?.sunIntensity ?? 0,
            sunPosition: v3(world.light?.sunPosition),
            shadows: world.light?.shadows ?? false,
        },
        terrain: protoToTerrain(world.terrain!),
        objectDefs: world.objectDefs.map(protoToDef),
        regions: world.regions.map(protoToRegion),
        objects: world.objects.map(protoToInstance),
    };
}

function gameMapToProto(map: GameMap): World {
    return {
        id: uuidToBytes(map.id),
        name: map.name ?? '',
        sky: { color: map.sky.color, texture: map.sky.texture ?? '' },
        light: {
            ambientColor: map.light.ambientColor,
            ambientIntensity: map.light.ambientIntensity,
            sunColor: map.light.sunColor,
            sunIntensity: map.light.sunIntensity,
            sunPosition: toV3(map.light.sunPosition),
            shadows: map.light.shadows,
        },
        terrain: terrainToProto(map.terrain),
        objectDefs: map.objectDefs.map(defToProto),
        regions: map.regions.map(regionToProto),
        objects: map.objects.map(instanceToProto),
    };
}

// ---- Public API ----

function uint8ToBase64(bytes: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
    return btoa(binary);
}

export async function loadMap(): Promise<GameMap> {
    const res = await fetch(MAP_FILE);
    if (!res.ok) throw new Error(`Failed to load map: ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    return protoToGameMap(World.decode(bytes));
}

export async function saveMap(map: GameMap): Promise<void> {
    const bytes = World.encode(gameMapToProto(map)).finish();
    const res = await fetch('/api/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: MAP_FILE, content: uint8ToBase64(bytes), binary: true }),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

export async function uploadTexture(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const destPath = `data/map/textures/${file.name}`;
    const res = await fetch('/api/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: destPath, content: uint8ToBase64(bytes), binary: true }),
    });
    if (!res.ok) throw new Error('Upload failed');
    return destPath;
}

export async function uploadModel(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const destPath = `data/map/models/${file.name}`;
    const res = await fetch('/api/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: destPath, content: uint8ToBase64(bytes), binary: true }),
    });
    if (!res.ok) throw new Error('Upload failed');
    return destPath;
}
