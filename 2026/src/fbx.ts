/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';

const fbxManager = new THREE.LoadingManager();
fbxManager.setURLModifier((url) => {
    if (/\.(png|jpg|jpeg|tga|bmp|dds|webp|tiff)$/i.test(url)) return '';
    return url;
});

export const fbxLoader = new FBXLoader(fbxManager);
