/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';
import type {
    BillboardComponent,
    CubeComponent,
    CylinderComponent,
    GameMap,
    Light,
    ObjectDef,
    ObjectInstance,
    PlaneComponent,
    SphereComponent,
    SpriteComponent,
    Sky,
    Terrain,
} from './types.ts';

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
    scene.fog = new THREE.FogExp2(color.getHex(), 0.004);
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

export function buildTerrainMesh(terrain: Terrain): THREE.Mesh {
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

    const mat = new THREE.MeshLambertMaterial({ map: tex });
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
    ctx.terrainMesh = buildTerrainMesh(terrain);
    ctx.scene.add(ctx.terrainMesh);
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
            side: THREE.DoubleSide,
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
            side: THREE.DoubleSide,
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
            const worldPos = new THREE.Vector3();
            mesh.getWorldPosition(worldPos);
            mesh.rotation.y = Math.atan2(camera.position.x - worldPos.x, camera.position.z - worldPos.z);
        };
        return mesh;
    }
}

export function buildObjectGroup(def: ObjectDef, instance: ObjectInstance): THREE.Group {
    const group = new THREE.Group();
    group.name = instance.id;
    group.userData = { instanceId: instance.id };
    group.position.set(instance.position[0], instance.position[1], instance.position[2]);
    group.rotation.set(instance.rotation?.[0] ?? 0, instance.rotation?.[1] ?? 0, instance.rotation?.[2] ?? 0);
    group.scale.set(instance.scale?.[0] ?? 1, instance.scale?.[1] ?? 1, instance.scale?.[2] ?? 1);
    for (const comp of def.components) {
        group.add(buildComponentMesh(comp));
    }
    return group;
}

export function rebuildObjectGroup(group: THREE.Group, def: ObjectDef, instance: ObjectInstance): void {
    while (group.children.length > 0) group.remove(group.children[0]!);
    group.position.set(instance.position[0], instance.position[1], instance.position[2]);
    group.rotation.set(instance.rotation?.[0] ?? 0, instance.rotation?.[1] ?? 0, instance.rotation?.[2] ?? 0);
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
    objectGroups: Map<string, THREE.Group>;
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

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 800);
    camera.position.set(0, 10, 20);

    // Create renderer first so applyLight/applySky can reference it
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    applySky(scene, gameMap.sky);
    applyLight(ambientLight, sunLight, renderer, gameMap.light);

    const terrainMesh = buildTerrainMesh(gameMap.terrain);
    scene.add(terrainMesh);

    const objectGroups = new Map<string, THREE.Group>();
    for (const instance of gameMap.objects) {
        const def = gameMap.objectDefs.find((d) => d.id === instance.defId);
        if (!def) continue;
        const group = buildObjectGroup(def, instance);
        scene.add(group);
        objectGroups.set(instance.id, group);
    }

    const resizeObserver = new ResizeObserver(() => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
    resizeObserver.observe(container);

    return { scene, camera, renderer, terrainMesh, objectGroups, ambientLight, sunLight };
}

export function renderFrame(ctx: RendererContext): void {
    ctx.renderer.render(ctx.scene, ctx.camera);
}
