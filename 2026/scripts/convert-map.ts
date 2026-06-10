/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 *
 * One-time migration: converts data/map/map.json to data/map/map.bin (protobuf).
 * Run with: npx tsx scripts/convert-map.ts
 */

import { readFile, writeFile } from 'node:fs/promises';
import { randomFillSync } from 'node:crypto';
import { World } from '../src-gen/map.ts';

// ---- UUIDv7 generator ----

let lastMs = 0;
let seq = 0;

function generateId(): Uint8Array {
    let ms = Date.now();
    if (ms <= lastMs) {
        ms = lastMs;
        seq = (seq + 1) & 0xfff;
    } else {
        lastMs = ms;
        seq = 0;
    }
    const buf = new Uint8Array(16);
    const msHi = Math.floor(ms / 0x100000000);
    const msLo = ms >>> 0;
    buf[0] = (msHi >> 8) & 0xff;
    buf[1] = msHi & 0xff;
    buf[2] = (msLo >> 24) & 0xff;
    buf[3] = (msLo >> 16) & 0xff;
    buf[4] = (msLo >> 8) & 0xff;
    buf[5] = msLo & 0xff;
    buf[6] = 0x70 | ((seq >> 8) & 0x0f);
    buf[7] = seq & 0xff;
    randomFillSync(buf, 8, 8);
    buf[8] = 0x80 | (buf[8]! & 0x3f);
    return buf;
}

// ---- Types for old JSON format ----

interface OldTerrainLayer {
    name: string;
    texture: string;
    repeat: number;
}

interface OldTerrain {
    width: number;
    depth: number;
    cellSize: number;
    heights: number[];
    texture: string;
    layers: OldTerrainLayer[];
    layerWeights: number[][];
    regionMap: number[];
}

interface OldObjectDef {
    id: string;
    name: string;
    components: OldComponent[];
}

interface OldVec3 {
    x: number;
    y: number;
    z: number;
}
interface OldVec2 {
    x: number;
    y: number;
}

type OldComponent =
    | {
          type: 'cube';
          position: [number, number, number];
          rotation: [number, number, number];
          size: [number, number, number];
          texture: string;
          transparent: boolean;
      }
    | {
          type: 'billboard';
          position: [number, number, number];
          size: [number, number];
          texture: string;
          transparent: boolean;
      }
    | {
          type: 'plane';
          position: [number, number, number];
          rotation: [number, number, number];
          size: [number, number];
          texture: string;
          transparent: boolean;
      }
    | {
          type: 'cylinder';
          position: [number, number, number];
          rotation: [number, number, number];
          size: [number, number, number];
          texture: string;
          transparent: boolean;
      }
    | {
          type: 'sphere';
          position: [number, number, number];
          rotation: [number, number, number];
          size: [number, number, number];
          texture: string;
          transparent: boolean;
      }
    | {
          type: 'sprite';
          position: [number, number, number];
          size: [number, number];
          texture: string;
          transparent: boolean;
      };

interface OldRegion {
    id: string;
    name: string;
}

interface OldObjectInstance {
    id: string;
    defId: string;
    position: [number, number, number];
    rotationY?: number; // legacy single-axis rotation
    rotation?: [number, number, number];
    scale: [number, number, number];
}

interface OldGameMap {
    name: string;
    sky: { color: string; texture?: string };
    light: {
        ambientColor: string;
        ambientIntensity: number;
        sunColor: string;
        sunIntensity: number;
        sunPosition: [number, number, number];
        shadows: boolean;
    };
    terrain: OldTerrain;
    objectDefs: OldObjectDef[];
    regions: OldRegion[];
    objects: OldObjectInstance[];
}

// ---- Vec helpers ----

function v3(a: [number, number, number]): OldVec3 {
    return { x: a[0], y: a[1], z: a[2] };
}
function v2(a: [number, number]): OldVec2 {
    return { x: a[0], y: a[1] };
}

// ---- Main conversion ----

const src = new URL('../data/map/map.json', import.meta.url);
const dest = new URL('../data/map/map.bin', import.meta.url);

const map = JSON.parse(await readFile(src, 'utf-8')) as OldGameMap;

// Generate world ID
const worldId = generateId();

// Generate UUIDs for all ObjectDefs; keep map from old string ID -> new UUID bytes
const defIdMap = new Map<string, Uint8Array>();
for (const def of map.objectDefs) {
    defIdMap.set(def.id, generateId());
}

