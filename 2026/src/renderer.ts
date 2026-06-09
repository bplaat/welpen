/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';
import type {
    BillboardComponent,
    Component,
    CubeComponent,
    CylinderComponent,
    GameMap,
    Light,
    ObjectDef,
    ObjectInstance,
    PlaneComponent,
    Region,
    SphereComponent,
    SpriteComponent,
    Sky,
    Terrain,
} from './types.ts';

// --- Terrain splatmap ---

export function createSplatMap(terrain: Terrain): THREE.DataTexture {
    const { width, depth, layerWeights } = terrain;
    const data = new Uint8Array(width * depth * 4);
    for (let i = 0; i < width * depth; i++) {
        data[i * 4 + 0] = Math.round((layerWeights[0]?.[i] ?? 0) * 255);
        data[i * 4 + 1] = Math.round((layerWeights[1]?.[i] ?? 0) * 255);
        data[i * 4 + 2] = Math.round((layerWeights[2]?.[i] ?? 0) * 255);
        data[i * 4 + 3] = Math.round((layerWeights[3]?.[i] ?? 0) * 255);
    }
    const tex = new THREE.DataTexture(data, width, depth, THREE.RGBAFormat);
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
}

export function updateTerrainSplatMap(splatMap: THREE.DataTexture, terrain: Terrain): void {
    const { width, depth, layerWeights } = terrain;
    const data = splatMap.image.data as Uint8Array;
    for (let i = 0; i < width * depth; i++) {
        data[i * 4 + 0] = Math.round((layerWeights[0]?.[i] ?? 0) * 255);
        data[i * 4 + 1] = Math.round((layerWeights[1]?.[i] ?? 0) * 255);
        data[i * 4 + 2] = Math.round((layerWeights[2]?.[i] ?? 0) * 255);
        data[i * 4 + 3] = Math.round((layerWeights[3]?.[i] ?? 0) * 255);
    }
    splatMap.needsUpdate = true;
}

// --- Region overlay ---

const REGION_COLORS = [
    [220, 80, 80],
    [80, 200, 80],
    [80, 130, 220],
    [220, 200, 60],
    [200, 80, 200],
    [60, 200, 200],
    [220, 140, 60],
    [150, 80, 220],
];

export function createRegionOverlayTex(terrain: Terrain): THREE.DataTexture {
    const { width, depth } = terrain;
    const data = new Uint8Array(width * depth * 4);
    const tex = new THREE.DataTexture(data, width, depth, THREE.RGBAFormat);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.flipY = false;
    tex.needsUpdate = true;
    return tex;
}

export function updateRegionOverlay(tex: THREE.DataTexture, terrain: Terrain, regions: Region[]): void {
    const { width, depth, regionMap } = terrain;
    const data = tex.image.data as Uint8Array;
    for (let i = 0; i < width * depth; i++) {
        const ri = regionMap[i] ?? -1;
        if (ri < 0 || ri >= regions.length) {
            data[i * 4 + 0] = 0; data[i * 4 + 1] = 0; data[i * 4 + 2] = 0; data[i * 4 + 3] = 0;
        } else {
            const c = REGION_COLORS[ri % REGION_COLORS.length]!;
            data[i * 4 + 0] = c[0]!; data[i * 4 + 1] = c[1]!; data[i * 4 + 2] = c[2]!; data[i * 4 + 3] = 160;
        }
    }
    tex.needsUpdate = true;
}

// --- Texture cache ---

const textureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();

function loadTexture(path: string): THREE.Texture {
    let tex = textureCache.get(path);
    if (!tex) {
        tex = textureLoader.load(path);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestMipmapLinearFilter;
        textureCache.set(path, tex);
    }
    return tex;
}

export function invalidateTexture(path: string): void {
    textureCache.delete(path);
}

// --- Sky ---

export function applySky(scene: THREE.Scene, sky: Sky): void {
    const color = new THREE.Color(sky.color);
    if (sky.texture) {
        const tex = textureLoader.load(sky.texture);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        tex.colorSpace = THREE.SRGBColorSpace;
        scene.background = tex;
    } else {
        scene.background = color;
    }
    scene.fog = new THREE.FogExp2(color.getHex(), 0.001);
}

// --- Light ---

