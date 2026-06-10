/*
 * Copyright (c) 2026 Bastiaan van der Plaat
 *
 * SPDX-License-Identifier: MIT
 */

let _lastMs = 0;
let _seq = 0;

// Generates a UUIDv7 string (time-ordered, uses crypto.getRandomValues for rand_b).
export function generateId(): string {
    let ms = Date.now();
    if (ms <= _lastMs) {
        ms = _lastMs;
        _seq = (_seq + 1) & 0xfff;
    } else {
        _lastMs = ms;
        _seq = 0;
    }
    const buf = new Uint8Array(16);
    const msHi = Math.floor(ms / 0x100000000);
    const msLo = ms >>> 0;
    buf[0] = (msHi >> 8) & 0xff;
    buf[1] = msHi & 0xff;
    buf[2] = (msLo >> 24) & 0xff;
    buf[3] = (msLo >> 16) & 0xff;
    buf[4] = (msLo >> 8) & 0xff;
    buf[5] = msLo & 0xff;
    buf[6] = 0x70 | ((_seq >> 8) & 0x0f);
    buf[7] = _seq & 0xff;
    crypto.getRandomValues(buf.subarray(8));
    buf[8] = 0x80 | (buf[8]! & 0x3f);
    return uuidBytesToString(buf);
}

function uuidBytesToString(b: Uint8Array): string {
    const hex = Array.from(b, (v) => v.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