// Generate UUIDs for regions
const regionIdMap = new Map<string, Uint8Array>();
for (const region of map.regions) {
    regionIdMap.set(region.id, generateId());
}

// Encode heights as Int16Array bytes (scale 100 = 0.01 unit precision)
const HEIGHT_SCALE = 100;
const heightBytes = new Uint8Array(new Int16Array(map.terrain.heights.map((v) => Math.round(v * HEIGHT_SCALE))).buffer);

// Quantize layer weights to 0-255
const layerWeightBytes = map.terrain.layerWeights.map((w) => new Uint8Array(w.map((v) => Math.round(v * 255))));

const world: World = {
    id: worldId,
    name: map.name,
    sky: { color: map.sky.color, texture: map.sky.texture ?? '' },
    light: {
        ambientColor: map.light.ambientColor,
        ambientIntensity: map.light.ambientIntensity,
        sunColor: map.light.sunColor,
        sunIntensity: map.light.sunIntensity,
        sunPosition: v3(map.light.sunPosition),
        shadows: map.light.shadows,
    },
    terrain: {
        width: map.terrain.width,
        depth: map.terrain.depth,
        cellSize: map.terrain.cellSize,
        heights: heightBytes,
        texture: map.terrain.texture,
        layers: map.terrain.layers.map((l) => ({
            id: generateId(),
            name: l.name,
            texture: l.texture,
            repeat: l.repeat,
        })),
        layerWeights: layerWeightBytes,
        regionMap: new Uint8Array(map.terrain.regionMap),
    },
    objectDefs: map.objectDefs.map((def) => ({
        id: defIdMap.get(def.id)!,
        name: def.name,
        components: def.components.map((c) => {
            if (c.type === 'cube')
                return {
                    cube: {
                        position: v3(c.position),
                        rotation: v3(c.rotation),
                        size: v3(c.size),
                        texture: c.texture,
                        transparent: c.transparent,
                    },
                };
            if (c.type === 'billboard')
                return {
                    billboard: {
                        position: v3(c.position),
                        size: v2(c.size),
                        texture: c.texture,
                        transparent: c.transparent,
                    },
                };
            if (c.type === 'plane')
                return {
                    plane: {
                        position: v3(c.position),
                        rotation: v3(c.rotation),
                        size: v2(c.size),
                        texture: c.texture,
                        transparent: c.transparent,
                    },
                };
            if (c.type === 'cylinder')
                return {
                    cylinder: {
                        position: v3(c.position),
                        rotation: v3(c.rotation),
                        size: v3(c.size),
                        texture: c.texture,
                        transparent: c.transparent,
                    },
                };
            if (c.type === 'sphere')
                return {
                    sphere: {
                        position: v3(c.position),
                        rotation: v3(c.rotation),
                        size: v3(c.size),
                        texture: c.texture,
                        transparent: c.transparent,
                    },
                };
            return {
                sprite: { position: v3(c.position), size: v2(c.size), texture: c.texture, transparent: c.transparent },
            };
        }),
    })),
    regions: map.regions.map((r) => ({
        id: regionIdMap.get(r.id)!,
        name: r.name,
    })),
    objects: map.objects.map((o) => {
        const rot: [number, number, number] = o.rotation ?? [0, o.rotationY ?? 0, 0];
        const isDefaultRotation = rot[0] === 0 && rot[1] === 0 && rot[2] === 0;
        const isDefaultScale = !o.scale || (o.scale[0] === 1 && o.scale[1] === 1 && o.scale[2] === 1);
        return {
            id: generateId(),
            name: '',
            defId: defIdMap.get(o.defId) ?? new Uint8Array(16),
            position: v3(o.position),
            rotation: isDefaultRotation ? undefined : v3(rot),
            scale: isDefaultScale ? undefined : v3(o.scale!),
            radius: 0,
            points: [],
        };
    }),
};

const bytes = World.encode(world).finish();
await writeFile(dest, bytes);

const jsonSize = (await readFile(src)).byteLength;
console.log(
    `JSON: ${(jsonSize / 1024).toFixed(0)} KB -> binary: ${(bytes.byteLength / 1024).toFixed(0)} KB (${(
        (1 - bytes.byteLength / jsonSize) *
        100
    ).toFixed(0)}% smaller)`
);
console.log('Written to data/map/map.bin');
