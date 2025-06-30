/*
 * Copyright (c) 2025 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import Spritesmith from 'spritesmith';

function getPngFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat && stat.isDirectory()) {
            results = results.concat(getPngFiles(filePath));
        } else if (filePath.endsWith('.png')) {
            results.push(filePath);
        }
    });
    return results;
}

Spritesmith.run(
    {
        src: getPngFiles('src/images'),
    },
    (err, result) => {
        if (err) {
            console.error('Error generating texture atlas:', err);
            return;
        }
        fs.mkdirSync('target', { recursive: true });
        fs.writeFileSync(`target/atlas.json`, JSON.stringify(result.coordinates));
        fs.writeFileSync(`target/atlas.png`, result.image);
        try {
            execSync('optipng -strip all target/atlas.png');
        } catch (err) {
            console.error('optipng not found or failed', err);
            return;
        }
    }
);
