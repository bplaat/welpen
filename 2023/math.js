export function degrees(radians) {
    return radians * 180 / Math.PI;
}

export function radians(degrees) {
    return degrees * Math.PI / 180;
}

export function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class Matrix4 {
    constructor(elements) {
        this.elements = elements;
    }

    clone() {
        return new Matrix4(this.elements);
    }

    mul(matrix) {
        const b00 = matrix.elements[0 * 4 + 0];
        const b01 = matrix.elements[0 * 4 + 1];
        const b02 = matrix.elements[0 * 4 + 2];
        const b03 = matrix.elements[0 * 4 + 3];
        const b10 = matrix.elements[1 * 4 + 0];
        const b11 = matrix.elements[1 * 4 + 1];
        const b12 = matrix.elements[1 * 4 + 2];
        const b13 = matrix.elements[1 * 4 + 3];
        const b20 = matrix.elements[2 * 4 + 0];
        const b21 = matrix.elements[2 * 4 + 1];
        const b22 = matrix.elements[2 * 4 + 2];
        const b23 = matrix.elements[2 * 4 + 3];
        const b30 = matrix.elements[3 * 4 + 0];
        const b31 = matrix.elements[3 * 4 + 1];
        const b32 = matrix.elements[3 * 4 + 2];
        const b33 = matrix.elements[3 * 4 + 3];
        const a00 = this.elements[0 * 4 + 0];
        const a01 = this.elements[0 * 4 + 1];
        const a02 = this.elements[0 * 4 + 2];
        const a03 = this.elements[0 * 4 + 3];
        const a10 = this.elements[1 * 4 + 0];
        const a11 = this.elements[1 * 4 + 1];
        const a12 = this.elements[1 * 4 + 2];
        const a13 = this.elements[1 * 4 + 3];
        const a20 = this.elements[2 * 4 + 0];
        const a21 = this.elements[2 * 4 + 1];
        const a22 = this.elements[2 * 4 + 2];
        const a23 = this.elements[2 * 4 + 3];
        const a30 = this.elements[3 * 4 + 0];
        const a31 = this.elements[3 * 4 + 1];
        const a32 = this.elements[3 * 4 + 2];
        const a33 = this.elements[3 * 4 + 3];

        this.elements = [
            b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30,
            b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31,
            b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32,
            b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33,
            b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30,
            b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31,
            b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32,
            b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33,
            b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30,
            b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31,
            b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32,
            b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33,
            b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30,
            b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31,
            b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32,
            b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33,
        ];
        return this;
    }

    static identity() {
        return new Matrix4([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    static perspective(fov, aspect, near, far) {
        const f = Math.tan(Math.PI * 0.5 - 0.5 * fov);
        const r = 1.0 / (near - far);
        return new Matrix4([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * r, -1,
            0, 0, near * far * r * 2, 0
        ]);
    }

    static translate(x, y, z) {
        return new Matrix4([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ]);
    }

    static rotateX(x) {
        const c = Math.cos(x);
        const s = Math.sin(x);
        return new Matrix4([
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1
        ]);
    }

    static rotateY(y) {
        const c = Math.cos(y);
        const s = Math.sin(y);
        return new Matrix4([
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1
        ]);
    }

    static rotateZ(z) {
        const c = Math.cos(z);
        const s = Math.sin(z);
        return new Matrix4([
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    }

    static scale(x, y, z) {
        return new Matrix4([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        ]);
    }

    static flat(width, height) {
        return new Matrix4([
            2 / width, 0, 0, 0,
            0, -2 / height, 0, 0,
            0, 0, 1, 0,
            -1, 1, 0, 1
        ]);
    }

    static rect(x, y, width, height) {
        return new Matrix4([
            width, 0, 0, 0,
            0, height, 0, 0,
            0, 0, 1, 0,
            x + width / 2, y + height / 2, 0, 1
        ]);
    }
}

export class Vector4 {
    constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    clone() {
        return new Vector4(this.x, this.y, this.z, this.w);
    }

    set(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    add(vector) {
        this.x += vector.x;
        this.y += vector.y;
        this.z += vector.z;
        this.w += vector.w;
        return this;
    }

    sub(vector) {
        this.x -= vector.x;
        this.y -= vector.y;
        this.z -= vector.z;
        this.w -= vector.w;
        return this;
    }

    mul(rhs) {
        if (rhs instanceof Vector4) {
            this.x *= rhs.x;
            this.y *= rhs.y;
            this.z *= rhs.z;
            this.w *= rhs.w;
        }
        if (rhs instanceof Matrix4) {
            const x = rhs.elements[0 * 4 + 0] * this.x + rhs.elements[0 * 4 + 1] * this.y + rhs.elements[0 * 4 + 2] * this.z + rhs.elements[0 * 4 + 3] * this.w;
            const y = rhs.elements[1 * 4 + 0] * this.x + rhs.elements[1 * 4 + 1] * this.y + rhs.elements[1 * 4 + 2] * this.z + rhs.elements[1 * 4 + 3] * this.w;
            const z = rhs.elements[2 * 4 + 0] * this.x + rhs.elements[2 * 4 + 1] * this.y + rhs.elements[2 * 4 + 2] * this.z + rhs.elements[2 * 4 + 3] * this.w;
            const w = rhs.elements[3 * 4 + 0] * this.x + rhs.elements[3 * 4 + 1] * this.y + rhs.elements[3 * 4 + 2] * this.z + rhs.elements[3 * 4 + 3] * this.w;
            this.x = x;
            this.y = y;
            this.z = z;
            this.w = w;
        }
        return this;
    }

    div(vector) {
        this.x /= vector.x;
        this.y /= vector.y;
        this.z /= vector.z;
        this.w /= vector.w;
        return this;
    }

    dist(vector) {
        return Math.sqrt((this.x - vector.x) ** 2 + (this.y - vector.y) ** 2 + (this.z - vector.z) ** 2);
    }

    distFlat(vector) {
        return Math.sqrt((this.x - vector.x) ** 2 + (this.z - vector.z) ** 2);
    }
}

export class Object3D {
    constructor() {
        this.position = new Vector4();
        this.rotation = new Vector4();
        this.scale = new Vector4(1, 1, 1);
    }

    updateMatrix() {
        this.matrix = Matrix4.translate(this.position.x, this.position.y, this.position.z)
            .mul(Matrix4.rotateX(this.rotation.x))
            .mul(Matrix4.rotateY(this.rotation.y))
            .mul(Matrix4.rotateZ(this.rotation.z))
            .mul(Matrix4.scale(this.scale.x, this.scale.y, this.scale.z));
    }
}

export class PerspectiveCamera extends Object3D {
    constructor(fov, aspect, near, far) {
        super();
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
    }

    updateMatrix() {
        this.matrix = Matrix4.perspective(this.fov, this.aspect, this.near, this.far)
            .mul(Matrix4.rotateX(this.rotation.x))
            .mul(Matrix4.rotateY(this.rotation.y))
            .mul(Matrix4.rotateZ(this.rotation.z))
            .mul(Matrix4.translate(-this.position.x, -this.position.y, -this.position.z));
    }
}
