/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import {
    applySky,
    applyLight,
    buildObjectGroup,
    rebuildObjectGroup,
    rebuildTerrain,
    getTerrainY,
    isAutoRotatedDef,
    createRenderer,
    renderFrame,
    updateRegionOverlay,
} from '../renderer.ts';
import { loadMap, saveMap, uploadTexture } from '../map.ts';
import type {
    BillboardComponent,
    CubeComponent,
    CylinderComponent,
    GameMap,
    ObjectDef,
    ObjectInstance,
    PlaneComponent,
    Region,
    SphereComponent,
    SpriteComponent,
} from '../types.ts';
import { TerrainEditor } from './terrain.ts';

// ---- State ----

let map: GameMap;
let ctx: ReturnType<typeof createRenderer>;

// World editor controls
let orbitControls: OrbitControls;
let transformControls: TransformControls;
let transformHelper: THREE.Object3D;
let selectionBox: THREE.BoxHelper;
let terrainEditor: TerrainEditor;
let contourMesh: THREE.Mesh;

// Defs editor scene (isolated preview)
let defsScene: THREE.Scene;
let defsCamera: THREE.PerspectiveCamera;
let defsOrbit: OrbitControls;
let defsTransformControls: TransformControls;
let defsTransformHelper: THREE.Object3D;
let defsGroup: THREE.Group;

type Tab = 'world' | 'defs';
type MapTool = 'select' | 'place' | 'raise' | 'lower' | 'level' | 'paint' | 'region' | 'scatter';
type TransformMode = 'translate' | 'rotate' | 'scale';

let activeTab: Tab = 'world';
let currentTool: MapTool = 'select';
let transformMode: TransformMode = 'translate';
let defsTransformMode: TransformMode = 'translate';

// Map editor selection
let mapSel: 'settings' | string | null = 'settings';
let placeDefId: string | null = null;
let brushSize = 4;
let brushHit: THREE.Vector3 | null = null;
let isMouseDown = false;
let isRightMouseDown = false;
let paintLayerIndex = 0;
let regionSelIndex = 0;
let regionOverlayMesh: THREE.Mesh;
let levelTargetHeight = 0;

// Defs editor selection
let defsSelDefId: string | null = null;
let defsSelCompIdx = -1;

// Placement ghost (follows cursor in place mode)
let ghostGroup: THREE.Group | null = null;

// WASD camera movement
const keysDown = new Set<string>();

// Scatter tool
let scatterAccum = 0;
let scatterIdSeq = 0;

// ---- DOM helpers ----

const $ = (id: string) => document.getElementById(id) as HTMLElement;

function el<T extends HTMLElement>(tag: string, cls?: string, text?: string): T {
    const e = document.createElement(tag) as T;
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
}

// ---- Field builders ----

function makeSection(title: string): HTMLElement {
    return el('div', 'section-title', title);
}

function makeField(label: string, ...inputs: HTMLElement[]): HTMLElement {
    const d = el('div', 'field');
    d.appendChild(el('label', '', label));
    inputs.forEach((i) => d.appendChild(i));
    return d;
}

function textInput(value: string, onChange: (v: string) => void): HTMLInputElement {
    const inp = el<HTMLInputElement>('input');
    inp.type = 'text';
    inp.value = value;
    inp.addEventListener('change', () => onChange(inp.value));
    return inp;
}

function numInput(value: number, onChange: (v: number) => void, step = 0.1, attr?: string): HTMLInputElement {
    const inp = el<HTMLInputElement>('input');
    inp.type = 'number';
    inp.step = String(step);
    inp.value = value.toFixed(3);
    if (attr) inp.dataset['field'] = attr;
    inp.addEventListener('input', () => onChange(parseFloat(inp.value) || 0));
    return inp;
}

function colorInput(value: string, onChange: (v: string) => void): HTMLInputElement {
    const inp = el<HTMLInputElement>('input');
    inp.type = 'color';
    inp.value = value;
    inp.addEventListener('input', () => onChange(inp.value));
    return inp;
}

function checkboxInput(checked: boolean, label: string, onChange: (v: boolean) => void): HTMLElement {
    const d = el('div', 'field');
    const lab = el<HTMLLabelElement>('label');
    const cb = el<HTMLInputElement>('input');
    cb.type = 'checkbox';
    cb.checked = checked;
    cb.addEventListener('change', () => onChange(cb.checked));
    lab.appendChild(cb);
    lab.appendChild(document.createTextNode(label));
    d.appendChild(lab);
    return d;
}

function selectInput(value: string, options: string[], onChange: (v: string) => void): HTMLSelectElement {
    const sel = el<HTMLSelectElement>('select');
    for (const opt of options) {
        const o = el<HTMLOptionElement>('option', '', opt);
        o.value = opt;
        o.selected = opt === value;
        sel.appendChild(o);
    }
    sel.addEventListener('change', () => onChange(sel.value));
    return sel;
}

function textureField(label: string, value: string, onChange: (v: string) => void): HTMLElement {
    const d = el('div', 'field');
    d.appendChild(el('label', '', label));
    const row = el('div', 'texture-row');
    const inp = textInput(value, onChange);
    const btn = el<HTMLButtonElement>('button', 'tex-upload-btn', '\uD83D\uDCC2');
    btn.title = 'Upload PNG or JPG texture';
    btn.addEventListener('click', () => {
        const fi = document.createElement('input');
        fi.type = 'file';
        fi.accept = '.png,.jpg,.jpeg';
        fi.addEventListener('change', () => {
            const file = fi.files?.[0];
            if (!file) return;
            uploadTexture(file)
                .then((path) => {
                    inp.value = path;
                    onChange(path);
                })
                .catch((e: unknown) => alert(`Upload failed: ${String(e)}`));
        });
        fi.click();
    });
    row.appendChild(inp);
    row.appendChild(btn);
    d.appendChild(row);
    return d;
}

function vec3Field(
    label: string,
    vals: [number, number, number],
    onChange: (i: number, v: number) => void,
    attr?: [string, string, string]
): HTMLElement {
    const d = el('div', 'field');
    d.appendChild(el('label', '', label));
    const row = el('div', 'vec3');
    ['X', 'Y', 'Z'].forEach((axis, i) => {
        const wrap = el('div', 'vec-row');
        wrap.appendChild(el('span', '', axis));
        wrap.appendChild(numInput(vals[i]!, (v) => onChange(i, v), 0.1, attr?.[i]));
        row.appendChild(wrap);
    });
    d.appendChild(row);
    return d;
}

function vec2Field(
    label: string,
    vals: [number, number],
    onChange: (i: number, v: number) => void,
    attr?: [string, string]
): HTMLElement {
    const d = el('div', 'field');
    d.appendChild(el('label', '', label));
    const row = el('div', 'vec2');
    ['W', 'H'].forEach((axis, i) => {
        const wrap = el('div', 'vec-row');
        wrap.appendChild(el('span', '', axis));
        wrap.appendChild(numInput(vals[i]!, (v) => onChange(i, v), 0.1, attr?.[i]));
        row.appendChild(wrap);
    });
    d.appendChild(row);
    return d;
}

function actionBtn(text: string, cls: string, onClick: () => void): HTMLButtonElement {
    const btn = el<HTMLButtonElement>('button', `action-btn ${cls}`, text);
    btn.addEventListener('click', onClick);
    return btn;
}

// ---- Raycasting ----

const raycaster = new THREE.Raycaster();

function getNDC(e: MouseEvent): THREE.Vector2 {
    const rect = ctx.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
}

function getTerrainHit(e: MouseEvent): THREE.Vector3 | null {
    raycaster.setFromCamera(getNDC(e), ctx.camera);
    const hits = raycaster.intersectObject(ctx.terrainMesh);
    return hits.length > 0 ? hits[0]!.point : null;
}

function getObjectHit(e: MouseEvent): THREE.Group | null {
    raycaster.setFromCamera(getNDC(e), ctx.camera);
    const hits = raycaster.intersectObjects(Array.from(ctx.objectGroups.values()), true);
    if (hits.length === 0) return null;
    let obj: THREE.Object3D | null = hits[0]!.object;
    while (obj && !obj.userData['instanceId']) obj = obj.parent;
    return obj instanceof THREE.Group ? obj : null;
}

// ---- Placement ghost ----

