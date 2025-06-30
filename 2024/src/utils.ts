/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

export function img(src: string): HTMLImageElement {
    const img = new Image();
    img.src = src;
    return img;
}
