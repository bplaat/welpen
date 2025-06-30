/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import atlasJson from '../target/atlas.json' assert { type: 'json' };
type Atlas = {
    [key: string]: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
};
const atlas: Atlas = atlasJson;

import atlasImageSrc from '../target/atlas.png';
const atlasImage = new Image();
atlasImage.src = atlasImageSrc;

export { atlas, atlasImage };