function buildGhostGroup(def: ObjectDef): THREE.Group {
    const dummy: ObjectInstance = {
        id: '__ghost__',
        defId: def.id,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    };
    const group = buildObjectGroup(def, dummy);
    group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
            const mat = (child.material as THREE.Material).clone();
            (mat as THREE.MeshLambertMaterial).transparent = true;
            (mat as THREE.MeshLambertMaterial).opacity = 0.45;
            (mat as THREE.MeshLambertMaterial).alphaTest = 0;
            (mat as THREE.MeshLambertMaterial).depthWrite = false;
            child.material = mat;
            child.castShadow = false;
        }
    });
    return group;
}

function updateGhost(e: MouseEvent): void {
    if (!placeDefId || !ghostGroup) return;
    const hit = getTerrainHit(e);
    if (hit) {
        ghostGroup.position.set(Math.round(hit.x * 10) / 10, hit.y, Math.round(hit.z * 10) / 10);
        ghostGroup.visible = true;
    } else {
        ghostGroup.visible = false;
    }
}

function setGhostDef(defId: string | null): void {
    if (ghostGroup) {
        ctx.scene.remove(ghostGroup);
        ghostGroup = null;
    }
    if (!defId) return;
    const def = map.objectDefs.find((d) => d.id === defId);
    if (!def) return;
    ghostGroup = buildGhostGroup(def);
    ghostGroup.visible = false;
    ctx.scene.add(ghostGroup);
}

// ---- World editor selection ----

function selectMapItem(sel: 'settings' | string | null): void {
    mapSel = sel;
    if (sel && sel !== 'settings') {
        const group = ctx.objectGroups.get(sel);
        if (group) {
            transformControls.attach(group);
            transformControls.setMode(transformMode);
            selectionBox.setFromObject(group);
            selectionBox.visible = true;
        }
    } else {
        transformControls.detach();
        selectionBox.visible = false;
    }
    renderLeftPanel();
    renderRightPanel();
}

function clearSelection(): void {
    mapSel = null;
    transformControls.detach();
    selectionBox.visible = false;
    renderLeftPanel();
    renderRightPanel();
}

function syncInstanceFromGroup(group: THREE.Group): void {
    const instanceId = group.userData['instanceId'] as string;
    const instance = map.objects.find((o) => o.id === instanceId);
    if (!instance) return;
    instance.position[0] = group.position.x;
    instance.position[1] = group.position.y;
    instance.position[2] = group.position.z;
    instance.rotation[0] = group.rotation.x;
    instance.rotation[1] = group.rotation.y;
    instance.rotation[2] = group.rotation.z;
    instance.scale[0] = group.scale.x;
    instance.scale[1] = group.scale.y;
    instance.scale[2] = group.scale.z;
    selectionBox.setFromObject(group);
    const setVal = (attr: string, v: number) => {
        const inp = document.querySelector(`[data-field="${attr}"]`) as HTMLInputElement | null;
        if (inp && document.activeElement !== inp) inp.value = v.toFixed(3);
    };
    setVal('pos-x', instance.position[0]);
    setVal('pos-y', instance.position[1]);
    setVal('pos-z', instance.position[2]);
    setVal('rot-x', instance.rotation[0]);
    setVal('rot-y', instance.rotation[1]);
    setVal('rot-z', instance.rotation[2]);
    setVal('scl-x', instance.scale[0]);
    setVal('scl-y', instance.scale[1]);
    setVal('scl-z', instance.scale[2]);
}

// ---- Defs editor component mesh helpers ----

function getDefsCompMesh(): THREE.Object3D | null {
    const previewGroup = defsGroup.children[0] as THREE.Group | undefined;
    if (!previewGroup || defsSelCompIdx < 0) return null;
    return previewGroup.children[defsSelCompIdx] ?? null;
}

function syncCompFromMesh(mesh: THREE.Object3D): void {
    const def = map.objectDefs.find((d) => d.id === defsSelDefId);
    if (!def || defsSelCompIdx < 0) return;
    const comp = def.components[defsSelCompIdx];
    if (!comp) return;

    comp.position[0] = mesh.position.x;
    comp.position[1] = mesh.position.y;
    comp.position[2] = mesh.position.z;

    if (comp.type === 'cube' || comp.type === 'cylinder' || comp.type === 'sphere') {
        comp.rotation[0] = mesh.rotation.x;
        comp.rotation[1] = mesh.rotation.y;
        comp.rotation[2] = mesh.rotation.z;
        comp.size[0] = Math.max(0.01, mesh.scale.x);
        comp.size[1] = Math.max(0.01, mesh.scale.y);
        comp.size[2] = Math.max(0.01, mesh.scale.z);
    } else if (comp.type === 'plane') {
        comp.rotation[0] = mesh.rotation.x;
        comp.rotation[1] = mesh.rotation.y;
        comp.rotation[2] = mesh.rotation.z;
        comp.size[0] = Math.max(0.01, mesh.scale.x);
        comp.size[1] = Math.max(0.01, mesh.scale.y);
    } else if (comp.type === 'billboard' || comp.type === 'sprite') {
        comp.size[0] = Math.max(0.01, mesh.scale.x);
        comp.size[1] = Math.max(0.01, mesh.scale.y);
    }

    const setVal = (attr: string, v: number) => {
        const inp = document.querySelector(`[data-field="${attr}"]`) as HTMLInputElement | null;
        if (inp && document.activeElement !== inp) inp.value = v.toFixed(3);
    };
    setVal('comp-pos-x', comp.position[0]);
    setVal('comp-pos-y', comp.position[1]);
    setVal('comp-pos-z', comp.position[2]);
    if (comp.type === 'cube' || comp.type === 'plane' || comp.type === 'cylinder' || comp.type === 'sphere') {
        setVal('comp-rot-x', comp.rotation[0]);
        setVal('comp-rot-y', comp.rotation[1]);
        setVal('comp-rot-z', comp.rotation[2]);
    }
    if (comp.type === 'cube' || comp.type === 'cylinder' || comp.type === 'sphere') {
        setVal('comp-sz-x', comp.size[0]);
        setVal('comp-sz-y', comp.size[1]);
        setVal('comp-sz-z', comp.size[2]);
    } else if (comp.type === 'plane' || comp.type === 'billboard' || comp.type === 'sprite') {
        setVal('comp-sz-x', comp.size[0]);
        setVal('comp-sz-y', comp.size[1]);
    }
}

function selectDefsComp(idx: number): void {
    defsSelCompIdx = idx;
    if (activeTab === 'defs') {
        const mesh = getDefsCompMesh();
        if (mesh) {
            defsTransformControls.attach(mesh);
            defsTransformControls.setMode(defsTransformMode);
        } else {
            defsTransformControls.detach();
        }
    }
    renderLeftPanel();
    renderRightPanel();
}

// ---- Rebuild def objects in scene ----

function rebuildDefObjects(def: ObjectDef): void {
    for (const instance of map.objects) {
        if (instance.defId !== def.id) continue;
        const group = ctx.objectGroups.get(instance.id);
        if (group) rebuildObjectGroup(group, def, instance);
    }
    if (defsSelDefId === def.id) rebuildDefsPreview();
}

// ---- Defs preview scene ----

function rebuildDefsPreview(): void {
    while (defsGroup.children.length > 0) defsGroup.remove(defsGroup.children[0]!);
    defsTransformControls.detach();

    const def = map.objectDefs.find((d) => d.id === defsSelDefId);
    if (!def) return;

    const dummyInstance: ObjectInstance = {
        id: '__preview__',
        defId: def.id,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
    };

    const group = buildObjectGroup(def, dummyInstance);
    defsGroup.add(group);

    // Re-attach TransformControls to selected component
    if (defsSelCompIdx >= 0 && activeTab === 'defs') {
        const mesh = getDefsCompMesh();
        if (mesh) {
            defsTransformControls.attach(mesh);
            defsTransformControls.setMode(defsTransformMode);
        }
    }

    // Center camera on bounding box (only if no component selected, so camera doesn't jump during editing)
    if (defsSelCompIdx < 0) {
        const box = new THREE.Box3().setFromObject(defsGroup);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        defsCamera.position.set(center.x + maxDim * 1.5, center.y + maxDim, center.z + maxDim * 1.5);
        defsOrbit.target.copy(center);
        defsOrbit.update();
    }
}

// ---- Left panel ----

function renderLeftPanel(): void {
    $('left-panel-header').textContent = activeTab === 'world' ? 'Entities' : 'Object Defs';
    const body = $('left-panel-body');
    body.innerHTML = '';
    activeTab === 'world' ? renderMapLeftPanel(body) : renderDefsLeftPanel(body);
}

