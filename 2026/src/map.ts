/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import type { GameMap } from './types.ts';

const MAP_FILE = 'data/map/map.json';

export async function loadMap(): Promise<GameMap> {
    const res = await fetch(MAP_FILE);
    if (!res.ok) throw new Error(`Failed to load map: ${res.status}`);
    return (await res.json()) as GameMap;
}

export async function saveMap(map: GameMap): Promise<void> {
    const res = await fetch('/api/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: MAP_FILE, content: JSON.stringify(map) }),
    });
    if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

export async function uploadTexture(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]!);
    const base64 = btoa(binary);
    const destPath = `data/map/textures/${file.name}`;
    const res = await fetch('/api/write-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: destPath, content: base64, binary: true }),
    });
    if (!res.ok) throw new Error('Upload failed');
    return destPath;
}
