/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

export type AnimationState = 'idle' | 'walk' | 'run' | 'jump';

export interface CharacterController {
    group: THREE.Group;
    mixer: THREE.AnimationMixer;
    setState(state: AnimationState, jumpHalfTime?: number): void;
    reverseJump(): void;
    onJumpFinished: (() => void) | null;
    update(delta: number): void;
}

const FADE_DURATION = 0.2;
const CHARACTER_SCALE = 0.001;
const CHARACTER_Y_OFFSET = -0.1;

// Remove position and scale tracks - prevents Mixamo root motion from fighting our manual
// positioning. Keeps all rotation formats (quaternion and Euler).
function removePositionTracks(clip: THREE.AnimationClip): THREE.AnimationClip {
    clip.tracks = clip.tracks.filter((t) => !t.name.endsWith('.position') && !t.name.endsWith('.scale'));
    return clip;
}

export async function loadCharacter(): Promise<CharacterController> {
    const loader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();

    const [characterFbx, texture, idleFbx, walkFbx, runFbx, jumpFbx] = await Promise.all([
        loader.loadAsync('data/characters/Cowboy.fbx'),
        texLoader.loadAsync('data/characters/Cowboy.png'),
        loader.loadAsync('data/characters/Idle.fbx'),
        loader.loadAsync('data/characters/Walking.fbx'),
        loader.loadAsync('data/characters/Running.fbx'),
        loader.loadAsync('data/characters/JumpingUp.fbx'),
    ]);

    texture.colorSpace = THREE.SRGBColorSpace;

    characterFbx.scale.setScalar(CHARACTER_SCALE);

    characterFbx.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.SkinnedMesh) {
            obj.castShadow = true;
            obj.receiveShadow = false;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const mat of mats) {
                if (
                    mat instanceof THREE.MeshLambertMaterial ||
                    mat instanceof THREE.MeshPhongMaterial ||
                    mat instanceof THREE.MeshStandardMaterial
                ) {
                    mat.map = texture;
                    mat.needsUpdate = true;
                } else {
                    obj.material = new THREE.MeshLambertMaterial({ map: texture });
                }
            }
        }
    });

    // Compute bounding box after scale and lift so feet sit exactly at y=0
    characterFbx.updateWorldMatrix(true, true);
    const bbox = new THREE.Box3().setFromObject(characterFbx);
    characterFbx.position.y -= bbox.min.y + CHARACTER_Y_OFFSET;

    const mixer = new THREE.AnimationMixer(characterFbx);

    function makeAction(fbx: THREE.Group, loopOnce = false): THREE.AnimationAction {
        const clip = fbx.animations[0];
        if (!clip) throw new Error('FBX has no animation clip');
        const action = mixer.clipAction(removePositionTracks(clip));
        if (loopOnce) {
            action.loop = THREE.LoopOnce;
            action.clampWhenFinished = true;
        }
        return action;
    }

    const idleAction = makeAction(idleFbx);
    const walkAction = makeAction(walkFbx);
    const runAction = makeAction(runFbx);
    const jumpAction = makeAction(jumpFbx, true);

    idleAction.play();

    let currentAction: THREE.AnimationAction = idleAction;
    let currentState: AnimationState = 'idle';
    let onJumpFinished: (() => void) | null = null;

    mixer.addEventListener('finished', (e) => {
        if ((e as THREE.Event & { action: THREE.AnimationAction }).action === jumpAction) {
            onJumpFinished?.();
        }
    });

    const group = new THREE.Group();
    group.add(characterFbx);

    const controller: CharacterController = {
        group,
        mixer,
        onJumpFinished: null,
        setState(state: AnimationState, jumpHalfTime?: number): void {
            if (state === currentState) return;
            const targetAction =
                state === 'idle'
                    ? idleAction
                    : state === 'walk'
                      ? walkAction
                      : state === 'run'
                        ? runAction
                        : jumpAction;
            // For jump: set timeScale so the clip reaches its end exactly at the arc peak
            const timeScale = state === 'jump' && jumpHalfTime ? jumpAction.getClip().duration / jumpHalfTime : 1;
            targetAction.reset().setEffectiveTimeScale(timeScale).setEffectiveWeight(1).play();
            currentAction.crossFadeTo(targetAction, FADE_DURATION, true);
            currentAction = targetAction;
            currentState = state;
        },
        reverseJump(): void {
            if (currentState !== 'jump') return;
            jumpAction.paused = false;
            jumpAction.setEffectiveTimeScale(-Math.abs(jumpAction.getEffectiveTimeScale()));
        },
        update(delta: number): void {
            onJumpFinished = this.onJumpFinished;
            mixer.update(delta);
        },
    };

    return controller;
}