function listItem(icon: string, label: string, selected: boolean, onClick: () => void): HTMLElement {
    const d = el('div', 'list-item' + (selected ? ' selected' : ''));
    d.innerHTML = `<span class="list-icon">${icon}</span><span class="list-label">${label}</span>`;
    d.addEventListener('click', onClick);
    return d;
}

function renderMapLeftPanel(body: HTMLElement): void {
    if (currentTool === 'place' || currentTool === 'scatter') {
        body.appendChild(el('div', 'list-section', 'Choose definition to place:'));
        for (const def of map.objectDefs) {
            body.appendChild(
                listItem('\uD83D\uDCE6', def.name, placeDefId === def.id, () => {
                    placeDefId = def.id;
                    if (currentTool === 'place') setGhostDef(placeDefId);
                    renderLeftPanel();
                })
            );
        }
        return;
    }

    body.appendChild(listItem('\uD83C\uDF0D', 'Map Settings', mapSel === 'settings', () => selectMapItem('settings')));

    body.appendChild(el('div', 'list-section', 'Regions'));
    for (let i = 0; i < map.regions.length; i++) {
        const region = map.regions[i]!;
        const idx = i;
        body.appendChild(
            listItem('\uD83D\uDDFA', region.name, currentTool === 'region' && regionSelIndex === idx, () => {
                regionSelIndex = idx;
                setTool('region');
            })
        );
    }
    const addRegionBtn = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Region');
    addRegionBtn.addEventListener('click', () => {
        map.regions.push({ id: `region_${Date.now()}`, name: 'New Region' });
        regionSelIndex = map.regions.length - 1;
        setTool('region');
    });
    body.appendChild(addRegionBtn);

    if (map.objects.length > 0) {
        body.appendChild(el('div', 'list-section', 'Placed Objects'));
        for (const inst of map.objects) {
            const def = map.objectDefs.find((d) => d.id === inst.defId);
            body.appendChild(
                listItem('\uD83D\uDCE6', def?.name ?? inst.defId, mapSel === inst.id, () => selectMapItem(inst.id))
            );
        }
    }
}

function renderDefsLeftPanel(body: HTMLElement): void {
    for (const def of map.objectDefs) {
        body.appendChild(
            listItem('\uD83D\uDCE6', def.name, defsSelDefId === def.id, () => {
                defsSelDefId = def.id;
                defsSelCompIdx = -1;
                defsTransformControls.detach();
                renderLeftPanel();
                renderRightPanel();
                rebuildDefsPreview();
            })
        );
    }
    const addBtn = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Definition');
    addBtn.addEventListener('click', () => {
        const id = `def_${Date.now()}`;
        map.objectDefs.push({ id, name: 'New Object', components: [] });
        defsSelDefId = id;
        defsSelCompIdx = -1;
        defsTransformControls.detach();
        renderLeftPanel();
        renderRightPanel();
        rebuildDefsPreview();
    });
    body.appendChild(addBtn);

    if (defsSelDefId) {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (def) {
            body.appendChild(el('div', 'list-section', `"${def.name}" components`));
            def.components.forEach((comp, i) => {
                const icons: Record<string, string> = {
                    cube: '\uD83E\uDDE0',
                    plane: '\u25A1',
                    cylinder: '\u232C',
                    sphere: '\u25CF',
                    billboard: '\uD83D\uDDBC',
                    sprite: '\u2726',
                };
                body.appendChild(
                    listItem(icons[comp.type] ?? '?', `${comp.type} ${i + 1}`, defsSelCompIdx === i, () => {
                        selectDefsComp(i);
                    })
                );
            });
            const addCube = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Cube');
            addCube.addEventListener('click', () => {
                def.components.push({
                    type: 'cube',
                    position: [0, 0.5, 0],
                    rotation: [0, 0, 0],
                    size: [1, 1, 1],
                    texture: 'data/map/textures/placeholder.png',
                    transparent: false,
                });
                rebuildDefObjects(def);
                selectDefsComp(def.components.length - 1);
            });
            const addCyl = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Cylinder');
            addCyl.addEventListener('click', () => {
                def.components.push({
                    type: 'cylinder',
                    position: [0, 0.5, 0],
                    rotation: [0, 0, 0],
                    size: [1, 1, 1],
                    texture: 'data/map/textures/placeholder.png',
                    transparent: false,
                });
                rebuildDefObjects(def);
                selectDefsComp(def.components.length - 1);
            });
            const addSph = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Sphere');
            addSph.addEventListener('click', () => {
                def.components.push({
                    type: 'sphere',
                    position: [0, 0.5, 0],
                    rotation: [0, 0, 0],
                    size: [1, 1, 1],
                    texture: 'data/map/textures/placeholder.png',
                    transparent: false,
                });
                rebuildDefObjects(def);
                selectDefsComp(def.components.length - 1);
            });
            const addBill = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Billboard');
            addBill.addEventListener('click', () => {
                def.components.push({
                    type: 'billboard',
                    position: [0, 0.5, 0],
                    size: [1, 1],
                    texture: 'data/map/textures/placeholder.png',
                    transparent: true,
                });
                rebuildDefObjects(def);
                selectDefsComp(def.components.length - 1);
            });
            const addSpr = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Sprite');
            addSpr.addEventListener('click', () => {
                def.components.push({
                    type: 'sprite',
                    position: [0, 0.5, 0],
                    size: [1, 1],
                    texture: 'data/map/textures/placeholder.png',
                    transparent: true,
                });
                rebuildDefObjects(def);
                selectDefsComp(def.components.length - 1);
            });
            const addPlane = el<HTMLButtonElement>('button', 'list-add-btn', '+ Add Plane');
            addPlane.addEventListener('click', () => {
                def.components.push({
                    type: 'plane',
                    position: [0, 0, 0],
                    rotation: [-Math.PI / 2, 0, 0],
                    size: [1, 1],
                    texture: 'data/map/textures/placeholder.png',
                    transparent: false,
                });
                rebuildDefObjects(def);
                selectDefsComp(def.components.length - 1);
            });
            body.appendChild(addCube);
            body.appendChild(addCyl);
            body.appendChild(addSph);
            body.appendChild(addBill);
            body.appendChild(addSpr);
            body.appendChild(addPlane);
        }
    }
}

// ---- Right panel ----

function renderRightPanel(): void {
    $('right-panel-header').textContent = activeTab === 'world' ? 'Properties' : 'Inspector';
    const body = $('right-panel-body');
    body.innerHTML = '';
    activeTab === 'world' ? renderMapRightPanel(body) : renderDefsRightPanel(body);
}

function renderMapRightPanel(body: HTMLElement): void {
    if (currentTool === 'region') {
        renderRegionPanel(body);
        return;
    }
    if (!mapSel) {
        body.appendChild(el('div', 'empty-msg', 'Select an entity or Map Settings'));
        return;
    }
    if (mapSel === 'settings') {
        renderMapSettings(body);
    } else {
        const instance = map.objects.find((o) => o.id === mapSel);
        if (instance) renderInstancePanel(body, instance);
    }
}

function renderRegionPanel(body: HTMLElement): void {
    const region = map.regions[regionSelIndex] as Region | undefined;
    if (!region) {
        body.appendChild(el('div', 'empty-msg', 'Select or add a region'));
        return;
    }
    body.appendChild(makeSection('Region'));
    body.appendChild(
        makeField('Name', textInput(region.name, (v) => {
            region.name = v;
            renderLeftPanel();
        }))
    );
    body.appendChild(
        actionBtn('Delete Region', 'danger', () => {
            const ri = regionSelIndex;
            for (let i = 0; i < map.terrain.regionMap.length; i++) {
                const v = map.terrain.regionMap[i]!;
                if (v === ri) map.terrain.regionMap[i] = -1;
                else if (v > ri) map.terrain.regionMap[i] = v - 1;
            }
            map.regions.splice(ri, 1);
            regionSelIndex = Math.max(0, map.regions.length - 1);
            updateRegionOverlay(ctx.regionOverlayTex, map.terrain, map.regions);
            if (map.regions.length === 0) setTool('select');
            else renderLeftPanel();
            renderRightPanel();
        })
    );
}

