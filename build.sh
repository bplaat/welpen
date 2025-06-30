#!/bin/bash
set -e

rm -rf target
mkdir -p target
cp -r 2021 2022 2023 index.html target

(cd 2024 && npm run build)
rm -rf target/2024
cp -r 2024/target/dist target/2024
