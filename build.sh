#!/bin/bash
set -e

rm -rf dist
mkdir -p dist
cp -r 2021 2022 2023 index.html dist

(cd 2024 && npm run build)
rm -rf dist/2024
cp -r 2024/dist dist/2024