function renderMapSettings(body: HTMLElement): void {
    body.appendChild(makeSection('Terrain'));

    let newW = map.terrain.width;
    let newD = map.terrain.depth;
    let newCS = map.terrain.cellSize;

    body.appendChild(
        makeField(
            'Width',
            numInput(
                map.terrain.width,
                (v) => {
                    newW = Math.max(2, Math.min(256, Math.round(v)));
                },
                1
            )
        )
    );
    body.appendChild(
        makeField(
            'Depth',
            numInput(
                map.terrain.depth,
                (v) => {
                    newD = Math.max(2, Math.min(256, Math.round(v)));
                },
                1
            )
        )
    );
    body.appendChild(
        makeField(
            'Cell Size',
            numInput(
                map.terrain.cellSize,
                (v) => {
                    newCS = Math.max(0.5, v);
                },
                0.5
            )
        )
    );
    body.appendChild(
        textureField('Ground Texture', map.terrain.texture, (v) => {
            map.terrain.texture = v;
            rebuildTerrain(ctx, map.terrain);
            terrainEditor.setMesh(ctx.terrainMesh, map.terrain, ctx.terrainSplatMap);
            contourMesh.geometry = ctx.terrainMesh.geometry;
            regionOverlayMesh.geometry = ctx.terrainMesh.geometry;
        })
    );

    body.appendChild(makeSection('Terrain Layers'));
    for (let i = 0; i < map.terrain.layers.length; i++) {
        const layer = map.terrain.layers[i]!;
        const layerIdx = i;
        const item = el('div', 'list-item');
        item.classList.toggle('selected', paintLayerIndex === layerIdx);
        item.addEventListener('click', () => {
            paintLayerIndex = layerIdx;
            setTool('paint');
            renderRightPanel();
        });
        const label = el('span', 'list-label', layer.name);
        const editBtn = el<HTMLButtonElement>('button', 'tb-btn');
        editBtn.textContent = 'Edit';
        editBtn.style.padding = '2px 7px';
        editBtn.style.fontSize = '11px';
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openLayerDialog(layerIdx);
        });
        const delBtn = el<HTMLButtonElement>('button', 'tb-btn danger');
        delBtn.textContent = '−';
        delBtn.style.padding = '2px 7px';
        delBtn.style.fontSize = '11px';
        delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            map.terrain.layers.splice(layerIdx, 1);
            map.terrain.layerWeights.splice(layerIdx, 1);
            if (paintLayerIndex >= map.terrain.layers.length) {
                paintLayerIndex = Math.max(0, map.terrain.layers.length - 1);
            }
            rebuildTerrain(ctx, map.terrain);
            terrainEditor.setMesh(ctx.terrainMesh, map.terrain, ctx.terrainSplatMap);
            contourMesh.geometry = ctx.terrainMesh.geometry;
            regionOverlayMesh.geometry = ctx.terrainMesh.geometry;
            renderRightPanel();
        });
        item.appendChild(label);
        item.appendChild(editBtn);
        item.appendChild(delBtn);
        body.appendChild(item);
    }

    if (map.terrain.layers.length < 4) {
        const addBtn = el<HTMLButtonElement>('button', 'list-add-btn');
        addBtn.textContent = '+ Add Layer';
        addBtn.addEventListener('click', () => openLayerDialog(-1));
        body.appendChild(addBtn);
    }

    body.appendChild(
        actionBtn('Apply Terrain Size', 'primary', () => {
            const oldH = map.terrain.heights;
            const oldW = map.terrain.width;
            const oldD = map.terrain.depth;
            const newH = new Array(newW * newD).fill(0) as number[];
            const offsetX = Math.floor((newW - oldW) / 2);
            const offsetZ = Math.floor((newD - oldD) / 2);
            for (let z = 0; z < oldD; z++) {
                for (let x = 0; x < oldW; x++) {
                    const nx = x + offsetX;
                    const nz = z + offsetZ;
                    if (nx >= 0 && nx < newW && nz >= 0 && nz < newD) {
                        newH[nz * newW + nx] = oldH[z * oldW + x] ?? 0;
                    }
                }
            }
            map.terrain.layerWeights = map.terrain.layerWeights.map((weights) => {
                const newWeights = new Array(newW * newD).fill(0) as number[];
                for (let z = 0; z < oldD; z++) {
                    for (let x = 0; x < oldW; x++) {
                        const nx = x + offsetX;
                        const nz = z + offsetZ;
                        if (nx >= 0 && nx < newW && nz >= 0 && nz < newD) {
                            newWeights[nz * newW + nx] = weights[z * oldW + x] ?? 0;
                        }
                    }
                }
                return newWeights;
            });
            const newRM = new Array(newW * newD).fill(-1) as number[];
            for (let z = 0; z < oldD; z++) {
                for (let x = 0; x < oldW; x++) {
                    const nx = x + offsetX; const nz = z + offsetZ;
                    if (nx >= 0 && nx < newW && nz >= 0 && nz < newD)
                        newRM[nz * newW + nx] = map.terrain.regionMap[z * oldW + x] ?? -1;
                }
            }
            map.terrain.regionMap = newRM;
            map.terrain.width = newW;
            map.terrain.depth = newD;
            map.terrain.cellSize = newCS;
            map.terrain.heights = newH;
            rebuildTerrain(ctx, map.terrain);
            terrainEditor.setMesh(ctx.terrainMesh, map.terrain, ctx.terrainSplatMap);
            contourMesh.geometry = ctx.terrainMesh.geometry;
            updateRegionOverlay(ctx.regionOverlayTex, map.terrain, map.regions);
            regionOverlayMesh.geometry = ctx.terrainMesh.geometry;
        })
    );

    body.appendChild(makeSection('Sky'));
    body.appendChild(
        makeField(
            'Color',
            colorInput(map.sky.color, (v) => {
                map.sky.color = v;
                applySky(ctx.scene, map.sky);
            })
        )
    );
    body.appendChild(
        textureField('Texture (equirectangular)', map.sky.texture ?? '', (v) => {
            map.sky.texture = v.trim() || null;
            applySky(ctx.scene, map.sky);
        })
    );

    body.appendChild(makeSection('Light'));
    body.appendChild(
        makeField(
            'Ambient Color',
            colorInput(map.light.ambientColor, (v) => {
                map.light.ambientColor = v;
                applyLight(ctx.ambientLight, ctx.sunLight, ctx.renderer, map.light);
            })
        )
    );
    body.appendChild(
        makeField(
            'Ambient Intensity',
            numInput(
                map.light.ambientIntensity,
                (v) => {
                    map.light.ambientIntensity = Math.max(0, v);
                    applyLight(ctx.ambientLight, ctx.sunLight, ctx.renderer, map.light);
                },
                0.1
            )
        )
    );
    body.appendChild(
        makeField(
            'Sun Color',
            colorInput(map.light.sunColor, (v) => {
                map.light.sunColor = v;
                applyLight(ctx.ambientLight, ctx.sunLight, ctx.renderer, map.light);
            })
        )
    );
    body.appendChild(
        makeField(
            'Sun Intensity',
            numInput(
                map.light.sunIntensity,
                (v) => {
                    map.light.sunIntensity = Math.max(0, v);
                    applyLight(ctx.ambientLight, ctx.sunLight, ctx.renderer, map.light);
                },
                0.1
            )
        )
    );
    body.appendChild(
        vec3Field('Sun Position', map.light.sunPosition, (i, v) => {
            map.light.sunPosition[i] = v;
            applyLight(ctx.ambientLight, ctx.sunLight, ctx.renderer, map.light);
        })
    );
    body.appendChild(
        checkboxInput(map.light.shadows, 'Shadows', (v) => {
            map.light.shadows = v;
            applyLight(ctx.ambientLight, ctx.sunLight, ctx.renderer, map.light);
        })
    );
}

