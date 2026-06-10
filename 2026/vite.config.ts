/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

import { execSync } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { writeFile, mkdir, cp } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

function protoPlugin(): Plugin {
    return {
        name: 'proto',
        buildStart() {
            execSync('mkdir -p src-gen');
            execSync(
                'protoc' +
                    ' --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto' +
                    ' --ts_proto_out=./src-gen' +
                    ' --ts_proto_opt=esModuleInterop=true,forceLong=number,useOptionals=messages,env=browser,outputIndex=false' +
                    ' --proto_path=src src/map.proto',
                { stdio: 'inherit' }
            );
        },
    };
}

const MIME: Record<string, string> = {
    '.bin': 'application/octet-stream',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.fbx': 'application/octet-stream',
};

function serveDataPlugin(): Plugin {
    return {
        name: 'serve-data',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? '/';
                const match = url.match(/^(?:\/2026)?\/data\//);
                if (!match) {
                    next();
                    return;
                }
                const relPath = 'data/' + url.slice(match[0].length).split('?')[0];
                const absPath = join(process.cwd(), relPath);
                if (!existsSync(absPath)) {
                    next();
                    return;
                }
                const mime = MIME[extname(absPath)] ?? 'application/octet-stream';
                res.setHeader('Content-Type', mime);
                const stream = createReadStream(absPath);
                stream.on('error', () => {
                    res.statusCode = 404;
                    res.end();
                });
                stream.pipe(res as import('stream').Writable);
            });
        },
    };
}

function writeFilePlugin(): Plugin {
    return {
        name: 'write-file',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const url = req.url ?? '/';
                if (!url.startsWith('/api/write-file') && !url.startsWith('/2026/api/write-file')) {
                    next();
                    return;
                }
                if (req.method !== 'POST') {
                    next();
                    return;
                }
                const chunks: Buffer[] = [];
                req.on('data', (chunk: Buffer) => chunks.push(chunk));
                req.on('end', () => {
                    const body = JSON.parse(Buffer.concat(chunks).toString()) as {
                        path: string;
                        content: string;
                        binary?: boolean;
                    };
                    const absPath = join(process.cwd(), body.path);
                    const buf = body.binary ? Buffer.from(body.content, 'base64') : Buffer.from(body.content, 'utf-8');
                    mkdir(dirname(absPath), { recursive: true })
                        .then(() => writeFile(absPath, buf))
                        .then(() => {
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ ok: true }));
                        })
                        .catch((e: unknown) => {
                            res.statusCode = 500;
                            res.end(JSON.stringify({ error: String(e) }));
                        });
                });
            });
        },
    };
}

function copyDataPlugin(): Plugin {
    return {
        name: 'copy-data',
        async closeBundle() {
            const src1 = join(process.cwd(), 'data/characters');
            const dest1 = join(process.cwd(), 'target/dist/data/characters');
            await cp(src1, dest1, { recursive: true });

            const src2 = join(process.cwd(), 'data/map');
            const dest2 = join(process.cwd(), 'target/dist/data/map');
            await cp(src2, dest2, { recursive: true });
        },
    };
}

export default defineConfig({
    base: '/2026/',
    build: {
        outDir: 'target/dist',
        rollupOptions: {
            // Only bundle the game for production; editor only runs in dev server
            input: { game: 'index.html' },
        },
    },
    plugins: [protoPlugin(), serveDataPlugin(), writeFilePlugin(), copyDataPlugin()],
});
