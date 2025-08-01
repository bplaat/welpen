#!/bin/bash
set -e

function clean() {
    rm -rf target
}

function check_copyright() {
    echo "Checking copyright headers..."
    exit=0
    for file in $(find . \( -name "*.html" -o -name "*.js" -o -name "*.ts" -o -name "*.css" \) ! -name "*.min.js" | grep -v node_modules | grep -v target); do
        if ! grep -E -q "Copyright \(c\) 20[0-9]{2}(-20[0-9]{2})? \w+" "$file"; then
            echo "Bad copyright header in: $file"
            exit=1
        fi
    done
    if [ "$exit" -ne 0 ]; then
        exit 1
    fi
}

function check_web() {
    # Format
    echo "Checking web formatting..."
    # This is the default Prettier version, in the VSCode extension :|
    npx --prefer-offline --yes prettier@2.8.8 --check --write $(find . \( -name "*.html" -o -name "*.js" -o -name "*.ts" -o -name "*.css" \) ! -name "*.min.js" | grep -v node_modules | grep -v target)
}

function check() {
    check_copyright
    check_web
}

function build() {
    rm -rf target && mkdir -p target
    cp -r 2021 2022 2023 index.html target

    (cd 2024 && npm run build)
    rm -rf target/2024
    cp -r 2024/target/dist target/2024
}

case "${1:-check}" in
    clean)
        clean
        ;;
    check)
        check
        ;;
    build)
        build
        ;;
    *)
        echo "Usage: $0 {clean|check|build}"
        exit 1
        ;;
esac