function renderInstancePanel(body: HTMLElement, instance: ObjectInstance): void {
    body.appendChild(makeSection('Instance'));
    body.appendChild(
        makeField(
            'Type',
            selectInput(
                instance.defId,
                map.objectDefs.map((d) => d.id),
                (v) => {
                    instance.defId = v;
                    const def = map.objectDefs.find((d) => d.id === v);
                    const group = ctx.objectGroups.get(instance.id);
                    if (def && group) rebuildObjectGroup(group, def, instance);
                    renderLeftPanel();
                }
            )
        )
    );

    body.appendChild(
        vec3Field(
            'Position',
            instance.position,
            (i, v) => {
                instance.position[i] = v;
                const g = ctx.objectGroups.get(instance.id);
                if (g) {
                    g.position.setComponent(i, v);
                    selectionBox.setFromObject(g);
                }
            },
            ['pos-x', 'pos-y', 'pos-z']
        )
    );

    body.appendChild(
        vec3Field(
            'Rotation',
            instance.rotation,
            (i, v) => {
                instance.rotation[i] = v;
                const g = ctx.objectGroups.get(instance.id);
                if (g) {
                    g.rotation.set(instance.rotation[0], instance.rotation[1], instance.rotation[2]);
                    selectionBox.setFromObject(g);
                }
            },
            ['rot-x', 'rot-y', 'rot-z']
        )
    );

    body.appendChild(
        vec3Field(
            'Scale',
            instance.scale,
            (i, v) => {
                instance.scale[i] = Math.max(0.001, v);
                const g = ctx.objectGroups.get(instance.id);
                if (g) {
                    g.scale.setComponent(i, Math.max(0.001, v));
                    selectionBox.setFromObject(g);
                }
            },
            ['scl-x', 'scl-y', 'scl-z']
        )
    );

    body.appendChild(
        actionBtn('Delete Instance', 'danger', () => {
            const group = ctx.objectGroups.get(instance.id);
            if (group) {
                ctx.scene.remove(group);
                ctx.objectGroups.delete(instance.id);
            }
            map.objects = map.objects.filter((o) => o.id !== instance.id);
            clearSelection();
        })
    );
}

function renderDefsRightPanel(body: HTMLElement): void {
    if (!defsSelDefId) {
        body.appendChild(el('div', 'empty-msg', 'Select a definition'));
        return;
    }
    const def = map.objectDefs.find((d) => d.id === defsSelDefId);
    if (!def) return;

    body.appendChild(makeSection('Definition'));
    body.appendChild(
        makeField(
            'Name',
            textInput(def.name, (v) => {
                def.name = v;
                renderLeftPanel();
            })
        )
    );
    body.appendChild(
        makeField(
            'ID',
            textInput(def.id, (v) => {
                const old = def.id;
                def.id = v;
                map.objects.forEach((o) => {
                    if (o.defId === old) o.defId = v;
                });
                defsSelDefId = v;
                renderLeftPanel();
            })
        )
    );

    if (defsSelCompIdx < 0 || defsSelCompIdx >= def.components.length) return;

    const comp = def.components[defsSelCompIdx]!;
    body.appendChild(makeSection('Component'));

    body.appendChild(
        makeField(
            'Type',
            selectInput(comp.type, ['cube', 'cylinder', 'sphere', 'billboard', 'sprite', 'plane'], (v) => {
                if (v === comp.type) return;
                const rot3: [number, number, number] =
                    'rotation' in comp ? (comp as CubeComponent).rotation : [0, 0, 0];
                const sz3: [number, number, number] =
                    'size' in comp && (comp as CubeComponent).size?.length === 3
                        ? ((comp as CubeComponent).size as [number, number, number])
                        : [1, 1, 1];
                const sz2: [number, number] =
                    'size' in comp
                        ? [(comp as BillboardComponent).size[0] ?? 1, (comp as BillboardComponent).size[1] ?? 1]
                        : [1, 1];
                if (v === 'cube')
                    def.components[defsSelCompIdx] = {
                        type: 'cube',
                        position: comp.position,
                        rotation: rot3,
                        size: sz3,
                        texture: comp.texture,
                        transparent: comp.transparent,
                    };
                else if (v === 'cylinder')
                    def.components[defsSelCompIdx] = {
                        type: 'cylinder',
                        position: comp.position,
                        rotation: rot3,
                        size: sz3,
                        texture: comp.texture,
                        transparent: comp.transparent,
                    };
                else if (v === 'sphere')
                    def.components[defsSelCompIdx] = {
                        type: 'sphere',
                        position: comp.position,
                        rotation: rot3,
                        size: sz3,
                        texture: comp.texture,
                        transparent: comp.transparent,
                    };
                else if (v === 'plane')
                    def.components[defsSelCompIdx] = {
                        type: 'plane',
                        position: comp.position,
                        rotation: rot3,
                        size: sz2,
                        texture: comp.texture,
                        transparent: comp.transparent,
                    };
                else if (v === 'sprite')
                    def.components[defsSelCompIdx] = {
                        type: 'sprite',
                        position: comp.position,
                        size: sz2,
                        texture: comp.texture,
                        transparent: comp.transparent,
                    };
                else
                    def.components[defsSelCompIdx] = {
                        type: 'billboard',
                        position: comp.position,
                        size: sz2,
                        texture: comp.texture,
                        transparent: comp.transparent,
                    };
                rebuildDefObjects(def);
                selectDefsComp(defsSelCompIdx);
            })
        )
    );

    body.appendChild(
        vec3Field(
            'Position',
            comp.position,
            (i, v) => {
                comp.position[i] = v;
                const mesh = getDefsCompMesh();
                if (mesh) mesh.position.setComponent(i, v);
            },
            ['comp-pos-x', 'comp-pos-y', 'comp-pos-z']
        )
    );

    const has3Size = comp.type === 'cube' || comp.type === 'cylinder' || comp.type === 'sphere';
    const has2Size = comp.type === 'plane' || comp.type === 'billboard' || comp.type === 'sprite';
    const hasRot = comp.type === 'cube' || comp.type === 'cylinder' || comp.type === 'sphere' || comp.type === 'plane';

    if (has3Size) {
        const c = comp as CubeComponent | CylinderComponent | SphereComponent;
        body.appendChild(
            vec3Field(
                'Size',
                c.size,
                (i, v) => {
                    c.size[i] = Math.max(0.01, v);
                    const mesh = getDefsCompMesh();
                    if (mesh) mesh.scale.setComponent(i, Math.max(0.01, v));
                },
                ['comp-sz-x', 'comp-sz-y', 'comp-sz-z']
            )
        );
    } else if (has2Size) {
        const c = comp as PlaneComponent | BillboardComponent | SpriteComponent;
        body.appendChild(
            vec2Field(
                'Size',
                c.size,
                (i, v) => {
                    c.size[i] = Math.max(0.01, v);
                    const mesh = getDefsCompMesh();
                    if (mesh) mesh.scale.setComponent(i, Math.max(0.01, v));
                },
                ['comp-sz-x', 'comp-sz-y']
            )
        );
    }

    if (hasRot) {
        const c = comp as CubeComponent | CylinderComponent | SphereComponent | PlaneComponent;
        body.appendChild(
            vec3Field(
                'Rotation',
                c.rotation,
                (i, v) => {
                    c.rotation[i] = v;
                    const mesh = getDefsCompMesh();
                    if (mesh) mesh.rotation.set(c.rotation[0], c.rotation[1], c.rotation[2]);
                },
                ['comp-rot-x', 'comp-rot-y', 'comp-rot-z']
            )
        );
    }

    body.appendChild(
        textureField('Texture', comp.texture, (v) => {
            comp.texture = v;
            rebuildDefObjects(def);
        })
    );
    body.appendChild(
        checkboxInput(comp.transparent, 'Transparent', (v) => {
            comp.transparent = v;
            rebuildDefObjects(def);
        })
    );
    body.appendChild(
        actionBtn('Delete Component', 'danger', () => {
            def.components.splice(defsSelCompIdx, 1);
            const newIdx = Math.min(defsSelCompIdx, def.components.length - 1);
            rebuildDefObjects(def);
            selectDefsComp(newIdx);
        })
    );
}

// ---- Tool management ----

// ---- Layer dialog ----