export function applyLight(
    ambientLight: THREE.AmbientLight,
    sunLight: THREE.DirectionalLight,
    renderer: THREE.WebGLRenderer,
    light: Light
): void {
    ambientLight.color.set(light.ambientColor);
    ambientLight.intensity = light.ambientIntensity;
    sunLight.color.set(light.sunColor);
    sunLight.intensity = light.sunIntensity;
    sunLight.position.set(light.sunPosition[0], light.sunPosition[1], light.sunPosition[2]);
    sunLight.castShadow = light.shadows;
    renderer.shadowMap.enabled = light.shadows;
}

// --- Terrain ---

export function buildTerrainMesh(terrain: Terrain, splatMap: THREE.DataTexture): THREE.Mesh {
    const { width, depth, cellSize, heights } = terrain;
    const geo = new THREE.PlaneGeometry(width * cellSize, depth * cellSize, width - 1, depth - 1);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        pos.setY(i, heights[i] ?? 0);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const tex = loadTexture(terrain.texture);
    tex.repeat.set(width / 4, depth / 4);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;

    const dummyData = new Uint8Array([0, 0, 0, 255]);
    const dummyTex = new THREE.DataTexture(dummyData, 1, 1);
    dummyTex.needsUpdate = true;

    const layerTextures = [0, 1, 2, 3].map((i) => {
        const layer = terrain.layers[i];
        if (!layer) return dummyTex;
        const t = loadTexture(layer.texture);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        return t;
    });

    // Scale to convert world XZ position to 0..1 splatmap UV
    const splatScale = new THREE.Vector2(1 / ((width - 1) * cellSize), 1 / ((depth - 1) * cellSize));

    const mat = new THREE.MeshLambertMaterial({ map: tex });
    mat.onBeforeCompile = (shader) => {
        shader.uniforms['splatMap'] = { value: splatMap };
        shader.uniforms['splatScale'] = { value: splatScale };
        for (let i = 0; i < 4; i++) {
            shader.uniforms[`layerMap${i}`] = { value: layerTextures[i] };
            const r = terrain.layers[i]?.repeat ?? 1;
            shader.uniforms[`layerRepeat${i}`] = { value: new THREE.Vector2((width / 4) * r, (depth / 4) * r) };
        }

        // Derive splatmap UV from world XZ position (avoids PlaneGeometry UV flip issues)
        shader.vertexShader = `varying vec2 vSplatUv;\nuniform vec2 splatScale;\n` + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
            `#include <begin_vertex>`,
            `#include <begin_vertex>\nvSplatUv = transformed.xz * splatScale + 0.5;`
        );

        shader.fragmentShader =
            `varying vec2 vSplatUv;
uniform sampler2D splatMap;
uniform sampler2D layerMap0;
uniform sampler2D layerMap1;
uniform sampler2D layerMap2;
uniform sampler2D layerMap3;
uniform vec2 layerRepeat0;
uniform vec2 layerRepeat1;
uniform vec2 layerRepeat2;
uniform vec2 layerRepeat3;
` + shader.fragmentShader;

        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <map_fragment>`,
            `#include <map_fragment>
{
    vec4 splat = texture2D(splatMap, vSplatUv);
    diffuseColor = mix(diffuseColor, texture2D(layerMap0, vSplatUv * layerRepeat0), splat.r);
    diffuseColor = mix(diffuseColor, texture2D(layerMap1, vSplatUv * layerRepeat1), splat.g);
    diffuseColor = mix(diffuseColor, texture2D(layerMap2, vSplatUv * layerRepeat2), splat.b);
    diffuseColor = mix(diffuseColor, texture2D(layerMap3, vSplatUv * layerRepeat3), splat.a);
}`
        );
    };

    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.name = 'terrain';
    return mesh;
}

export function updateTerrainGeometry(mesh: THREE.Mesh, terrain: Terrain): void {
    const pos = (mesh.geometry as THREE.PlaneGeometry).attributes['position'] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
        pos.setY(i, terrain.heights[i] ?? 0);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
}

// Bilinear-interpolated terrain height at world XZ position
export function getTerrainY(terrain: Terrain, wx: number, wz: number): number {
    const { width, depth, cellSize, heights } = terrain;
    const halfW = ((width - 1) * cellSize) / 2;
    const halfD = ((depth - 1) * cellSize) / 2;
    const lx = (wx + halfW) / cellSize;
    const lz = (wz + halfD) / cellSize;
    const x0 = Math.max(0, Math.min(width - 2, Math.floor(lx)));
    const z0 = Math.max(0, Math.min(depth - 2, Math.floor(lz)));
    const fx = lx - x0;
    const fz = lz - z0;
    const h00 = heights[z0 * width + x0] ?? 0;
    const h10 = heights[z0 * width + x0 + 1] ?? 0;
    const h01 = heights[(z0 + 1) * width + x0] ?? 0;
    const h11 = heights[(z0 + 1) * width + x0 + 1] ?? 0;
    return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
}

export function rebuildTerrain(ctx: RendererContext, terrain: Terrain): void {
    ctx.scene.remove(ctx.terrainMesh);
    ctx.terrainMesh.geometry.dispose();
    ctx.terrainSplatMap.dispose();
    ctx.terrainSplatMap = createSplatMap(terrain);
    ctx.terrainMesh = buildTerrainMesh(terrain, ctx.terrainSplatMap);
    ctx.scene.add(ctx.terrainMesh);
    ctx.regionOverlayTex.dispose();
    ctx.regionOverlayTex = createRegionOverlayTex(terrain);
}

// --- Object instances ---

function buildComponentMesh(
    comp: CubeComponent | BillboardComponent | PlaneComponent | CylinderComponent | SphereComponent | SpriteComponent
): THREE.Object3D {
    if (comp.type === 'cube') {
        const tex = loadTexture(comp.texture);
        const geo = new THREE.BoxGeometry(1, 1, 1);
        // alphaMap intentionally omitted: the PNG's own alpha channel handles transparency via alphaTest
        const mat = new THREE.MeshLambertMaterial({
            map: tex,
            transparent: comp.transparent,
            alphaTest: comp.transparent ? 0.5 : 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(comp.position[0], comp.position[1], comp.position[2]);
        mesh.rotation.set(comp.rotation[0], comp.rotation[1], comp.rotation[2]);
        mesh.scale.set(comp.size[0], comp.size[1], comp.size[2]);
        mesh.castShadow = true;
        if (comp.transparent) {
            mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
                depthPacking: THREE.RGBADepthPacking,
                alphaMap: tex,
                alphaTest: 0.5,
            });
        }
        return mesh;
    } else if (comp.type === 'plane') {
        const tex = loadTexture(comp.texture);
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshLambertMaterial({
            map: tex,
            transparent: comp.transparent,
            alphaTest: comp.transparent ? 0.5 : 0,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(comp.position[0], comp.position[1], comp.position[2]);
        mesh.rotation.set(comp.rotation[0], comp.rotation[1], comp.rotation[2]);
        mesh.scale.set(comp.size[0], comp.size[1], 1);
        mesh.castShadow = true;
        if (comp.transparent) {
            mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
                depthPacking: THREE.RGBADepthPacking,
                alphaMap: tex,
                alphaTest: 0.5,
            });
        }
        return mesh;
    } else if (comp.type === 'cylinder') {
        const tex = loadTexture(comp.texture);
        const geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
        const mat = new THREE.MeshLambertMaterial({
            map: tex,
            transparent: comp.transparent,
            alphaTest: comp.transparent ? 0.5 : 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(comp.position[0], comp.position[1], comp.position[2]);
        mesh.rotation.set(comp.rotation[0], comp.rotation[1], comp.rotation[2]);
        mesh.scale.set(comp.size[0], comp.size[1], comp.size[2]);
        mesh.castShadow = true;
        return mesh;
    } else if (comp.type === 'sphere') {
        const tex = loadTexture(comp.texture);
        const geo = new THREE.SphereGeometry(0.5, 16, 12);
        const mat = new THREE.MeshLambertMaterial({
            map: tex,
            transparent: comp.transparent,
            alphaTest: comp.transparent ? 0.5 : 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(comp.position[0], comp.position[1], comp.position[2]);
        mesh.rotation.set(comp.rotation[0], comp.rotation[1], comp.rotation[2]);
        mesh.scale.set(comp.size[0], comp.size[1], comp.size[2]);
        mesh.castShadow = true;
        return mesh;
    } else if (comp.type === 'sprite') {
        // Sprite: fully spherical camera facing (all axes)
        const tex = loadTexture(comp.texture);
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshLambertMaterial({
            map: tex,
            transparent: comp.transparent,
            alphaTest: comp.transparent ? 0.5 : 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(comp.position[0], comp.position[1], comp.position[2]);
        mesh.scale.set(comp.size[0], comp.size[1], 1);
        mesh.castShadow = true;
        mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            alphaMap: tex,
            alphaTest: comp.transparent ? 0.5 : 0,
        });
        mesh.onBeforeRender = (_r, _s, camera) => {
            mesh.lookAt(camera.position);
        };
        return mesh;
    } else {
        // Billboard: cylindrical Y-axis facing (stays upright, only yaws toward camera)
        const tex = loadTexture(comp.texture);
        const geo = new THREE.PlaneGeometry(1, 1);
        const mat = new THREE.MeshLambertMaterial({
            map: tex,
            transparent: comp.transparent,
            alphaTest: comp.transparent ? 0.5 : 0,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(comp.position[0], comp.position[1], comp.position[2]);
        mesh.scale.set(comp.size[0], comp.size[1], 1);
        mesh.castShadow = true;
        mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
            depthPacking: THREE.RGBADepthPacking,
            alphaMap: tex,
            alphaTest: comp.transparent ? 0.5 : 0,
        });
        mesh.onBeforeRender = (_r, _s, camera) => {
            mesh.getWorldPosition(_bbWorldPos);
            mesh.rotation.y = Math.atan2(camera.position.x - _bbWorldPos.x, camera.position.z - _bbWorldPos.z);
        };
        return mesh;
    }
}

export function isAutoRotatedDef(def: ObjectDef): boolean {
    return def.components.length > 0 && def.components.every((c) => c.type === 'billboard' || c.type === 'sprite');
}

// --- Instanced rendering ---

export interface InstancedDefData {
    meshes: THREE.InstancedMesh[];
    compAutoRotate: Array<'none' | 'billboard' | 'sprite'>;
    slots: Map<string, number>;
    reverseSlots: Map<number, string>;
    freeSlots: number[];
    capacity: number;
}

const _iPos = new THREE.Vector3();
const _iQuat = new THREE.Quaternion();
const _iScl = new THREE.Vector3();
const _iMat = new THREE.Matrix4();
const _iLookAt = new THREE.Matrix4();
const _iEuler = new THREE.Euler();
const _iUp = new THREE.Vector3(0, 1, 0);
const _zeroScale = new THREE.Matrix4().makeScale(0, 0, 0);
const _bbWorldPos = new THREE.Vector3();

function compLocalMatrix(comp: Component): THREE.Matrix4 {
    const pos = new THREE.Vector3(comp.position[0], comp.position[1], comp.position[2]);
    let rot: THREE.Quaternion;
    let scl: THREE.Vector3;
    if (comp.type === 'billboard' || comp.type === 'sprite') {
        rot = new THREE.Quaternion();
        scl = new THREE.Vector3(comp.size[0], comp.size[1], 1);
    } else if (comp.type === 'sphere') {
        rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(comp.rotation[0], comp.rotation[1], comp.rotation[2]));
        scl = new THREE.Vector3(comp.size[0], comp.size[0], comp.size[0]);
    } else if (comp.type === 'plane') {
        rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(comp.rotation[0], comp.rotation[1], comp.rotation[2]));
        scl = new THREE.Vector3(comp.size[0], comp.size[1], 1);
    } else {
        rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(comp.rotation[0], comp.rotation[1], comp.rotation[2]));
        scl = new THREE.Vector3(comp.size[0], comp.size[1], comp.size[2]);
    }
    return new THREE.Matrix4().compose(pos, rot, scl);
}

function buildInstancedMeshForComp(comp: Component, capacity: number, defId: string): THREE.InstancedMesh {
    let geo: THREE.BufferGeometry;
    let mat: THREE.Material;
    if (comp.type === 'cube') {
        geo = new THREE.BoxGeometry(1, 1, 1);
        mat = new THREE.MeshLambertMaterial({ map: loadTexture(comp.texture), transparent: comp.transparent, alphaTest: comp.transparent ? 0.5 : 0 });
    } else if (comp.type === 'plane') {
        geo = new THREE.PlaneGeometry(1, 1);
        mat = new THREE.MeshLambertMaterial({ map: loadTexture(comp.texture), transparent: comp.transparent, alphaTest: comp.transparent ? 0.5 : 0, side: THREE.DoubleSide });
    } else if (comp.type === 'cylinder') {
        geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
        mat = new THREE.MeshLambertMaterial({ map: loadTexture(comp.texture), transparent: comp.transparent, alphaTest: comp.transparent ? 0.5 : 0 });
    } else if (comp.type === 'sphere') {
        geo = new THREE.SphereGeometry(0.5, 16, 12);
        mat = new THREE.MeshLambertMaterial({ map: loadTexture(comp.texture), transparent: comp.transparent, alphaTest: comp.transparent ? 0.5 : 0 });
    } else {
        geo = new THREE.PlaneGeometry(1, 1);
        mat = new THREE.MeshLambertMaterial({ map: loadTexture(comp.texture), transparent: comp.transparent, alphaTest: comp.transparent ? 0.5 : 0 });
    }
    geo.applyMatrix4(compLocalMatrix(comp));
    const imesh = new THREE.InstancedMesh(geo, mat, capacity);
    imesh.castShadow = true;
    imesh.receiveShadow = !comp.transparent;
    imesh.userData['defId'] = defId;
    imesh.count = 0;
    for (let i = 0; i < capacity; i++) imesh.setMatrixAt(i, _zeroScale);
    imesh.instanceMatrix.needsUpdate = true;
    return imesh;
}

function makeInstanceMatrix(instance: ObjectInstance): THREE.Matrix4 {
    return new THREE.Matrix4().compose(
        new THREE.Vector3(instance.position[0], instance.position[1], instance.position[2]),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(instance.rotation?.[0] ?? 0, instance.rotation?.[1] ?? 0, instance.rotation?.[2] ?? 0)),
        new THREE.Vector3(instance.scale?.[0] ?? 1, instance.scale?.[1] ?? 1, instance.scale?.[2] ?? 1)
    );
}

function createInstancedDef(scene: THREE.Scene, def: ObjectDef, capacity: number): InstancedDefData {
    const meshes = def.components.map((comp) => {
        const m = buildInstancedMeshForComp(comp, capacity, def.id);
        scene.add(m);
        return m;
    });
    return {
        meshes,
        compAutoRotate: def.components.map((c) => (c.type === 'billboard' ? 'billboard' : c.type === 'sprite' ? 'sprite' : 'none')),
        slots: new Map(),
        reverseSlots: new Map(),
        freeSlots: [],
        capacity,
    };
}

function growInstancedDef(scene: THREE.Scene, data: InstancedDefData, def: ObjectDef): void {
    const newCap = data.capacity * 2 + 16;
    for (let ci = 0; ci < data.meshes.length; ci++) {
        const old = data.meshes[ci]!;
        const n = buildInstancedMeshForComp(def.components[ci]!, newCap, def.id);
        const tmp = new THREE.Matrix4();
        for (let s = 0; s < data.capacity; s++) { old.getMatrixAt(s, tmp); n.setMatrixAt(s, tmp); }
        n.count = old.count;
        n.instanceMatrix.needsUpdate = true;
        scene.remove(old);
        old.geometry.dispose();
        scene.add(n);
        data.meshes[ci] = n;
    }
    data.capacity = newCap;
}

export function addObjectInstance(ctx: RendererContext, def: ObjectDef, instance: ObjectInstance): void {
    let data = ctx.instancedDefs.get(def.id);
    if (!data) {
        data = createInstancedDef(ctx.scene, def, 16);
        ctx.instancedDefs.set(def.id, data);
    }
    let slot: number;
    if (data.freeSlots.length > 0) {
        slot = data.freeSlots.pop()!;
    } else {
        if (data.slots.size >= data.capacity) growInstancedDef(ctx.scene, data, def);
        slot = data.slots.size;
        for (const m of data.meshes) m.count = Math.max(m.count, slot + 1);
    }
    data.slots.set(instance.id, slot);
    data.reverseSlots.set(slot, instance.id);
    const mat = makeInstanceMatrix(instance);
    for (const m of data.meshes) { m.setMatrixAt(slot, mat); m.instanceMatrix.needsUpdate = true; }
    const group = buildObjectGroup(def, instance);
    group.visible = false;
    ctx.scene.add(group);
    ctx.objectGroups.set(instance.id, group);
}

export function removeObjectInstance(ctx: RendererContext, instanceId: string): void {
    const group = ctx.objectGroups.get(instanceId);
    if (group) { ctx.scene.remove(group); ctx.objectGroups.delete(instanceId); }
    for (const [, data] of ctx.instancedDefs) {
        const slot = data.slots.get(instanceId);
        if (slot !== undefined) {
            for (const m of data.meshes) { m.setMatrixAt(slot, _zeroScale); m.instanceMatrix.needsUpdate = true; }
            data.slots.delete(instanceId);
            data.reverseSlots.delete(slot);
            data.freeSlots.push(slot);
            break;
        }
    }
}

export function syncObjectToInstanced(ctx: RendererContext, instanceId: string): void {
    const group = ctx.objectGroups.get(instanceId);
    if (!group) return;
    _iMat.compose(group.position, group.quaternion, group.scale);
    for (const [, data] of ctx.instancedDefs) {
        const slot = data.slots.get(instanceId);
        if (slot !== undefined) {
            for (const m of data.meshes) { m.setMatrixAt(slot, _iMat); m.instanceMatrix.needsUpdate = true; }
            return;
        }
    }
}

export function setObjectSelected(ctx: RendererContext, instanceId: string, selected: boolean): void {
    const group = ctx.objectGroups.get(instanceId);
    if (!group) return;
    if (selected) {
        group.visible = true;
        for (const [, data] of ctx.instancedDefs) {
            const slot = data.slots.get(instanceId);
            if (slot !== undefined) {
                for (const m of data.meshes) { m.setMatrixAt(slot, _zeroScale); m.instanceMatrix.needsUpdate = true; }
                return;
            }
        }
    } else {
        group.visible = false;
        _iMat.compose(group.position, group.quaternion, group.scale);
        for (const [, data] of ctx.instancedDefs) {
            const slot = data.slots.get(instanceId);
            if (slot !== undefined) {
                for (const m of data.meshes) { m.setMatrixAt(slot, _iMat); m.instanceMatrix.needsUpdate = true; }
                return;
            }
        }
    }
}

export function rebuildDefInstanced(ctx: RendererContext, def: ObjectDef, instances: ObjectInstance[]): void {
    const old = ctx.instancedDefs.get(def.id);
    if (old) {
        for (const m of old.meshes) { ctx.scene.remove(m); m.geometry.dispose(); }
        ctx.instancedDefs.delete(def.id);
    }
    if (instances.length === 0) return;
    const data = createInstancedDef(ctx.scene, def, Math.max(instances.length * 2 + 16, 16));
    ctx.instancedDefs.set(def.id, data);
    for (const inst of instances) {
        const slot = data.slots.size;
        data.slots.set(inst.id, slot);
        data.reverseSlots.set(slot, inst.id);
        const group = ctx.objectGroups.get(inst.id);
        const mat = group?.visible ? _zeroScale : makeInstanceMatrix(inst);
        for (const m of data.meshes) { m.setMatrixAt(slot, mat); m.count = Math.max(m.count, slot + 1); }
    }
    for (const m of data.meshes) m.instanceMatrix.needsUpdate = true;
}

export function buildObjectGroup(def: ObjectDef, instance: ObjectInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = instance.id;
    group.userData = { instanceId: instance.id };
    group.position.set(instance.position[0], instance.position[1], instance.position[2]);
    if (!isAutoRotatedDef(def)) {
        group.rotation.set(instance.rotation?.[0] ?? 0, instance.rotation?.[1] ?? 0, instance.rotation?.[2] ?? 0);
    }
    group.scale.set(instance.scale?.[0] ?? 1, instance.scale?.[1] ?? 1, instance.scale?.[2] ?? 1);
    for (const comp of def.components) {
        group.add(buildComponentMesh(comp));
    }
    return group;
}

export function rebuildObjectGroup(group: THREE.Group, def: ObjectDef, instance: ObjectInstance): void {
    while (group.children.length > 0) group.remove(group.children[0]!);
    group.position.set(instance.position[0], instance.position[1], instance.position[2]);
    if (!isAutoRotatedDef(def)) {
        group.rotation.set(instance.rotation?.[0] ?? 0, instance.rotation?.[1] ?? 0, instance.rotation?.[2] ?? 0);
    }
    group.scale.set(instance.scale?.[0] ?? 1, instance.scale?.[1] ?? 1, instance.scale?.[2] ?? 1);
    for (const comp of def.components) {
        group.add(buildComponentMesh(comp));
    }
}

// --- Renderer context ---

export interface RendererContext {
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    terrainMesh: THREE.Mesh;
    terrainSplatMap: THREE.DataTexture;
    regionOverlayTex: THREE.DataTexture;
    objectGroups: Map<string, THREE.Group>;
    instancedDefs: Map<string, InstancedDefData>;
    ambientLight: THREE.AmbientLight;
    sunLight: THREE.DirectionalLight;
}

export function createRenderer(container: HTMLElement, gameMap: GameMap): RendererContext {
    const scene = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight();
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight();
    sunLight.shadow.mapSize.set(2048, 2048);
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    scene.add(sunLight);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 3200);
    camera.position.set(0, 10, 20);

    // Create renderer first so applyLight/applySky can reference it
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    applySky(scene, gameMap.sky);
    applyLight(ambientLight, sunLight, renderer, gameMap.light);

    const terrainSplatMap = createSplatMap(gameMap.terrain);
    const terrainMesh = buildTerrainMesh(gameMap.terrain, terrainSplatMap);
    scene.add(terrainMesh);

    const regionOverlayTex = createRegionOverlayTex(gameMap.terrain);
    updateRegionOverlay(regionOverlayTex, gameMap.terrain, gameMap.regions ?? []);

    const objectGroups = new Map<string, THREE.Group>();
    const instancedDefs = new Map<string, InstancedDefData>();

    // First pass: create InstancedDefData with correct capacity per def
    for (const def of gameMap.objectDefs) {
        const count = gameMap.objects.filter((o) => o.defId === def.id).length;
        if (count === 0) continue;
        instancedDefs.set(def.id, createInstancedDef(scene, def, count * 2 + 16));
    }

    // Second pass: fill instance matrices and create invisible proxy groups
    for (const instance of gameMap.objects) {
        const def = gameMap.objectDefs.find((d) => d.id === instance.defId);
        if (!def) continue;
        const group = buildObjectGroup(def, instance);
        group.visible = false;
        scene.add(group);
        objectGroups.set(instance.id, group);

        const data = instancedDefs.get(def.id)!;
        const slot = data.slots.size;
        data.slots.set(instance.id, slot);
        data.reverseSlots.set(slot, instance.id);
        const mat = makeInstanceMatrix(instance);
        for (const m of data.meshes) { m.setMatrixAt(slot, mat); m.count = Math.max(m.count, slot + 1); }
    }
    for (const [, data] of instancedDefs) {
        for (const m of data.meshes) m.instanceMatrix.needsUpdate = true;
    }

    const resizeObserver = new ResizeObserver(() => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    return { scene, camera, renderer, terrainMesh, terrainSplatMap, regionOverlayTex, objectGroups, instancedDefs, ambientLight, sunLight };
}

export function renderFrame(ctx: RendererContext): void {
    const camPos = ctx.camera.position;
    for (const [, data] of ctx.instancedDefs) {
        for (let ci = 0; ci < data.meshes.length; ci++) {
            const autoRot = data.compAutoRotate[ci];
            if (autoRot === 'none') continue;
            const mesh = data.meshes[ci]!;
            for (const [, slot] of data.slots) {
                mesh.getMatrixAt(slot, _iMat);
                _iMat.decompose(_iPos, _iQuat, _iScl);
                if (_iScl.lengthSq() < 1e-6) continue;
                if (autoRot === 'billboard') {
                    _iEuler.set(0, Math.atan2(camPos.x - _iPos.x, camPos.z - _iPos.z), 0);
                    _iQuat.setFromEuler(_iEuler);
                } else {
                    _iLookAt.lookAt(_iPos, camPos, _iUp);
                    _iQuat.setFromRotationMatrix(_iLookAt);
                }
                _iMat.compose(_iPos, _iQuat, _iScl);
                mesh.setMatrixAt(slot, _iMat);
            }
            mesh.instanceMatrix.needsUpdate = true;
        }
    }
    ctx.renderer.render(ctx.scene, ctx.camera);
}