function openLayerDialog(layerIdx: number): void {
    const dialog = $('layer-dialog') as HTMLDialogElement;
    const titleEl = $('layer-dialog-title');
    const nameInp = $('layer-dialog-name') as HTMLInputElement;
    const texInp = $('layer-dialog-texture') as HTMLInputElement;
    const repeatInp = $('layer-dialog-repeat') as HTMLInputElement;

    const isEdit = layerIdx >= 0;
    titleEl.textContent = isEdit ? 'Edit Layer' : 'Add Layer';
    nameInp.value = isEdit ? (map.terrain.layers[layerIdx]?.name ?? '') : '';
    texInp.value = isEdit ? (map.terrain.layers[layerIdx]?.texture ?? '') : map.terrain.texture;
    repeatInp.value = String(isEdit ? (map.terrain.layers[layerIdx]?.repeat ?? 1) : 1);

    const save = $('layer-dialog-save');
    const cancel = $('layer-dialog-cancel');
    const upload = $('layer-dialog-upload');

    const onSave = (): void => {
        const name = nameInp.value.trim() || 'Layer';
        const texture = texInp.value.trim() || map.terrain.texture;
        const repeat = Math.max(0.25, parseFloat(repeatInp.value) || 1);
        if (isEdit) {
            map.terrain.layers[layerIdx]!.name = name;
            map.terrain.layers[layerIdx]!.texture = texture;
            map.terrain.layers[layerIdx]!.repeat = repeat;
        } else {
            const newIndex = map.terrain.layers.length;
            map.terrain.layers.push({ name, texture, repeat });
            map.terrain.layerWeights[newIndex] = new Array(map.terrain.width * map.terrain.depth).fill(0) as number[];
            paintLayerIndex = newIndex;
        }
        rebuildTerrain(ctx, map.terrain);
        terrainEditor.setMesh(ctx.terrainMesh, map.terrain, ctx.terrainSplatMap);
        contourMesh.geometry = ctx.terrainMesh.geometry;
        regionOverlayMesh.geometry = ctx.terrainMesh.geometry;
        if (!isEdit) setTool('paint');
        dialog.close();
        renderRightPanel();
    };

    const onCancel = (): void => dialog.close();

    const onUpload = (): void => {
        const fi = document.createElement('input');
        fi.type = 'file';
        fi.accept = '.png,.jpg,.jpeg';
        fi.addEventListener('change', () => {
            const file = fi.files?.[0];
            if (!file) return;
            uploadTexture(file)
                .then((path) => { texInp.value = path; })
                .catch((e: unknown) => alert(`Upload failed: ${String(e)}`));
        });
        fi.click();
    };

    // Replace listeners to avoid stacking
    const newSave = save.cloneNode(true) as HTMLElement;
    const newCancel = cancel.cloneNode(true) as HTMLElement;
    const newUpload = upload.cloneNode(true) as HTMLElement;
    save.replaceWith(newSave);
    cancel.replaceWith(newCancel);
    upload.replaceWith(newUpload);
    newSave.addEventListener('click', onSave);
    newCancel.addEventListener('click', onCancel);
    newUpload.addEventListener('click', onUpload);

    dialog.showModal();
}

function setTool(tool: MapTool): void {
    currentTool = tool;
    (['select', 'place', 'raise', 'lower', 'level', 'paint', 'scatter'] as const).forEach((t) => {
        $(`btn-${t}`).classList.toggle('active', t === tool);
    });
    const isTerrain = tool === 'raise' || tool === 'lower' || tool === 'level' || tool === 'paint' || tool === 'region';
    const showBrush = isTerrain || tool === 'scatter';
    $('brush-controls').classList.toggle('visible', showBrush);
    terrainEditor.showBrush(showBrush);
    contourMesh.visible = tool === 'raise' || tool === 'lower' || tool === 'level';
    regionOverlayMesh.visible = tool === 'region';
    if (tool !== 'select') {
        transformControls.detach();
        selectionBox.visible = false;
        // Terrain tools keep settings open so the layer list stays visible
        if (isTerrain && tool !== 'region') {
            mapSel = 'settings';
        } else if (tool === 'region') {
            mapSel = null;
        } else {
            mapSel = null;
        }
    }
    if (tool === 'place' || tool === 'scatter') {
        placeDefId = map.objectDefs[0]?.id ?? null;
        setGhostDef(tool === 'place' ? placeDefId : null);
    } else {
        setGhostDef(null);
    }
    if (tool !== 'scatter') scatterAccum = 0;
    renderLeftPanel();
    renderRightPanel();
}

function setTransformMode(mode: TransformMode): void {
    transformMode = mode;
    (['translate', 'rotate', 'scale'] as const).forEach((m) => {
        $(`btn-${m}`).classList.toggle('active', m === mode);
    });
    transformControls.setMode(mode);
}

function setDefsTransformMode(mode: TransformMode): void {
    defsTransformMode = mode;
    (['translate', 'rotate', 'scale'] as const).forEach((m) => {
        $(`btn-defs-${m}`).classList.toggle('active', m === mode);
    });
    defsTransformControls.setMode(mode);
}

// ---- Tab management ----

function switchTab(tab: Tab): void {
    activeTab = tab;
    $('tab-world').classList.toggle('active', tab === 'world');
    $('tab-defs').classList.toggle('active', tab === 'defs');
    ($('toolbar-world') as HTMLElement).style.display = tab === 'world' ? 'flex' : 'none';
    ($('toolbar-defs') as HTMLElement).style.display = tab === 'defs' ? 'flex' : 'none';

    if (tab === 'world') {
        orbitControls.enabled = true;
        defsOrbit.enabled = false;
        defsTransformControls.detach();
        defsTransformHelper.visible = false;
        transformHelper.visible = true;
        selectionBox.visible = mapSel !== null && mapSel !== 'settings';
    } else {
        orbitControls.enabled = false;
        defsOrbit.enabled = true;
        transformControls.detach();
        transformHelper.visible = false;
        selectionBox.visible = false;
        defsTransformHelper.visible = true;
        setGhostDef(null);
        rebuildDefsPreview();
    }
    renderLeftPanel();
    renderRightPanel();
}

// ---- Viewport events ----

function setupViewportEvents(): void {
    const canvas = ctx.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0 && e.button !== 2) return;
        if (e.button === 0) isMouseDown = true;
        if (e.button === 2) isRightMouseDown = true;
        if (activeTab !== 'world') return;
        if (e.button === 0 && currentTool === 'select') {
            if (transformControls.dragging) return;
            const group = getObjectHit(e);
            if (group) {
                selectMapItem(group.userData['instanceId'] as string);
            } else {
                clearSelection();
            }
        } else if (e.button === 0 && currentTool === 'place') {
            if (!placeDefId) return;
            const def = map.objectDefs.find((d) => d.id === placeDefId);
            if (!def) return;
            const hit = getTerrainHit(e);
            if (!hit) return;
            const instance: ObjectInstance = {
                id: `obj_${Date.now()}`,
                defId: placeDefId,
                position: [Math.round(hit.x * 10) / 10, hit.y, Math.round(hit.z * 10) / 10],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
            };
            map.objects.push(instance);
            const group = buildObjectGroup(def, instance);
            ctx.scene.add(group);
            ctx.objectGroups.set(instance.id, group);
            // Stay in place mode - do not switch to select
            renderLeftPanel();
        } else if (currentTool === 'raise' || currentTool === 'lower') {
            if (e.button !== 0) return;
            orbitControls.enabled = false;
            brushHit = terrainEditor.onMouseMove(e, ctx.camera, canvas, brushSize);
        } else if (currentTool === 'level') {
            if (e.button !== 0) return;
            orbitControls.enabled = false;
            brushHit = terrainEditor.onMouseMove(e, ctx.camera, canvas, brushSize);
            if (brushHit) levelTargetHeight = getTerrainY(map.terrain, brushHit.x, brushHit.z);
        } else if (currentTool === 'paint') {
            orbitControls.enabled = false;
            brushHit = terrainEditor.onMouseMove(e, ctx.camera, canvas, brushSize);
        } else if (currentTool === 'region') {
            if (e.button !== 0 && e.button !== 2) return;
            orbitControls.enabled = false;
            brushHit = terrainEditor.onMouseMove(e, ctx.camera, canvas, brushSize);
        } else if (currentTool === 'scatter') {
            orbitControls.enabled = false;
            brushHit = terrainEditor.onMouseMove(e, ctx.camera, canvas, brushSize);
        }
    });

    document.addEventListener('mouseup', (e) => {
        if (e.button === 0) isMouseDown = false;
        if (e.button === 2) isRightMouseDown = false;
        if (currentTool === 'raise' || currentTool === 'lower' || currentTool === 'level' || currentTool === 'paint' || currentTool === 'region' || currentTool === 'scatter') {
            orbitControls.enabled = true;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (activeTab !== 'world') return;
        if (currentTool === 'place') {
            updateGhost(e);
        } else if (currentTool === 'raise' || currentTool === 'lower' || currentTool === 'level' || currentTool === 'paint' || currentTool === 'region' || currentTool === 'scatter') {
            brushHit = terrainEditor.onMouseMove(e, ctx.camera, canvas, brushSize);
        }
    });

    // Hide ghost when mouse leaves canvas
    canvas.addEventListener('mouseleave', () => {
        if (ghostGroup) ghostGroup.visible = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

// ---- Toolbar events ----

function setupToolbarEvents(): void {
    $('btn-select').addEventListener('click', () => setTool('select'));
    $('btn-place').addEventListener('click', () => setTool('place'));
    $('btn-raise').addEventListener('click', () => setTool('raise'));
    $('btn-lower').addEventListener('click', () => setTool('lower'));
    $('btn-level').addEventListener('click', () => setTool('level'));
    $('btn-paint').addEventListener('click', () => setTool('paint'));
    $('btn-scatter').addEventListener('click', () => setTool('scatter'));
    $('btn-translate').addEventListener('click', () => setTransformMode('translate'));
    $('btn-rotate').addEventListener('click', () => setTransformMode('rotate'));
    $('btn-scale').addEventListener('click', () => setTransformMode('scale'));

    $('btn-defs-translate').addEventListener('click', () => setDefsTransformMode('translate'));
    $('btn-defs-rotate').addEventListener('click', () => setDefsTransformMode('rotate'));
    $('btn-defs-scale').addEventListener('click', () => setDefsTransformMode('scale'));

    const brushSizeInp = $('brush-size') as HTMLInputElement;
    const brushSizeLbl = $('brush-size-label');
    brushSizeInp.addEventListener('input', () => {
        brushSize = parseInt(brushSizeInp.value, 10);
        brushSizeLbl.textContent = String(brushSize);
    });

    $('btn-add-def').addEventListener('click', () => {
        const id = `def_${Date.now()}`;
        map.objectDefs.push({ id, name: 'New Object', components: [] });
        defsSelDefId = id;
        defsSelCompIdx = -1;
        defsTransformControls.detach();
        renderLeftPanel();
        renderRightPanel();
        rebuildDefsPreview();
    });
    $('btn-del-def').addEventListener('click', () => {
        if (!defsSelDefId) return;
        map.objectDefs = map.objectDefs.filter((d) => d.id !== defsSelDefId);
        map.objects = map.objects.filter((o) => o.defId !== defsSelDefId);
        defsSelDefId = map.objectDefs[0]?.id ?? null;
        defsSelCompIdx = -1;
        defsTransformControls.detach();
        renderLeftPanel();
        renderRightPanel();
        rebuildDefsPreview();
    });
    $('btn-add-cube').addEventListener('click', () => {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (!def) return;
        def.components.push({
            type: 'cube',
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            size: [1, 1, 1],
            texture: 'data/map/textures/placeholder.png',
            transparent: false,
        });
        rebuildDefObjects(def);
        selectDefsComp(def.components.length - 1);
    });
    $('btn-add-cylinder').addEventListener('click', () => {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (!def) return;
        def.components.push({
            type: 'cylinder',
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            size: [1, 1, 1],
            texture: 'data/map/textures/placeholder.png',
            transparent: false,
        });
        rebuildDefObjects(def);
        selectDefsComp(def.components.length - 1);
    });
    $('btn-add-sphere').addEventListener('click', () => {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (!def) return;
        def.components.push({
            type: 'sphere',
            position: [0, 0.5, 0],
            rotation: [0, 0, 0],
            size: [1, 1, 1],
            texture: 'data/map/textures/placeholder.png',
            transparent: false,
        });
        rebuildDefObjects(def);
        selectDefsComp(def.components.length - 1);
    });
    $('btn-add-billboard').addEventListener('click', () => {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (!def) return;
        def.components.push({
            type: 'billboard',
            position: [0, 0.5, 0],
            size: [1, 1],
            texture: 'data/map/textures/placeholder.png',
            transparent: true,
        });
        rebuildDefObjects(def);
        selectDefsComp(def.components.length - 1);
    });
    $('btn-add-sprite').addEventListener('click', () => {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (!def) return;
        def.components.push({
            type: 'sprite',
            position: [0, 0.5, 0],
            size: [1, 1],
            texture: 'data/map/textures/placeholder.png',
            transparent: true,
        });
        rebuildDefObjects(def);
        selectDefsComp(def.components.length - 1);
    });
    $('btn-add-plane').addEventListener('click', () => {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (!def) return;
        def.components.push({
            type: 'plane',
            position: [0, 0, 0],
            rotation: [-Math.PI / 2, 0, 0],
            size: [1, 1],
            texture: 'data/map/textures/placeholder.png',
            transparent: false,
        });
        rebuildDefObjects(def);
        selectDefsComp(def.components.length - 1);
    });
    $('btn-del-comp').addEventListener('click', () => {
        const def = map.objectDefs.find((d) => d.id === defsSelDefId);
        if (!def || defsSelCompIdx < 0) return;
        def.components.splice(defsSelCompIdx, 1);
        const newIdx = Math.min(defsSelCompIdx, def.components.length - 1);
        rebuildDefObjects(def);
        selectDefsComp(newIdx);
    });

    $('tab-world').addEventListener('click', () => switchTab('world'));
    $('tab-defs').addEventListener('click', () => switchTab('defs'));

    function triggerSave(): void {
        saveMap(map)
            .then(() => {
                const btn = $('btn-save');
                btn.textContent = 'Saved!';
                setTimeout(() => {
                    btn.textContent = 'Save';
                }, 1500);
            })
            .catch((e: unknown) => alert(`Save failed: ${String(e)}`));
    }

    $('btn-save').addEventListener('click', triggerSave);

    document.addEventListener('keydown', (e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if ((e.ctrlKey || e.metaKey) && e.code === 'KeyS') {
            e.preventDefault();
            triggerSave();
            return;
        }
        keysDown.add(e.code);
        e.preventDefault();
        if (activeTab === 'world' && !e.repeat) {
            if (e.code === 'Delete' && mapSel && mapSel !== 'settings') {
                const group = ctx.objectGroups.get(mapSel);
                if (group) {
                    ctx.scene.remove(group);
                    ctx.objectGroups.delete(mapSel);
                }
                map.objects = map.objects.filter((o) => o.id !== mapSel);
                clearSelection();
            }
        }
    });
}

// ---- Main ----

async function main(): Promise<void> {
    map = await loadMap();
    map.terrain.layers ??= [];
    map.terrain.layerWeights ??= [];
    map.regions ??= [];
    map.terrain.regionMap ??= new Array(map.terrain.width * map.terrain.depth).fill(-1) as number[];

    const viewport = $('viewport');
    ctx = createRenderer(viewport, map);
    ctx.camera.position.set(0, 25, 40);

    // --- World editor controls ---

    orbitControls = new OrbitControls(ctx.camera, ctx.renderer.domElement);
    orbitControls.target.set(0, 0, 0);
    orbitControls.enableDamping = true;
    orbitControls.dampingFactor = 0.08;

    // Restore editor camera from localStorage
    const editorCamLS = 'wildwest_editor_cam';
    try {
        const raw = localStorage.getItem(editorCamLS);
        if (raw) {
            const s = JSON.parse(raw) as { cx: number; cy: number; cz: number; tx: number; ty: number; tz: number };
            ctx.camera.position.set(s.cx, s.cy, s.cz);
            orbitControls.target.set(s.tx, s.ty, s.tz);
        }
    } catch {
        /* ignore */
    }

    orbitControls.update();
    orbitControls.addEventListener('change', () => {
        localStorage.setItem(
            editorCamLS,
            JSON.stringify({
                cx: ctx.camera.position.x,
                cy: ctx.camera.position.y,
                cz: ctx.camera.position.z,
                tx: orbitControls.target.x,
                ty: orbitControls.target.y,
                tz: orbitControls.target.z,
            })
        );
    });

    document.addEventListener('keyup', (e) => {
        keysDown.delete(e.code);
    });

    transformControls = new TransformControls(ctx.camera, ctx.renderer.domElement);
    transformControls.setMode(transformMode);
    transformControls.addEventListener('dragging-changed', (e) => {
        orbitControls.enabled = !(e as THREE.Event & { value: boolean }).value;
    });
    transformControls.addEventListener('objectChange', () => {
        const group = transformControls.object as THREE.Group | undefined;
        if (group) syncInstanceFromGroup(group);
    });
    transformHelper = transformControls.getHelper();
    ctx.scene.add(transformHelper);

    selectionBox = new THREE.BoxHelper(new THREE.Object3D(), 0xff2222);
    selectionBox.visible = false;
    ctx.scene.add(selectionBox);

    terrainEditor = new TerrainEditor(map.terrain, ctx.terrainMesh, ctx.terrainSplatMap, ctx.scene);

    const regionSplatScale = new THREE.Vector2(
        1 / ((map.terrain.width - 1) * map.terrain.cellSize),
        1 / ((map.terrain.depth - 1) * map.terrain.cellSize)
    );
    regionOverlayMesh = new THREE.Mesh(
        ctx.terrainMesh.geometry,
        new THREE.ShaderMaterial({
            transparent: true,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -3,
            polygonOffsetUnits: -3,
            uniforms: {
                regionTex: { value: ctx.regionOverlayTex },
                splatScale: { value: regionSplatScale },
            },
            vertexShader: `
                uniform vec2 splatScale;
                varying vec2 vRegionUv;
                void main() {
                    vRegionUv = position.xz * splatScale + 0.5;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D regionTex;
                varying vec2 vRegionUv;
                void main() {
                    vec4 col = texture2D(regionTex, vRegionUv);
                    if (col.a < 0.01) discard;
                    gl_FragColor = col;
                }
            `,
        })
    );
    regionOverlayMesh.visible = false;
    ctx.scene.add(regionOverlayMesh);

    // Contour line overlay — shown only during raise/lower terrain editing
    contourMesh = new THREE.Mesh(
        ctx.terrainMesh.geometry,
        new THREE.ShaderMaterial({
            transparent: true,
            depthTest: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
            vertexShader: `
            varying float vHeight;
            void main() {
                vHeight = position.y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
            fragmentShader: `
            varying float vHeight;
            void main() {
                if (abs(vHeight) < 0.05) discard;
                float line = fract(vHeight * 10.0);
                float onLine = step(0.95, line) + step(line, 0.05);
                if (onLine < 0.01) discard;
                gl_FragColor = vec4(1.0, 0.85, 0.0, 0.85);
            }
        `,
        })
    );
    contourMesh.visible = false;
    ctx.scene.add(contourMesh);

    // --- Defs preview scene ---

    defsScene = new THREE.Scene();
    defsScene.background = new THREE.Color(0x1a1a2e);

    const defsAmbient = new THREE.AmbientLight(0xffffff, 0.7);
    defsScene.add(defsAmbient);
    const defsSun = new THREE.DirectionalLight(0xffffff, 1.0);
    defsSun.position.set(5, 10, 5);
    defsScene.add(defsSun);

    const grid = new THREE.GridHelper(20, 20, 0x555555, 0x333333);
    defsScene.add(grid);
    const axes = new THREE.AxesHelper(2);
    defsScene.add(axes);

    defsGroup = new THREE.Group();
    defsScene.add(defsGroup);

    defsCamera = new THREE.PerspectiveCamera(60, viewport.clientWidth / viewport.clientHeight, 0.01, 200);
    defsCamera.position.set(3, 3, 3);

    defsOrbit = new OrbitControls(defsCamera, ctx.renderer.domElement);
    defsOrbit.target.set(0, 0, 0);
    defsOrbit.enableDamping = true;
    defsOrbit.dampingFactor = 0.1;
    defsOrbit.enabled = false;

    // Defs TransformControls (uses defsCamera so gizmo scales correctly)
    defsTransformControls = new TransformControls(defsCamera, ctx.renderer.domElement);
    defsTransformControls.setMode(defsTransformMode);
    defsTransformControls.addEventListener('dragging-changed', (e) => {
        defsOrbit.enabled = !(e as THREE.Event & { value: boolean }).value;
    });
    defsTransformControls.addEventListener('objectChange', () => {
        const mesh = defsTransformControls.object;
        if (mesh) syncCompFromMesh(mesh);
    });
    defsTransformHelper = defsTransformControls.getHelper();
    defsTransformHelper.visible = false;
    defsScene.add(defsTransformHelper);

    new ResizeObserver(() => {
        defsCamera.aspect = viewport.clientWidth / viewport.clientHeight;
        defsCamera.updateProjectionMatrix();
    }).observe(viewport);

    // --- Setup ---
    setupToolbarEvents();
    setupViewportEvents();
    renderLeftPanel();
    renderRightPanel();

    // --- Render loop ---
    let lastTime = performance.now();
    function frame(): void {
        requestAnimationFrame(frame);
        const now = performance.now();
        const delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;

        if (activeTab === 'world') {
            const moveSpeed = 120 * delta;
            if (keysDown.has('KeyW') || keysDown.has('KeyA') || keysDown.has('KeyS') || keysDown.has('KeyD')) {
                const forward = new THREE.Vector3();
                ctx.camera.getWorldDirection(forward);
                forward.y = 0;
                forward.normalize();
                const right = new THREE.Vector3().crossVectors(forward, THREE.Object3D.DEFAULT_UP).normalize();
                const move = new THREE.Vector3();
                if (keysDown.has('KeyW')) move.addScaledVector(forward, moveSpeed);
                if (keysDown.has('KeyS')) move.addScaledVector(forward, -moveSpeed);
                if (keysDown.has('KeyA')) move.addScaledVector(right, -moveSpeed);
                if (keysDown.has('KeyD')) move.addScaledVector(right, moveSpeed);
                ctx.camera.position.add(move);
                orbitControls.target.add(move);
            }
            orbitControls.update();
            if (isMouseDown && (currentTool === 'raise' || currentTool === 'lower') && brushHit) {
                terrainEditor.applyBrush(
                    brushHit,
                    currentTool === 'raise',
                    brushSize,
                    delta,
                    map.objects,
                    ctx.objectGroups
                );
            }
            if (isMouseDown && currentTool === 'level' && brushHit) {
                terrainEditor.applyLevelBrush(brushHit, levelTargetHeight, brushSize, delta, map.objects, ctx.objectGroups);
            }
            if ((isMouseDown || isRightMouseDown) && currentTool === 'paint' && brushHit) {
                terrainEditor.applyPaintBrush(brushHit, paintLayerIndex, brushSize, delta, isRightMouseDown);
            }
            if ((isMouseDown || isRightMouseDown) && currentTool === 'region' && brushHit) {
                const paintIdx = isRightMouseDown ? -1 : regionSelIndex;
                terrainEditor.applyRegionBrush(brushHit, paintIdx, brushSize);
                updateRegionOverlay(ctx.regionOverlayTex, map.terrain, map.regions);
            }
            if (isMouseDown && currentTool === 'scatter' && brushHit && placeDefId) {
                const def = map.objectDefs.find((d) => d.id === placeDefId);
                if (def) {
                    scatterAccum += delta * brushSize * 0.5;
                    while (scatterAccum >= 1) {
                        scatterAccum -= 1;
                        const angle = Math.random() * Math.PI * 2;
                        const dist = Math.sqrt(Math.random()) * brushSize;
                        const x = brushHit.x + Math.cos(angle) * dist;
                        const z = brushHit.z + Math.sin(angle) * dist;
                        const y = getTerrainY(map.terrain, x, z);
                        const rotY = isAutoRotatedDef(def) ? 0 : Math.random() * Math.PI * 2;
                        const instance: ObjectInstance = {
                            id: `obj_${Date.now()}_${scatterIdSeq++}`,
                            defId: placeDefId,
                            position: [Math.round(x * 10) / 10, y, Math.round(z * 10) / 10],
                            rotation: [0, rotY, 0],
                            scale: [1, 1, 1],
                        };
                        map.objects.push(instance);
                        const group = buildObjectGroup(def, instance);
                        ctx.scene.add(group);
                        ctx.objectGroups.set(instance.id, group);
                    }
                }
            }
            if (isRightMouseDown && currentTool === 'scatter' && brushHit) {
                const hit = brushHit;
                const r2 = brushSize * brushSize;
                const toRemove = map.objects.filter((o) => {
                    const dx = o.position[0] - hit.x;
                    const dz = o.position[2] - hit.z;
                    return dx * dx + dz * dz <= r2;
                });
                for (const o of toRemove) {
                    const group = ctx.objectGroups.get(o.id);
                    if (group) ctx.scene.remove(group);
                    ctx.objectGroups.delete(o.id);
                }
                if (toRemove.length > 0) {
                    const removeIds = new Set(toRemove.map((o) => o.id));
                    map.objects = map.objects.filter((o) => !removeIds.has(o.id));
                }
            }
            renderFrame(ctx);
        } else {
            defsOrbit.update();
            ctx.renderer.render(defsScene, defsCamera);
        }
    }
    frame();
}

main().catch(console.error);
